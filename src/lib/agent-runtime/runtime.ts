import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { AgentToolName } from "@/lib/agent-runtime/tools/registry";
import { getAgentToolDefinition } from "@/lib/agent-runtime/tools/registry";

type TypedSupabaseClient = SupabaseClient<Database>;

export type AgentRunRow = Database["public"]["Tables"]["agent_runs"]["Row"];
export type AgentRunTaskRow = Database["public"]["Tables"]["agent_run_tasks"]["Row"];
export type AgentToolCallRow = Database["public"]["Tables"]["agent_tool_calls"]["Row"];
export type AgentEventRow = Database["public"]["Tables"]["agent_events"]["Row"];

type AgentRunType = Database["public"]["Enums"]["agent_run_type"];
type AgentRunStatus = Database["public"]["Enums"]["agent_run_status"];
type AgentTaskType = Database["public"]["Enums"]["agent_task_type"];
type AgentTaskStatus = Database["public"]["Enums"]["agent_task_status"];
type AgentEventType = Database["public"]["Enums"]["agent_event_type"];
type AgentEventSeverity = Database["public"]["Enums"]["agent_event_severity"];
type AgentMemoryScope = Database["public"]["Enums"]["agent_memory_scope"];
type AgentMemoryConfidence = Database["public"]["Enums"]["agent_memory_confidence"];
type AgentMemorySourceType = Database["public"]["Enums"]["agent_memory_source_type"];
type AgentArtifactType = Database["public"]["Enums"]["agent_artifact_type"];
type AgentArtifactStatus = Database["public"]["Enums"]["agent_artifact_status"];

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export async function createAgentRun(
  supabase: TypedSupabaseClient,
  params: {
    sessionId: string;
    briefId?: string | null;
    planId?: string | null;
    approvalRequestId?: string | null;
    executionRunId?: string | null;
    organizationId?: string | null;
    workspaceId: string;
    programId?: string | null;
    runType: AgentRunType;
    goalText?: string | null;
    userInstruction?: string | null;
    startedBy: string;
    runInput?: Record<string, unknown>;
    plannerModel?: string | null;
    executorModel?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      session_id: params.sessionId,
      brief_id: params.briefId ?? null,
      plan_id: params.planId ?? null,
      approval_request_id: params.approvalRequestId ?? null,
      execution_run_id: params.executionRunId ?? null,
      organization_id: params.organizationId ?? null,
      workspace_id: params.workspaceId,
      program_id: params.programId ?? null,
      run_type: params.runType,
      status: "queued",
      goal_text: params.goalText ?? null,
      user_instruction: params.userInstruction ?? null,
      planner_model: params.plannerModel ?? null,
      executor_model: params.executorModel ?? null,
      started_by: params.startedBy,
      started_at: new Date().toISOString(),
      run_input: toJson(params.runInput ?? {}),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create agent run.");
  }

  return data satisfies AgentRunRow;
}

export async function updateAgentRunStatus(
  supabase: TypedSupabaseClient,
  params: {
    runId: string;
    status: AgentRunStatus;
    currentTaskId?: string | null;
    summary?: string | null;
    runOutput?: Record<string, unknown>;
    errorPayload?: Record<string, unknown>;
    completed?: boolean;
  },
) {
  const patch: Database["public"]["Tables"]["agent_runs"]["Update"] = {
    status: params.status,
  };

  if (params.currentTaskId !== undefined) {
    patch.current_task_id = params.currentTaskId;
  }
  if (params.summary !== undefined) {
    patch.summary = params.summary;
  }
  if (params.runOutput !== undefined) {
    patch.run_output = toJson(params.runOutput);
  }
  if (params.errorPayload !== undefined) {
    patch.error_payload = toJson(params.errorPayload);
  }
  if (params.completed) {
    patch.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("agent_runs").update(patch).eq("id", params.runId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createAgentRunTask(
  supabase: TypedSupabaseClient,
  params: {
    runId: string;
    parentTaskId?: string | null;
    taskType: AgentTaskType;
    title: string;
    description?: string | null;
    displayOrder: number;
    priority?: number;
    blocking?: boolean;
    approvalRequired?: boolean;
    inputPayload?: Record<string, unknown>;
    status?: AgentTaskStatus;
  },
) {
  const { data, error } = await supabase
    .from("agent_run_tasks")
    .insert({
      run_id: params.runId,
      parent_task_id: params.parentTaskId ?? null,
      task_type: params.taskType,
      status: params.status ?? "pending",
      title: params.title,
      description: params.description ?? null,
      display_order: params.displayOrder,
      priority: params.priority ?? 100,
      blocking: params.blocking ?? true,
      approval_required: params.approvalRequired ?? false,
      input_payload: toJson(params.inputPayload ?? {}),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create agent task.");
  }

  return data satisfies AgentRunTaskRow;
}

export async function updateAgentTaskStatus(
  supabase: TypedSupabaseClient,
  params: {
    taskId: string;
    status: AgentTaskStatus;
    waitingReason?: string | null;
    outputPayload?: Record<string, unknown>;
    errorPayload?: Record<string, unknown>;
    started?: boolean;
    completed?: boolean;
  },
) {
  const patch: Database["public"]["Tables"]["agent_run_tasks"]["Update"] = {
    status: params.status,
  };

  if (params.waitingReason !== undefined) {
    patch.waiting_reason = params.waitingReason;
  }
  if (params.outputPayload !== undefined) {
    patch.output_payload = toJson(params.outputPayload);
  }
  if (params.errorPayload !== undefined) {
    patch.error_payload = toJson(params.errorPayload);
  }
  if (params.started) {
    patch.started_at = new Date().toISOString();
  }
  if (params.completed) {
    patch.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("agent_run_tasks").update(patch).eq("id", params.taskId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function recordAgentToolCall(
  supabase: TypedSupabaseClient,
  params: {
    runId: string;
    taskId?: string | null;
    sessionId: string;
    organizationId?: string | null;
    workspaceId: string;
    programId?: string | null;
    toolName: AgentToolName;
    inputPayload?: Record<string, unknown>;
  },
) {
  const definition = getAgentToolDefinition(params.toolName);
  const { data, error } = await supabase
    .from("agent_tool_calls")
    .insert({
      run_id: params.runId,
      task_id: params.taskId ?? null,
      session_id: params.sessionId,
      organization_id: params.organizationId ?? null,
      workspace_id: params.workspaceId,
      program_id: params.programId ?? null,
      tool_name: definition.toolName,
      tool_version: "v1",
      risk_level: definition.riskLevel,
      approval_required: definition.approvalRequired,
      status: "queued",
      executor_type: definition.executorType,
      input_payload: toJson(params.inputPayload ?? {}),
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to record agent tool call.");
  }

  return data satisfies AgentToolCallRow;
}

export async function completeAgentToolCall(
  supabase: TypedSupabaseClient,
  params: {
    toolCallId: string;
    status: Database["public"]["Enums"]["agent_tool_call_status"];
    outputPayload?: Record<string, unknown>;
    errorPayload?: Record<string, unknown>;
    startedAt?: Date;
  },
) {
  const completedAt = new Date();
  const patch: Database["public"]["Tables"]["agent_tool_calls"]["Update"] = {
    status: params.status,
    completed_at: completedAt.toISOString(),
  };

  if (params.outputPayload !== undefined) {
    patch.output_payload = toJson(params.outputPayload);
  }
  if (params.errorPayload !== undefined) {
    patch.error_payload = toJson(params.errorPayload);
  }
  if (params.startedAt) {
    patch.latency_ms = Math.max(0, completedAt.getTime() - params.startedAt.getTime());
  }

  const { error } = await supabase
    .from("agent_tool_calls")
    .update(patch)
    .eq("id", params.toolCallId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function recordAgentEvent(
  supabase: TypedSupabaseClient,
  params: {
    sessionId: string;
    runId?: string | null;
    taskId?: string | null;
    toolCallId?: string | null;
    organizationId?: string | null;
    workspaceId: string;
    programId?: string | null;
    eventType: AgentEventType;
    severity?: AgentEventSeverity;
    title: string;
    body?: string | null;
    eventPayload?: Record<string, unknown>;
    visibleToUser?: boolean;
  },
) {
  const { data, error } = await supabase
    .from("agent_events")
    .insert({
      session_id: params.sessionId,
      run_id: params.runId ?? null,
      task_id: params.taskId ?? null,
      tool_call_id: params.toolCallId ?? null,
      organization_id: params.organizationId ?? null,
      workspace_id: params.workspaceId,
      program_id: params.programId ?? null,
      event_type: params.eventType,
      severity: params.severity ?? "info",
      title: params.title,
      body: params.body ?? null,
      event_payload: toJson(params.eventPayload ?? {}),
      visible_to_user: params.visibleToUser ?? true,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to record agent event.");
  }

  return data satisfies AgentEventRow;
}

export async function upsertAgentMemory(
  supabase: TypedSupabaseClient,
  params: {
    sessionId?: string | null;
    organizationId?: string | null;
    workspaceId?: string | null;
    programId?: string | null;
    artifactType?: AgentArtifactType | null;
    artifactSourceTable?: string | null;
    artifactSourceId?: string | null;
    memoryScope: AgentMemoryScope;
    memoryKey: string;
    summary: string;
    memoryPayload?: Record<string, unknown>;
    confidence?: AgentMemoryConfidence;
    sourceType: AgentMemorySourceType;
    sourceRunId?: string | null;
    sourceEventId?: string | null;
    expiresAt?: string | null;
  },
) {
  let query = supabase
    .from("agent_memories")
    .select("id")
    .eq("memory_scope", params.memoryScope)
    .eq("memory_key", params.memoryKey)
    .eq("is_active", true)
    .limit(1);

  if (params.sessionId) {
    query = query.eq("session_id", params.sessionId);
  } else {
    query = query.is("session_id", null);
  }
  if (params.programId) {
    query = query.eq("program_id", params.programId);
  } else {
    query = query.is("program_id", null);
  }
  if (params.workspaceId) {
    query = query.eq("workspace_id", params.workspaceId);
  } else {
    query = query.is("workspace_id", null);
  }

  const { data: existing, error: existingError } = await query.maybeSingle();
  if (existingError) {
    throw new Error(existingError.message);
  }

  const { data, error } = await supabase
    .from("agent_memories")
    .insert({
      session_id: params.sessionId ?? null,
      organization_id: params.organizationId ?? null,
      workspace_id: params.workspaceId ?? null,
      program_id: params.programId ?? null,
      artifact_type: params.artifactType ?? null,
      artifact_source_table: params.artifactSourceTable ?? null,
      artifact_source_id: params.artifactSourceId ?? null,
      memory_scope: params.memoryScope,
      memory_key: params.memoryKey,
      summary: params.summary,
      memory_payload: toJson(params.memoryPayload ?? {}),
      confidence: params.confidence ?? "medium",
      source_type: params.sourceType,
      source_run_id: params.sourceRunId ?? null,
      source_event_id: params.sourceEventId ?? null,
      superseded_by: null,
      is_active: true,
      expires_at: params.expiresAt ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to save agent memory.");
  }

  if (existing?.id) {
    await supabase
      .from("agent_memories")
      .update({
        is_active: false,
        superseded_by: data.id,
      })
      .eq("id", existing.id);
  }

  return data.id;
}

export async function registerAgentArtifact(
  supabase: TypedSupabaseClient,
  params: {
    sessionId: string;
    runId?: string | null;
    taskId?: string | null;
    organizationId?: string | null;
    workspaceId: string;
    programId?: string | null;
    artifactType: AgentArtifactType;
    status?: AgentArtifactStatus;
    sourceTable: string;
    sourceId: string;
    versionLabel?: string | null;
    title?: string | null;
    summary?: string | null;
    artifactPayload?: Record<string, unknown>;
    createdByRunId?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("agent_artifacts")
    .insert({
      session_id: params.sessionId,
      run_id: params.runId ?? null,
      task_id: params.taskId ?? null,
      organization_id: params.organizationId ?? null,
      workspace_id: params.workspaceId,
      program_id: params.programId ?? null,
      artifact_type: params.artifactType,
      status: params.status ?? "draft",
      source_table: params.sourceTable,
      source_id: params.sourceId,
      version_label: params.versionLabel ?? null,
      title: params.title ?? null,
      summary: params.summary ?? null,
      artifact_payload: toJson(params.artifactPayload ?? {}),
      created_by_run_id: params.createdByRunId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to register agent artifact.");
  }

  return data.id;
}
