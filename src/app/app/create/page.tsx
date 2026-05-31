import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AssetStatusBadge,
  deriveAssets,
} from "@/app/app/create/_components/assets-review-workspace";
import { CreateWorkspaceLive } from "@/app/app/create/_components/create-workspace-live";
import { buildWorkspaceHref } from "@/app/app/create/_components/session-screen-primitives";
import { WorkspaceAssetCanvas } from "@/app/app/create/_components/workspace-asset-canvas";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import {
  readSetupProgress,
  type SetupProgress,
  type SetupStageStatus,
} from "@/lib/pm-workspace/setup-progress";
import {
  getAgentCreateWorkspaceData,
  getApprovalRequestItems,
  getCurrentUserOrNull,
  getInitialOnboardingState,
  getProgramAccessRows,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreatePageProps = {
  searchParams?: Promise<{
    session?: string;
    workspace?: string;
    status?: string;
    error?: string;
    prompt?: string;
    panel?: string;
    asset?: string;
    name?: string;
  }>;
};

type WorkspaceLandingPageEditorMessage = {
  id: string;
  role: "user" | "assistant";
  contentText: string;
  createdAt: string;
};

type WorkspaceStageTone = "amber" | "gold" | "green";
type ActiveArtifact = "brief" | "plan" | "assets" | "approvals";
type WorkspacePrimaryAction =
  | {
      kind:
        | "generate_plan"
        | "prepare_approvals"
        | "review_approvals"
        | "execute_approved_plan";
      label: string;
      approvalRequestId?: string | null;
    }
  | null;

type WorkspaceSecondaryLink = {
  href: string;
  label: string;
} | null;

type DerivedWorkspaceState = {
  stage: {
    label: string;
    tone: WorkspaceStageTone;
  };
  activeArtifact: ActiveArtifact;
  primaryAction: WorkspacePrimaryAction;
  secondaryLink: WorkspaceSecondaryLink;
  footerHint: string | null;
};

const statusCopy: Record<string, string> = {
  "brief-updated":
    "The PM agent updated the structured brief and captured the next operational questions.",
  "brief-ready":
    "The brief now has enough structure to draft a serious execution plan.",
  "plan-generated":
    "The execution plan is ready. Review the milestones and approval gates, then generate launch assets or prepare the approval packet.",
  "assets-generated":
    "The requested launch-kit drafts are ready for PM review in the assets workspace.",
  "approval-packet-ready":
    "The approval packet is ready. Review the governed items and approve to proceed with deterministic execution.",
  "approval-approved":
    "The approval packet is approved. The PM workspace can now move into deterministic execution.",
  "approval-rejected":
    "The approval packet was rejected. Refine the plan or the brief before proceeding.",
  "execution-complete":
    "The approved program foundation executed successfully.",
  "execution-partial":
    "The approved foundation executed successfully, with some downstream executors still pending implementation.",
  "workspace-guidance":
    "Innova reviewed the current workspace state and recommended the next operator action.",
  "live-ops-proposed":
    "Innova proposed a live change. Review it in the thread and click Apply to execute.",
  "live-ops-applied":
    "The live program change was applied successfully.",
};

const templates = [
  {
    name: "Employee Hackathon",
    description: "Time-boxed internal sprint with team formation and judging rounds",
    badge: "Most popular",
    iconClass: "bg-[#b08a2812] text-[#ccaa4a] border border-[#b08a2838]",
    prompt:
      "Create an employee hackathon for our organization with team formation, registration, submission, two judging rounds, and a sponsor-safe final report.",
  },
  {
    name: "Open Innovation Call",
    description: "External submissions with screening, scoring, and sponsor reporting",
    badge: "External",
    iconClass: "bg-[#19304e] text-[#7bb4f0] border border-[#26496f]",
    prompt:
      "Create an open innovation challenge for external applicants with public registration, submission screening, judging, and sponsor reporting.",
  },
  {
    name: "Corporate Accelerator",
    description: "Multi-cohort program with mentorship tracks and milestone gates",
    badge: "Multi-phase",
    iconClass: "bg-[#173125] text-[#8dd6b4] border border-[#285941]",
    prompt:
      "Create a corporate accelerator with cohort selection, mentor tracks, milestone reviews, judging, and executive reporting.",
  },
  {
    name: "Venture Client Scouting",
    description: "Structured startup scouting with pilot agreements and sponsor reports",
    badge: "External",
    iconClass: "bg-[#2f2515] text-[#d4b062] border border-[#54401f]",
    prompt:
      "Set up a venture client scouting program to source startups, review submissions, coordinate judging, and prepare sponsor-safe reports.",
  },
  {
    name: "Incubator Program",
    description: "Cohort-based incubation with workspace, mentors, and demo day",
    badge: "Long-form",
    iconClass: "bg-white/[0.03] text-[#9baabf] border border-white/10",
    prompt:
      "Create an incubator program with applications, mentor sessions, milestone checkpoints, submission review, and demo day preparation.",
  },
  {
    name: "Custom / Hybrid",
    description: "Describe any combination and Innova will configure from scratch",
    badge: "Blank slate",
    iconClass: "bg-white/[0.03] text-[#9baabf] border border-white/10",
    prompt:
      "Help me design a custom innovation program. I want to define the format, timeline, participant flow, judging, and reporting requirements from scratch.",
  },
] as const;

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const onboarding = await getInitialOnboardingState(supabase, user);

  if (!onboarding.isComplete) {
    redirect("/app/onboarding");
  }

  const data = await getAgentCreateWorkspaceData(supabase, user, {
    sessionId: params.session,
    workspaceId: params.workspace,
  });
  const programs = await getProgramAccessRows(supabase);

  const selectedWorkspace = data.selectedWorkspace ?? data.workspaces[0];
  const activeSession = data.activeSession;
  const setupProgress = readSetupProgress(activeSession?.sessionMetadata ?? null);

  // If ?workspace= is present without ?session=, the PM explicitly wants a blank
  // new program — don't auto-resume the most recent session.
  const forceNewSession = Boolean(params.workspace) && !params.session && !params.prompt;
  const activeSessionId = forceNewSession ? null : (activeSession?.id ?? null);
  const latestApproval = data.approvals[0] ?? null;
  const approvalItems = latestApproval
    ? await getApprovalRequestItems(supabase, latestApproval.id)
    : [];
  const hasPendingApproval = data.approvals.some((approval) => approval.status === "pending");
  const hasApprovalHistory = data.approvals.length > 0;

  // hasBriefWithContent requires actual structured content — not just a bare
  // program_briefs row (which is created the moment the first message is sent,
  // before the AI has generated anything).
  const hasBriefWithContent =
    Boolean(data.brief) &&
    data.brief?.currentBrief != null &&
    typeof data.brief.currentBrief === "object" &&
    !Array.isArray(data.brief.currentBrief) &&
    Object.keys(data.brief.currentBrief as Record<string, unknown>).length > 0;

  const canGeneratePlan =
    Boolean(activeSessionId) &&
    hasBriefWithContent &&
    (data.brief?.status === "collecting_requirements" ||
      data.brief?.status === "ready_for_plan" ||
      data.brief?.status === "plan_generated") &&
    !data.plan;
  const canPrepareApprovals =
    Boolean(activeSessionId) && Boolean(data.plan) && data.approvals.length === 0;
  const canExecuteApprovedPlan =
    Boolean(activeSessionId) && latestApproval?.status === "approved";
  const briefOpenQuestionCount = Array.isArray(data.brief?.openQuestions)
    ? data.brief.openQuestions.length
    : 0;
  const userName = user.user_metadata.full_name ?? user.email ?? "Operator";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "O";

  const workspaceState = deriveWorkspaceState({
    requestedPanel: params.panel,
    sessionId: activeSessionId,
    setupProgress,
    hasBrief: hasBriefWithContent,
    hasPlan: Boolean(data.plan),
    openQuestionCount: briefOpenQuestionCount,
    hasApprovalRequest: hasApprovalHistory,
    hasPendingApproval,
    canGeneratePlan,
    canPrepareApprovals,
    canExecuteApprovedPlan,
    hasApprovals: hasApprovalHistory || canExecuteApprovedPlan,
    latestApprovalId: latestApproval?.id ?? null,
  });
  const stage = workspaceState.stage;
  const activeArtifact = workspaceState.activeArtifact;
  const assets = deriveAssets(
    data.planItems,
    approvalItems,
    data.latestExecutionSteps,
    data.artifacts,
  );
  const selectedWorkspaceAsset =
    activeArtifact === "assets" && params.asset
      ? assets.find((asset) => asset.itemKey === params.asset) ?? null
      : null;
  const landingPageWorkspaceAsset =
    assets.find((asset) => asset.editorSurface === "landing-page") ?? null;
  const landingPageEditorMessages: WorkspaceLandingPageEditorMessage[] =
    selectedWorkspaceAsset?.editorSurface === "landing-page"
    ? data.messages
        .filter((message): message is typeof message & {
          role: "user" | "assistant";
          contentText: string;
        } => {
          if (
            (message.role !== "user" && message.role !== "assistant") ||
            !message.contentText
          ) {
            return false;
          }

          if (
            !message.contentPayload ||
            typeof message.contentPayload !== "object" ||
            Array.isArray(message.contentPayload)
          ) {
            return false;
          }

          const payload = message.contentPayload as Record<string, unknown>;
          return (
            payload.assetType === "landing_page" &&
            payload.assetKey === selectedWorkspaceAsset.itemKey
          );
        })
        .map((message) => ({
          id: message.id,
          role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
          contentText: message.contentText ?? "",
          createdAt: message.createdAt,
        }))
    : [];
  const inlineApprovalItems =
    hasPendingApproval && latestApproval?.status === "pending"
      ? approvalItems.map((item) => ({
          id: item.id,
          label: item.title,
          itemType: item.itemType,
          status: item.status === "approved" ? ("ok" as const) : ("pending" as const),
        }))
      : null;
  const briefRecord =
    data.brief?.currentBrief &&
    typeof data.brief.currentBrief === "object" &&
    !Array.isArray(data.brief.currentBrief)
      ? (data.brief.currentBrief as Record<string, unknown>)
      : null;
  const briefTimeline = (briefRecord?.timeline ?? {}) as Record<string, string>;
  const compactTimelineValues = [
    briefTimeline.registrationWindow,
    briefTimeline.submissionWindow,
    briefTimeline.liveProgramWindow,
  ]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  const inlineBriefTimeline =
    Array.from(new Set(compactTimelineValues))
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .slice(0, 2)
      .join(" · ") || null;
  const inlineBriefCard =
    data.brief && briefRecord
      ? {
          openQuestionCount: briefOpenQuestionCount,
          programType:
            data.brief.detectedProgramType ??
            getStringValue(briefRecord.programType) ??
            getStringValue(briefRecord.type),
          objective: getStringValue(briefRecord.objective),
          format: getStringValue(briefRecord.format),
          audience: getArrayPreview(briefRecord.targetParticipants),
          regions: getArrayPreview(briefRecord.regions),
          teamPolicy: getStringValue(briefRecord.teamPolicy),
          timeline: inlineBriefTimeline,
          judging: getStringValue(briefRecord.evaluationModel),
          output: getArrayPreview(briefRecord.deliverables) ?? inlineBriefTimeline,
        }
      : null;
  const approvalSensitiveItemCount = data.planItems.filter((item) => item.requiresApproval).length;
  const setupActiveStage = activeSessionId
    ? setupProgress.stages.find((item) => item.key === setupProgress.activeStage)
    : null;
  const panelStatusLabel = canExecuteApprovedPlan
    ? "Approved"
    : hasPendingApproval
      ? "Pending"
      : briefOpenQuestionCount > 0
        ? `${briefOpenQuestionCount} needed`
        : setupActiveStage?.status === "complete"
          ? "Complete"
          : setupActiveStage?.status === "active"
            ? "Active"
            : data.plan
              ? "Built"
              : "Draft";
  const panelStatusTone =
    panelStatusLabel === "Approved" || panelStatusLabel === "Complete"
      ? "green"
      : panelStatusLabel === "Pending" ||
          panelStatusLabel === "Active" ||
          panelStatusLabel.includes("needed")
        ? "gold"
        : "default";
  return (
    <OperatorShell
      activeNav="ai-workspace"
      headerTitle="New Program"
      headerSubtitle="Describe your program to Innova to get started"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
      sessionId={activeSessionId}
      programSetupNavOnly
      workspacePrimaryMode
      hideSidebar
      hideHeader
      mainClassName="pm-workspace-theme overflow-hidden"
      rightPanel={
        selectedWorkspaceAsset ? null : (
        <>
          {/* ── Panel header — shows current state name */}
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-b-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-surface)] px-3.5">
            <span className="text-[9px] font-bold uppercase tracking-[.1em] text-[var(--ws-t-muted)]">
              {canExecuteApprovedPlan
                ? "Ready to confirm"
                : hasPendingApproval
                  ? "Under review"
                  : setupActiveStage
                    ? setupActiveStage.label
                    : data.plan
                      ? "Program structure"
                      : hasBriefWithContent
                        ? "Brief"
                        : "Workspace"}
            </span>
            <span
              className={`ml-auto inline-flex items-center gap-1 rounded-[var(--ws-r-xs)] border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] ${
                panelStatusTone === "green"
                  ? "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]"
                  : panelStatusTone === "gold"
                    ? "border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[var(--ws-gold-bright)]"
                    : "border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] text-[var(--ws-t-muted)]"
              }`}
            >
              {panelStatusLabel}
            </span>
          </div>
          {/* ── Panel body — 4-state context-aware content */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {activeSessionId ? <SetupProgressCard progress={setupProgress} /> : null}
            {activeArtifact === "approvals" && latestApproval ? (
              <div className="space-y-3">
                <section className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-3">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--ws-gold-bright)]">
                    Approval packet
                  </div>
                  <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[var(--ws-t-primary)]">
                    {latestApproval.title ?? "Governed approval review"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SidebarPill
                      label={
                        latestApproval.status === "approved"
                          ? "Approved"
                          : latestApproval.status === "rejected"
                            ? "Rejected"
                            : "Pending review"
                      }
                      tone={
                        latestApproval.status === "approved"
                          ? "green"
                          : latestApproval.status === "rejected"
                            ? "amber"
                            : "default"
                      }
                    />
                    <SidebarPill label={`${approvalSensitiveItemCount} governed items`} muted />
                    <SidebarPill
                      label={
                        latestApproval.riskLevel
                          ? `Risk ${latestApproval.riskLevel}`
                          : "Risk medium"
                      }
                      muted
                    />
                  </div>
                  <div className="mt-3">
                    <ApprovalSummary
                      approval={latestApproval}
                      approvalSensitiveItemCount={approvalSensitiveItemCount}
                    />
                  </div>
                </section>
              </div>
            ) : activeArtifact === "plan" && data.plan ? (
              <div className="space-y-3">
                <section className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-3">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--ws-gold-bright)]">
                    Execution plan
                  </div>
                  <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[var(--ws-t-primary)]">
                    {data.plan.title ?? "Program plan"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SidebarPill label={data.plan.status ?? "Proposed"} />
                    <SidebarPill label={`${data.planItems.length} plan items`} muted />
                    <SidebarPill
                      label={`${approvalSensitiveItemCount} approval gates`}
                      tone={approvalSensitiveItemCount > 0 ? "amber" : "green"}
                    />
                  </div>
                  <div className="mt-3">
                    <PlanSummary
                      plan={data.plan}
                      planItemsCount={data.planItems.length}
                      approvalSensitiveItemCount={approvalSensitiveItemCount}
                    />
                  </div>
                </section>
              </div>
            ) : activeArtifact === "assets" && activeSessionId ? (
              <div className="space-y-3">
                <section className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-3">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--ws-gold-bright)]">
                    Launch-kit drafts
                  </div>
                  <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[var(--ws-t-primary)]">
                    Asset review workspace
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SidebarPill label={`${data.artifacts.length} generated drafts`} />
                    <SidebarPill label={`${data.planItems.length} launch items`} muted />
                    <SidebarPill
                      label={
                        hasApprovalHistory
                          ? "Packet prepared"
                          : "Ready for PM review"
                      }
                      tone={hasApprovalHistory ? "green" : "blue"}
                    />
                  </div>
                  <div className="mt-3">
                    <AssetsSummary
                      assetCount={data.artifacts.length}
                      generatedCount={data.artifacts.length}
                      planItemsCount={data.planItems.length}
                    />
                  </div>
                </section>
                {assets.length > 0 ? (
                  <section className="rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-3">
                    <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--ws-t-muted)]">
                      Select asset
                    </div>
                    <div className="space-y-2">
                      {assets.slice(0, 5).map((asset) => (
                        <Link
                          key={asset.id}
                          href={buildWorkspaceHref(activeSessionId, "assets", {
                            asset: asset.itemKey,
                          })}
                          className="block rounded-[var(--ws-r-lg)] border border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)] px-3 py-3 transition hover:border-[color:var(--ws-b-strong)] hover:bg-[var(--ws-bg-hover)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-medium text-[var(--ws-t-primary)]">
                                {asset.title}
                              </div>
                              <div className="mt-1 text-[10.5px] text-[var(--ws-t-tertiary)]">
                                {asset.meta}
                              </div>
                            </div>
                            <AssetStatusBadge tone={asset.statusTone}>
                              {asset.statusLabel}
                            </AssetStatusBadge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : hasBriefWithContent ? (
              <div>
                <section className="px-3.5 pt-3.5">
                  <div
                    className={`mb-1 text-[9px] font-bold uppercase tracking-[.13em] ${
                      briefOpenQuestionCount > 0
                        ? "text-[var(--ws-amber-bright)]"
                        : "text-[var(--ws-green-bright)]"
                    }`}
                  >
                    Structured brief
                  </div>
                  <div className="truncate text-[13px] font-bold tracking-[-0.015em] text-[var(--ws-t-primary)]">
                    {data.brief?.title ?? "Program Brief"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <SidebarPill
                      label={
                        briefOpenQuestionCount > 0
                          ? `${briefOpenQuestionCount} needed`
                          : "Ready"
                      }
                      tone={briefOpenQuestionCount > 0 ? "amber" : "green"}
                    />
                    {data.brief?.detectedProgramType ? (
                      <SidebarPill label={data.brief.detectedProgramType} muted />
                    ) : null}
                    {data.brief?.confidenceLevel ? (
                      <SidebarPill label={`Confidence ${data.brief.confidenceLevel}`} muted />
                    ) : null}
                  </div>
                </section>
                <div className="my-3 h-px bg-[var(--ws-b-subtle)]" />
                <section className="px-3.5">
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[.12em] text-[var(--ws-t-muted)]">
                    Summary
                  </div>
                  <BriefSummary brief={briefRecord} />
                </section>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[var(--ws-r-xl)] border border-dashed border-[color:var(--ws-b-default)] bg-[var(--ws-bg-card)] px-8 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[var(--ws-gold-bright)]">
                  <DocumentIcon />
                </div>
                <div className="mt-5 text-[18px] font-semibold text-[var(--ws-t-primary)]">
                  Brief will appear here
                </div>
                <p className="mt-3 max-w-[250px] text-[12px] leading-6 text-[var(--ws-t-secondary)]">
                  Describe your program in the chat and Innova will generate a structured program brief for review and approval.
                </p>
                <div className="mt-5 text-[11.5px] text-[var(--ws-t-muted)]">
                  Start by describing your program →
                </div>
              </div>
            )}
            {activeSessionId && landingPageWorkspaceAsset && !selectedWorkspaceAsset ? (
              <section className="mt-3 rounded-[var(--ws-r-lg)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] px-3 py-3">
                <div className="text-[9px] font-bold uppercase tracking-[.12em] text-[var(--ws-blue-bright)]">
                  Page editor
                </div>
                <div className="mt-1 text-[12px] font-semibold text-[var(--ws-t-primary)]">
                  {landingPageWorkspaceAsset.title}
                </div>
                <p className="mt-1.5 text-[10.5px] leading-5 text-[var(--ws-t-secondary)]">
                  Open the conversational landing-page canvas without leaving the AI Workspace.
                </p>
                <Link
                  href={buildWorkspaceHref(activeSessionId, "assets", {
                    asset: landingPageWorkspaceAsset.itemKey,
                  })}
                  className="mt-3 block rounded-[var(--ws-r-md)] border border-[color:var(--ws-blue-bdr)] bg-[var(--ws-bg-card)] px-3 py-2 text-center text-[11.5px] font-semibold text-[var(--ws-blue-bright)] transition hover:bg-[var(--ws-bg-elevated)] hover:text-[var(--ws-t-primary)]"
                >
                  Open page editor →
                </Link>
              </section>
            ) : null}
          </div>
          <div className="shrink-0 border-t border-t-[color:var(--ws-b-subtle)] px-3 py-2.5">
            <p className="text-center text-[10px] leading-relaxed text-[var(--ws-t-muted)]">
              Innova drafts · you approve · services execute
            </p>
          </div>
        </>
        )
      }
    >
      {selectedWorkspaceAsset && activeSessionId ? (
        <WorkspaceAssetCanvas
          key={`workspace-asset-canvas-${selectedWorkspaceAsset.id}-${landingPageEditorMessages.length}`}
          sessionId={activeSessionId}
          asset={selectedWorkspaceAsset}
          linkedProgramId={data.brief?.programId ?? null}
          approvalReady={hasApprovalHistory}
          executionStatus={
            data.executionRuns.length > 0
              ? data.executionRuns[0]?.status ?? "No run"
              : "No deterministic run yet"
          }
          landingPageEditorMessages={landingPageEditorMessages}
        />
      ) : (
        <CreateWorkspaceLive
          key={`workspace-live-${activeSessionId ?? "new"}-${selectedWorkspace.workspaceId}`}
          workspaceId={selectedWorkspace.workspaceId}
          sessionId={activeSessionId}
          initialSessions={data.sessions}
          initialMessages={data.messages}
          initialRuns={data.runs}
          initialEvents={data.events}
          initialPrompt={params.prompt ?? ""}
          initialProgramName={params.name ? decodeURIComponent(params.name) : null}
          initialStatus={params.status ?? null}
          initialError={params.error ?? null}
          statusCopy={statusCopy}
          templates={templates}
          stageLabel={stage.label}
          stageTone={stage.tone}
          userInitial={userInitial}
          primaryAction={workspaceState.primaryAction}
          secondaryLink={workspaceState.secondaryLink}
          inlineApprovalRequestId={hasPendingApproval ? latestApproval?.id ?? null : null}
          inlineApprovalRequestedAt={hasPendingApproval ? latestApproval?.requestedAt ?? null : null}
          inlineApprovalItems={inlineApprovalItems}
          inlineBriefCard={inlineBriefCard}
        />
      )}
    </OperatorShell>
  );
}

function EmptySidebarCopy({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--ws-r-lg)] border border-dashed border-[color:var(--ws-b-default)] bg-[var(--ws-bg-elevated)] px-3 py-3 text-[11px] leading-5 text-[var(--ws-t-secondary)]">
      {text}
    </div>
  );
}

function SetupProgressCard({ progress }: { progress: SetupProgress }) {
  const activeStage = progress.stages.find(
    (stage) => stage.key === progress.activeStage,
  );

  return (
    <section className="mb-3 rounded-[var(--ws-r-xl)] border border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-card)] px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[.13em] text-[var(--ws-blue-bright)]">
            Setup progress
          </div>
          <div className="mt-0.5 text-[12.5px] font-semibold text-[var(--ws-t-primary)]">
            {activeStage?.label ?? "Workspace"} active
          </div>
        </div>
        {progress.recommendedStage ? (
          <span className="rounded-[var(--ws-r-xs)] border border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[.06em] text-[var(--ws-gold-bright)]">
            Next
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {progress.stages.slice(0, 8).map((stage) => (
          <div
            key={stage.key}
            className={`rounded-[var(--ws-r-sm)] border px-2 py-1.5 ${setupStageClassName(stage.status)}`}
            title={stage.label}
          >
            <div className="mb-1 flex items-center gap-1">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[8px]">
                {setupStageIcon(stage.status)}
              </span>
              <span className="truncate text-[9.5px] font-semibold">
                {stage.label}
              </span>
            </div>
            <div className="truncate text-[8.5px] uppercase tracking-[.05em] opacity-75">
              {stage.status.replaceAll("_", " ")}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function setupStageClassName(status: SetupStageStatus) {
  if (status === "complete") {
    return "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]";
  }

  if (status === "active") {
    return "border-[color:var(--ws-gold-bdr)] bg-[var(--ws-gold-sub)] text-[var(--ws-gold-bright)]";
  }

  if (status === "blocked") {
    return "border-[color:var(--ws-red-bdr)] bg-[var(--ws-red-sub)] text-[var(--ws-red-bright)]";
  }

  return "border-[color:var(--ws-b-subtle)] bg-[var(--ws-bg-elevated)] text-[var(--ws-t-muted)]";
}

function setupStageIcon(status: SetupStageStatus) {
  if (status === "complete") return "✓";
  if (status === "active") return "•";
  if (status === "blocked") return "!";
  return "";
}

function BriefSummary({ brief }: { brief: unknown }) {
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    return <EmptySidebarCopy text="No structured brief has been assembled yet." />;
  }

  const briefRecord = brief as Record<string, unknown>;

  if (Object.keys(briefRecord).length === 0) {
    return <EmptySidebarCopy text="No structured brief has been assembled yet." />;
  }

  const targetParticipants = getArrayPreview(briefRecord.targetParticipants);
  const deliverables = getArrayPreview(briefRecord.deliverables);
  const regions = getArrayPreview(briefRecord.regions);
  const timeline = (briefRecord.timeline ?? {}) as Record<string, string>;
  const timelineSummary = [timeline.registrationWindow, timeline.submissionWindow, timeline.liveProgramWindow]
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .slice(0, 2)
    .join(" · ");

  return (
    <div className="space-y-0">
      <SummaryField label="Type" value={getStringValue(briefRecord.programType) ?? getStringValue(briefRecord.type) ?? "Internal Hackathon"} primary />
      <SummaryField label="Objective" value={getCompactValue(getStringValue(briefRecord.objective))} />
      <SummaryField label="Format" value={getCompactValue(getStringValue(briefRecord.format))} />
      <SummaryField label="Audience" value={getCompactValue(targetParticipants)} primary />
      <SummaryField label="Regions" value={getCompactValue(regions)} needsInput={!regions} />
      <SummaryField label="Team size" value={getCompactValue(getStringValue(briefRecord.teamPolicy))} needsInput={!getStringValue(briefRecord.teamPolicy)} />
      <SummaryField label="Judging" value={getCompactValue(getStringValue(briefRecord.evaluationModel))} />
      <SummaryField label="Output" value={getCompactValue(deliverables ?? timelineSummary)} />
    </div>
  );
}

function SummaryField({
  label,
  value,
  primary = false,
  needsInput = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
  needsInput?: boolean;
}) {
  return (
    <div className="grid grid-cols-[74px_1fr] items-start gap-x-2 border-b border-b-[color:var(--ws-b-faint)] py-1 last:border-0">
      <p className="pt-px text-[10px] font-semibold uppercase leading-[1.4] tracking-[.06em] text-[var(--ws-t-muted)]">
        {label}
      </p>
      <div
        className={`min-w-0 text-[12px] leading-[1.45] ${primary ? "text-[var(--ws-t-primary)]" : "text-[var(--ws-t-secondary)]"}`}
        title={value}
      >
        <span>{value}</span>
        {needsInput ? (
          <span className="ml-2 inline-flex items-center gap-1 rounded-[var(--ws-r-xs)] border border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--ws-amber-bright)]">
            <MiniWarnIcon />
            needed
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PlanSummary({
  plan,
  planItemsCount,
  approvalSensitiveItemCount,
}: {
  plan: {
    status: string | null;
    summary: string | null;
    planPayload: unknown;
  };
  planItemsCount: number;
  approvalSensitiveItemCount: number;
}) {
  const payload =
    plan.planPayload && typeof plan.planPayload === "object" && !Array.isArray(plan.planPayload)
      ? (plan.planPayload as Record<string, unknown>)
      : null;
  const phaseCount = Array.isArray(payload?.phases) ? payload.phases.length : 0;

  return (
    <div className="space-y-0">
      <SummaryField label="Status" value={getCompactValue(plan.status ?? "Proposed")} primary />
      <SummaryField label="Summary" value={getCompactValue(plan.summary)} />
      <SummaryField label="Phases" value={String(phaseCount)} />
      <SummaryField label="Items" value={String(planItemsCount)} />
      <SummaryField
        label="Approvals"
        value={`${approvalSensitiveItemCount} gated items`}
        needsInput={approvalSensitiveItemCount === 0}
      />
    </div>
  );
}

function AssetsSummary({
  assetCount,
  generatedCount,
  planItemsCount,
}: {
  assetCount: number;
  generatedCount: number;
  planItemsCount: number;
}) {
  return (
    <div className="space-y-0">
      <SummaryField label="Drafts" value={String(assetCount)} primary />
      <SummaryField label="Generated" value={`${generatedCount} governed assets`} />
      <SummaryField label="Plan items" value={`${planItemsCount} launch-kit tasks`} />
      <SummaryField
        label="Next"
        value={assetCount > 0 ? "Review and refine assets" : "Generate launch-kit assets"}
        needsInput={assetCount === 0}
      />
    </div>
  );
}

function ApprovalSummary({
  approval,
  approvalSensitiveItemCount,
}: {
  approval: {
    status: string;
    summary: string | null;
    requestedAt: string | null;
    reviewedAt: string | null;
  };
  approvalSensitiveItemCount: number;
}) {
  return (
    <div className="space-y-0">
      <SummaryField label="Status" value={getCompactValue(approval.status)} primary />
      <SummaryField label="Summary" value={getCompactValue(approval.summary)} />
      <SummaryField label="Items" value={`${approvalSensitiveItemCount} review items`} />
      <SummaryField
        label="Requested"
        value={getCompactValue(formatSidebarDateTime(approval.requestedAt))}
      />
      <SummaryField
        label="Reviewed"
        value={
          approval.reviewedAt
            ? getCompactValue(formatSidebarDateTime(approval.reviewedAt))
            : "Awaiting decision"
        }
        needsInput={!approval.reviewedAt}
      />
    </div>
  );
}

function SidebarPill({
  label,
  muted = false,
  tone = "default",
}: {
  label: string;
  muted?: boolean;
  tone?: "default" | "amber" | "green" | "blue";
}) {
  const toneClass =
    tone === "amber"
      ? "border-[color:var(--ws-amber-bdr)] bg-[var(--ws-amber-sub)] text-[var(--ws-amber-bright)]"
      : tone === "green"
        ? "border-[color:var(--ws-green-bdr)] bg-[var(--ws-green-sub)] text-[var(--ws-green-bright)]"
        : tone === "blue"
          ? "border-[color:var(--ws-blue-bdr)] bg-[var(--ws-blue-sub)] text-[var(--ws-blue-bright)]"
        : muted
          ? "border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] text-[var(--ws-t-muted)]"
          : "border-[color:var(--ws-b-subtle)] bg-[var(--ws-b-faint)] text-[var(--ws-t-tertiary)]";

  return (
    <span
      className={`inline-flex items-center rounded-[var(--ws-r-xs)] border px-[7px] py-0.5 text-[9px] font-bold uppercase tracking-[.06em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

function DocumentIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9 1.5Z" />
      <path d="M9 1.5v4h4M5 9h6M5 12h4" />
    </svg>
  );
}

function MiniWarnIcon() {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 1 1 14h14L8 1z" />
      <path d="M8 7v3" />
    </svg>
  );
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getArrayPreview(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").join(", ")
    : null;
}

function getCompactValue(value?: string | null) {
  if (!value || value.trim().length === 0) {
    return "Not set";
  }

  return value.length > 100 ? `${value.slice(0, 97)}...` : value;
}

function formatSidebarDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-SG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function deriveStageFromSetupProgress(
  progress: SetupProgress,
  context: {
    canExecuteApprovedPlan: boolean;
    hasPendingApproval: boolean;
    hasApprovalRequest: boolean;
    hasPlan: boolean;
  },
) {
  if (context.canExecuteApprovedPlan) {
    return { label: "Ready to execute", tone: "green" as const };
  }

  if (context.hasPendingApproval) {
    return { label: "Ready to review", tone: "gold" as const };
  }

  const activeStage = progress.stages.find(
    (stage) => stage.key === progress.activeStage,
  );

  if (!activeStage) {
    return context.hasPlan
      ? { label: "Plan ready", tone: "green" as const }
      : { label: "Brief ready", tone: "green" as const };
  }

  if (activeStage.key === "brief") {
    return activeStage.status === "complete"
      ? { label: "Brief ready", tone: "green" as const }
      : { label: "Drafting brief", tone: "gold" as const };
  }

  if (activeStage.key === "approval") {
    return context.hasApprovalRequest
      ? { label: "Ready to review", tone: "gold" as const }
      : { label: "Approvals next", tone: "gold" as const };
  }

  if (activeStage.key === "execution") {
    return { label: "Ready to execute", tone: "green" as const };
  }

  const label =
    activeStage.status === "complete"
      ? `${activeStage.label} ready`
      : `${activeStage.label} next`;

  return {
    label,
    tone: activeStage.status === "complete" ? ("green" as const) : ("gold" as const),
  };
}

function deriveWorkspaceState({
  requestedPanel,
  sessionId,
  setupProgress,
  hasBrief,
  hasPlan,
  openQuestionCount,
  hasApprovalRequest,
  hasPendingApproval,
  canGeneratePlan,
  canPrepareApprovals,
  canExecuteApprovedPlan,
  hasApprovals,
  latestApprovalId,
}: {
  requestedPanel?: string;
  sessionId: string | null;
  setupProgress?: SetupProgress;
  hasBrief: boolean;
  hasPlan: boolean;
  openQuestionCount: number;
  hasApprovalRequest: boolean;
  hasPendingApproval: boolean;
  canGeneratePlan: boolean;
  canPrepareApprovals: boolean;
  canExecuteApprovedPlan: boolean;
  hasApprovals: boolean;
  latestApprovalId: string | null;
}): DerivedWorkspaceState {
  const activeArtifact = resolveActiveArtifact({
    requestedPanel,
    hasBrief,
    hasPlan,
    hasApprovals,
  });

  const stage =
    !hasBrief
      ? { label: "Drafting brief", tone: "gold" as const }
      : setupProgress && openQuestionCount === 0
        ? deriveStageFromSetupProgress(setupProgress, {
            canExecuteApprovedPlan,
            hasPendingApproval,
            hasApprovalRequest,
            hasPlan,
          })
      : !hasPlan
        ? openQuestionCount > 0
          ? {
              label: `${openQuestionCount} ${openQuestionCount === 1 ? "answer" : "answers"} needed`,
              tone: "amber" as const,
            }
          : { label: "Brief ready", tone: "green" as const }
        : canExecuteApprovedPlan
          ? { label: "Ready to execute", tone: "green" as const }
          : hasPendingApproval
            ? { label: "Ready to review", tone: "gold" as const }
            : hasApprovalRequest
              ? { label: "Under review", tone: "gold" as const }
              : { label: "Plan ready", tone: "green" as const };

  const primaryAction = canExecuteApprovedPlan
    ? ({
        kind: "execute_approved_plan",
        label: "Execute approved foundation",
        approvalRequestId: latestApprovalId,
      } satisfies NonNullable<WorkspacePrimaryAction>)
    : hasPendingApproval
      ? ({
          kind: "review_approvals",
          label: "Review approvals",
        } satisfies NonNullable<WorkspacePrimaryAction>)
      : canPrepareApprovals
        ? ({
            kind: "prepare_approvals",
            label: "Prepare approval packet",
          } satisfies NonNullable<WorkspacePrimaryAction>)
        : canGeneratePlan
          ? ({
              kind: "generate_plan",
              label: "Generate execution plan",
            } satisfies NonNullable<WorkspacePrimaryAction>)
          : null;

  const secondaryLink = sessionId
    ? activeArtifact === "approvals"
      ? {
          href: `/app/create/${sessionId}/approvals`,
          label: primaryAction?.kind === "review_approvals" ? "Open approval packet" : "Open approval review",
        }
      : activeArtifact === "assets"
        ? {
            href: `/app/create/${sessionId}/assets`,
            label: "Open full asset review",
          }
        : activeArtifact === "plan"
          ? {
              href: `/app/create/${sessionId}/plan`,
              label: "Open full plan review",
            }
          : {
              href: `/app/create/${sessionId}/brief`,
              label: "Inspect full brief",
            }
    : null;

  const footerHint = primaryAction
    ? null
    : activeArtifact === "assets"
      ? "Select an asset to open it inside the workspace canvas."
      : openQuestionCount > 0
        ? `${openQuestionCount} brief ${openQuestionCount === 1 ? "answer is" : "answers are"} still needed.`
        : hasPlan
          ? "The plan is available for governed review."
          : "The next guided step will unlock automatically.";

  return {
    stage,
    activeArtifact,
    primaryAction,
    secondaryLink,
    footerHint,
  };
}

function resolveActiveArtifact({
  requestedPanel,
  hasBrief,
  hasPlan,
  hasApprovals,
}: {
  requestedPanel?: string;
  hasBrief: boolean;
  hasPlan: boolean;
  hasApprovals: boolean;
}) {
  if (requestedPanel === "approvals" && hasApprovals) {
    return "approvals" as const;
  }

  if (requestedPanel === "assets" && hasPlan) {
    return "assets" as const;
  }

  if (requestedPanel === "plan" && hasPlan) {
    return "plan" as const;
  }

  if (requestedPanel === "brief" && hasBrief) {
    return "brief" as const;
  }

  if (hasApprovals) {
    return "approvals" as const;
  }

  if (hasPlan) {
    return "plan" as const;
  }

  return "brief" as const;
}
