import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildPmStageRecommendation,
  getPmWorkspaceStage,
  planPmWorkspaceRun,
} from "@/lib/agent-runtime/planner";
import {
  buildLaunchKitAssetDrafts,
  type GeneratedAssetDraft,
} from "@/lib/ai/program-launch-kit";
import { generateLandingPageAssetDraft } from "@/lib/ai/landing-page-asset-agent";
import {
  completeAgentToolCall,
  createAgentRun,
  createAgentRunTask,
  recordAgentEvent,
  recordAgentToolCall,
  registerAgentArtifact,
  updateAgentRunStatus,
  updateAgentTaskStatus,
  upsertAgentMemory,
} from "@/lib/agent-runtime/runtime";
import { applyProgramBriefDelta } from "@/lib/ai/brief-delta";
import {
  extractProgramBriefDelta,
  generateProgramBriefDraft,
  generateProgramPlanDraft,
} from "@/lib/ai/program-agent";
import { generateStageAssetDraft } from "@/lib/ai/stage-asset-agent";
import {
  deriveAllowedWorkspaceActions,
  describeAllowedActions,
  isWorkspaceActionAllowed,
  type WorkspaceAgentAction,
} from "@/lib/pm-workspace/allowed-actions";
import {
  advanceSetupProgress,
  createInitialSetupProgress,
  getSetupStageForAgentAction,
  getSetupStageLabel,
  isSetupStageComplete,
  mergeSetupProgressIntoMetadata,
  readSetupProgress,
  type SetupStageKey,
} from "@/lib/pm-workspace/setup-progress";
import { buildWorkspaceStageGuidance } from "@/lib/pm-workspace/stage-guidance";
import type { Json } from "@/lib/supabase/database.types";
import {
  getCurrentUserOrNull,
  getWorkspaceAccessRows,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  workspaceId: z.uuid(),
  sessionId: z.uuid().optional().nullable(),
  message: z.string().trim().min(1).max(3000),
  clientMessageId: z.string().trim().min(8).max(120).optional().nullable(),
  // Legacy flag: now starts the first guided setup stage only (plan generation).
  // The remaining launch-kit stages are recommended one at a time.
  buildFullProgram: z.boolean().optional(),
  // Explicit PM decision from the brief action card. This avoids sending
  // "Confirm & Apply" back through the agent as an ambiguous user prompt.
  confirmBriefUpdates: z.boolean().optional(),
});

type StreamEvent =
  | {
      type: "session";
      sessionId: string;
      workspaceId: string;
    }
  | {
      type: "status";
      title: string;
      body: string;
    }
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      status: string;
      sessionId: string;
      workspaceId: string;
    }
  | {
      type: "error";
      message: string;
      traceId?: string;
      sessionId?: string;
      workspaceId?: string;
    }
  | {
      // Live build progress — one event per step
      type: "build_step";
      step: string;
      status: "running" | "done";
      label: string;
    };

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function createTraceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pmchat_${crypto.randomUUID().slice(0, 8)}`;
  }

  return `pmchat_${Date.now().toString(36)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getErrorStack(error: unknown) {
  return error instanceof Error ? error.stack ?? null : null;
}

function getStageKeyForArtifactType(
  artifactType: string,
):
  | "landing_page"
  | "registration_form"
  | "submission_form"
  | "judging_setup"
  | "workspace" {
  if (
    artifactType === "landing_page" ||
    artifactType === "registration_form" ||
    artifactType === "submission_form" ||
    artifactType === "judging_setup"
  ) {
    return artifactType;
  }

  return "workspace";
}

function buildDisallowedActionResponse(params: {
  requestedAction: string;
  allowedActions: ReturnType<typeof deriveAllowedWorkspaceActions>;
}) {
  const next = params.allowedActions.find((action) => action.action !== "respond");
  if (!next) {
    return "I can’t take that action from the current workspace state yet. The safe next move is to review the current workspace state, then continue from the available action in the thread.";
  }

  return `I can’t take "${params.requestedAction}" from the current workspace state yet. The safe next step is: ${next.label}. ${next.reason}`;
}

function isApprovalOnlyMessage(message: string) {
  const normalized = message
    .trim()
    .toLowerCase()
    .replace(/[.!?,]+$/g, "");

  return [
    "all good",
    "all good i approve",
    "all good, i approve",
    "approved",
    "i approve",
    "looks good",
    "looks good to me",
    "that's it",
    "thats it",
    "that's it nothing else",
    "thats it nothing else",
    "nothing else",
    "go ahead",
    "sounds good",
    "ok",
    "okay",
  ].includes(normalized);
}

function writeLine(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: StreamEvent,
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

async function runBestEffort(task: () => Promise<void>) {
  try {
    await task();
  } catch (error) {
    console.error("Non-blocking PM chat stream failure", error);
  }
}

async function persistPlannerStateMemory(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  sessionId: string;
  organizationId: string | null;
  workspaceId: string;
  programId: string | null;
  briefId: string | null;
  agentRunId: string | null;
  stage: string;
  stageLabel: string;
  stageTone: "gold" | "amber" | "green";
  openQuestionCount: number;
  recommendationTitle: string;
  recommendationBody: string;
  recommendationActionLabel: string;
}) {
  const stageMemoryId = await upsertAgentMemory(params.supabase, {
    sessionId: params.sessionId,
    organizationId: params.organizationId,
    workspaceId: params.workspaceId,
    programId: params.programId,
    artifactType: "brief",
    artifactSourceTable: params.briefId ? "program_briefs" : null,
    artifactSourceId: params.briefId,
    memoryScope: "session",
    memoryKey: "pm_workspace_stage",
    summary: params.stageLabel,
    memoryPayload: {
      stage: params.stage,
      label: params.stageLabel,
      tone: params.stageTone,
      openQuestionCount: params.openQuestionCount,
    },
    confidence: "high",
    sourceType: "derived_summary",
    sourceRunId: params.agentRunId,
  });

  const recommendationMemoryId = await upsertAgentMemory(params.supabase, {
    sessionId: params.sessionId,
    organizationId: params.organizationId,
    workspaceId: params.workspaceId,
    programId: params.programId,
    artifactType: "brief",
    artifactSourceTable: params.briefId ? "program_briefs" : null,
    artifactSourceId: params.briefId,
    memoryScope: "session",
    memoryKey: "pm_workspace_recommended_next_step",
    summary: params.recommendationTitle,
    memoryPayload: {
      actionLabel: params.recommendationActionLabel,
      body: params.recommendationBody,
      stage: params.stage,
    },
    confidence: "high",
    sourceType: "derived_summary",
    sourceRunId: params.agentRunId,
  });

  return {
    stageMemoryId,
    recommendationMemoryId,
  };
}

async function loadSessionMetadata(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  sessionId: string;
}) {
  const { data } = await params.supabase
    .from("agent_sessions")
    .select("session_metadata")
    .eq("id", params.sessionId)
    .maybeSingle();

  return data?.session_metadata ?? null;
}

async function persistSetupProgress(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  sessionId: string;
  completedStage: SetupStageKey;
  artifactId?: string | null;
  metadataPatch?: Record<string, unknown>;
}) {
  const currentMetadata = await loadSessionMetadata({
    supabase: params.supabase,
    sessionId: params.sessionId,
  });
  const nextProgress = advanceSetupProgress(
    readSetupProgress(currentMetadata),
    params.completedStage,
    { artifactId: params.artifactId },
  );

  await params.supabase
    .from("agent_sessions")
    .update({
      last_message_at: new Date().toISOString(),
      session_metadata: json({
        ...mergeSetupProgressIntoMetadata(currentMetadata, nextProgress),
        ...(params.metadataPatch ?? {}),
      }),
    })
    .eq("id", params.sessionId);

  return nextProgress;
}

async function persistAssistantWorkspaceResponse(params: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  sessionId: string;
  briefId: string;
  contentText: string;
  contentPayload?: Record<string, unknown>;
  modelName?: string;
}) {
  const { error } = await params.supabase.from("agent_messages").insert({
    session_id: params.sessionId,
    brief_id: params.briefId,
    role: "assistant",
    kind: "chat",
    content_text: params.contentText,
    content_payload: json(params.contentPayload ?? {}),
    model_name: params.modelName ?? "pm_workspace_policy",
  });

  if (error) {
    throw new Error(error.message);
  }

  await params.supabase
    .from("agent_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", params.sessionId);
}

async function createAiRequestLog(params: {
  featureKey: string;
  requestedBy: string;
  organizationId: string | null;
  workspaceId: string;
  programId: string | null;
  requestPayload: Json;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_requests")
    .insert({
      feature_key: params.featureKey,
      requested_by: params.requestedBy,
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      program_id: params.programId,
      risk_level: "medium",
      status: "pending_review",
      request_payload: params.requestPayload,
    })
    .select("id")
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

async function finalizeAiRequestLog(params: {
  aiRequestId: string | null;
  outputPayload: Json;
  status: "generated" | "failed";
  workspaceId: string;
  organizationId: string | null;
  programId: string | null;
  featureKey: string;
  modelName?: string;
  tokenCount?: number | null;
}) {
  if (!params.aiRequestId) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  await supabase
    .from("ai_requests")
    .update({
      status: params.status,
      output_payload: params.outputPayload,
    })
    .eq("id", params.aiRequestId);

  if (
    params.status === "generated" &&
    params.modelName &&
    typeof params.tokenCount === "number"
  ) {
    await supabase.from("ai_usage_events").insert({
      ai_request_id: params.aiRequestId,
      feature_key: params.featureKey,
      provider_name: "openai",
      model_name: params.modelName,
      token_count: params.tokenCount,
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      program_id: params.programId,
    });
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid PM chat request.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const workspaces = await getWorkspaceAccessRows(supabase, user);
  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.workspaceId === parsed.data.workspaceId,
  );

  if (!selectedWorkspace) {
    return NextResponse.json(
      { error: "You do not have access to that workspace." },
      { status: 403 },
    );
  }

  const encoder = new TextEncoder();
  const traceId = createTraceId();
  const requestStartedAt = new Date().toISOString();

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      let sessionId = parsed.data.sessionId ?? null;
      let briefId: string | null = null;
      let organizationId = selectedWorkspace.organizationId;
      let programId: string | null = null;
      let phase = "stream_start";

      try {
        if (!sessionId) {
          phase = "create_brief";
          const { data: brief, error: briefError } = await supabase
            .from("program_briefs")
            .insert({
              organization_id: organizationId,
              workspace_id: selectedWorkspace.workspaceId,
              created_by: user.id,
              source: "chat",
              status: "collecting_requirements",
              confidence_level: "medium",
              current_brief: json({}),
              assumptions: json([]),
              open_questions: json([]),
            })
            .select("id")
            .single();

          if (briefError || !brief) {
            throw new Error(
              briefError?.message ?? "Unable to create the program brief.",
            );
          }

          briefId = brief.id;

          phase = "create_session";
          const { data: session, error: sessionError } = await supabase
            .from("agent_sessions")
            .insert({
              brief_id: brief.id,
              organization_id: organizationId,
              workspace_id: selectedWorkspace.workspaceId,
              created_by: user.id,
              title: "New innovation workspace",
              status: "active",
              session_metadata: json({
                surface: "pm_create_workspace",
                setupProgress: createInitialSetupProgress(),
              }),
            })
            .select("id")
            .single();

          if (sessionError || !session) {
            throw new Error(
              sessionError?.message ?? "Unable to create the agent workspace.",
            );
          }

          sessionId = session.id;
        } else {
          phase = "load_session";
          const { data: session, error: sessionError } = await supabase
            .from("agent_sessions")
            .select("id, brief_id, organization_id, program_id")
            .eq("id", sessionId)
            .eq("created_by", user.id)
            .single();

          if (sessionError || !session) {
            throw new Error("The selected agent workspace is no longer available.");
          }

          briefId = session.brief_id;
          organizationId = session.organization_id ?? selectedWorkspace.organizationId;
          programId = session.program_id;
        }

        if (!briefId || !sessionId) {
          throw new Error("The PM agent workspace could not be initialized.");
        }

        const activeSessionId = sessionId;
        const activeBriefId = briefId;

        phase = "emit_session";
        writeLine(controller, encoder, {
          type: "session",
          sessionId: activeSessionId,
          workspaceId: selectedWorkspace.workspaceId,
        });

        phase = "persist_user_message";
        const { error: userMessageError } = await supabase
          .from("agent_messages")
          .insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            actor_user_id: user.id,
            role: "user",
            kind: "chat",
            content_text: parsed.data.message,
            content_payload: {
              source: "pm_chat",
              clientMessageId: parsed.data.clientMessageId ?? null,
            },
          });

        if (userMessageError) {
          throw new Error(userMessageError.message);
        }

        await supabase
          .from("agent_sessions")
          .update({
            last_message_at: new Date().toISOString(),
          })
          .eq("id", activeSessionId);

        phase = "load_workspace_state";
        const [
          { data: briefRow, error: briefError },
          { data: messageRows, error: historyError },
          { data: approvalRows, error: approvalError },
        ] = await Promise.all([
          supabase
            .from("program_briefs")
            .select(
              "id, organization_id, workspace_id, program_id, title, detected_program_type, status, confidence_level, current_brief, assumptions, open_questions, active_version_id, active_plan_id",
            )
            .eq("id", activeBriefId)
            .single(),
          supabase
            .from("agent_messages")
            .select("role, content_text")
            .eq("session_id", activeSessionId)
            .order("created_at", { ascending: true })
            .limit(14),
          supabase
            .from("approval_requests")
            .select("status")
            .eq("brief_id", activeBriefId)
            .order("requested_at", { ascending: false })
            .limit(8),
        ]);

        if (briefError || !briefRow || historyError || approvalError) {
          throw new Error(
            briefError?.message ??
              historyError?.message ??
              approvalError?.message ??
              "Unable to load current agent state.",
          );
        }

        const hasPendingApproval = (approvalRows ?? []).some(
          (approval) => approval.status === "pending",
        );
        const isApproved = (approvalRows ?? []).some(
          (approval) => approval.status === "approved",
        );
        const openQuestionCount = Array.isArray(briefRow.open_questions)
          ? briefRow.open_questions.length
          : 0;
        const hasBriefContent =
          briefRow.current_brief != null &&
          typeof briefRow.current_brief === "object" &&
          !Array.isArray(briefRow.current_brief) &&
          Object.keys(briefRow.current_brief as Record<string, unknown>).length > 0;
        const hasPlan = Boolean(briefRow.active_plan_id);
        // Once the PM has generated a plan or downstream assets, stale brief
        // questions must not silently pull the workspace back to clarification.
        // Explicit brief changes are still possible, but the default operator
        // flow continues forward from the committed plan.
        const gatingOpenQuestionCount = hasPlan ? 0 : openQuestionCount;

        if (parsed.data.confirmBriefUpdates === true) {
          phase = "confirm_brief_updates";
          writeLine(controller, encoder, {
            type: "status",
            title: "Confirming brief updates",
            body: "Recording the PM decision and refreshing the workspace state.",
          });

          const isBriefReady = gatingOpenQuestionCount === 0 && hasBriefContent;
          const assistantMessage = isBriefReady
            ? "Confirmed. The structured brief is ready. I can now generate the governed execution plan as the next stage."
            : `Confirmed. I applied the latest brief updates to the workspace. ${openQuestionCount} ${openQuestionCount === 1 ? "answer is" : "answers are"} still needed before I can build the launch kit.`;
          const briefActionProposal = isBriefReady
            ? {
                kind: "accept_build",
                title: "Brief ready",
                body: "Review the captured changes, then generate the execution plan as the next governed stage.",
                primaryLabel: "Generate plan",
                secondaryLabel: "Make changes",
                steps: [
                  { key: "plan", label: "Generate execution plan" },
                  { key: "landing_page", label: "Next: draft landing page" },
                  { key: "registration", label: "Then: draft registration form" },
                  { key: "submission", label: "Then: draft submission form" },
                  { key: "judging", label: "Then: draft judging setup" },
                ],
              }
            : null;
          const nextStepGuidance = buildWorkspaceStageGuidance({
            sessionId: activeSessionId,
            stageKey: "brief",
            stageStatus: isBriefReady ? "draft_ready" : "needs_input",
            openQuestionCount: gatingOpenQuestionCount,
          });

          const { error: assistantMessageError } = await supabase
            .from("agent_messages")
            .insert({
              session_id: activeSessionId,
              brief_id: activeBriefId,
              role: "assistant",
              kind: isBriefReady ? "brief_update" : "question",
              content_text: assistantMessage,
              content_payload: json({
                confirmation: {
                  kind: "brief_updates_confirmed",
                  confirmedAt: new Date().toISOString(),
                  openQuestionCount: gatingOpenQuestionCount,
                },
                briefStatus: briefRow.status,
                confidenceLevel: briefRow.confidence_level,
                structuredBrief: briefRow.current_brief,
                assumptions: briefRow.assumptions,
                openQuestions: briefRow.open_questions,
                workspaceStage: isBriefReady ? "brief_ready" : "brief_clarification",
                nextStepGuidance,
                ...(briefActionProposal ? { briefActionProposal } : {}),
              }),
              model_name: "pm_workspace_deterministic",
            });

          if (assistantMessageError) {
            throw new Error(assistantMessageError.message);
          }

          await supabase
            .from("agent_sessions")
            .update({
              last_message_at: new Date().toISOString(),
            })
            .eq("id", activeSessionId);

          await runBestEffort(async () => {
            await recordAgentEvent(supabase, {
              sessionId: activeSessionId,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              eventType: "artifact_updated",
              title: "Brief updates confirmed",
              body: assistantMessage,
              eventPayload: {
                traceId,
                openQuestionCount: gatingOpenQuestionCount,
                isBriefReady,
              },
            });
          });

          for (const chunk of chunkText(assistantMessage)) {
            writeLine(controller, encoder, { type: "delta", text: chunk });
          }

          writeLine(controller, encoder, {
            type: "done",
            status: isBriefReady ? "brief-ready" : "brief-updated",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        // ── Step 1: planner provides run metadata (runType, taskPlan, summaries)
        const plannerDecision = planPmWorkspaceRun({
          message: parsed.data.message,
          currentBrief: briefRow.current_brief,
          openQuestionCount: gatingOpenQuestionCount,
          hasPlan,
          hasPendingApproval,
          isApproved,
        });

        // ── Step 2: LLM decides the actual action from natural language
        // This replaces the keyword planner and handles all messages naturally —
        // greetings, casual replies, edge cases — without pattern matching.
        phase = "agent_decision";
        const currentWorkspaceStage = getPmWorkspaceStage({
          currentBrief: briefRow.current_brief,
          openQuestionCount: gatingOpenQuestionCount,
          hasPlan,
          hasPendingApproval,
          isApproved,
        });
        const agentDecision = await (async () => {
          try {
            // messageRows is loaded in ascending (oldest-first) order.
            // Take the most recent 12, keep chronological order so the LLM
            // reads the conversation correctly oldest → newest.
            const recentHistory = (messageRows ?? [])
              .filter(
                (m) =>
                  Boolean(m.content_text) &&
                  (m.role === "user" || m.role === "assistant"),
              )
              .slice(-12)
              .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content_text as string,
              }));

            // Load live program context when the session has a linked live program
            let liveProgramContext: {
              programId: string;
              programName: string | null;
              status: string | null;
              shortDescription: string | null;
              registrationClosesAt: string | null;
              submissionClosesAt: string | null;
              startsAt: string | null;
              endsAt: string | null;
            } | null = null;

            if (programId) {
              const { data: liveProgram } = await supabase
                .from("programs")
                .select("id, name, status, short_description, registration_closes_at, submission_closes_at, starts_at, ends_at")
                .eq("id", programId)
                .maybeSingle();

              if (liveProgram) {
                liveProgramContext = {
                  programId: liveProgram.id,
                  programName: liveProgram.name ?? null,
                  status: liveProgram.status ?? null,
                  shortDescription: liveProgram.short_description ?? null,
                  registrationClosesAt: liveProgram.registration_closes_at ?? null,
                  submissionClosesAt: liveProgram.submission_closes_at ?? null,
                  startsAt: liveProgram.starts_at ?? null,
                  endsAt: liveProgram.ends_at ?? null,
                };
              }
            }

            const allowedWorkspaceActions = deriveAllowedWorkspaceActions({
              stage: liveProgramContext ? "live" : currentWorkspaceStage,
              hasBrief: hasBriefContent,
              openQuestionCount: gatingOpenQuestionCount,
              hasPlan,
              hasPendingApproval,
              isApproved,
              isLiveProgram: Boolean(liveProgramContext),
            });

            const { data: fnResult, error: fnError } = await supabase.functions.invoke(
              "pm-workspace-agent",
              {
                body: {
                  message: parsed.data.message,
                  workspaceContext: {
                    stage: liveProgramContext ? "live" : currentWorkspaceStage,
                    hasBrief: hasBriefContent,
                    briefTitle: briefRow.title ?? null,
                    briefSummary: null,
                    openQuestionCount: gatingOpenQuestionCount,
                    hasPlan,
                    hasPendingApproval,
                    isApproved,
                    hasAssets: false,
                    organizationName: selectedWorkspace.organizationName,
                    workspaceName: selectedWorkspace.workspaceName,
                    liveProgram: liveProgramContext,
                  },
                  allowedActions: describeAllowedActions(allowedWorkspaceActions),
                  conversationHistory: recentHistory,
                },
              },
            );

            if (fnError || !fnResult?.ok) {
              console.error("pm-workspace-agent fallback:", fnError?.message ?? fnResult?.error);
              return null;
            }

            // Parse the flat schema into the shape the rest of the route expects.
            // The agent now returns all fields as plain strings (no nullable objects/arrays).
            const raw = fnResult as {
              action: string;
              message: string;
              assetTypes: string;          // comma-separated or ""
              liveOpsChangeType: string;   // enum value or ""
              liveOpsField: string;        // DB field name or ""
              liveOpsValue: string;        // new value or ""
              liveOpsCurrentValue: string; // current value or ""
              liveOpsDescription: string;  // human description or ""
            };

            const parsedAssetTypes = raw.assetTypes
              ? raw.assetTypes.split(",").map((s) => s.trim()).filter(Boolean)
              : null;

            const parsedLiveOpsChange =
              raw.action === "live_ops_change" && raw.liveOpsField
                ? {
                    changeType: raw.liveOpsChangeType,
                    fieldPath: raw.liveOpsField,
                    proposedValue: raw.liveOpsValue,
                    currentValue: raw.liveOpsCurrentValue || null,
                    changeDescription: raw.liveOpsDescription,
                  }
                : null;

            const parsedAction = raw.action as WorkspaceAgentAction;
            if (
              parsedAction === "draft_brief" &&
              hasPlan &&
              isApprovalOnlyMessage(parsed.data.message)
            ) {
              return {
                action: "respond" as const,
                message:
                  "Noted. I will keep the approved brief and current drafts unchanged. The next safe step is to continue the setup sequence or prepare the governed approval packet when the launch assets are ready.",
                assetTypes: null,
                liveOpsChange: null,
              };
            }

            if (!isWorkspaceActionAllowed(allowedWorkspaceActions, parsedAction)) {
              return {
                action: "respond" as const,
                message: buildDisallowedActionResponse({
                  requestedAction: parsedAction,
                  allowedActions: allowedWorkspaceActions,
                }),
                assetTypes: null,
                liveOpsChange: null,
              };
            }

            return {
              action: parsedAction,
              message: raw.message,
              assetTypes: parsedAssetTypes,
              liveOpsChange: parsedLiveOpsChange,
            };
          } catch (err) {
            console.error("pm-workspace-agent error:", err);
            return null;
          }
        })();

        // Legacy full-build requests now start only the first guided stage.
        const shouldStartStagedPlan = parsed.data.buildFullProgram === true;
        if (
          shouldStartStagedPlan &&
          (!hasBriefContent || gatingOpenQuestionCount > 0)
        ) {
          throw new Error(
            "The staged setup can only start after the brief is complete and before a plan already exists.",
          );
        }

        // Override planner flags with agent decision when available.
        // Fall back to planner-derived flags if agent call failed.
        const shouldLiveOpsChange = !shouldStartStagedPlan && agentDecision?.action === "live_ops_change" && Boolean(agentDecision.liveOpsChange);
        const shouldProposeSequence = !shouldStartStagedPlan && agentDecision?.action === "propose_sequence";
        const shouldBuildFullProgram = false;
        const shouldGenerateBrief = shouldStartStagedPlan
          ? false
          : agentDecision
            ? agentDecision.action === "draft_brief"
            : plannerDecision.shouldGenerateBrief;
        const shouldGeneratePlan = shouldStartStagedPlan
          ? true
          : agentDecision
          ? agentDecision.action === "generate_plan"
          : plannerDecision.shouldGeneratePlan;
        const shouldGenerateAssets = shouldStartStagedPlan
          ? false
          : agentDecision
            ? [
                "generate_assets",
                "generate_landing_page",
                "generate_registration_form",
                "generate_submission_form",
                "generate_judging_setup",
              ].includes(agentDecision.action)
            : plannerDecision.shouldGenerateAssets;
        const shouldPrepareApprovals = shouldStartStagedPlan
          ? false
          : agentDecision
            ? agentDecision.action === "prepare_approvals"
            : plannerDecision.shouldPrepareApprovals;

        // The agent's natural-language message replaces the templated recommendation.
        const agentMessage = agentDecision?.message ?? plannerDecision.recommendation.body;
        const currentSetupMetadata = await loadSessionMetadata({
          supabase,
          sessionId: activeSessionId,
        });
        const currentSetupProgress = readSetupProgress(currentSetupMetadata);
        const requestedSetupStage = shouldStartStagedPlan
          ? "plan"
          : agentDecision
            ? getSetupStageForAgentAction(agentDecision.action)
            : null;

        if (
          requestedSetupStage &&
            (isSetupStageComplete(currentSetupProgress, requestedSetupStage) ||
              (requestedSetupStage === "plan" && Boolean(briefRow.active_plan_id)) ||
            (requestedSetupStage === "approval" && (approvalRows ?? []).length > 0))
        ) {
          const stageLabel = getSetupStageLabel(requestedSetupStage);
          const guidanceStage =
            currentSetupProgress.recommendedStage ??
            currentSetupProgress.activeStage ??
            requestedSetupStage;
          const nextStepGuidance = buildWorkspaceStageGuidance({
            sessionId: activeSessionId,
            stageKey: guidanceStage,
            stageStatus: "draft_ready",
          });
          const duplicateMessage = `${stageLabel} is already complete for this workspace. I won't generate a duplicate draft automatically. Continue with ${getSetupStageLabel(guidanceStage)} or refine the existing stage from the workspace.`;

          await persistAssistantWorkspaceResponse({
            supabase,
            sessionId: activeSessionId,
            briefId: activeBriefId,
            contentText: duplicateMessage,
            contentPayload: {
              workspaceStage: plannerDecision.stage,
              duplicateStageBlocked: {
                stageKey: requestedSetupStage,
                stageLabel,
              },
              nextStepGuidance,
            },
          });

          for (const chunk of chunkText(duplicateMessage)) {
            writeLine(controller, encoder, { type: "delta", text: chunk });
            await delay(16);
          }

          writeLine(controller, encoder, {
            type: "done",
            status: "workspace-guidance",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        let agentRunId: string | null = null;
        let draftBriefTaskId: string | null = null;
        let validateBriefTaskId: string | null = null;
        let updateMemoryTaskId: string | null = null;
        let recommendationTaskId: string | null = null;
        let draftBriefToolCallId: string | null = null;
        const draftBriefToolStartedAt = new Date();

        phase = "clear_stale_agent_runs";
        await runBestEffort(async () => {
          await supabase
            .from("agent_runs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
              error_payload: json({
                reason: "Superseded by a newer chat request before completion.",
                traceId,
              }),
            })
            .eq("session_id", activeSessionId)
            .in("status", [
              "queued",
              "planning",
              "running",
              "waiting_for_input",
              "waiting_for_approval",
              "blocked",
            ])
            .lt("created_at", requestStartedAt);
        });

        phase = "create_agent_run";
        await runBestEffort(async () => {
          const run = await createAgentRun(supabase, {
            sessionId: activeSessionId,
            briefId: activeBriefId,
            organizationId,
            workspaceId: selectedWorkspace.workspaceId,
            programId,
            runType: plannerDecision.runType,
            goalText: parsed.data.message,
            userInstruction: parsed.data.message,
            startedBy: user.id,
            plannerModel: "pm_workspace_v1",
            executorModel: shouldGenerateBrief
              ? "generate-program-agent-draft"
              : "pm_workspace_planner_v1",
            runInput: {
              plannerIntent: plannerDecision.intent,
              workspaceStage: plannerDecision.stage,
              workspaceName: selectedWorkspace.workspaceName,
              organizationName: selectedWorkspace.organizationName,
              existingBriefState: briefRow.status,
            },
          });
          agentRunId = run.id;

          await updateAgentRunStatus(supabase, {
            runId: run.id,
            status: "planning",
            summary: plannerDecision.planningSummary,
          });

          await recordAgentEvent(supabase, {
            sessionId: activeSessionId,
            runId: run.id,
            organizationId,
            workspaceId: selectedWorkspace.workspaceId,
            programId,
            eventType: "run_started",
            title: "PM agent run started",
            body: "Innova started a new workspace run from the latest program instruction.",
            eventPayload: {
              runType: run.run_type,
              plannerIntent: plannerDecision.intent,
              workspaceStage: plannerDecision.stage,
            },
          });

          for (const taskBlueprint of plannerDecision.taskPlan) {
            const task = await createAgentRunTask(supabase, {
              runId: run.id,
              taskType: taskBlueprint.taskType,
              title: taskBlueprint.title,
              description: taskBlueprint.description,
              displayOrder: taskBlueprint.displayOrder,
              status:
                taskBlueprint.taskType === "inspect_context"
                  ? "completed"
                  : "pending",
              inputPayload:
                taskBlueprint.taskType === "inspect_context"
                  ? {
                      workspaceId: selectedWorkspace.workspaceId,
                      briefId: activeBriefId,
                    }
                  : taskBlueprint.taskType === "draft_brief"
                    ? {
                        latestUserMessage: parsed.data.message,
                      }
                    : undefined,
            });

            if (taskBlueprint.taskType === "draft_brief") {
              draftBriefTaskId = task.id;
            }

            if (taskBlueprint.taskType === "validate_output") {
              validateBriefTaskId = task.id;
            }

            if (taskBlueprint.taskType === "update_memory") {
              updateMemoryTaskId = task.id;
            }

            if (taskBlueprint.taskType === "emit_recommendation") {
              recommendationTaskId = task.id;
            }
          }

          await recordAgentEvent(supabase, {
            sessionId: activeSessionId,
            runId: run.id,
            taskId: draftBriefTaskId ?? recommendationTaskId,
            organizationId,
            workspaceId: selectedWorkspace.workspaceId,
            programId,
            eventType: "run_planned",
            title: "Run planned",
            body: "Innova prepared the initial task sequence for this PM workspace run.",
            eventPayload: {
              plannerIntent: plannerDecision.intent,
              taskTypes: plannerDecision.taskPlan.map((task) => task.taskType),
            },
          });
        });

        writeLine(controller, encoder, {
          type: "status",
          title: "Planning the run",
          body: plannerDecision.planningSummary,
        });

        if (shouldGenerateAssets) {
          if (!briefRow.active_plan_id) {
            throw new Error(
              "A generated execution plan is required before launch assets can be drafted.",
            );
          }

          const { data: planRow, error: planError } = await supabase
            .from("program_plans")
            .select("id, title, summary")
            .eq("id", briefRow.active_plan_id)
            .single();

          if (planError || !planRow) {
            throw new Error(planError?.message ?? "Unable to load the current plan.");
          }

          const { data: planItemRows } = await supabase
            .from("program_plan_items")
            .select("item_key, item_type")
            .eq("plan_id", planRow.id);
          const planItemKeyByType = new Map(
            (planItemRows ?? []).map((item) => [item.item_type, item.item_key]),
          );

          let draftAssetTaskId: string | null = null;
          let updateMemoryTaskId: string | null = null;
          let recommendationTaskId: string | null = null;

          const draftAssetTask = plannerDecision.taskPlan.find(
            (task) => task.taskType === "draft_asset",
          );
          const updateMemoryTask = plannerDecision.taskPlan.find(
            (task) => task.taskType === "update_memory",
          );
          const recommendationTask = plannerDecision.taskPlan.find(
            (task) => task.taskType === "emit_recommendation",
          );

          draftAssetTaskId =
            draftAssetTask && agentRunId
              ? (
                  await supabase
                    .from("agent_run_tasks")
                    .select("id")
                    .eq("run_id", agentRunId!)
                    .eq("task_type", "draft_asset")
                    .maybeSingle()
                ).data?.id ?? null
              : null;
          updateMemoryTaskId =
            updateMemoryTask && agentRunId
              ? (
                  await supabase
                    .from("agent_run_tasks")
                    .select("id")
                    .eq("run_id", agentRunId!)
                    .eq("task_type", "update_memory")
                    .maybeSingle()
                ).data?.id ?? null
              : null;
          recommendationTaskId =
            recommendationTask && agentRunId
              ? (
                  await supabase
                    .from("agent_run_tasks")
                    .select("id")
                    .eq("run_id", agentRunId!)
                    .eq("task_type", "emit_recommendation")
                    .maybeSingle()
                ).data?.id ?? null
              : null;

          await runBestEffort(async () => {
            if (agentRunId && draftAssetTaskId) {
              await updateAgentRunStatus(supabase, {
                runId: agentRunId,
                status: "running",
                currentTaskId: draftAssetTaskId,
                summary: plannerDecision.runningSummary,
              });

              await updateAgentTaskStatus(supabase, {
                taskId: draftAssetTaskId,
                status: "running",
                started: true,
              });
            }
          });

          writeLine(controller, encoder, {
            type: "status",
            title: "Drafting launch assets",
            body: plannerDecision.runningSummary,
          });

          const assetRequestMessage =
            agentDecision?.action === "generate_landing_page"
              ? "landing page"
              : agentDecision?.action === "generate_registration_form"
                ? "registration form"
                : agentDecision?.action === "generate_submission_form"
                  ? "submission form"
                  : agentDecision?.action === "generate_judging_setup"
                    ? "judging setup"
                    : parsed.data.message;
          const structuredBrief =
            (briefRow.current_brief as Record<string, unknown> | null) ?? null;
          const { drafts: baseDrafts, targets } = buildLaunchKitAssetDrafts({
            message: assetRequestMessage,
            brief: {
              title: briefRow.title,
              detectedProgramType: briefRow.detected_program_type,
              currentBrief: structuredBrief,
            },
            plan: {
              title: planRow.title,
              summary: planRow.summary,
            },
          });
          const drafts: GeneratedAssetDraft[] = [];
          for (const draft of baseDrafts) {
            if (
              draft.artifactType === "registration_form" ||
              draft.artifactType === "submission_form" ||
              draft.artifactType === "judging_setup"
            ) {
              const generated = await generateStageAssetDraft(supabase, draft.artifactType, {
                workspaceName: selectedWorkspace.workspaceName,
                organizationName: selectedWorkspace.organizationName,
                briefTitle: briefRow.title,
                detectedProgramType: briefRow.detected_program_type,
                structuredBrief: structuredBrief ?? {},
                planTitle: planRow.title,
                planSummary: planRow.summary,
              });
              drafts.push(generated.draft);
            } else if (draft.artifactType === "landing_page") {
              const generated = await generateLandingPageAssetDraft(supabase, {
                workspaceName: selectedWorkspace.workspaceName,
                organizationName: selectedWorkspace.organizationName,
                briefTitle: briefRow.title,
                detectedProgramType: briefRow.detected_program_type,
                structuredBrief: structuredBrief ?? {},
                planTitle: planRow.title,
                planSummary: planRow.summary,
              });
              drafts.push(generated.draft);
            } else {
              drafts.push(draft);
            }
          }

          if (drafts.length === 0) {
            throw new Error(
              "I could not tell which launch asset to draft. Ask for a landing page, registration form, submission form, judging setup, or the full launch kit.",
            );
          }

          const toolNameByArtifact = {
            landing_page: "draft_landing_page",
            registration_form: "draft_registration_form",
            submission_form: "draft_submission_form",
            judging_setup: "draft_judging_setup",
          } as const;

          const toolCallSummaries: Array<{
            artifactType: string;
            title: string;
            toolCallId: string | null;
          }> = [];

          for (const draft of drafts) {
            const startedAt = new Date();
            let toolCallId: string | null = null;

            await runBestEffort(async () => {
              if (agentRunId && draftAssetTaskId) {
                const toolCall = await recordAgentToolCall(supabase, {
                  runId: agentRunId,
                  taskId: draftAssetTaskId,
                  sessionId: activeSessionId,
                  organizationId,
                  workspaceId: selectedWorkspace.workspaceId,
                  programId,
                  toolName: toolNameByArtifact[draft.artifactType],
                  inputPayload: {
                    artifactType: draft.artifactType,
                    title: draft.title,
                  },
                });
                toolCallId = toolCall.id;
              }
            });

            await runBestEffort(async () => {
              if (toolCallId) {
                await completeAgentToolCall(supabase, {
                  toolCallId,
                  status: "completed",
                  outputPayload: {
                    artifactType: draft.artifactType,
                    title: draft.title,
                  },
                  startedAt,
                });
              }
            });

            toolCallSummaries.push({
              artifactType: draft.artifactType,
              title: draft.title,
              toolCallId,
            });
          }

          const assistantMessage = `I generated ${drafts.length === 1 ? "the requested launch asset" : "the requested launch assets"} from the current brief and execution plan.\n\n${drafts.map((draft) => `- ${draft.title}: ${draft.summary}`).join("\n")}\n\nReview the drafts in the assets workspace, refine anything that needs adjustment, and then move into the governed approval packet.`;
          const primaryDraft = drafts[0] ?? null;
          const nextStepGuidance = primaryDraft
            ? buildWorkspaceStageGuidance({
                sessionId: activeSessionId,
                stageKey:
                  drafts.length === 1
                    ? getStageKeyForArtifactType(primaryDraft.artifactType)
                    : "workspace",
                stageStatus: "draft_ready",
                assetKey:
                  drafts.length === 1
                    ? planItemKeyByType.get(primaryDraft.artifactType) ??
                      primaryDraft.artifactType
                    : null,
              })
            : null;

          const { data: assistantMessageRow, error: assistantMessageError } =
            await supabase
              .from("agent_messages")
              .insert({
                session_id: activeSessionId,
                brief_id: activeBriefId,
                plan_id: planRow.id,
                role: "assistant",
                kind: "chat",
                content_text: assistantMessage,
                content_payload: json({
                  workspaceStage: "plan_in_progress",
                  generatedAssets: drafts.map((draft) => ({
                    artifactType: draft.artifactType,
                    title: draft.title,
                  })),
                  ...(nextStepGuidance ? { nextStepGuidance } : {}),
                  primaryActionLabel: "Review assets",
                }),
              })
              .select("id")
              .single();

          if (assistantMessageError || !assistantMessageRow) {
            throw new Error(
              assistantMessageError?.message ??
                "Unable to save the generated asset summary.",
            );
          }

          for (const draft of drafts) {
            await registerAgentArtifact(supabase, {
              sessionId: activeSessionId,
              runId: agentRunId,
              taskId: draftAssetTaskId,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              artifactType: draft.artifactType,
              status: "ready_for_review",
              sourceTable: "agent_messages",
              sourceId: assistantMessageRow.id,
              title: draft.title,
              summary: draft.summary,
              artifactPayload: draft.payload,
              createdByRunId: agentRunId,
            });
          }

          const completedStage =
            drafts.length === 1 && primaryDraft
              ? getStageKeyForArtifactType(primaryDraft.artifactType)
              : "workspace";
          if (completedStage !== "workspace") {
            await persistSetupProgress({
              supabase,
              sessionId: activeSessionId,
              completedStage,
              artifactId: assistantMessageRow.id,
              metadataPatch: {
                surface: "pm_create_workspace",
                workspace_stage: "plan_in_progress",
                recommended_next_step:
                  nextStepGuidance?.nextStep.label ?? "Review assets",
              },
            });
          } else {
            await supabase
              .from("agent_sessions")
              .update({
                last_message_at: new Date().toISOString(),
                session_metadata: json({
                  surface: "pm_create_workspace",
                  workspace_stage: "plan_in_progress",
                  recommended_next_step: "Review assets",
                }),
              })
              .eq("id", activeSessionId);
          }

          await runBestEffort(async () => {
            const summaryMemoryId = await upsertAgentMemory(supabase, {
              sessionId: activeSessionId,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              artifactType: "plan",
              artifactSourceTable: "program_plans",
              artifactSourceId: planRow.id,
              memoryScope: "session",
              memoryKey: "pm_workspace_launch_kit_summary",
              summary: assistantMessage,
              memoryPayload: {
                targets,
                artifactCount: drafts.length,
              },
              confidence: "high",
              sourceType: "tool_output",
              sourceRunId: agentRunId,
            });

            const { stageMemoryId, recommendationMemoryId } =
              await persistPlannerStateMemory({
                supabase,
                sessionId: activeSessionId,
                organizationId,
                workspaceId: selectedWorkspace.workspaceId,
                programId,
                briefId: activeBriefId,
                agentRunId,
                stage: "plan_in_progress",
                stageLabel: plannerDecision.recommendation.stageLabel,
                stageTone: plannerDecision.recommendation.stageTone,
                openQuestionCount: gatingOpenQuestionCount,
                recommendationTitle: plannerDecision.recommendation.title,
                recommendationBody: plannerDecision.recommendation.body,
                recommendationActionLabel:
                  plannerDecision.recommendation.primaryActionLabel,
              });

            if (draftAssetTaskId) {
              await updateAgentTaskStatus(supabase, {
                taskId: draftAssetTaskId,
                status: "completed",
                completed: true,
                outputPayload: {
                  artifactCount: drafts.length,
                  targets,
                },
              });
            }

            if (updateMemoryTaskId) {
              await updateAgentTaskStatus(supabase, {
                taskId: updateMemoryTaskId,
                status: "completed",
                started: true,
                completed: true,
                outputPayload: {
                  summaryMemoryId,
                  stageMemoryId,
                  recommendationMemoryId,
                },
              });
            }

            if (recommendationTaskId) {
              await updateAgentTaskStatus(supabase, {
                taskId: recommendationTaskId,
                status: "completed",
                started: true,
                completed: true,
                outputPayload: {
                  title: plannerDecision.recommendation.title,
                  body: plannerDecision.recommendation.body,
                  primaryActionLabel:
                    plannerDecision.recommendation.primaryActionLabel,
                },
              });
            }

            if (agentRunId) {
              await updateAgentRunStatus(supabase, {
                runId: agentRunId,
                status: "completed",
                currentTaskId: recommendationTaskId ?? updateMemoryTaskId,
                summary: plannerDecision.completionSummary,
                runOutput: {
                  artifactCount: drafts.length,
                  targets,
                },
                completed: true,
              });
            }
          });

          for (const chunk of chunkText(assistantMessage)) {
            writeLine(controller, encoder, {
              type: "delta",
              text: chunk,
            });
            await delay(16);
          }

          revalidatePath("/app/create");
          revalidatePath(`/app/create/${activeSessionId}/assets`);
          writeLine(controller, encoder, {
            type: "done",
            status: "assets-generated",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        // ── CONVERSATIONAL PLAN GENERATION ──────────────────────────────────
        if (shouldGeneratePlan) {
          const structuredBrief =
            (briefRow.current_brief as Record<string, unknown> | null) ?? null;

          if (!briefRow.title || !structuredBrief || Object.keys(structuredBrief).length === 0) {
            throw new Error(
              "The brief needs more detail before a plan can be generated. Keep refining it first.",
            );
          }

          await runBestEffort(async () => {
            if (agentRunId) {
              await updateAgentRunStatus(supabase, {
                runId: agentRunId,
                status: "running",
                currentTaskId: draftBriefTaskId,
                summary: plannerDecision.runningSummary,
              });
              await recordAgentEvent(supabase, {
                sessionId: activeSessionId,
                runId: agentRunId,
                organizationId,
                workspaceId: selectedWorkspace.workspaceId,
                programId,
                eventType: "tool_call_started",
                title: "Generating execution plan",
                body: "Innova is drafting the governed execution plan from the current brief.",
                eventPayload: { toolName: "draft_program_plan" },
              });
            }
          });

          writeLine(controller, encoder, {
            type: "status",
            title: "Generating the execution plan",
            body: plannerDecision.runningSummary,
          });

          const planDraft = await generateProgramPlanDraft(supabase, {
            workspaceName: selectedWorkspace.workspaceName,
            organizationName: selectedWorkspace.organizationName,
            briefTitle: briefRow.title,
            detectedProgramType: briefRow.detected_program_type,
            structuredBrief,
            assumptions: (briefRow.assumptions as string[]) ?? [],
            openQuestions: (briefRow.open_questions as Array<Record<string, unknown>>) ?? [],
          });

          writeLine(controller, encoder, {
            type: "status",
            title: "Saving the plan",
            body: "Innova is storing the plan and unlocking the next workspace step.",
          });

          const { data: planRow, error: planError } = await supabase
            .from("program_plans")
            .insert({
              brief_id: activeBriefId,
              brief_version_id: null,
              organization_id: organizationId,
              workspace_id: selectedWorkspace.workspaceId,
              program_id: programId,
              created_by: user.id,
              status: planDraft.result.status,
              title: planDraft.result.planTitle,
              summary: planDraft.result.planSummary,
              plan_payload: json({ items: planDraft.result.items }),
              assumptions: json(planDraft.result.assumptions),
              approval_requirements: json(planDraft.result.approvalRequirements),
            })
            .select("id")
            .single();

          if (planError || !planRow) {
            throw new Error(planError?.message ?? "Unable to save the execution plan.");
          }

          const { error: itemError } = await supabase
            .from("program_plan_items")
            .insert(
              planDraft.result.items.map((item, index) => ({
                plan_id: planRow.id,
                item_key: item.itemKey,
                item_type: item.itemType,
                title: item.title,
                description: item.description,
                display_order: index + 1,
                requires_approval: item.requiresApproval,
                payload: json(item.payload),
              })),
            );

          if (itemError) {
            throw new Error(itemError.message);
          }

          await supabase
            .from("program_briefs")
            .update({ active_plan_id: planRow.id, status: "plan_generated" })
            .eq("id", activeBriefId);

          const nextStepGuidance = buildWorkspaceStageGuidance({
            sessionId: activeSessionId,
            stageKey: "plan",
            stageStatus: "draft_ready",
          });

          const { error: msgError } = await supabase.from("agent_messages").insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            plan_id: planRow.id,
            role: "assistant",
            kind: "plan_summary",
            content_text: planDraft.result.assistantMessage,
            content_payload: json({
              planTitle: planDraft.result.planTitle,
              planSummary: planDraft.result.planSummary,
              workspaceStage: "plan_in_progress",
              nextStepGuidance,
              primaryActionLabel: "Prepare approval packet",
            }),
            model_name: planDraft.model,
          });

          if (msgError) {
            throw new Error(msgError.message);
          }

          await persistSetupProgress({
            supabase,
            sessionId: activeSessionId,
            completedStage: "plan",
            artifactId: planRow.id,
            metadataPatch: {
              surface: "pm_create_workspace",
              brief_status: "plan_generated",
              active_plan_id: planRow.id,
              workspace_stage: "plan_in_progress",
              recommended_next_step: "Draft landing page",
            },
          });

          await runBestEffort(async () => {
            if (agentRunId) {
              await updateAgentRunStatus(supabase, {
                runId: agentRunId,
                status: "completed",
                summary: plannerDecision.completionSummary,
                runOutput: { planId: planRow.id, planTitle: planDraft.result.planTitle },
                completed: true,
              });
            }
            await persistPlannerStateMemory({
              supabase,
              sessionId: activeSessionId,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              briefId: activeBriefId,
              agentRunId,
              stage: "plan_in_progress",
              stageLabel: "Plan ready",
              stageTone: "green",
              openQuestionCount: 0,
              recommendationTitle: plannerDecision.recommendation.title,
              recommendationBody: plannerDecision.recommendation.body,
              recommendationActionLabel: plannerDecision.recommendation.primaryActionLabel,
            });
          });

          for (const chunk of chunkText(planDraft.result.assistantMessage)) {
            writeLine(controller, encoder, { type: "delta", text: chunk });
            await delay(16);
          }

          revalidatePath("/app/create");
          revalidatePath(`/app/create/${activeSessionId}/plan`);
          writeLine(controller, encoder, {
            type: "done",
            status: "plan-generated",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        // ── CONVERSATIONAL APPROVAL PREPARATION ─────────────────────────────
        if (shouldPrepareApprovals) {
          if (!briefRow.active_plan_id) {
            throw new Error(
              "A generated execution plan is required before approvals can be prepared.",
            );
          }

          writeLine(controller, encoder, {
            type: "status",
            title: "Preparing the approval packet",
            body: plannerDecision.runningSummary,
          });

          const [{ data: planRow, error: planError }, { data: planItems, error: itemsError }] =
            await Promise.all([
              supabase
                .from("program_plans")
                .select("id, title, summary, approval_requirements")
                .eq("id", briefRow.active_plan_id)
                .single(),
              supabase
                .from("program_plan_items")
                .select("item_key, item_type, title, description, requires_approval, payload, display_order")
                .eq("plan_id", briefRow.active_plan_id)
                .order("display_order", { ascending: true }),
            ]);

          if (planError || !planRow || itemsError) {
            throw new Error(
              planError?.message ?? itemsError?.message ?? "Unable to load the current plan.",
            );
          }

          const approvalItems = (planItems ?? []).filter((item) => item.requires_approval);

          if (approvalItems.length === 0) {
            throw new Error("This plan doesn't contain any items that require approval.");
          }

          const { data: approvalRequest, error: approvalError } = await supabase
            .from("approval_requests")
            .insert({
              brief_id: activeBriefId,
              plan_id: planRow.id,
              organization_id: organizationId,
              workspace_id: selectedWorkspace.workspaceId,
              program_id: programId,
              requested_by: user.id,
              status: "pending",
              title: `Approve ${planRow.title ?? "program execution plan"}`,
              summary:
                planRow.summary ??
                "Review the generated plan items and approve the controlled execution package.",
              risk_level: "medium",
              request_payload: json({ approvalRequirements: planRow.approval_requirements }),
            })
            .select("id")
            .single();

          if (approvalError || !approvalRequest) {
            throw new Error(approvalError?.message ?? "Unable to create the approval request.");
          }

          const { error: approvalItemsError } = await supabase
            .from("approval_request_items")
            .insert(
              approvalItems.map((item) => ({
                approval_request_id: approvalRequest.id,
                item_key: item.item_key,
                item_type: item.item_type,
                title: item.title,
                description: item.description,
                payload: item.payload,
                status: "pending",
              })),
            );

          if (approvalItemsError) {
            throw new Error(approvalItemsError.message);
          }

          await supabase
            .from("program_briefs")
            .update({ status: "ready_for_execution" })
            .eq("id", activeBriefId);

          const approvalMessage =
            `The approval packet is ready — ${approvalItems.length} governed ${approvalItems.length === 1 ? "item" : "items"} require your decision.\n\n` +
            approvalItems.map((item) => `- **${item.title}** (${item.item_type})`).join("\n") +
            `\n\nReview the packet above and approve to proceed with deterministic execution. You can request changes instead if anything needs adjustment first.`;
          const nextStepGuidance = buildWorkspaceStageGuidance({
            sessionId: activeSessionId,
            stageKey: "approval",
            stageStatus: "ready_for_review",
            approvalRequestId: approvalRequest.id,
          });

          const { error: msgError } = await supabase.from("agent_messages").insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            plan_id: planRow.id,
            role: "assistant",
            kind: "chat",
            content_text: approvalMessage,
            content_payload: json({
              workspaceStage: "approval_review",
              approvalRequestId: approvalRequest.id,
              approvalItemCount: approvalItems.length,
              nextStepGuidance,
              primaryActionLabel: "Review approvals",
            }),
          });

          if (msgError) {
            throw new Error(msgError.message);
          }

          await persistSetupProgress({
            supabase,
            sessionId: activeSessionId,
            completedStage: "approval",
            artifactId: approvalRequest.id,
            metadataPatch: {
              surface: "pm_create_workspace",
              workspace_stage: "approval_review",
              recommended_next_step: "Review and approve the packet",
            },
          });

          await runBestEffort(async () => {
            if (agentRunId) {
              await updateAgentRunStatus(supabase, {
                runId: agentRunId,
                status: "waiting_for_input",
                summary: plannerDecision.waitingSummary,
                runOutput: { approvalRequestId: approvalRequest.id },
              });
            }
            await persistPlannerStateMemory({
              supabase,
              sessionId: activeSessionId,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              briefId: activeBriefId,
              agentRunId,
              stage: "approval_review",
              stageLabel: "Ready to review",
              stageTone: "gold",
              openQuestionCount: 0,
              recommendationTitle: plannerDecision.recommendation.title,
              recommendationBody: plannerDecision.recommendation.body,
              recommendationActionLabel: plannerDecision.recommendation.primaryActionLabel,
            });
          });

          for (const chunk of chunkText(approvalMessage)) {
            writeLine(controller, encoder, { type: "delta", text: chunk });
            await delay(16);
          }

          revalidatePath("/app/create");
          revalidatePath(`/app/create/${activeSessionId}/approvals`);
          writeLine(controller, encoder, {
            type: "done",
            status: "approval-packet-ready",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        // ── LIVE PROGRAM OPERATIONS ──────────────────────────────────────────
        if (shouldLiveOpsChange && agentDecision?.liveOpsChange && programId) {
          const change = agentDecision.liveOpsChange;

          // Save the live ops proposal as an assistant message.
          // The PM must click "Apply" to execute — it is NOT auto-applied.
          const { error: msgError } = await supabase.from("agent_messages").insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            role: "assistant",
            kind: "chat",
            content_text: agentMessage,
            content_payload: json({
              workspaceStage: "live",
              liveOpsProposal: {
                programId,
                changeType: change.changeType,
                fieldPath: change.fieldPath,
                proposedValue: change.proposedValue,
                currentValue: change.currentValue,
                changeDescription: change.changeDescription,
              },
            }),
          });

          if (msgError) {
            throw new Error(msgError.message);
          }

          await supabase
            .from("agent_sessions")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", activeSessionId);

          for (const chunk of chunkText(agentMessage)) {
            writeLine(controller, encoder, { type: "delta", text: chunk });
            await delay(18);
          }

          revalidatePath("/app/create");
          writeLine(controller, encoder, {
            type: "done",
            status: "live-ops-proposed",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        // ── PROPOSE SEQUENCE ─────────────────────────────────────────────────
        if (shouldProposeSequence) {
          const proposalMessage = agentMessage;

          const { error: msgError } = await supabase.from("agent_messages").insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            role: "assistant",
            kind: "chat",
            content_text: proposalMessage,
            content_payload: json({
              workspaceStage: "brief_ready",
              buildProposal: {
                steps: [
                  { key: "plan", label: "Generate execution plan" },
                  { key: "landing_page", label: "Next: draft landing page" },
                  { key: "registration_form", label: "Then: draft registration form" },
                  { key: "submission_form", label: "Then: draft submission form" },
                  { key: "judging_setup", label: "Then: draft judging setup" },
                  { key: "approval_packet", label: "Then: prepare approval packet" },
                ],
              },
            }),
          });

          if (msgError) throw new Error(msgError.message);

          await supabase
            .from("agent_sessions")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", activeSessionId);

          for (const chunk of chunkText(proposalMessage)) {
            writeLine(controller, encoder, { type: "delta", text: chunk });
            await delay(18);
          }

          revalidatePath("/app/create");
          writeLine(controller, encoder, {
            type: "done",
            status: "build-proposed",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        // ── BUILD FULL PROGRAM ──────────────────────────────────────────────────
        // Triggered when PM clicks Accept on the proposal card.
        // Executes: plan → all assets → approval packet in one sequential stream.
        if (shouldBuildFullProgram) {
          const structuredBrief = (briefRow.current_brief as Record<string, unknown> | null) ?? null;

          if (!briefRow.title || !structuredBrief || Object.keys(structuredBrief).length === 0) {
            throw new Error("The brief needs more detail before the full program can be built.");
          }

          // ── Step 1: Generate execution plan ────────────────────────────────
          writeLine(controller, encoder, {
            type: "build_step",
            step: "plan",
            status: "running",
            label: "Building program structure",
          });

          const planDraft = await generateProgramPlanDraft(supabase, {
            workspaceName: selectedWorkspace.workspaceName,
            organizationName: selectedWorkspace.organizationName,
            briefTitle: briefRow.title,
            detectedProgramType: briefRow.detected_program_type,
            structuredBrief,
            assumptions: (briefRow.assumptions as string[]) ?? [],
            openQuestions: (briefRow.open_questions as Array<Record<string, unknown>>) ?? [],
          });

          const { data: planRow, error: planError } = await supabase
            .from("program_plans")
            .insert({
              brief_id: activeBriefId,
              brief_version_id: null,
              organization_id: organizationId,
              workspace_id: selectedWorkspace.workspaceId,
              program_id: programId,
              created_by: user.id,
              status: planDraft.result.status,
              title: planDraft.result.planTitle,
              summary: planDraft.result.planSummary,
              plan_payload: json({ items: planDraft.result.items }),
              assumptions: json(planDraft.result.assumptions),
              approval_requirements: json(planDraft.result.approvalRequirements),
            })
            .select("id")
            .single();

          if (planError || !planRow) throw new Error(planError?.message ?? "Unable to save the execution plan.");

          const { error: planItemError } = await supabase.from("program_plan_items").insert(
            planDraft.result.items.map((item, index) => ({
              plan_id: planRow.id,
              item_key: item.itemKey,
              item_type: item.itemType,
              title: item.title,
              description: item.description,
              display_order: index + 1,
              requires_approval: item.requiresApproval,
              payload: json(item.payload),
            })),
          );

          if (planItemError) throw new Error(planItemError.message);
          const planItemKeyByType = new Map(
            planDraft.result.items.map((item) => [item.itemType, item.itemKey]),
          );

          await supabase
            .from("program_briefs")
            .update({ active_plan_id: planRow.id, status: "plan_generated" })
            .eq("id", activeBriefId);

          writeLine(controller, encoder, {
            type: "build_step",
            step: "plan",
            status: "done",
            label: "Program structure ready",
          });

          // ── Step 2: Generate form & judging assets ──────────────────────────
          const assetLabels: Record<string, string> = {
            registration_form: "Registration form",
            submission_form: "Submission form",
            judging_setup: "Judging setup",
          };

          const stageDrafts: GeneratedAssetDraft[] = [];
          for (const target of ["registration_form", "submission_form", "judging_setup"] as const) {
            const generated = await generateStageAssetDraft(supabase, target, {
              workspaceName: selectedWorkspace.workspaceName,
              organizationName: selectedWorkspace.organizationName,
              briefTitle: briefRow.title,
              detectedProgramType: briefRow.detected_program_type,
              structuredBrief,
              planTitle: planDraft.result.planTitle,
              planSummary: planDraft.result.planSummary,
            });
            stageDrafts.push(generated.draft);
          }

          for (const draft of stageDrafts) {
            writeLine(controller, encoder, {
              type: "build_step",
              step: draft.artifactType,
              status: "running",
              label: `Building ${assetLabels[draft.artifactType] ?? draft.title}`,
            });

            await registerAgentArtifact(supabase, {
              sessionId: activeSessionId,
              runId: agentRunId,
              taskId: null,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              artifactType: draft.artifactType,
              status: "ready_for_review",
              sourceTable: "program_briefs",
              sourceId: activeBriefId ?? activeSessionId,
              title: draft.title,
              summary: draft.summary,
              artifactPayload: draft.payload,
              createdByRunId: agentRunId,
            });

            writeLine(controller, encoder, {
              type: "build_step",
              step: draft.artifactType,
              status: "done",
              label: `${assetLabels[draft.artifactType] ?? draft.title} ready`,
            });
          }

          // ── Step 3: Generate landing page first draft ───────────────────────
          writeLine(controller, encoder, {
            type: "build_step",
            step: "landing_page_draft",
            status: "running",
            label: "Drafting landing page",
          });

          const generatedLandingPage = await generateLandingPageAssetDraft(supabase, {
            workspaceName: selectedWorkspace.workspaceName,
            organizationName: selectedWorkspace.organizationName,
            briefTitle: briefRow.title,
            detectedProgramType: briefRow.detected_program_type,
            structuredBrief,
            planTitle: planDraft.result.planTitle,
            planSummary: planDraft.result.planSummary,
          });

          await registerAgentArtifact(supabase, {
            sessionId: activeSessionId,
            runId: agentRunId,
            taskId: null,
            organizationId,
            workspaceId: selectedWorkspace.workspaceId,
            programId,
            artifactType: "landing_page",
            status: "ready_for_review",
            sourceTable: "program_briefs",
            sourceId: activeBriefId ?? activeSessionId,
            title: generatedLandingPage.draft.title,
            summary: generatedLandingPage.draft.summary,
            artifactPayload: generatedLandingPage.draft.payload,
            createdByRunId: agentRunId,
          });

          writeLine(controller, encoder, {
            type: "build_step",
            step: "landing_page_draft",
            status: "done",
            label: "Landing page first draft ready",
          });

          // ── Step 4: Prepare approval packet ────────────────────────────────
          writeLine(controller, encoder, {
            type: "build_step",
            step: "approval_packet",
            status: "running",
            label: "Preparing review package",
          });

          const { data: freshPlanItems } = await supabase
            .from("program_plan_items")
            .select("item_key, item_type, title, description, requires_approval, payload")
            .eq("plan_id", planRow.id)
            .order("display_order", { ascending: true });

          const approvalItems = (freshPlanItems ?? []).filter((i) => i.requires_approval);

          if (approvalItems.length > 0) {
            const { data: approvalRequest } = await supabase
              .from("approval_requests")
              .insert({
                brief_id: activeBriefId,
                plan_id: planRow.id,
                organization_id: organizationId,
                workspace_id: selectedWorkspace.workspaceId,
                program_id: programId,
                requested_by: user.id,
                status: "pending",
                title: `Approve ${planDraft.result.planTitle ?? "program setup"}`,
                summary: planDraft.result.planSummary ?? "Review the program items and confirm to proceed.",
                risk_level: "medium",
                request_payload: json({ approvalRequirements: planDraft.result.approvalRequirements }),
              })
              .select("id")
              .single();

            if (approvalRequest) {
              await supabase.from("approval_request_items").insert(
                approvalItems.map((item) => ({
                  approval_request_id: approvalRequest.id,
                  item_key: item.item_key,
                  item_type: item.item_type,
                  title: item.title,
                  description: item.description,
                  payload: item.payload,
                  status: "pending",
                })),
              );
            }

            await supabase
              .from("program_briefs")
              .update({ status: "ready_for_execution" })
              .eq("id", activeBriefId);
          }

          writeLine(controller, encoder, {
            type: "build_step",
            step: "approval_packet",
            status: "done",
            label: "Review package ready",
          });

          // ── Final summary message ───────────────────────────────────────────
          const summaryMessage = [
            `Everything is built for ${briefRow.title ?? "your program"}.`,
            "",
            "Your landing page has a first draft ready — open the editor to refine it with me before confirming.",
            "",
            "When you're happy with the page, click **Confirm & Apply** to provision your live program.",
          ].join("\n");

          await supabase.from("agent_messages").insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            plan_id: planRow.id,
            role: "assistant",
            kind: "chat",
            content_text: summaryMessage,
            content_payload: json({
              workspaceStage: "plan_in_progress",
              buildComplete: true,
              planId: planRow.id,
              primaryActionLabel: "Confirm & Apply",
              launchKitReady: {
                title: "Launch kit ready",
                body: "Review each generated workstream, refine the drafts with Innova, then move into the governed approval packet.",
                items: [
                  {
                    key: "execution_plan",
                    label: "Review execution plan",
                    description: "Milestones, dependencies, approval gates, and launch sequence.",
                    kind: "plan",
                  },
                  {
                    key: "landing_page",
                    label: "Edit landing page",
                    description: "Public landing page copy and page structure.",
                    kind: "asset",
                    assetKey: planItemKeyByType.get("landing_page") ?? null,
                  },
                  {
                    key: "registration_form",
                    label: "Edit registration form",
                    description: "Participant intake, eligibility, and team fields.",
                    kind: "asset",
                    assetKey: planItemKeyByType.get("registration_form") ?? null,
                  },
                  {
                    key: "submission_form",
                    label: "Edit submission form",
                    description: "Project submission fields and judging-ready evidence.",
                    kind: "asset",
                    assetKey: planItemKeyByType.get("submission_form") ?? null,
                  },
                  {
                    key: "judging_setup",
                    label: "Review judging setup",
                    description: "Rounds, criteria, scoring guidance, and panel readiness.",
                    kind: "asset",
                    assetKey: planItemKeyByType.get("judging_setup") ?? null,
                  },
                  {
                    key: "approval_packet",
                    label: "Review approvals",
                    description: "Governed approval packet before deterministic execution.",
                    kind: "approvals",
                  },
                ],
              },
            }),
          });

          await supabase
            .from("agent_sessions")
            .update({
              last_message_at: new Date().toISOString(),
              session_metadata: json({
                surface: "pm_create_workspace",
                workspace_stage: "plan_in_progress",
                build_complete: true,
              }),
            })
            .eq("id", activeSessionId);

          for (const chunk of chunkText(summaryMessage)) {
            writeLine(controller, encoder, { type: "delta", text: chunk });
            await delay(16);
          }

          revalidatePath("/app/create");
          revalidatePath(`/app/create/${activeSessionId}/assets`);
          writeLine(controller, encoder, {
            type: "done",
            status: "program-built",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        if (!shouldGenerateBrief) {
          const nextStepGuidance = buildWorkspaceStageGuidance({
            sessionId: activeSessionId,
            stageKey:
              plannerDecision.stage === "brief_ready"
                ? "brief"
                : plannerDecision.stage === "approval_review"
                  ? "approval"
                  : plannerDecision.stage === "execution_ready"
                    ? "execution"
                    : "workspace",
            stageStatus:
              plannerDecision.stage === "brief_ready"
                ? "draft_ready"
                : plannerDecision.stage === "execution_ready"
                  ? "ready_to_execute"
                  : "ready_for_review",
            openQuestionCount: gatingOpenQuestionCount,
          });
          const recommendationPayload = {
            plannerIntent: plannerDecision.intent,
            workspaceStage: plannerDecision.stage,
            primaryActionLabel: plannerDecision.recommendation.primaryActionLabel,
            stageLabel: plannerDecision.recommendation.stageLabel,
            stageTone: plannerDecision.recommendation.stageTone,
            blockingOpenInputCount:
              plannerDecision.recommendation.blockingOpenInputCount,
            nextStepGuidance,
          };

          await supabase.from("agent_messages").insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            role: "assistant",
            kind: "chat",
            // Use the agent's natural-language message when available,
            // fall back to the planner's templated recommendation.
            content_text: agentMessage,
            content_payload: json(recommendationPayload),
          });

          await supabase
            .from("agent_sessions")
            .update({
              last_message_at: new Date().toISOString(),
              session_metadata: json({
                surface: "pm_create_workspace",
                workspace_stage: plannerDecision.stage,
                recommended_next_step:
                  plannerDecision.recommendation.primaryActionLabel,
              }),
            })
            .eq("id", activeSessionId);

          await runBestEffort(async () => {
            if (recommendationTaskId) {
              await updateAgentTaskStatus(supabase, {
                taskId: recommendationTaskId,
                status: "completed",
                started: true,
                completed: true,
                outputPayload: recommendationPayload,
              });
            }

            const { stageMemoryId, recommendationMemoryId } =
              await persistPlannerStateMemory({
                supabase,
                sessionId: activeSessionId,
                organizationId,
                workspaceId: selectedWorkspace.workspaceId,
                programId,
                briefId: activeBriefId,
                agentRunId,
                stage: plannerDecision.stage,
                stageLabel: plannerDecision.recommendation.stageLabel,
                stageTone: plannerDecision.recommendation.stageTone,
                openQuestionCount: gatingOpenQuestionCount,
                recommendationTitle: plannerDecision.recommendation.title,
                recommendationBody: plannerDecision.recommendation.body,
                recommendationActionLabel:
                  plannerDecision.recommendation.primaryActionLabel,
              });

            if (updateMemoryTaskId) {
              await updateAgentTaskStatus(supabase, {
                taskId: updateMemoryTaskId,
                status: "completed",
                started: true,
                completed: true,
                outputPayload: {
                  stageMemoryId,
                  recommendationMemoryId,
                },
              });
            }
          });

          for (const chunk of chunkText(agentMessage)) {
            writeLine(controller, encoder, {
              type: "delta",
              text: chunk,
            });
            await delay(18);
          }

          revalidatePath("/app/create");
          writeLine(controller, encoder, {
            type: "done",
            status: "workspace-guidance",
            sessionId: activeSessionId,
            workspaceId: selectedWorkspace.workspaceId,
          });
          controller.close();
          return;
        }

        await runBestEffort(async () => {
          if (agentRunId && draftBriefTaskId) {
            await updateAgentRunStatus(supabase, {
              runId: agentRunId,
              status: "running",
              currentTaskId: draftBriefTaskId,
              summary: plannerDecision.runningSummary,
            });

            await updateAgentTaskStatus(supabase, {
              taskId: draftBriefTaskId,
              status: "running",
              started: true,
            });

            const toolCall = await recordAgentToolCall(supabase, {
              runId: agentRunId,
              taskId: draftBriefTaskId,
              sessionId: activeSessionId,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              toolName: "draft_program_brief",
              inputPayload: {
                briefId: activeBriefId,
                latestUserMessage: parsed.data.message,
                plannerIntent: plannerDecision.intent,
              },
            });
            draftBriefToolCallId = toolCall.id;
          }
        });

        writeLine(controller, encoder, {
          type: "status",
          title: "Drafting the brief",
          body: plannerDecision.runningSummary,
        });

        const aiRequestId = await createAiRequestLog({
          featureKey: "pm_agent_brief_generation",
          requestedBy: user.id,
          organizationId,
          workspaceId: selectedWorkspace.workspaceId,
          programId,
          requestPayload: json({
            message: parsed.data.message,
            session_id: activeSessionId,
            brief_id: activeBriefId,
          }),
        });

        const currentAssumptions = Array.isArray(briefRow.assumptions)
          ? (briefRow.assumptions as string[]).filter(
              (assumption): assumption is string => typeof assumption === "string",
            )
          : [];
        const currentOpenQuestions = Array.isArray(briefRow.open_questions)
          ? (briefRow.open_questions as Array<Record<string, unknown>>)
          : [];
        const conversation = (messageRows ?? [])
          .filter((message) => message.content_text)
          .map((message) => ({
            role:
              message.role === "tool"
                ? "system"
                : (message.role as "user" | "assistant" | "system"),
            content: message.content_text as string,
          }));

        phase = hasBriefContent ? "draft_brief_delta" : "draft_initial_brief";
        const briefDraft = hasBriefContent
          ? await (async () => {
              const delta = await extractProgramBriefDelta(supabase, {
                workspaceName: selectedWorkspace.workspaceName,
                organizationName: selectedWorkspace.organizationName,
                currentBrief: briefRow.current_brief as Record<string, unknown>,
                assumptions: currentAssumptions,
                openQuestions: currentOpenQuestions,
                conversationContext: conversation.slice(-4),
                latestUserMessage: parsed.data.message,
                briefTitle: briefRow.title,
                detectedProgramType: briefRow.detected_program_type,
              });

              return {
                result: applyProgramBriefDelta({
                  currentBrief: briefRow.current_brief as Record<string, unknown>,
                  currentAssumptions,
                  currentOpenQuestions,
                  currentTitle: briefRow.title,
                  currentDetectedProgramType: briefRow.detected_program_type,
                  delta: delta.result,
                }),
                model: delta.model,
                usage: delta.usage,
              };
            })()
          : await generateProgramBriefDraft(supabase, {
              workspaceName: selectedWorkspace.workspaceName,
              organizationName: selectedWorkspace.organizationName,
              currentBrief: null,
              assumptions: currentAssumptions,
              openQuestions: currentOpenQuestions,
              conversation,
              latestUserMessage: parsed.data.message,
            });

        writeLine(controller, encoder, {
          type: "status",
          title: "Saving the brief",
          body: "Innova is validating the structured output and updating the governed workspace state.",
        });

        phase = "load_latest_brief_version";
        const { data: latestVersion } = await supabase
          .from("program_brief_versions")
          .select("version_number")
          .eq("brief_id", activeBriefId)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersion = (latestVersion?.version_number ?? 0) + 1;

        phase = "save_brief_version";
        const { data: versionRow, error: versionError } = await supabase
          .from("program_brief_versions")
          .insert({
            brief_id: activeBriefId,
            version_number: nextVersion,
            created_by: user.id,
            source: "chat",
            structured_brief: json(briefDraft.result.structuredBrief),
            assumptions: json(briefDraft.result.assumptions),
            open_questions: json(briefDraft.result.openQuestions),
            confidence_level: briefDraft.result.confidenceLevel,
          })
          .select("id")
          .single();

        if (versionError || !versionRow) {
          throw new Error(
            versionError?.message ?? "Unable to save the brief version.",
          );
        }

        phase = "update_program_brief";
        const { error: briefUpdateError } = await supabase
          .from("program_briefs")
          .update({
            title: briefDraft.result.briefTitle,
            detected_program_type: briefDraft.result.detectedProgramType,
            status: briefDraft.result.status,
            confidence_level: briefDraft.result.confidenceLevel,
            current_brief: json(briefDraft.result.structuredBrief),
            assumptions: json(briefDraft.result.assumptions),
            open_questions: json(briefDraft.result.openQuestions),
            active_version_id: versionRow.id,
          })
          .eq("id", activeBriefId);

        if (briefUpdateError) {
          throw new Error(briefUpdateError.message);
        }

        const nextOpenQuestionCount = briefDraft.result.openQuestions.length;
        const nextRecommendation = buildPmStageRecommendation({
          stage:
            nextOpenQuestionCount > 0 ? "brief_clarification" : "brief_ready",
          openQuestionCount: nextOpenQuestionCount,
        });
        const briefActionProposal =
          nextOpenQuestionCount === 0
            ? {
                kind: "accept_build",
                title: "Brief ready",
                body: "Review the captured changes, then generate the execution plan as the next governed stage.",
                primaryLabel: "Generate plan",
                secondaryLabel: "Make changes",
                steps: [
                  { key: "plan", label: "Generate execution plan" },
                  { key: "landing_page", label: "Next: draft landing page" },
                  { key: "registration", label: "Then: draft registration form" },
                  { key: "submission", label: "Then: draft submission form" },
                  { key: "judging", label: "Then: draft judging setup" },
                ],
              }
            : {
                kind: "confirm_updates",
                title: "Brief updated",
                body: `${nextOpenQuestionCount} ${nextOpenQuestionCount === 1 ? "answer is" : "answers are"} still needed before Innova can build the launch kit.`,
                primaryLabel: "Confirm & Apply",
                secondaryLabel: "Make changes",
              };
        const nextStepGuidance = buildWorkspaceStageGuidance({
          sessionId: activeSessionId,
          stageKey: "brief",
          stageStatus: nextOpenQuestionCount === 0 ? "draft_ready" : "needs_input",
          openQuestionCount: nextOpenQuestionCount,
        });

        phase = "persist_assistant_message";
        const { error: assistantMessageError } = await supabase
          .from("agent_messages")
          .insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            role: "assistant",
            kind:
              briefDraft.result.openQuestions.length > 0
                ? "question"
                : "brief_update",
            content_text: briefDraft.result.assistantMessage,
            content_payload: json({
              briefStatus: briefDraft.result.status,
              confidenceLevel: briefDraft.result.confidenceLevel,
              structuredBrief: briefDraft.result.structuredBrief,
              assumptions: briefDraft.result.assumptions,
              openQuestions: briefDraft.result.openQuestions,
              workspaceStage:
                nextOpenQuestionCount > 0 ? "brief_clarification" : "brief_ready",
              nextStepGuidance,
              briefActionProposal,
            }),
            model_name: briefDraft.model,
          });

        if (assistantMessageError) {
          throw new Error(assistantMessageError.message);
        }

        if (nextOpenQuestionCount === 0) {
          const currentMetadata = await loadSessionMetadata({
            supabase,
            sessionId: activeSessionId,
          });
          const setupProgress = advanceSetupProgress(
            readSetupProgress(currentMetadata),
            "brief",
            { artifactId: versionRow.id },
          );
          await supabase
            .from("agent_sessions")
            .update({
              brief_id: activeBriefId,
              title: briefDraft.result.sessionTitle,
              last_message_at: new Date().toISOString(),
              session_metadata: json({
                ...mergeSetupProgressIntoMetadata(currentMetadata, setupProgress),
                surface: "pm_create_workspace",
                brief_status: briefDraft.result.status,
                confidence_level: briefDraft.result.confidenceLevel,
                recommended_next_step: "Generate execution plan",
              }),
            })
            .eq("id", activeSessionId);
        } else {
          await supabase
            .from("agent_sessions")
            .update({
              brief_id: activeBriefId,
              title: briefDraft.result.sessionTitle,
              last_message_at: new Date().toISOString(),
              session_metadata: json({
                ...mergeSetupProgressIntoMetadata(
                  await loadSessionMetadata({ supabase, sessionId: activeSessionId }),
                  createInitialSetupProgress(),
                ),
                surface: "pm_create_workspace",
                brief_status: briefDraft.result.status,
                confidence_level: briefDraft.result.confidenceLevel,
              }),
            })
            .eq("id", activeSessionId);
        }

        await finalizeAiRequestLog({
          aiRequestId,
          featureKey: "pm_agent_brief_generation",
          outputPayload: json({
            brief: briefDraft.result,
          }),
          status: "generated",
          workspaceId: selectedWorkspace.workspaceId,
          organizationId,
          programId,
          modelName: briefDraft.model,
          tokenCount:
            briefDraft.usage?.total_tokens ??
            ((briefDraft.usage?.input_tokens ?? 0) +
              (briefDraft.usage?.output_tokens ?? 0)),
        });

        await runBestEffort(async () => {
          if (draftBriefToolCallId) {
            await completeAgentToolCall(supabase, {
              toolCallId: draftBriefToolCallId,
              status: "completed",
              outputPayload: {
                briefStatus: briefDraft.result.status,
                confidenceLevel: briefDraft.result.confidenceLevel,
                briefTitle: briefDraft.result.briefTitle,
                openQuestionCount: briefDraft.result.openQuestions.length,
              },
              startedAt: draftBriefToolStartedAt,
            });
          }

          if (draftBriefTaskId) {
            await updateAgentTaskStatus(supabase, {
              taskId: draftBriefTaskId,
              status: "completed",
              completed: true,
              outputPayload: {
                briefStatus: briefDraft.result.status,
                activeVersionId: versionRow.id,
              },
            });
          }

          if (validateBriefTaskId) {
            await updateAgentTaskStatus(supabase, {
              taskId: validateBriefTaskId,
              status: "completed",
              started: true,
              completed: true,
              outputPayload: {
                readyForPlan:
                  briefDraft.result.status === "ready_for_plan",
                confidenceLevel: briefDraft.result.confidenceLevel,
                openQuestionCount: briefDraft.result.openQuestions.length,
              },
            });
          }

          await registerAgentArtifact(supabase, {
            sessionId: activeSessionId,
            runId: agentRunId,
            taskId: draftBriefTaskId,
            organizationId,
            workspaceId: selectedWorkspace.workspaceId,
            programId,
            artifactType: "brief",
            status:
              briefDraft.result.openQuestions.length > 0
                ? "draft"
                : "ready_for_review",
            sourceTable: "program_brief_versions",
            sourceId: versionRow.id,
            versionLabel: `v${nextVersion}`,
            title: briefDraft.result.briefTitle,
            summary: briefDraft.result.assistantMessage,
            artifactPayload: {
              confidenceLevel: briefDraft.result.confidenceLevel,
              briefStatus: briefDraft.result.status,
            },
            createdByRunId: agentRunId,
          });

          const summaryMemoryId = await upsertAgentMemory(supabase, {
            sessionId: activeSessionId,
            organizationId,
            workspaceId: selectedWorkspace.workspaceId,
            programId,
            artifactType: "brief",
            artifactSourceTable: "program_briefs",
            artifactSourceId: activeBriefId,
            memoryScope: "session",
            memoryKey: "pm_workspace_brief_summary",
            summary: briefDraft.result.assistantMessage,
            memoryPayload: {
              briefTitle: briefDraft.result.briefTitle,
              briefStatus: briefDraft.result.status,
              confidenceLevel: briefDraft.result.confidenceLevel,
              assumptions: briefDraft.result.assumptions,
            },
            confidence:
              briefDraft.result.confidenceLevel === "high"
                ? "high"
                : "medium",
            sourceType: "tool_output",
            sourceRunId: agentRunId,
          });

          const questionMemoryId = await upsertAgentMemory(supabase, {
            sessionId: activeSessionId,
            organizationId,
            workspaceId: selectedWorkspace.workspaceId,
            programId,
            artifactType: "brief",
            artifactSourceTable: "program_briefs",
            artifactSourceId: activeBriefId,
            memoryScope: "session",
            memoryKey: "pm_workspace_open_questions",
            summary:
              briefDraft.result.openQuestions.length > 0
                ? "The PM workspace still has unresolved questions before the next stage."
                : "The PM workspace currently has no material unresolved questions.",
            memoryPayload: {
              openQuestions: briefDraft.result.openQuestions,
            },
            confidence: "medium",
            sourceType: "tool_output",
            sourceRunId: agentRunId,
          });

          const { stageMemoryId, recommendationMemoryId } =
            await persistPlannerStateMemory({
              supabase,
              sessionId: activeSessionId,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              briefId: activeBriefId,
              agentRunId,
              stage:
                nextOpenQuestionCount > 0
                  ? "brief_clarification"
                  : "brief_ready",
              stageLabel: nextRecommendation.stageLabel,
              stageTone: nextRecommendation.stageTone,
              openQuestionCount: nextOpenQuestionCount,
              recommendationTitle: nextRecommendation.title,
              recommendationBody: nextRecommendation.body,
              recommendationActionLabel:
                nextRecommendation.primaryActionLabel,
            });

          if (updateMemoryTaskId) {
            await updateAgentTaskStatus(supabase, {
              taskId: updateMemoryTaskId,
              status: "completed",
              started: true,
              completed: true,
              outputPayload: {
                summaryMemoryId,
                questionMemoryId,
                stageMemoryId,
                recommendationMemoryId,
              },
            });
          }

          if (recommendationTaskId) {
            await updateAgentTaskStatus(supabase, {
              taskId: recommendationTaskId,
              status: "completed",
              started: true,
              completed: true,
              outputPayload: {
                title: nextRecommendation.title,
                body: nextRecommendation.body,
                primaryActionLabel: nextRecommendation.primaryActionLabel,
                stageLabel: nextRecommendation.stageLabel,
              },
            });
          }

          if (agentRunId) {
            await updateAgentRunStatus(supabase, {
              runId: agentRunId,
              status:
                nextOpenQuestionCount > 0 ? "waiting_for_input" : "completed",
              currentTaskId: recommendationTaskId ?? updateMemoryTaskId,
              summary:
                nextOpenQuestionCount > 0
                  ? plannerDecision.waitingSummary
                  : plannerDecision.completionSummary,
              runOutput: {
                briefId: activeBriefId,
                briefVersionId: versionRow.id,
                briefStatus: briefDraft.result.status,
                primaryActionLabel: nextRecommendation.primaryActionLabel,
              },
              completed: nextOpenQuestionCount === 0,
            });
          }
        });

        for (const chunk of chunkText(briefDraft.result.assistantMessage)) {
          writeLine(controller, encoder, {
            type: "delta",
            text: chunk,
          });
          await delay(16);
        }

        revalidatePath("/app/create");
        writeLine(controller, encoder, {
          type: "done",
          status:
            briefDraft.result.status === "ready_for_plan"
              ? "brief-ready"
              : "brief-updated",
          sessionId: activeSessionId,
          workspaceId: selectedWorkspace.workspaceId,
        });
        controller.close();
      } catch (error) {
        const message = getErrorMessage(error);
        const stack = getErrorStack(error);

        console.error("[pm-workspace-chat] request failed", {
          traceId,
          phase,
          sessionId,
          briefId,
          workspaceId: selectedWorkspace.workspaceId,
          organizationId,
          programId,
          userId: user.id,
          message,
          stack,
        });

        const failedSessionId = sessionId;
        if (failedSessionId) {
          await runBestEffort(async () => {
            await recordAgentEvent(supabase, {
              sessionId: failedSessionId,
              organizationId,
              workspaceId: selectedWorkspace.workspaceId,
              programId,
              eventType: "run_failed",
              severity: "critical",
              title: "Workspace message failed",
              body: `A workspace message failed while processing. Reference: ${traceId}.`,
              eventPayload: {
                traceId,
                phase,
                briefId,
                errorCategory: "workspace_message_failed",
              },
              visibleToUser: true,
            });
          });
        }

        writeLine(controller, encoder, {
          type: "error",
          traceId,
          sessionId: sessionId ?? undefined,
          workspaceId: selectedWorkspace.workspaceId,
          message: `Innova couldn't process the last message. Reference: ${traceId}.`,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Innovink-Trace-Id": traceId,
    },
  });
}

function chunkText(text: string) {
  const chunks: string[] = [];
  let index = 0;

  while (index < text.length) {
    const next = Math.min(text.length, index + 28);
    chunks.push(text.slice(index, next));
    index = next;
  }

  return chunks;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
