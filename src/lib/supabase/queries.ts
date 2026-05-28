import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

export type WorkspaceAccessRow = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  workspaceRole: Database["public"]["Enums"]["workspace_membership_role"];
  organizationId: string;
  organizationName: string;
};

export type ProgramAccessRow = {
  id: string;
  name: string;
  slug: string;
  status: Database["public"]["Enums"]["program_status"];
  visibility: Database["public"]["Enums"]["visibility_scope"];
  programType: string;
  shortDescription: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  submissionClosesAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
};

export type ProgramDetailRow = {
  id: string;
  name: string;
  slug: string;
  status: Database["public"]["Enums"]["program_status"];
  visibility: Database["public"]["Enums"]["visibility_scope"];
  programType: string;
  shortDescription: string | null;
  longDescription: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
};

export type LandingPageVersionSummary = {
  id: string;
  versionNumber: number;
  status: Database["public"]["Enums"]["landing_page_status"];
  createdAt: string;
};

export type LandingPageSectionRow = {
  id: string;
  sectionKey: string;
  displayOrder: number;
  isEnabled: boolean;
  content: Database["public"]["Tables"]["landing_page_sections"]["Row"]["content"];
};

export type LandingPageManagerData = {
  landingPage: Database["public"]["Tables"]["landing_pages"]["Row"] | null;
  versions: LandingPageVersionSummary[];
  activeDraftVersionId: string | null;
  activeDraftVersionNumber: number | null;
  publishedVersionId: string | null;
  sections: LandingPageSectionRow[];
};

export type AgentSessionSummary = {
  id: string;
  briefId: string | null;
  workspaceId: string;
  title: string | null;
  status: Database["public"]["Enums"]["agent_session_status"];
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentMessageSummary = {
  id: string;
  role: Database["public"]["Enums"]["agent_message_role"];
  kind: Database["public"]["Enums"]["agent_message_kind"];
  contentText: string | null;
  contentPayload: Database["public"]["Tables"]["agent_messages"]["Row"]["content_payload"];
  createdAt: string;
};

export type ProgramBriefSummary = {
  id: string;
  organizationId: string | null;
  workspaceId: string;
  programId: string | null;
  title: string | null;
  detectedProgramType: string | null;
  status: Database["public"]["Enums"]["brief_status"];
  confidenceLevel: string;
  currentBrief: Database["public"]["Tables"]["program_briefs"]["Row"]["current_brief"];
  assumptions: Database["public"]["Tables"]["program_briefs"]["Row"]["assumptions"];
  openQuestions: Database["public"]["Tables"]["program_briefs"]["Row"]["open_questions"];
  activeVersionId: string | null;
  activePlanId: string | null;
  updatedAt: string;
};

export type ProgramPlanSummary = {
  id: string;
  title: string | null;
  summary: string | null;
  status: Database["public"]["Enums"]["plan_status"];
  planPayload: Database["public"]["Tables"]["program_plans"]["Row"]["plan_payload"];
  assumptions: Database["public"]["Tables"]["program_plans"]["Row"]["assumptions"];
  approvalRequirements: Database["public"]["Tables"]["program_plans"]["Row"]["approval_requirements"];
  createdAt: string;
  updatedAt: string;
};

export type ProgramPlanItemSummary = {
  id: string;
  itemKey: string;
  itemType: string;
  title: string;
  description: string | null;
  displayOrder: number;
  requiresApproval: boolean;
  payload: Database["public"]["Tables"]["program_plan_items"]["Row"]["payload"];
};

export type ApprovalRequestSummary = {
  id: string;
  title: string;
  summary: string | null;
  status: Database["public"]["Enums"]["approval_status"];
  riskLevel: Database["public"]["Enums"]["ai_risk_level"];
  requestedAt: string;
  reviewedAt: string | null;
};

export type ApprovalRequestItemSummary = {
  id: string;
  title: string;
  description: string | null;
  itemKey: string;
  itemType: string;
  status: Database["public"]["Enums"]["approval_status"];
  payload: Database["public"]["Tables"]["approval_request_items"]["Row"]["payload"];
  createdAt: string;
};

export type ExecutionRunSummary = {
  id: string;
  status: Database["public"]["Enums"]["execution_status"];
  executionKind: string;
  summary: string | null;
  outputPayload: Database["public"]["Tables"]["execution_runs"]["Row"]["output_payload"];
  errorPayload: Database["public"]["Tables"]["execution_runs"]["Row"]["error_payload"];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type ExecutionRunStepSummary = {
  id: string;
  executionRunId: string;
  stepKey: string;
  stepType: string;
  title: string;
  displayOrder: number;
  status: Database["public"]["Enums"]["execution_status"];
  targetType: string | null;
  targetId: string | null;
  outputPayload: Database["public"]["Tables"]["execution_run_steps"]["Row"]["output_payload"];
  errorPayload: Database["public"]["Tables"]["execution_run_steps"]["Row"]["error_payload"];
};

export type ProgramBriefVersionSummary = {
  id: string;
  versionNumber: number;
  confidenceLevel: string;
  source: Database["public"]["Enums"]["brief_source"];
  structuredBrief: Database["public"]["Tables"]["program_brief_versions"]["Row"]["structured_brief"];
  assumptions: Database["public"]["Tables"]["program_brief_versions"]["Row"]["assumptions"];
  openQuestions: Database["public"]["Tables"]["program_brief_versions"]["Row"]["open_questions"];
  createdAt: string;
};

export type AgentCreateWorkspaceData = {
  workspaces: WorkspaceAccessRow[];
  selectedWorkspace: WorkspaceAccessRow | null;
  sessions: AgentSessionSummary[];
  activeSession: AgentSessionSummary | null;
  messages: AgentMessageSummary[];
  brief: ProgramBriefSummary | null;
  plan: ProgramPlanSummary | null;
  planItems: ProgramPlanItemSummary[];
  approvals: ApprovalRequestSummary[];
  executionRuns: ExecutionRunSummary[];
  latestExecutionSteps: ExecutionRunStepSummary[];
};

export async function getCurrentUserOrNull(supabase: TypedSupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getWorkspaceAccessRows(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const { data, error } = await supabase
    .from("workspace_memberships")
    .select(
      "workspace_id, role, status, workspaces!inner(id, name, slug, organization_id, organizations!inner(name))",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    workspaceId: row.workspace_id,
    workspaceName: row.workspaces.name,
    workspaceSlug: row.workspaces.slug,
    workspaceRole: row.role,
    organizationId: row.workspaces.organization_id,
    organizationName: row.workspaces.organizations.name,
  })) satisfies WorkspaceAccessRow[];
}

export async function hasWorkspaceAccess(
  supabase: TypedSupabaseClient,
  user: User,
) {
  const memberships = await getWorkspaceAccessRows(supabase, user);
  return memberships.length > 0;
}

export async function getAgentCreateWorkspaceData(
  supabase: TypedSupabaseClient,
  user: User,
  options?: {
    sessionId?: string | null;
    workspaceId?: string | null;
  },
) {
  const workspaces = await getWorkspaceAccessRows(supabase, user);

  if (workspaces.length === 0) {
    return {
      workspaces,
      selectedWorkspace: null,
      sessions: [],
      activeSession: null,
      messages: [],
      brief: null,
      plan: null,
      planItems: [],
      approvals: [],
      executionRuns: [],
      latestExecutionSteps: [],
    } satisfies AgentCreateWorkspaceData;
  }

  const fallbackWorkspace =
    workspaces.find((workspace) => workspace.workspaceId === options?.workspaceId) ??
    workspaces[0];

  const { data: sessions, error: sessionsError } = await supabase
    .from("agent_sessions")
    .select("id, brief_id, workspace_id, title, status, last_message_at, created_at, updated_at")
    .eq("created_by", user.id)
    .order("updated_at", { ascending: false })
    .limit(16);

  if (sessionsError) {
    throw sessionsError;
  }

  const mappedSessions = (sessions ?? []).map((session) => ({
    id: session.id,
    briefId: session.brief_id,
    workspaceId: session.workspace_id,
    title: session.title,
    status: session.status,
    lastMessageAt: session.last_message_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  })) satisfies AgentSessionSummary[];

  let activeSession =
    mappedSessions.find((session) => session.id === options?.sessionId) ??
    mappedSessions.find((session) => session.workspaceId === fallbackWorkspace.workspaceId) ??
    mappedSessions[0] ??
    null;

  if (!activeSession && options?.sessionId) {
    const { data: explicitSession, error: explicitSessionError } = await supabase
      .from("agent_sessions")
      .select("id, brief_id, workspace_id, title, status, last_message_at, created_at, updated_at")
      .eq("id", options.sessionId)
      .eq("created_by", user.id)
      .maybeSingle();

    if (explicitSessionError) {
      throw explicitSessionError;
    }

    if (explicitSession) {
      activeSession = {
        id: explicitSession.id,
        briefId: explicitSession.brief_id,
        workspaceId: explicitSession.workspace_id,
        title: explicitSession.title,
        status: explicitSession.status,
        lastMessageAt: explicitSession.last_message_at,
        createdAt: explicitSession.created_at,
        updatedAt: explicitSession.updated_at,
      } satisfies AgentSessionSummary;
    }
  }

  const selectedWorkspace =
    workspaces.find(
      (workspace) =>
        workspace.workspaceId ===
        (activeSession?.workspaceId ?? fallbackWorkspace.workspaceId),
    ) ?? fallbackWorkspace;

  if (!activeSession) {
    return {
      workspaces,
      selectedWorkspace,
      sessions: mappedSessions,
      activeSession: null,
      messages: [],
      brief: null,
      plan: null,
      planItems: [],
      approvals: [],
      executionRuns: [],
      latestExecutionSteps: [],
    } satisfies AgentCreateWorkspaceData;
  }

  const { data: messageRows, error: messagesError } = await supabase
    .from("agent_messages")
    .select("id, role, kind, content_text, content_payload, created_at")
    .eq("session_id", activeSession.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw messagesError;
  }

  const messages = (messageRows ?? []).map((message) => ({
    id: message.id,
    role: message.role,
    kind: message.kind,
    contentText: message.content_text,
    contentPayload: message.content_payload,
    createdAt: message.created_at,
  })) satisfies AgentMessageSummary[];

  if (!activeSession.briefId) {
    return {
      workspaces,
      selectedWorkspace,
      sessions: mappedSessions,
      activeSession,
      messages,
      brief: null,
      plan: null,
      planItems: [],
      approvals: [],
      executionRuns: [],
      latestExecutionSteps: [],
    } satisfies AgentCreateWorkspaceData;
  }

  const { data: briefRow, error: briefError } = await supabase
    .from("program_briefs")
    .select(
      "id, organization_id, workspace_id, program_id, title, detected_program_type, status, confidence_level, current_brief, assumptions, open_questions, active_version_id, active_plan_id, updated_at",
    )
    .eq("id", activeSession.briefId)
    .maybeSingle();

  if (briefError) {
    throw briefError;
  }

  if (!briefRow) {
    return {
      workspaces,
      selectedWorkspace,
      sessions: mappedSessions,
      activeSession,
      messages,
      brief: null,
      plan: null,
      planItems: [],
      approvals: [],
      executionRuns: [],
      latestExecutionSteps: [],
    } satisfies AgentCreateWorkspaceData;
  }

  const brief = {
    id: briefRow.id,
    organizationId: briefRow.organization_id,
    workspaceId: briefRow.workspace_id,
    programId: briefRow.program_id,
    title: briefRow.title,
    detectedProgramType: briefRow.detected_program_type,
    status: briefRow.status,
    confidenceLevel: briefRow.confidence_level,
    currentBrief: briefRow.current_brief,
    assumptions: briefRow.assumptions,
    openQuestions: briefRow.open_questions,
    activeVersionId: briefRow.active_version_id,
    activePlanId: briefRow.active_plan_id,
    updatedAt: briefRow.updated_at,
  } satisfies ProgramBriefSummary;

  let plan: ProgramPlanSummary | null = null;
  let planItems: ProgramPlanItemSummary[] = [];

  if (brief.activePlanId) {
    const [{ data: planRow, error: planError }, { data: itemRows, error: itemError }] =
      await Promise.all([
        supabase
          .from("program_plans")
          .select(
            "id, title, summary, status, plan_payload, assumptions, approval_requirements, created_at, updated_at",
          )
          .eq("id", brief.activePlanId)
          .maybeSingle(),
        supabase
          .from("program_plan_items")
          .select(
            "id, item_key, item_type, title, description, display_order, requires_approval, payload",
          )
          .eq("plan_id", brief.activePlanId)
          .order("display_order", { ascending: true }),
      ]);

    if (planError) {
      throw planError;
    }

    if (itemError) {
      throw itemError;
    }

    if (planRow) {
      plan = {
        id: planRow.id,
        title: planRow.title,
        summary: planRow.summary,
        status: planRow.status,
        planPayload: planRow.plan_payload,
        assumptions: planRow.assumptions,
        approvalRequirements: planRow.approval_requirements,
        createdAt: planRow.created_at,
        updatedAt: planRow.updated_at,
      } satisfies ProgramPlanSummary;
    }

    planItems = (itemRows ?? []).map((item) => ({
      id: item.id,
      itemKey: item.item_key,
      itemType: item.item_type,
      title: item.title,
      description: item.description,
      displayOrder: item.display_order,
      requiresApproval: item.requires_approval,
      payload: item.payload,
    })) satisfies ProgramPlanItemSummary[];
  }

  const [
    { data: approvalRows, error: approvalError },
    { data: executionRows, error: executionError },
  ] = await Promise.all([
    supabase
      .from("approval_requests")
      .select("id, title, summary, status, risk_level, requested_at, reviewed_at")
      .eq("brief_id", brief.id)
      .order("requested_at", { ascending: false })
      .limit(8),
    supabase
      .from("execution_runs")
      .select(
        "id, status, execution_kind, summary, output_payload, error_payload, started_at, completed_at, created_at",
      )
      .eq("brief_id", brief.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (approvalError) {
    throw approvalError;
  }

  if (executionError) {
    throw executionError;
  }

  const approvals = (approvalRows ?? []).map((approval) => ({
    id: approval.id,
    title: approval.title,
    summary: approval.summary,
    status: approval.status,
    riskLevel: approval.risk_level,
    requestedAt: approval.requested_at,
    reviewedAt: approval.reviewed_at,
  })) satisfies ApprovalRequestSummary[];

  const executionRuns = (executionRows ?? []).map((run) => ({
    id: run.id,
    status: run.status,
    executionKind: run.execution_kind,
    summary: run.summary,
    outputPayload: run.output_payload,
    errorPayload: run.error_payload,
    startedAt: run.started_at,
    completedAt: run.completed_at,
    createdAt: run.created_at,
  })) satisfies ExecutionRunSummary[];

  let latestExecutionSteps: ExecutionRunStepSummary[] = [];

  if (executionRuns[0]) {
    const { data: stepRows, error: stepError } = await supabase
      .from("execution_run_steps")
      .select(
        "id, execution_run_id, step_key, step_type, title, display_order, status, target_type, target_id, output_payload, error_payload",
      )
      .eq("execution_run_id", executionRuns[0].id)
      .order("display_order", { ascending: true });

    if (stepError) {
      throw stepError;
    }

    latestExecutionSteps = (stepRows ?? []).map((step) => ({
      id: step.id,
      executionRunId: step.execution_run_id,
      stepKey: step.step_key,
      stepType: step.step_type,
      title: step.title,
      displayOrder: step.display_order,
      status: step.status,
      targetType: step.target_type,
      targetId: step.target_id,
      outputPayload: step.output_payload,
      errorPayload: step.error_payload,
    })) satisfies ExecutionRunStepSummary[];
  }

  return {
    workspaces,
    selectedWorkspace,
    sessions: mappedSessions,
    activeSession,
    messages,
    brief,
    plan,
    planItems,
    approvals,
    executionRuns,
    latestExecutionSteps,
  } satisfies AgentCreateWorkspaceData;
}

export async function getProgramAccessRows(supabase: TypedSupabaseClient) {
  const { data, error } = await supabase
    .from("programs")
    .select(
      "id, name, slug, status, visibility, program_type, short_description, registration_opens_at, registration_closes_at, submission_closes_at, starts_at, ends_at, workspace_id, workspaces!inner(id, name, slug)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    visibility: row.visibility,
    programType: row.program_type,
    shortDescription: row.short_description,
    registrationOpensAt: row.registration_opens_at,
    registrationClosesAt: row.registration_closes_at,
    submissionClosesAt: row.submission_closes_at,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    workspaceId: row.workspace_id,
    workspaceName: row.workspaces.name,
    workspaceSlug: row.workspaces.slug,
  })) satisfies ProgramAccessRow[];
}

export async function getProgramBriefVersions(
  supabase: TypedSupabaseClient,
  briefId: string,
) {
  const { data, error } = await supabase
    .from("program_brief_versions")
    .select(
      "id, version_number, confidence_level, source, structured_brief, assumptions, open_questions, created_at",
    )
    .eq("brief_id", briefId)
    .order("version_number", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((version) => ({
    id: version.id,
    versionNumber: version.version_number,
    confidenceLevel: version.confidence_level,
    source: version.source,
    structuredBrief: version.structured_brief,
    assumptions: version.assumptions,
    openQuestions: version.open_questions,
    createdAt: version.created_at,
  })) satisfies ProgramBriefVersionSummary[];
}

export async function getApprovalRequestItems(
  supabase: TypedSupabaseClient,
  approvalRequestId: string,
) {
  const { data, error } = await supabase
    .from("approval_request_items")
    .select("id, title, description, item_key, item_type, status, payload, created_at")
    .eq("approval_request_id", approvalRequestId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    itemKey: item.item_key,
    itemType: item.item_type,
    status: item.status,
    payload: item.payload,
    createdAt: item.created_at,
  })) satisfies ApprovalRequestItemSummary[];
}

export async function getExecutionRunDetail(
  supabase: TypedSupabaseClient,
  runId: string,
) {
  const [{ data: run, error: runError }, { data: steps, error: stepsError }] =
    await Promise.all([
      supabase
        .from("execution_runs")
        .select(
          "id, status, execution_kind, summary, output_payload, error_payload, started_at, completed_at, created_at",
        )
        .eq("id", runId)
        .maybeSingle(),
      supabase
        .from("execution_run_steps")
        .select(
          "id, execution_run_id, step_key, step_type, title, display_order, status, target_type, target_id, output_payload, error_payload",
        )
        .eq("execution_run_id", runId)
        .order("display_order", { ascending: true }),
    ]);

  if (runError) {
    throw runError;
  }

  if (stepsError) {
    throw stepsError;
  }

  return {
    run: run
      ? ({
          id: run.id,
          status: run.status,
          executionKind: run.execution_kind,
          summary: run.summary,
          outputPayload: run.output_payload,
          errorPayload: run.error_payload,
          startedAt: run.started_at,
          completedAt: run.completed_at,
          createdAt: run.created_at,
        } satisfies ExecutionRunSummary)
      : null,
    steps: (steps ?? []).map((step) => ({
      id: step.id,
      executionRunId: step.execution_run_id,
      stepKey: step.step_key,
      stepType: step.step_type,
      title: step.title,
      displayOrder: step.display_order,
      status: step.status,
      targetType: step.target_type,
      targetId: step.target_id,
      outputPayload: step.output_payload,
      errorPayload: step.error_payload,
    })) satisfies ExecutionRunStepSummary[],
  };
}

export async function getProgramById(
  supabase: TypedSupabaseClient,
  programId: string,
) {
  const { data, error } = await supabase
    .from("programs")
    .select(
      "id, name, slug, status, visibility, program_type, short_description, long_description, workspace_id, workspaces!inner(id, name, slug)",
    )
    .eq("id", programId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    status: data.status,
    visibility: data.visibility,
    programType: data.program_type,
    shortDescription: data.short_description,
    longDescription: data.long_description,
    workspaceId: data.workspace_id,
    workspaceName: data.workspaces.name,
    workspaceSlug: data.workspaces.slug,
  } satisfies ProgramDetailRow;
}

export async function getLandingPageManagerData(
  supabase: TypedSupabaseClient,
  programId: string,
) {
  const { data: landingPage, error: landingPageError } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("program_id", programId)
    .maybeSingle();

  if (landingPageError) {
    throw landingPageError;
  }

  if (!landingPage) {
    return {
      landingPage: null,
      versions: [],
      activeDraftVersionId: null,
      activeDraftVersionNumber: null,
      publishedVersionId: null,
      sections: [],
    } satisfies LandingPageManagerData;
  }

  const { data: versions, error: versionsError } = await supabase
    .from("landing_page_versions")
    .select("id, version_number, status, created_at")
    .eq("landing_page_id", landingPage.id)
    .order("version_number", { ascending: false });

  if (versionsError) {
    throw versionsError;
  }

  const activeDraftVersion =
    versions?.find((version) => version.status === "draft" || version.status === "preview") ??
    versions?.[0] ??
    null;

  const { data: sections, error: sectionsError } = activeDraftVersion
    ? await supabase
        .from("landing_page_sections")
        .select("id, section_key, display_order, is_enabled, content")
        .eq("landing_page_version_id", activeDraftVersion.id)
        .order("display_order", { ascending: true })
    : { data: [], error: null };

  if (sectionsError) {
    throw sectionsError;
  }

  return {
    landingPage,
    versions: (versions ?? []).map((version) => ({
      id: version.id,
      versionNumber: version.version_number,
      status: version.status,
      createdAt: version.created_at,
    })),
    activeDraftVersionId: activeDraftVersion?.id ?? null,
    activeDraftVersionNumber: activeDraftVersion?.version_number ?? null,
    publishedVersionId: landingPage.published_version_id,
    sections: (sections ?? []).map((section) => ({
      id: section.id,
      sectionKey: section.section_key,
      displayOrder: section.display_order,
      isEnabled: section.is_enabled,
      content: section.content,
    })),
  } satisfies LandingPageManagerData;
}

export async function getPublishedLandingPageBySlug(
  supabase: TypedSupabaseClient,
  slug: string,
) {
  const { data: publishedPage, error: publishedPageError } = await supabase
    .from("published_pages")
    .select("id, program_id, landing_page_id, landing_page_version_id, slug, published_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (publishedPageError) {
    throw publishedPageError;
  }

  if (!publishedPage) {
    return null;
  }

  const [{ data: program, error: programError }, { data: landingPage, error: landingPageError }, { data: sections, error: sectionsError }] =
    await Promise.all([
      supabase
        .from("programs")
        .select("id, name, slug, short_description")
        .eq("id", publishedPage.program_id)
        .single(),
      supabase
        .from("landing_pages")
        .select("title, seo_title, seo_description, theme_key, published_slug, brand_config")
        .eq("id", publishedPage.landing_page_id)
        .single(),
      supabase
        .from("landing_page_sections")
        .select("id, section_key, display_order, is_enabled, content")
        .eq("landing_page_version_id", publishedPage.landing_page_version_id)
        .eq("is_enabled", true)
        .order("display_order", { ascending: true }),
    ]);

  if (programError) {
    throw programError;
  }

  if (landingPageError) {
    throw landingPageError;
  }

  if (sectionsError) {
    throw sectionsError;
  }

  return {
    publishedPage,
    program,
    landingPage,
    sections: sections ?? [],
  };
}
