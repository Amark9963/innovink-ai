import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildPmStageRecommendation,
  planPmWorkspaceRun,
} from "@/lib/agent-runtime/planner";
import { buildLaunchKitAssetDrafts } from "@/lib/ai/program-launch-kit";
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
import { generateProgramBriefDraft } from "@/lib/ai/program-agent";
import type { Json } from "@/lib/supabase/database.types";
import {
  getCurrentUserOrNull,
  getWorkspaceAccessRows,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  workspaceId: z.uuid(),
  sessionId: z.uuid().optional().nullable(),
  message: z.string().trim().min(8).max(3000),
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
      sessionId?: string;
      workspaceId?: string;
    };

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
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

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      let sessionId = parsed.data.sessionId ?? null;
      let briefId: string | null = null;
      let organizationId = selectedWorkspace.organizationId;
      let programId: string | null = null;

      try {
        if (!sessionId) {
          const { data: brief, error: briefError } = await supabase
            .from("program_briefs")
            .insert({
              organization_id: organizationId,
              workspace_id: selectedWorkspace.workspaceId,
              created_by: user.id,
              source: "chat",
              status: "collecting_requirements",
              confidence_level: "medium",
            })
            .select("id")
            .single();

          if (briefError || !brief) {
            throw new Error(
              briefError?.message ?? "Unable to create the program brief.",
            );
          }

          briefId = brief.id;

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

        writeLine(controller, encoder, {
          type: "session",
          sessionId: activeSessionId,
          workspaceId: selectedWorkspace.workspaceId,
        });

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
        const plannerDecision = planPmWorkspaceRun({
          message: parsed.data.message,
          currentBrief: briefRow.current_brief,
          openQuestionCount,
          hasPlan: Boolean(briefRow.active_plan_id),
          hasPendingApproval,
          isApproved,
        });

        let agentRunId: string | null = null;
        let draftBriefTaskId: string | null = null;
        let validateBriefTaskId: string | null = null;
        let updateMemoryTaskId: string | null = null;
        let recommendationTaskId: string | null = null;
        let draftBriefToolCallId: string | null = null;
        const draftBriefToolStartedAt = new Date();

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
            executorModel: plannerDecision.shouldGenerateBrief
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

        if (plannerDecision.shouldGenerateAssets) {
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

          const { drafts, targets } = buildLaunchKitAssetDrafts({
            message: parsed.data.message,
            brief: {
              title: briefRow.title,
              detectedProgramType: briefRow.detected_program_type,
              currentBrief:
                (briefRow.current_brief as Record<string, unknown> | null) ?? null,
            },
            plan: {
              title: planRow.title,
              summary: planRow.summary,
            },
          });

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
                openQuestionCount,
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

        if (!plannerDecision.shouldGenerateBrief) {
          const recommendationPayload = {
            plannerIntent: plannerDecision.intent,
            workspaceStage: plannerDecision.stage,
            primaryActionLabel: plannerDecision.recommendation.primaryActionLabel,
            stageLabel: plannerDecision.recommendation.stageLabel,
            stageTone: plannerDecision.recommendation.stageTone,
            blockingOpenInputCount:
              plannerDecision.recommendation.blockingOpenInputCount,
          };

          await supabase.from("agent_messages").insert({
            session_id: activeSessionId,
            brief_id: activeBriefId,
            role: "assistant",
            kind: "chat",
            content_text: plannerDecision.recommendation.body,
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
                openQuestionCount,
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

          for (const chunk of chunkText(plannerDecision.recommendation.body)) {
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

        const briefDraft = await generateProgramBriefDraft(supabase, {
          workspaceName: selectedWorkspace.workspaceName,
          organizationName: selectedWorkspace.organizationName,
          currentBrief:
            (briefRow.current_brief as Record<string, unknown> | null) ?? null,
          assumptions: briefRow.assumptions as string[],
          openQuestions: briefRow.open_questions as Array<Record<string, unknown>>,
          conversation: (messageRows ?? [])
            .filter((message) => message.content_text)
            .map((message) => ({
              role:
                message.role === "tool"
                  ? "system"
                  : (message.role as "user" | "assistant" | "system"),
              content: message.content_text as string,
            })),
          latestUserMessage: parsed.data.message,
        });

        writeLine(controller, encoder, {
          type: "status",
          title: "Saving the brief",
          body: "Innova is validating the structured output and updating the governed workspace state.",
        });

        const { data: latestVersion } = await supabase
          .from("program_brief_versions")
          .select("version_number")
          .eq("brief_id", activeBriefId)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersion = (latestVersion?.version_number ?? 0) + 1;

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
            }),
            model_name: briefDraft.model,
          });

        if (assistantMessageError) {
          throw new Error(assistantMessageError.message);
        }

        await supabase
          .from("agent_sessions")
          .update({
            brief_id: activeBriefId,
            title: briefDraft.result.sessionTitle,
            last_message_at: new Date().toISOString(),
            session_metadata: json({
              surface: "pm_create_workspace",
              brief_status: briefDraft.result.status,
              confidence_level: briefDraft.result.confidenceLevel,
            }),
          })
          .eq("id", activeSessionId);

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

        const nextOpenQuestionCount = briefDraft.result.openQuestions.length;
        const nextRecommendation = buildPmStageRecommendation({
          stage:
            nextOpenQuestionCount > 0 ? "brief_clarification" : "brief_ready",
          openQuestionCount: nextOpenQuestionCount,
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
        const message =
          error instanceof Error
            ? error.message
            : "The PM agent could not process that request.";
        writeLine(controller, encoder, {
          type: "error",
          message,
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
