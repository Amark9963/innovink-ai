"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  generateProgramBriefDraft,
  generateProgramPlanDraft,
} from "@/lib/ai/program-agent";
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
import {
  buildPmStageRecommendation,
  planPmWorkspaceRun,
} from "@/lib/agent-runtime/planner";
import { executePmWorkspacePlanStep } from "@/lib/execution/pm-workspace";
import type { Json } from "@/lib/supabase/database.types";
import {
  getCurrentUserOrNull,
  getWorkspaceAccessRows,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSlugOrThrow } from "@/lib/utils/slugs";

const sendMessageSchema = z.object({
  workspaceId: z.uuid(),
  sessionId: z.uuid().optional(),
  message: z.string().trim().min(8).max(3000),
});

const sessionOnlySchema = z.object({
  sessionId: z.uuid(),
  redirectTo: z.enum(["create", "plan", "approvals"]).optional(),
});

const approvalDecisionSchema = z.object({
  sessionId: z.uuid(),
  approvalRequestId: z.uuid(),
  decision: z.enum(["approved", "rejected"]),
  redirectTo: z.enum(["create", "approvals", "execution"]).optional(),
});

const executeSchema = z.object({
  sessionId: z.uuid(),
  approvalRequestId: z.uuid(),
  redirectTo: z.enum(["create", "execution"]).optional(),
});

function buildCreateRoute({
  sessionId,
  workspaceId,
  status,
  error,
}: {
  sessionId?: string | null;
  workspaceId?: string | null;
  status?: string | null;
  error?: string | null;
}) {
  const params = new URLSearchParams();

  if (sessionId) {
    params.set("session", sessionId);
  }

  if (workspaceId) {
    params.set("workspace", workspaceId);
  }

  if (status) {
    params.set("status", status);
  }

  if (error) {
    params.set("error", error);
  }

  const query = params.toString();
  return `/app/create${query ? `?${query}` : ""}`;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function runBestEffort(task: () => Promise<void>) {
  try {
    await task();
  } catch (error) {
    console.error("Non-blocking agent runtime trace failure", error);
  }
}

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function insertAssistantErrorMessage(
  sessionId: string,
  briefId: string | null,
  contentText: string,
) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("agent_messages").insert({
    session_id: sessionId,
    brief_id: briefId,
    role: "assistant",
    kind: "chat",
    content_text: contentText,
    content_payload: toJson({
      state: "error",
    }),
  });
  await supabase
    .from("agent_sessions")
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

async function resolveWorkspaceContext(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const workspaces = await getWorkspaceAccessRows(supabase, user);
  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.workspaceId === workspaceId,
  );

  if (!selectedWorkspace) {
    redirect(
      buildCreateRoute({
        workspaceId,
        error: "You do not have access to that workspace.",
      }),
    );
  }

  return {
    supabase,
    user,
    selectedWorkspace,
  };
}

async function resolveSessionContext(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const { data: session, error: sessionError } = await supabase
    .from("agent_sessions")
    .select(
      "id, brief_id, organization_id, workspace_id, program_id, title, status, session_metadata",
    )
    .eq("id", sessionId)
    .eq("created_by", user.id)
    .single();

  if (sessionError || !session) {
    redirect(
      buildCreateRoute({
        error: "That agent workspace could not be found.",
      }),
    );
  }

  const workspaces = await getWorkspaceAccessRows(supabase, user);
  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.workspaceId === session.workspace_id,
  );

  if (!selectedWorkspace) {
    redirect(
      buildCreateRoute({
        error: "You no longer have access to this agent workspace.",
      }),
    );
  }

  return {
    supabase,
    user,
    session,
    selectedWorkspace,
  };
}

function getBriefObjective(brief: unknown) {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    return null;
  }

  const value = (brief as Record<string, unknown>).objective;
  return typeof value === "string" ? value : null;
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

export async function sendCreateAgentMessageAction(formData: FormData) {
  const parsed = sendMessageSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    sessionId: formData.get("sessionId") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    redirect(
      buildCreateRoute({
        workspaceId: String(formData.get("workspaceId") ?? ""),
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
      }),
    );
  }

  const { supabase, user, selectedWorkspace } = await resolveWorkspaceContext(
    parsed.data.workspaceId,
  );

  let sessionId = parsed.data.sessionId ?? null;
  let briefId: string | null = null;
  let organizationId = selectedWorkspace.organizationId;
  let programId: string | null = null;

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
      redirect(
        buildCreateRoute({
          workspaceId: selectedWorkspace.workspaceId,
          error: briefError?.message ?? "Unable to create the program brief.",
        }),
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
        session_metadata: toJson({
          surface: "pm_create_workspace",
        }),
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      redirect(
        buildCreateRoute({
          workspaceId: selectedWorkspace.workspaceId,
          error: sessionError?.message ?? "Unable to create the agent workspace.",
        }),
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
      redirect(
        buildCreateRoute({
          workspaceId: selectedWorkspace.workspaceId,
          error: "The selected agent workspace is no longer available.",
        }),
      );
    }

    briefId = session.brief_id;
    organizationId = session.organization_id ?? selectedWorkspace.organizationId;
    programId = session.program_id;
  }

  if (!briefId || !sessionId) {
    redirect(
      buildCreateRoute({
        workspaceId: selectedWorkspace.workspaceId,
        error: "The PM agent workspace could not be initialized.",
      }),
    );
  }

  const { error: userMessageError } = await supabase.from("agent_messages").insert({
    session_id: sessionId,
    brief_id: briefId,
    actor_user_id: user.id,
    role: "user",
    kind: "chat",
    content_text: parsed.data.message,
      content_payload: {
        source: "pm_chat",
      },
  });

  if (userMessageError) {
    redirect(
      buildCreateRoute({
        sessionId,
        workspaceId: selectedWorkspace.workspaceId,
        error: userMessageError.message,
      }),
    );
  }

  await supabase
    .from("agent_sessions")
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

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
      .eq("id", briefId)
      .single(),
    supabase
      .from("agent_messages")
      .select("role, content_text")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(14),
    supabase
      .from("approval_requests")
      .select("status")
      .eq("brief_id", briefId)
      .order("requested_at", { ascending: false })
      .limit(8),
  ]);

  if (briefError || !briefRow || historyError || approvalError) {
    redirect(
      buildCreateRoute({
        sessionId,
        workspaceId: selectedWorkspace.workspaceId,
        error:
          briefError?.message ??
          historyError?.message ??
          approvalError?.message ??
          "Unable to load current agent state.",
      }),
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
      sessionId,
      briefId,
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
      sessionId,
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
          taskBlueprint.taskType === "inspect_context" ? "completed" : "pending",
        inputPayload:
          taskBlueprint.taskType === "inspect_context"
            ? {
                workspaceId: selectedWorkspace.workspaceId,
                briefId,
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
      sessionId,
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

    if (plannerDecision.shouldGenerateBrief && draftBriefTaskId) {
      await updateAgentRunStatus(supabase, {
        runId: run.id,
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
        runId: run.id,
        taskId: draftBriefTaskId,
        sessionId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        toolName: "draft_program_brief",
        inputPayload: {
          briefId,
          latestUserMessage: parsed.data.message,
          plannerIntent: plannerDecision.intent,
        },
      });
      draftBriefToolCallId = toolCall.id;

      await recordAgentEvent(supabase, {
        sessionId,
        runId: run.id,
        taskId: draftBriefTaskId,
        toolCallId: toolCall.id,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        eventType: "tool_call_started",
        title: "Drafting the structured brief",
        body: "Innova is generating the next structured brief revision.",
        eventPayload: {
          toolName: "draft_program_brief",
          plannerIntent: plannerDecision.intent,
        },
      });
    }
  });

  if (!plannerDecision.shouldGenerateBrief) {
    const recommendationPayload = {
      plannerIntent: plannerDecision.intent,
      workspaceStage: plannerDecision.stage,
      primaryActionLabel: plannerDecision.recommendation.primaryActionLabel,
      stageLabel: plannerDecision.recommendation.stageLabel,
      stageTone: plannerDecision.recommendation.stageTone,
      blockingOpenInputCount: plannerDecision.recommendation.blockingOpenInputCount,
    };

    await runBestEffort(async () => {
      if (agentRunId) {
        await updateAgentRunStatus(supabase, {
          runId: agentRunId,
          status: "running",
          currentTaskId: recommendationTaskId,
          summary: plannerDecision.runningSummary,
        });
      }

      if (recommendationTaskId) {
        await updateAgentTaskStatus(supabase, {
          taskId: recommendationTaskId,
          status: "running",
          started: true,
        });
      }
    });

    await supabase.from("agent_messages").insert({
      session_id: sessionId,
      brief_id: briefId,
      role: "assistant",
      kind: "chat",
      content_text: plannerDecision.recommendation.body,
      content_payload: toJson(recommendationPayload),
    });

    await supabase
      .from("agent_sessions")
      .update({
        last_message_at: new Date().toISOString(),
        session_metadata: toJson({
          surface: "pm_create_workspace",
          workspace_stage: plannerDecision.stage,
          recommended_next_step:
            plannerDecision.recommendation.primaryActionLabel,
        }),
      })
      .eq("id", sessionId);

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
          sessionId,
          organizationId,
          workspaceId: selectedWorkspace.workspaceId,
          programId,
          briefId,
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

      await recordAgentEvent(supabase, {
        sessionId,
        runId: agentRunId,
        taskId: recommendationTaskId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        eventType: "recommendation_created",
        title: plannerDecision.recommendation.title,
        body: plannerDecision.recommendation.body,
        eventPayload: recommendationPayload,
      });

      await recordAgentEvent(supabase, {
        sessionId,
        runId: agentRunId,
        taskId: updateMemoryTaskId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        eventType: "memory_updated",
        title: "Workspace memory updated",
        body: "Innova stored the current workspace stage and the next recommended PM action.",
        eventPayload: {
          stageMemoryId,
          recommendationMemoryId,
        },
      });

      if (agentRunId) {
        const runStatus =
          plannerDecision.stage === "brief_clarification" ||
          plannerDecision.stage === "goal_definition" ||
          plannerDecision.stage === "approval_review"
            ? "waiting_for_input"
            : "completed";

        await updateAgentRunStatus(supabase, {
          runId: agentRunId,
          status: runStatus,
          currentTaskId: recommendationTaskId ?? updateMemoryTaskId,
          summary:
            runStatus === "waiting_for_input"
              ? plannerDecision.waitingSummary
              : plannerDecision.completionSummary,
          runOutput: recommendationPayload,
          completed: runStatus === "completed",
        });

        await recordAgentEvent(supabase, {
          sessionId,
          runId: agentRunId,
          taskId: recommendationTaskId ?? updateMemoryTaskId,
          organizationId,
          workspaceId: selectedWorkspace.workspaceId,
          programId,
          eventType:
            runStatus === "waiting_for_input" ? "needs_input" : "run_completed",
          title:
            runStatus === "waiting_for_input"
              ? "PM input needed"
              : "Recommendation run completed",
          body:
            runStatus === "waiting_for_input"
              ? plannerDecision.recommendation.body
              : "Innova completed the PM workspace recommendation run.",
          eventPayload: recommendationPayload,
        });
      }
    });

    revalidatePath("/app/create");
    redirect(
      buildCreateRoute({
        sessionId,
        workspaceId: selectedWorkspace.workspaceId,
        status: "workspace-guidance",
      }),
    );
  }

  const aiRequestId = await createAiRequestLog({
    featureKey: "pm_agent_brief_generation",
    requestedBy: user.id,
    organizationId,
    workspaceId: selectedWorkspace.workspaceId,
    programId,
    requestPayload: toJson({
      message: parsed.data.message,
      session_id: sessionId,
      brief_id: briefId,
    }),
  });

  try {
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

    const { data: latestVersion } = await supabase
      .from("program_brief_versions")
      .select("version_number")
      .eq("brief_id", briefId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestVersion?.version_number ?? 0) + 1;

    const { data: versionRow, error: versionError } = await supabase
      .from("program_brief_versions")
      .insert({
        brief_id: briefId,
        version_number: nextVersion,
        created_by: user.id,
        source: "chat",
        structured_brief: toJson(briefDraft.result.structuredBrief),
        assumptions: toJson(briefDraft.result.assumptions),
        open_questions: toJson(briefDraft.result.openQuestions),
        confidence_level: briefDraft.result.confidenceLevel,
      })
      .select("id")
      .single();

    if (versionError || !versionRow) {
      throw new Error(versionError?.message ?? "Unable to save the brief version.");
    }

    const { error: briefUpdateError } = await supabase
      .from("program_briefs")
      .update({
        title: briefDraft.result.briefTitle,
        detected_program_type: briefDraft.result.detectedProgramType,
        status: briefDraft.result.status,
        confidence_level: briefDraft.result.confidenceLevel,
        current_brief: toJson(briefDraft.result.structuredBrief),
        assumptions: toJson(briefDraft.result.assumptions),
        open_questions: toJson(briefDraft.result.openQuestions),
        active_version_id: versionRow.id,
      })
      .eq("id", briefId);

    if (briefUpdateError) {
      throw new Error(briefUpdateError.message);
    }

    const { error: assistantMessageError } = await supabase
      .from("agent_messages")
      .insert({
        session_id: sessionId,
        brief_id: briefId,
        role: "assistant",
        kind:
          briefDraft.result.openQuestions.length > 0
            ? "question"
            : "brief_update",
        content_text: briefDraft.result.assistantMessage,
        content_payload: toJson({
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
        brief_id: briefId,
        title: briefDraft.result.sessionTitle,
        last_message_at: new Date().toISOString(),
        session_metadata: toJson({
          surface: "pm_create_workspace",
          brief_status: briefDraft.result.status,
          confidence_level: briefDraft.result.confidenceLevel,
        }),
      })
      .eq("id", sessionId);

    await finalizeAiRequestLog({
      aiRequestId,
      featureKey: "pm_agent_brief_generation",
      outputPayload: toJson({
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
      stage: nextOpenQuestionCount > 0 ? "brief_clarification" : "brief_ready",
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

        await recordAgentEvent(supabase, {
          sessionId,
          runId: agentRunId,
          taskId: draftBriefTaskId,
          toolCallId: draftBriefToolCallId,
          organizationId,
          workspaceId: selectedWorkspace.workspaceId,
          programId,
          eventType: "tool_call_completed",
          title: "Brief drafting completed",
          body: "Innova completed the structured brief drafting step.",
          eventPayload: {
            briefStatus: briefDraft.result.status,
            confidenceLevel: briefDraft.result.confidenceLevel,
          },
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
            readyForPlan: briefDraft.result.status === "ready_for_plan",
            confidenceLevel: briefDraft.result.confidenceLevel,
            openQuestionCount: briefDraft.result.openQuestions.length,
          },
        });
      }

      const artifactId = await registerAgentArtifact(supabase, {
        sessionId,
        runId: agentRunId,
        taskId: draftBriefTaskId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        artifactType: "brief",
        status: briefDraft.result.openQuestions.length > 0 ? "draft" : "ready_for_review",
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

      await recordAgentEvent(supabase, {
        sessionId,
        runId: agentRunId,
        taskId: draftBriefTaskId,
        toolCallId: draftBriefToolCallId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        eventType: "artifact_updated",
        title: "Structured brief updated",
        body:
          briefDraft.result.status === "ready_for_plan"
            ? "The brief is ready for planning."
            : "The brief was updated and still needs clarification before planning.",
        eventPayload: {
          artifactId,
          briefVersionId: versionRow.id,
          briefStatus: briefDraft.result.status,
        },
      });

      const summaryMemoryId = await upsertAgentMemory(supabase, {
        sessionId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        artifactType: "brief",
        artifactSourceTable: "program_briefs",
        artifactSourceId: briefId,
        memoryScope: "session",
        memoryKey: "pm_workspace_brief_summary",
        summary: briefDraft.result.assistantMessage,
        memoryPayload: {
          briefTitle: briefDraft.result.briefTitle,
          briefStatus: briefDraft.result.status,
          confidenceLevel: briefDraft.result.confidenceLevel,
          assumptions: briefDraft.result.assumptions,
        },
        confidence: briefDraft.result.confidenceLevel === "high" ? "high" : "medium",
        sourceType: "tool_output",
        sourceRunId: agentRunId,
      });

      const questionMemoryId = await upsertAgentMemory(supabase, {
        sessionId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        artifactType: "brief",
        artifactSourceTable: "program_briefs",
        artifactSourceId: briefId,
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
          sessionId,
          organizationId,
          workspaceId: selectedWorkspace.workspaceId,
          programId,
          briefId,
          agentRunId,
          stage: nextOpenQuestionCount > 0 ? "brief_clarification" : "brief_ready",
          stageLabel: nextRecommendation.stageLabel,
          stageTone: nextRecommendation.stageTone,
          openQuestionCount: nextOpenQuestionCount,
          recommendationTitle: nextRecommendation.title,
          recommendationBody: nextRecommendation.body,
          recommendationActionLabel: nextRecommendation.primaryActionLabel,
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

      await recordAgentEvent(supabase, {
        sessionId,
        runId: agentRunId,
        taskId: updateMemoryTaskId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        eventType: "memory_updated",
        title: "Workspace memory updated",
        body: "Innova stored the current brief summary and unresolved questions for later runs.",
        eventPayload: {
          summaryMemoryId,
          questionMemoryId,
          stageMemoryId,
          recommendationMemoryId,
        },
      });

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

      await recordAgentEvent(supabase, {
        sessionId,
        runId: agentRunId,
        taskId: recommendationTaskId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        eventType: "recommendation_created",
        title: nextRecommendation.title,
        body: nextRecommendation.body,
        eventPayload: {
          stage: nextOpenQuestionCount > 0 ? "brief_clarification" : "brief_ready",
          primaryActionLabel: nextRecommendation.primaryActionLabel,
          blockingOpenInputCount: nextRecommendation.blockingOpenInputCount,
        },
      });

      if (agentRunId) {
        await updateAgentRunStatus(supabase, {
          runId: agentRunId,
          status: nextOpenQuestionCount > 0 ? "waiting_for_input" : "completed",
          currentTaskId: recommendationTaskId ?? updateMemoryTaskId,
          summary:
            nextOpenQuestionCount > 0
              ? plannerDecision.waitingSummary
              : plannerDecision.completionSummary,
          runOutput: {
            briefId,
            briefVersionId: versionRow.id,
            briefStatus: briefDraft.result.status,
            primaryActionLabel: nextRecommendation.primaryActionLabel,
          },
          completed: nextOpenQuestionCount === 0,
        });
      }

      await recordAgentEvent(supabase, {
        sessionId,
        runId: agentRunId,
        taskId: recommendationTaskId ?? updateMemoryTaskId,
        organizationId,
        workspaceId: selectedWorkspace.workspaceId,
        programId,
        eventType: nextOpenQuestionCount > 0 ? "needs_input" : "run_completed",
        title:
          nextOpenQuestionCount > 0
            ? "PM clarification needed"
            : "Brief run completed",
        body:
          nextOpenQuestionCount > 0
            ? nextRecommendation.body
            : "Innova completed the brief run and the workspace is ready for planning.",
        eventPayload: {
          openQuestionCount: nextOpenQuestionCount,
          briefStatus: briefDraft.result.status,
          primaryActionLabel: nextRecommendation.primaryActionLabel,
        },
      });
    });

    revalidatePath("/app/create");
    redirect(
      buildCreateRoute({
        sessionId,
        workspaceId: selectedWorkspace.workspaceId,
        status:
          briefDraft.result.status === "ready_for_plan"
            ? "brief-ready"
            : "brief-updated",
      }),
    );
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    await finalizeAiRequestLog({
      aiRequestId,
      featureKey: "pm_agent_brief_generation",
      outputPayload: toJson({
        error: error instanceof Error ? error.message : "Unknown AI failure.",
      }),
      status: "failed",
      workspaceId: selectedWorkspace.workspaceId,
      organizationId,
      programId,
    });

    await runBestEffort(async () => {
      if (draftBriefToolCallId) {
        await completeAgentToolCall(supabase, {
          toolCallId: draftBriefToolCallId,
          status: "failed",
          errorPayload: {
            message: error instanceof Error ? error.message : "Unknown AI failure.",
          },
          startedAt: draftBriefToolStartedAt,
        });

        await recordAgentEvent(supabase, {
          sessionId,
          runId: agentRunId,
          taskId: draftBriefTaskId,
          toolCallId: draftBriefToolCallId,
          organizationId,
          workspaceId: selectedWorkspace.workspaceId,
          programId,
          eventType: "tool_call_failed",
          severity: "warning",
          title: "Brief drafting failed",
          body: "The PM agent could not complete the brief drafting step.",
          eventPayload: {
            error: error instanceof Error ? error.message : "Unknown AI failure.",
          },
        });
      }

      if (draftBriefTaskId) {
        await updateAgentTaskStatus(supabase, {
          taskId: draftBriefTaskId,
          status: "failed",
          completed: true,
          errorPayload: {
            message: error instanceof Error ? error.message : "Unknown AI failure.",
          },
        });
      }

      if (agentRunId) {
        await updateAgentRunStatus(supabase, {
          runId: agentRunId,
          status: "failed",
          currentTaskId: draftBriefTaskId,
          summary: "The PM brief drafting run failed before the brief could be updated.",
          errorPayload: {
            message: error instanceof Error ? error.message : "Unknown AI failure.",
          },
          completed: true,
        });

        await recordAgentEvent(supabase, {
          sessionId,
          runId: agentRunId,
          taskId: draftBriefTaskId,
          toolCallId: draftBriefToolCallId,
          organizationId,
          workspaceId: selectedWorkspace.workspaceId,
          programId,
          eventType: "run_failed",
          severity: "warning",
          title: "Brief run failed",
          body:
            "Innova could not update the program brief from the latest instruction. The workspace state is preserved for retry.",
          eventPayload: {
            error: error instanceof Error ? error.message : "Unknown AI failure.",
          },
        });
      }
    });

    await insertAssistantErrorMessage(
      sessionId,
      briefId,
      "I could not update the program brief just now. The workspace state is preserved, so you can retry or refine the request.",
    );

    revalidatePath("/app/create");
    redirect(
      buildCreateRoute({
        sessionId,
        workspaceId: selectedWorkspace.workspaceId,
        error:
          error instanceof Error
            ? error.message
            : "The PM agent could not process that request.",
      }),
    );
  }
}

export async function generateProgramPlanAction(formData: FormData) {
  const parsed = sessionOnlySchema.safeParse({
    sessionId: formData.get("sessionId"),
    redirectTo: formData.get("redirectTo") || undefined,
  });

  if (!parsed.success) {
    redirect(
      buildCreateRoute({
        error: parsed.error.issues[0]?.message ?? "Invalid session request.",
      }),
    );
  }

  const { supabase, user, session, selectedWorkspace } = await resolveSessionContext(
    parsed.data.sessionId,
  );

  if (!session.brief_id) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: "This workspace does not have a brief to execute yet.",
      }),
    );
  }

  if (!session.brief_id) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: "This workspace does not have a program brief yet.",
      }),
    );
  }

  const { data: briefRow, error: briefError } = await supabase
    .from("program_briefs")
    .select(
      "id, organization_id, workspace_id, program_id, title, detected_program_type, current_brief, assumptions, open_questions",
    )
    .eq("id", session.brief_id!)
    .single();

  if (briefError || !briefRow) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: briefError?.message ?? "The current brief could not be loaded.",
      }),
    );
  }

  const briefTitle = briefRow.title?.trim();
  const structuredBrief =
    briefRow.current_brief as Record<string, unknown> | null;

  if (!briefTitle || !structuredBrief || Object.keys(structuredBrief).length === 0) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: "The brief needs more detail before a serious execution plan can be generated.",
      }),
    );
  }

  const aiRequestId = await createAiRequestLog({
    featureKey: "pm_agent_plan_generation",
    requestedBy: user.id,
    organizationId: briefRow.organization_id,
    workspaceId: briefRow.workspace_id,
    programId: briefRow.program_id,
    requestPayload: toJson({
        session_id: session.id,
        brief_id: briefRow.id,
        brief_title: briefTitle,
      }),
  });

  let agentRunId: string | null = null;
  let draftPlanTaskId: string | null = null;
  let validatePlanTaskId: string | null = null;
  let updateMemoryTaskId: string | null = null;
  let draftPlanToolCallId: string | null = null;
  const draftPlanToolStartedAt = new Date();

  await runBestEffort(async () => {
    const run = await createAgentRun(supabase, {
      sessionId: session.id,
      briefId: briefRow.id,
      organizationId: briefRow.organization_id,
      workspaceId: briefRow.workspace_id,
      programId: briefRow.program_id,
      runType: "plan_generation",
      goalText: `Generate a governed execution plan for ${briefTitle}`,
      userInstruction: `Generate a governed execution plan for ${briefTitle}`,
      startedBy: user.id,
      plannerModel: "pm_workspace_v1",
      executorModel: "generate-program-agent-draft",
      runInput: {
        briefId: briefRow.id,
        briefTitle,
        detectedProgramType: briefRow.detected_program_type,
      },
    });
    agentRunId = run.id;

    await updateAgentRunStatus(supabase, {
      runId: run.id,
      status: "planning",
      summary: "Inspecting the approved brief context and planning the execution-plan run.",
    });

    await recordAgentEvent(supabase, {
      sessionId: session.id,
      runId: run.id,
      organizationId: briefRow.organization_id,
      workspaceId: briefRow.workspace_id,
      programId: briefRow.program_id,
      eventType: "run_started",
      title: "Plan run started",
      body: "Innova started a new plan-generation run from the latest brief state.",
      eventPayload: {
        runType: run.run_type,
        briefId: briefRow.id,
      },
    });

    await createAgentRunTask(supabase, {
      runId: run.id,
      taskType: "inspect_context",
      title: "Inspect the brief and workspace context",
      description: "Load the current brief, assumptions, and open questions before drafting the plan.",
      displayOrder: 10,
      status: "completed",
      inputPayload: {
        briefId: briefRow.id,
        briefTitle,
      },
    });

    const draftTask = await createAgentRunTask(supabase, {
      runId: run.id,
      taskType: "draft_plan",
      title: "Draft the governed execution plan",
      description: "Generate the next execution plan from the current brief and workspace context.",
      displayOrder: 20,
      inputPayload: {
        briefId: briefRow.id,
        briefTitle,
      },
    });
    draftPlanTaskId = draftTask.id;

    const validateTask = await createAgentRunTask(supabase, {
      runId: run.id,
      taskType: "validate_output",
      title: "Validate the generated plan",
      description: "Validate the returned plan structure, approval gates, and execution readiness.",
      displayOrder: 30,
    });
    validatePlanTaskId = validateTask.id;

    const memoryTask = await createAgentRunTask(supabase, {
      runId: run.id,
      taskType: "update_memory",
      title: "Persist the distilled planning memory",
      description: "Store the important plan summary and approval requirements for later runs.",
      displayOrder: 40,
    });
    updateMemoryTaskId = memoryTask.id;

    await updateAgentRunStatus(supabase, {
      runId: run.id,
      status: "running",
      currentTaskId: draftTask.id,
      summary: "Drafting the governed execution plan from the current brief.",
    });

    await updateAgentTaskStatus(supabase, {
      taskId: draftTask.id,
      status: "running",
      started: true,
    });

    await recordAgentEvent(supabase, {
      sessionId: session.id,
      runId: run.id,
      taskId: draftTask.id,
      organizationId: briefRow.organization_id,
      workspaceId: briefRow.workspace_id,
      programId: briefRow.program_id,
      eventType: "run_planned",
      title: "Plan run planned",
      body: "Innova prepared the task sequence for the plan-generation run.",
      eventPayload: {
        taskTypes: [
          "inspect_context",
          "draft_plan",
          "validate_output",
          "update_memory",
        ],
      },
    });

    const toolCall = await recordAgentToolCall(supabase, {
      runId: run.id,
      taskId: draftTask.id,
      sessionId: session.id,
      organizationId: briefRow.organization_id,
      workspaceId: briefRow.workspace_id,
      programId: briefRow.program_id,
      toolName: "draft_program_plan",
      inputPayload: {
        briefId: briefRow.id,
        briefTitle,
      },
    });
    draftPlanToolCallId = toolCall.id;

    await recordAgentEvent(supabase, {
      sessionId: session.id,
      runId: run.id,
      taskId: draftTask.id,
      toolCallId: toolCall.id,
      organizationId: briefRow.organization_id,
      workspaceId: briefRow.workspace_id,
      programId: briefRow.program_id,
      eventType: "tool_call_started",
      title: "Drafting the execution plan",
      body: "Innova is generating the governed execution plan.",
      eventPayload: {
        toolName: "draft_program_plan",
      },
    });
  });

  try {
    const planDraft = await generateProgramPlanDraft(supabase, {
      workspaceName: selectedWorkspace.workspaceName,
      organizationName: selectedWorkspace.organizationName,
      briefTitle,
      detectedProgramType: briefRow.detected_program_type,
      structuredBrief,
      assumptions: briefRow.assumptions as string[],
      openQuestions: briefRow.open_questions as Array<Record<string, unknown>>,
    });

    const { data: planRow, error: planError } = await supabase
      .from("program_plans")
      .insert({
        brief_id: briefRow.id,
        brief_version_id: null,
        organization_id: briefRow.organization_id,
        workspace_id: briefRow.workspace_id,
        program_id: briefRow.program_id,
        created_by: user.id,
        status: planDraft.result.status,
        title: planDraft.result.planTitle,
        summary: planDraft.result.planSummary,
        plan_payload: toJson({
          items: planDraft.result.items,
        }),
        assumptions: toJson(planDraft.result.assumptions),
        approval_requirements: toJson(planDraft.result.approvalRequirements),
      })
      .select("id")
      .single();

    if (planError || !planRow) {
      throw new Error(planError?.message ?? "Unable to create the program plan.");
    }

    const { error: itemError } = await supabase.from("program_plan_items").insert(
      planDraft.result.items.map((item, index) => ({
        plan_id: planRow.id,
        item_key: item.itemKey,
        item_type: item.itemType,
        title: item.title,
        description: item.description,
        display_order: index + 1,
        requires_approval: item.requiresApproval,
        payload: toJson(item.payload),
      })),
    );

    if (itemError) {
      throw new Error(itemError.message);
    }

    const { error: briefUpdateError } = await supabase
      .from("program_briefs")
      .update({
        active_plan_id: planRow.id,
        status: "plan_generated",
      })
      .eq("id", briefRow.id);

    if (briefUpdateError) {
      throw new Error(briefUpdateError.message);
    }

    const { error: assistantMessageError } = await supabase
      .from("agent_messages")
      .insert({
        session_id: session.id,
        brief_id: briefRow.id,
        plan_id: planRow.id,
        role: "assistant",
        kind: "plan_summary",
        content_text: planDraft.result.assistantMessage,
        content_payload: toJson({
          planTitle: planDraft.result.planTitle,
          planSummary: planDraft.result.planSummary,
          items: planDraft.result.items,
          approvalRequirements: planDraft.result.approvalRequirements,
        }),
        model_name: planDraft.model,
      });

    if (assistantMessageError) {
      throw new Error(assistantMessageError.message);
    }

    await supabase
      .from("agent_sessions")
      .update({
        last_message_at: new Date().toISOString(),
        session_metadata: toJson({
          surface: "pm_create_workspace",
          brief_status: "plan_generated",
          active_plan_id: planRow.id,
        }),
      })
      .eq("id", session.id);

    await finalizeAiRequestLog({
      aiRequestId,
      featureKey: "pm_agent_plan_generation",
      outputPayload: toJson({
        plan: planDraft.result,
      }),
      status: "generated",
      workspaceId: briefRow.workspace_id,
      organizationId: briefRow.organization_id,
      programId: briefRow.program_id,
      modelName: planDraft.model,
      tokenCount:
        planDraft.usage?.total_tokens ??
        ((planDraft.usage?.input_tokens ?? 0) +
          (planDraft.usage?.output_tokens ?? 0)),
    });

    await runBestEffort(async () => {
      if (draftPlanToolCallId) {
        await completeAgentToolCall(supabase, {
          toolCallId: draftPlanToolCallId,
          status: "completed",
          outputPayload: {
            planStatus: planDraft.result.status,
            planTitle: planDraft.result.planTitle,
            itemCount: planDraft.result.items.length,
            approvalRequirementCount: planDraft.result.approvalRequirements.length,
          },
          startedAt: draftPlanToolStartedAt,
        });

        await recordAgentEvent(supabase, {
          sessionId: session.id,
          runId: agentRunId,
          taskId: draftPlanTaskId,
          toolCallId: draftPlanToolCallId,
          organizationId: briefRow.organization_id,
          workspaceId: briefRow.workspace_id,
          programId: briefRow.program_id,
          eventType: "tool_call_completed",
          title: "Plan drafting completed",
          body: "Innova completed the governed execution-plan drafting step.",
          eventPayload: {
            planStatus: planDraft.result.status,
            itemCount: planDraft.result.items.length,
          },
        });
      }

      if (draftPlanTaskId) {
        await updateAgentTaskStatus(supabase, {
          taskId: draftPlanTaskId,
          status: "completed",
          completed: true,
          outputPayload: {
            planId: planRow.id,
            planStatus: planDraft.result.status,
          },
        });
      }

      if (validatePlanTaskId) {
        await updateAgentTaskStatus(supabase, {
          taskId: validatePlanTaskId,
          status: "completed",
          started: true,
          completed: true,
          outputPayload: {
            itemCount: planDraft.result.items.length,
            approvalRequirementCount: planDraft.result.approvalRequirements.length,
            readyForApprovalPacket:
              planDraft.result.approvalRequirements.length > 0,
          },
        });
      }

      const artifactId = await registerAgentArtifact(supabase, {
        sessionId: session.id,
        runId: agentRunId,
        taskId: draftPlanTaskId,
        organizationId: briefRow.organization_id,
        workspaceId: briefRow.workspace_id,
        programId: briefRow.program_id,
        artifactType: "plan",
        status: "ready_for_review",
        sourceTable: "program_plans",
        sourceId: planRow.id,
        versionLabel: "v1",
        title: planDraft.result.planTitle,
        summary: planDraft.result.planSummary,
        artifactPayload: {
          planStatus: planDraft.result.status,
          itemCount: planDraft.result.items.length,
        },
        createdByRunId: agentRunId,
      });

      await recordAgentEvent(supabase, {
        sessionId: session.id,
        runId: agentRunId,
        taskId: draftPlanTaskId,
        toolCallId: draftPlanToolCallId,
        organizationId: briefRow.organization_id,
        workspaceId: briefRow.workspace_id,
        programId: briefRow.program_id,
        eventType: "artifact_updated",
        title: "Execution plan updated",
        body: "The governed execution plan is ready for PM review.",
        eventPayload: {
          artifactId,
          planId: planRow.id,
          planStatus: planDraft.result.status,
        },
      });

      const summaryMemoryId = await upsertAgentMemory(supabase, {
        sessionId: session.id,
        organizationId: briefRow.organization_id,
        workspaceId: briefRow.workspace_id,
        programId: briefRow.program_id,
        artifactType: "plan",
        artifactSourceTable: "program_plans",
        artifactSourceId: planRow.id,
        memoryScope: "session",
        memoryKey: "pm_workspace_plan_summary",
        summary: planDraft.result.planSummary,
        memoryPayload: {
          planTitle: planDraft.result.planTitle,
          planStatus: planDraft.result.status,
          itemCount: planDraft.result.items.length,
        },
        confidence: "high",
        sourceType: "tool_output",
        sourceRunId: agentRunId,
      });

      const approvalsMemoryId = await upsertAgentMemory(supabase, {
        sessionId: session.id,
        organizationId: briefRow.organization_id,
        workspaceId: briefRow.workspace_id,
        programId: briefRow.program_id,
        artifactType: "plan",
        artifactSourceTable: "program_plans",
        artifactSourceId: planRow.id,
        memoryScope: "session",
        memoryKey: "pm_workspace_plan_approval_requirements",
        summary:
          planDraft.result.approvalRequirements.length > 0
            ? "The execution plan contains approval-gated requirements before deterministic execution."
            : "The execution plan currently has no explicit approval-gated requirements.",
        memoryPayload: {
          approvalRequirements: planDraft.result.approvalRequirements,
        },
        confidence: "high",
        sourceType: "tool_output",
        sourceRunId: agentRunId,
      });

      if (updateMemoryTaskId) {
        await updateAgentTaskStatus(supabase, {
          taskId: updateMemoryTaskId,
          status: "completed",
          started: true,
          completed: true,
          outputPayload: {
            summaryMemoryId,
            approvalsMemoryId,
          },
        });
      }

      await recordAgentEvent(supabase, {
        sessionId: session.id,
        runId: agentRunId,
        taskId: updateMemoryTaskId,
        organizationId: briefRow.organization_id,
        workspaceId: briefRow.workspace_id,
        programId: briefRow.program_id,
        eventType: "memory_updated",
        title: "Plan memory updated",
        body: "Innova stored the current plan summary and approval requirements for later runs.",
        eventPayload: {
          summaryMemoryId,
          approvalsMemoryId,
        },
      });

      if (agentRunId) {
        await updateAgentRunStatus(supabase, {
          runId: agentRunId,
          status: "completed",
          currentTaskId: updateMemoryTaskId,
          summary:
            "The plan run is complete and the governed execution plan is ready for PM review.",
          runOutput: {
            planId: planRow.id,
            planStatus: planDraft.result.status,
            itemCount: planDraft.result.items.length,
          },
          completed: true,
        });
      }

      await recordAgentEvent(supabase, {
        sessionId: session.id,
        runId: agentRunId,
        taskId: updateMemoryTaskId,
        organizationId: briefRow.organization_id,
        workspaceId: briefRow.workspace_id,
        programId: briefRow.program_id,
        eventType: "run_completed",
        title: "Plan run completed",
        body: "Innova completed the plan run and the workspace is ready for plan review.",
        eventPayload: {
          planId: planRow.id,
          approvalRequirementCount: planDraft.result.approvalRequirements.length,
        },
      });
    });

    revalidatePath("/app/create");
    if (parsed.data.redirectTo === "plan") {
      redirect(`/app/create/${session.id}/plan`);
    }

    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        status: "plan-generated",
      }),
    );
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    await finalizeAiRequestLog({
      aiRequestId,
      featureKey: "pm_agent_plan_generation",
      outputPayload: toJson({
        error: error instanceof Error ? error.message : "Unknown AI failure.",
      }),
      status: "failed",
      workspaceId: briefRow.workspace_id,
      organizationId: briefRow.organization_id,
      programId: briefRow.program_id,
    });

    await runBestEffort(async () => {
      if (draftPlanToolCallId) {
        await completeAgentToolCall(supabase, {
          toolCallId: draftPlanToolCallId,
          status: "failed",
          errorPayload: {
            message: error instanceof Error ? error.message : "Unknown AI failure.",
          },
          startedAt: draftPlanToolStartedAt,
        });

        await recordAgentEvent(supabase, {
          sessionId: session.id,
          runId: agentRunId,
          taskId: draftPlanTaskId,
          toolCallId: draftPlanToolCallId,
          organizationId: briefRow.organization_id,
          workspaceId: briefRow.workspace_id,
          programId: briefRow.program_id,
          eventType: "tool_call_failed",
          severity: "warning",
          title: "Plan drafting failed",
          body: "The PM agent could not complete the plan drafting step.",
          eventPayload: {
            error: error instanceof Error ? error.message : "Unknown AI failure.",
          },
        });
      }

      if (draftPlanTaskId) {
        await updateAgentTaskStatus(supabase, {
          taskId: draftPlanTaskId,
          status: "failed",
          completed: true,
          errorPayload: {
            message: error instanceof Error ? error.message : "Unknown AI failure.",
          },
        });
      }

      if (agentRunId) {
        await updateAgentRunStatus(supabase, {
          runId: agentRunId,
          status: "failed",
          currentTaskId: draftPlanTaskId,
          summary:
            "The plan run failed before the governed execution plan could be updated.",
          errorPayload: {
            message: error instanceof Error ? error.message : "Unknown AI failure.",
          },
          completed: true,
        });

        await recordAgentEvent(supabase, {
          sessionId: session.id,
          runId: agentRunId,
          taskId: draftPlanTaskId,
          toolCallId: draftPlanToolCallId,
          organizationId: briefRow.organization_id,
          workspaceId: briefRow.workspace_id,
          programId: briefRow.program_id,
          eventType: "run_failed",
          severity: "warning",
          title: "Plan run failed",
          body:
            "Innova could not generate the execution plan from the current brief. The workspace state is preserved for retry.",
          eventPayload: {
            error: error instanceof Error ? error.message : "Unknown AI failure.",
          },
        });
      }
    });

    await insertAssistantErrorMessage(
      session.id,
      briefRow.id,
      "I could not generate the execution plan yet. The brief remains intact, so you can refine it or retry.",
    );

    revalidatePath("/app/create");
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error:
          error instanceof Error
            ? error.message
            : "The PM agent could not generate the plan.",
      }),
    );
  }
}

export async function prepareApprovalRequestAction(formData: FormData) {
  const parsed = sessionOnlySchema.safeParse({
    sessionId: formData.get("sessionId"),
    redirectTo: formData.get("redirectTo") || undefined,
  });

  if (!parsed.success) {
    redirect(
      buildCreateRoute({
        error: parsed.error.issues[0]?.message ?? "Invalid session request.",
      }),
    );
  }

  const { supabase, user, session, selectedWorkspace } = await resolveSessionContext(
    parsed.data.sessionId,
  );

  if (!session.brief_id) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: "This workspace does not have a brief yet.",
      }),
    );
  }

  const { data: briefRow, error: briefError } = await supabase
    .from("program_briefs")
    .select("id, organization_id, workspace_id, program_id, title, active_plan_id")
    .eq("id", session.brief_id!)
    .single();

  if (briefError || !briefRow || !briefRow.active_plan_id) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: "A generated plan is required before approvals can be prepared.",
      }),
    );
  }

  const [{ data: planRow, error: planError }, { data: planItems, error: itemError }] =
    await Promise.all([
      supabase
        .from("program_plans")
        .select("id, title, summary, approval_requirements")
        .eq("id", briefRow.active_plan_id)
        .single(),
      supabase
        .from("program_plan_items")
        .select(
          "item_key, item_type, title, description, requires_approval, payload, display_order",
        )
        .eq("plan_id", briefRow.active_plan_id)
        .order("display_order", { ascending: true }),
    ]);

  if (planError || itemError || !planRow) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error:
          planError?.message ?? itemError?.message ?? "Unable to load the current plan.",
      }),
    );
  }

  const approvalItems =
    planItems?.filter((item) => item.requires_approval) ?? [];

  if (approvalItems.length === 0) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: "This plan does not currently contain approval-gated items.",
      }),
    );
  }

  const { data: approvalRequest, error: approvalError } = await supabase
    .from("approval_requests")
    .insert({
      brief_id: briefRow.id,
      plan_id: planRow.id,
      organization_id: briefRow.organization_id,
      workspace_id: briefRow.workspace_id,
      program_id: briefRow.program_id,
      requested_by: user.id,
      status: "pending",
      title: `Approve ${planRow.title ?? "program execution plan"}`,
      summary:
        planRow.summary ??
        "Review the generated plan items and approve the controlled execution package.",
      risk_level: "medium",
      request_payload: toJson({
        approvalRequirements: planRow.approval_requirements,
      }),
    })
    .select("id")
    .single();

  if (approvalError || !approvalRequest) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: approvalError?.message ?? "Unable to create the approval request.",
      }),
    );
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
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: approvalItemsError.message,
      }),
    );
  }

  await supabase
    .from("program_briefs")
    .update({
      status: "ready_for_execution",
    })
    .eq("id", briefRow.id);

  await supabase.from("agent_messages").insert({
    session_id: session.id,
    brief_id: briefRow.id,
    plan_id: planRow.id,
    approval_request_id: approvalRequest.id,
    role: "assistant",
    kind: "approval_summary",
    content_text:
      "I prepared an approval packet for the current plan. Once the package is reviewed, we can move into deterministic execution against the real platform tables.",
    content_payload: toJson({
      approvalRequestId: approvalRequest.id,
      itemCount: approvalItems.length,
      workspaceStage: "approval_review",
      primaryActionLabel: "Review approvals",
    }),
  });

  await supabase
    .from("agent_sessions")
    .update({
      last_message_at: new Date().toISOString(),
      session_metadata: toJson({
        surface: "pm_create_workspace",
        brief_status: "ready_for_execution",
        approval_request_id: approvalRequest.id,
      }),
    })
    .eq("id", session.id);

  revalidatePath("/app/create");
  revalidatePath(`/app/create/${session.id}/plan`);
  revalidatePath(`/app/create/${session.id}/approvals`);
  if (parsed.data.redirectTo === "approvals") {
    redirect(`/app/create/${session.id}/approvals`);
  }

  redirect(
    buildCreateRoute({
      sessionId: session.id,
      workspaceId: selectedWorkspace.workspaceId,
      status: "approval-packet-ready",
    }),
  );
}

export async function reviewApprovalRequestAction(formData: FormData) {
  const parsed = approvalDecisionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    approvalRequestId: formData.get("approvalRequestId"),
    decision: formData.get("decision"),
    redirectTo: formData.get("redirectTo") || undefined,
  });

  if (!parsed.success) {
    redirect(
      buildCreateRoute({
        error: parsed.error.issues[0]?.message ?? "Invalid approval decision.",
      }),
    );
  }

  const { supabase, user, session, selectedWorkspace } = await resolveSessionContext(
    parsed.data.sessionId,
  );

  const { data: approvalRequest, error: approvalError } = await supabase
    .from("approval_requests")
    .select("id, brief_id, plan_id, status")
    .eq("id", parsed.data.approvalRequestId)
    .maybeSingle();

  if (approvalError || !approvalRequest) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: approvalError?.message ?? "Approval request not found.",
      }),
    );
  }

  const reviewedAt = new Date().toISOString();

  const { error: requestUpdateError } = await supabase
    .from("approval_requests")
    .update({
      status: parsed.data.decision,
      reviewed_by: user.id,
      reviewed_at: reviewedAt,
    })
    .eq("id", approvalRequest.id);

  if (requestUpdateError) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: requestUpdateError.message,
      }),
    );
  }

  const { error: itemUpdateError } = await supabase
    .from("approval_request_items")
    .update({
      status: parsed.data.decision,
    })
    .eq("approval_request_id", approvalRequest.id)
    .eq("status", "pending");

  if (itemUpdateError) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: itemUpdateError.message,
      }),
    );
  }

  if (approvalRequest.plan_id) {
    await supabase
      .from("program_plans")
      .update({
        status: parsed.data.decision === "approved" ? "approved" : "rejected",
      })
      .eq("id", approvalRequest.plan_id);
  }

  if (approvalRequest.brief_id) {
    await supabase
      .from("program_briefs")
      .update({
        status:
          parsed.data.decision === "approved"
            ? "ready_for_execution"
            : "plan_generated",
      })
      .eq("id", approvalRequest.brief_id);
  }

  await supabase.from("agent_messages").insert({
    session_id: session.id,
    brief_id: approvalRequest.brief_id,
    plan_id: approvalRequest.plan_id,
    approval_request_id: approvalRequest.id,
    actor_user_id: user.id,
    role: "assistant",
    kind: "approval_summary",
    content_text:
      parsed.data.decision === "approved"
        ? "The approval packet is now approved. The workspace can move into deterministic execution."
        : "The approval packet was rejected. Refine the plan or the brief before retrying execution.",
    content_payload: toJson({
      decision: parsed.data.decision,
      reviewedAt,
    }),
  });

  await supabase
    .from("agent_sessions")
    .update({
      last_message_at: new Date().toISOString(),
      session_metadata: toJson({
        surface: "pm_create_workspace",
        latest_approval_decision: parsed.data.decision,
      }),
    })
    .eq("id", session.id);

  revalidatePath("/app/create");
  if (parsed.data.redirectTo === "approvals") {
    redirect(`/app/create/${session.id}/approvals?approval=${approvalRequest.id}`);
  }

  if (parsed.data.redirectTo === "execution" && parsed.data.decision === "approved") {
    redirect(`/app/create/${session.id}/execution`);
  }

  redirect(
    buildCreateRoute({
      sessionId: session.id,
      workspaceId: selectedWorkspace.workspaceId,
      status:
        parsed.data.decision === "approved"
          ? "approval-approved"
          : "approval-rejected",
    }),
  );
}

export async function executeApprovedPlanAction(formData: FormData) {
  const parsed = executeSchema.safeParse({
    sessionId: formData.get("sessionId"),
    approvalRequestId: formData.get("approvalRequestId"),
    redirectTo: formData.get("redirectTo") || undefined,
  });

  if (!parsed.success) {
    redirect(
      buildCreateRoute({
        error: parsed.error.issues[0]?.message ?? "Invalid execution request.",
      }),
    );
  }

  const { supabase, user, session, selectedWorkspace } = await resolveSessionContext(
    parsed.data.sessionId,
  );

  const { data: briefRow, error: briefError } = await supabase
    .from("program_briefs")
    .select(
      "id, organization_id, workspace_id, program_id, title, detected_program_type, current_brief, status, active_plan_id",
    )
    .eq("id", session.brief_id!)
    .single();

  if (briefError || !briefRow) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: briefError?.message ?? "Program brief not found.",
      }),
    );
  }

  if (!briefRow.active_plan_id) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: "A generated plan is required before execution can begin.",
      }),
    );
  }

  const [{ data: approvalRequest, error: approvalError }, { data: planItems, error: itemsError }] =
    await Promise.all([
      supabase
        .from("approval_requests")
        .select("id, plan_id, status")
        .eq("id", parsed.data.approvalRequestId)
        .maybeSingle(),
      supabase
        .from("program_plan_items")
        .select(
          "item_key, item_type, title, description, requires_approval, payload, display_order",
        )
        .eq("plan_id", briefRow.active_plan_id!)
        .order("display_order", { ascending: true }),
    ]);

  if (approvalError || !approvalRequest) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: approvalError?.message ?? "Approval request not found.",
      }),
    );
  }

  if (itemsError) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: itemsError.message,
      }),
    );
  }

  if (approvalRequest.status !== "approved") {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: "Only approved packets can be executed.",
      }),
    );
  }

  const { data: executionRun, error: executionError } = await supabase
    .from("execution_runs")
    .insert({
      brief_id: briefRow.id,
      plan_id: approvalRequest.plan_id,
      approval_request_id: approvalRequest.id,
      organization_id: briefRow.organization_id,
      workspace_id: briefRow.workspace_id,
      program_id: briefRow.program_id,
      triggered_by: user.id,
      status: "running",
      execution_kind: "pm_workspace_bootstrap",
      summary: "Creating the governed program foundation from the approved PM workspace plan.",
      input_payload: toJson({
        briefTitle: briefRow.title,
        planId: approvalRequest.plan_id,
        itemCount: planItems?.length ?? 0,
      }),
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (executionError || !executionRun) {
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error: executionError?.message ?? "Execution run could not be created.",
      }),
    );
  }

  const executionRunId = executionRun.id;
  const createdAt = new Date().toISOString();
  const stepsToInsert =
    planItems?.map((item, index) => ({
      execution_run_id: executionRunId,
      step_key: item.item_key,
      step_type: item.item_type,
      title: item.title,
      display_order: index + 1,
      status: "queued" as const,
      target_type: null,
      target_id: null,
      input_payload: toJson(item.payload),
      output_payload: toJson({}),
      created_at: createdAt,
    })) ?? [];

  if (stepsToInsert.length > 0) {
    const { error: stepInsertError } = await supabase
      .from("execution_run_steps")
      .insert(stepsToInsert);

    if (stepInsertError) {
      redirect(
        buildCreateRoute({
          sessionId: session.id,
          workspaceId: selectedWorkspace.workspaceId,
          error: stepInsertError.message,
        }),
      );
    }
  }

  let programId = briefRow.program_id;
  let completedSteps = 0;
  const partialSteps: Array<{ stepKey: string; reason: string }> = [];

  try {
    if (!programId) {
      const programName = briefRow.title?.trim();
      const programType =
        briefRow.detected_program_type?.trim() || "innovation_program";

      if (!programName) {
        throw new Error("The brief needs a program title before execution can create the program.");
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "bootstrap_program_creation",
        {
          workspace_id_input: briefRow.workspace_id,
          name_input: programName,
          slug_input: ensureSlugOrThrow(programName, "Program slug"),
          program_type_input: programType,
          short_description_input:
            getBriefObjective(briefRow.current_brief) ?? undefined,
          visibility_input: "private",
        },
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const createdProgramId = (
        rpcResult as Array<{ program_id: string }> | null
      )?.[0]?.program_id;

      if (!createdProgramId) {
        throw new Error("Program foundation was created without a program id result.");
      }

      programId = createdProgramId;

      await Promise.all([
        supabase
          .from("program_briefs")
          .update({
            program_id: programId,
            status: "executing",
          })
          .eq("id", briefRow.id),
        supabase
          .from("program_plans")
          .update({
            program_id: programId,
          })
          .eq("id", approvalRequest.plan_id ?? ""),
        supabase
          .from("approval_requests")
          .update({
            program_id: programId,
          })
          .eq("id", approvalRequest.id),
        supabase
          .from("agent_sessions")
          .update({
            program_id: programId,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", session.id),
        supabase
          .from("execution_runs")
          .update({
            program_id: programId,
          })
          .eq("id", executionRunId),
      ]);
    }

    const stepRowsResult = await supabase
      .from("execution_run_steps")
      .select("id, step_key, step_type, title, input_payload")
      .eq("execution_run_id", executionRunId)
      .order("display_order", { ascending: true });

    if (stepRowsResult.error) {
      throw new Error(stepRowsResult.error.message);
    }

    const stepRows = stepRowsResult.data ?? [];

    for (const step of stepRows) {
      if (!programId) {
        throw new Error("Program execution requires a concrete program id.");
      }

      try {
        const result = await executePmWorkspacePlanStep(
          {
            supabase,
            userId: user.id,
            organizationId: briefRow.organization_id,
            workspaceId: briefRow.workspace_id,
            programId,
            brief: {
              title: briefRow.title,
              detectedProgramType: briefRow.detected_program_type,
              currentBrief:
                briefRow.current_brief &&
                typeof briefRow.current_brief === "object" &&
                !Array.isArray(briefRow.current_brief)
                  ? (briefRow.current_brief as Record<string, unknown>)
                  : null,
            },
          },
          {
            id: step.id,
            stepKey: step.step_key,
            stepType: step.step_type,
            title: step.title,
            inputPayload: step.input_payload,
          },
        );

        await supabase
          .from("execution_run_steps")
          .update({
            status: result.status,
            target_type: result.targetType,
            target_id: result.targetId,
            output_payload: result.outputPayload,
            completed_at: new Date().toISOString(),
          })
          .eq("id", step.id);

        if (result.status === "completed") {
          completedSteps += 1;
        } else {
          partialSteps.push({
            stepKey: step.step_key,
            reason: result.reason ?? "Executor returned a partial result.",
          });
        }
      } catch (stepError) {
        const message =
          stepError instanceof Error
            ? stepError.message
            : "Unknown execution step failure.";

        await supabase
          .from("execution_run_steps")
          .update({
            status: "failed",
            error_payload: toJson({
              message,
            }),
            completed_at: new Date().toISOString(),
          })
          .eq("id", step.id);

        partialSteps.push({
          stepKey: step.step_key,
          reason: message,
        });
      }
    }

    const finalStatus =
      partialSteps.length > 0 ? "partial" : "completed";

    await Promise.all([
      supabase
        .from("execution_runs")
        .update({
          status: finalStatus,
          summary:
            finalStatus === "completed"
              ? "Program foundation and supported assets were executed successfully."
              : "Program foundation executed successfully, with some approved items still awaiting dedicated executors.",
          output_payload: toJson({
            programId,
            completedSteps,
            partialSteps,
          }),
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionRunId),
      supabase
        .from("program_briefs")
        .update({
          status: finalStatus === "completed" ? "live" : "executing",
          program_id: programId,
        })
        .eq("id", briefRow.id),
      supabase
        .from("approval_requests")
        .update({
          status: "approved",
        })
        .eq("id", approvalRequest.id),
    ]);

    await supabase.from("agent_messages").insert({
      session_id: session.id,
      brief_id: briefRow.id,
      plan_id: approvalRequest.plan_id,
      approval_request_id: approvalRequest.id,
      execution_run_id: executionRunId,
      role: "assistant",
      kind: "execution_update",
      content_text:
        partialSteps.length === 0
          ? "Deterministic execution completed. The governed program foundation is now live in the platform."
          : "The approved plan has started execution. The core program foundation is now created, and the remaining approved items are tracked as partial execution until their executors are added.",
      content_payload: toJson({
        executionRunId,
        programId,
        completedSteps,
        partialSteps,
      }),
    });

    revalidatePath("/app/create");
    if (parsed.data.redirectTo === "execution") {
      redirect(`/app/create/${session.id}/execution`);
    }

    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        status:
          partialSteps.length === 0
            ? "execution-complete"
            : "execution-partial",
      }),
    );
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    await Promise.all([
      supabase
        .from("execution_runs")
        .update({
          status: "failed",
          error_payload: toJson({
            message: error instanceof Error ? error.message : "Unknown execution failure.",
          }),
          completed_at: new Date().toISOString(),
        })
        .eq("id", executionRunId),
      supabase.from("agent_messages").insert({
        session_id: session.id,
        brief_id: briefRow.id,
        plan_id: approvalRequest.plan_id,
        approval_request_id: approvalRequest.id,
        execution_run_id: executionRunId,
        role: "assistant",
        kind: "execution_update",
        content_text:
          "Execution failed before the governed program foundation could be completed. Review the error and retry once the issue is resolved.",
        content_payload: toJson({
          executionRunId,
          error: error instanceof Error ? error.message : "Unknown execution failure.",
        }),
      }),
    ]);

    revalidatePath("/app/create");
    redirect(
      buildCreateRoute({
        sessionId: session.id,
        workspaceId: selectedWorkspace.workspaceId,
        error:
          error instanceof Error
            ? error.message
            : "The approved plan could not be executed.",
      }),
    );
  }
}
