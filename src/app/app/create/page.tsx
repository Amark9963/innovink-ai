import Link from "next/link";
import { redirect } from "next/navigation";
import {
  executeApprovedPlanAction,
  generateProgramPlanAction,
  prepareApprovalRequestAction,
} from "@/app/app/create/actions";
import {
  AssetStatusBadge,
  deriveAssets,
  type DerivedAsset,
} from "@/app/app/create/_components/assets-review-workspace";
import { CreateWorkspaceLive } from "@/app/app/create/_components/create-workspace-live";
import { LandingPageChatEditor } from "@/app/app/create/_components/landing-page-chat-editor";
import { buildWorkspaceHref } from "@/app/app/create/_components/session-screen-primitives";
import { OperatorShell } from "@/components/enterprise/operator-shell";
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
  }>;
};

type WorkspaceLandingPageEditorMessage = {
  id: string;
  role: "user" | "assistant";
  contentText: string;
  createdAt: string;
};

const statusCopy: Record<string, string> = {
  "brief-updated":
    "The PM agent updated the structured brief and captured the next operational questions.",
  "brief-ready":
    "The brief now has enough structure to draft a serious execution plan.",
  "plan-generated":
    "A proposed execution plan is ready for review and downstream approvals.",
  "assets-generated":
    "The requested launch-kit drafts are ready for PM review in the assets workspace.",
  "approval-packet-ready":
    "The approval packet is ready for governed review. Once it is approved, the workspace can move into deterministic execution.",
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
  const activeSessionId = activeSession?.id ?? null;
  const latestApproval = data.approvals[0] ?? null;
  const approvalItems = latestApproval
    ? await getApprovalRequestItems(supabase, latestApproval.id)
    : [];
  const hasPendingApproval = data.approvals.some((approval) => approval.status === "pending");
  const hasApprovalHistory = data.approvals.length > 0;
  const canGeneratePlan =
    Boolean(activeSessionId) &&
    Boolean(data.brief) &&
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
  const stage = getWorkspaceStage({
    hasBrief: Boolean(data.brief),
    hasPlan: Boolean(data.plan),
    openQuestionCount: briefOpenQuestionCount,
    hasApprovalRequest: hasApprovalHistory,
    hasPendingApproval,
    isApproved: latestApproval?.status === "approved",
  });
  const activeArtifact = resolveActiveArtifact({
    requestedPanel: params.panel,
    hasBrief: Boolean(data.brief),
    hasPlan: Boolean(data.plan),
    hasApprovals: hasApprovalHistory || canExecuteApprovedPlan,
  });
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
  const workspaceLandingAsset =
    selectedWorkspaceAsset?.editorSurface === "landing-page" ? selectedWorkspaceAsset : null;
  const landingPageEditorMessages: WorkspaceLandingPageEditorMessage[] = workspaceLandingAsset
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
            payload.assetKey === workspaceLandingAsset.itemKey
          );
        })
        .map((message) => ({
          id: message.id,
          role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
          contentText: message.contentText ?? "",
          createdAt: message.createdAt,
        }))
    : [];
  const approvalSensitiveItemCount = data.planItems.filter((item) => item.requiresApproval).length;
  const currentPrimaryHref = activeSessionId
    ? activeArtifact === "approvals"
      ? `/app/create/${activeSessionId}/approvals`
      : activeArtifact === "assets"
        ? `/app/create/${activeSessionId}/assets`
        : activeArtifact === "plan"
          ? `/app/create/${activeSessionId}/plan`
          : `/app/create/${activeSessionId}/brief`
    : null;
  const currentPrimaryLabel =
    activeArtifact === "approvals"
      ? "Review approvals ->"
      : activeArtifact === "assets"
        ? "Open asset review ->"
        : activeArtifact === "plan"
          ? "Open plan workspace ->"
          : "Open full brief ->";

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
      mainClassName="overflow-hidden"
      rightPanel={
        <>
          <div className="border-b border-white/7 bg-[#0c1525] px-3 py-2.5">
            <div className="flex flex-wrap gap-1">
              {["Brief", "Plan", "Assets", "Approvals"].map((tab) => (
                <Link
                  key={tab}
                  href={
                    activeSessionId
                      ? buildWorkspaceHref(
                          activeSessionId,
                          tab.toLowerCase() as "brief" | "plan" | "assets" | "approvals",
                        )
                      : "#"
                  }
                  className={`rounded-md px-3 py-1.5 text-[11px] transition ${
                    activeArtifact === tab.toLowerCase()
                      ? "bg-[#162034] font-medium text-[#eae5dc]"
                      : "text-[#7f90a6] hover:bg-white/[0.03] hover:text-[#c8d3de]"
                  }`}
                >
                  {tab}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {activeArtifact === "approvals" && latestApproval ? (
              <div className="space-y-3">
                <section className="rounded-2xl border border-white/7 bg-[#162034] px-3 py-3">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#b08a28]">
                    Approval packet
                  </div>
                  <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[#eae5dc]">
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
                <section className="rounded-2xl border border-white/7 bg-[#162034] px-3 py-3">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#b08a28]">
                    Execution plan
                  </div>
                  <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[#eae5dc]">
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
                <section className="rounded-2xl border border-white/7 bg-[#162034] px-3 py-3">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#b08a28]">
                    Launch-kit drafts
                  </div>
                  <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[#eae5dc]">
                    {selectedWorkspaceAsset?.title ?? "Asset review workspace"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SidebarPill label={`${data.artifacts.length} generated drafts`} />
                    <SidebarPill label={`${data.planItems.length} launch items`} muted />
                    <SidebarPill
                      label={
                        workspaceLandingAsset
                          ? "Canvas active"
                          : hasApprovalHistory
                            ? "Packet prepared"
                            : "Ready for PM review"
                      }
                      tone={workspaceLandingAsset ? "blue" : hasApprovalHistory ? "green" : "blue"}
                    />
                  </div>
                  <div className="mt-3">
                    {selectedWorkspaceAsset ? (
                      <AssetWorkspaceSummary asset={selectedWorkspaceAsset} />
                    ) : (
                      <AssetsSummary
                        assetCount={data.artifacts.length}
                        generatedCount={data.artifacts.length}
                        planItemsCount={data.planItems.length}
                      />
                    )}
                  </div>
                </section>
                {assets.length > 0 ? (
                  <section className="rounded-2xl border border-white/7 bg-[#162034] px-3 py-3">
                    <div className="mb-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#5e7088]">
                      Select asset
                    </div>
                    <div className="space-y-2">
                      {assets.slice(0, 5).map((asset) => (
                        <Link
                          key={asset.id}
                          href={buildWorkspaceHref(activeSessionId, "assets", {
                            asset: asset.itemKey,
                          })}
                          className={`block rounded-xl border px-3 py-3 transition ${
                            selectedWorkspaceAsset?.itemKey === asset.itemKey
                              ? "border-[#b08a2838] bg-[#b08a2810]"
                              : "border-white/8 bg-[#111e30] hover:border-white/16 hover:bg-white/[0.03]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[12px] font-medium text-[#eae5dc]">
                                {asset.title}
                              </div>
                              <div className="mt-1 text-[10.5px] text-[#7f90a6]">
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
            ) : data.brief ? (
              <div className="space-y-3">
                <section className="rounded-2xl border border-white/7 bg-[#162034] px-3 py-3">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#b08a28]">
                    Structured brief
                  </div>
                  <div className="truncate text-[14px] font-semibold tracking-[-0.015em] text-[#eae5dc]">
                    {data.brief.title ?? "Program Brief"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SidebarPill label={data.brief.detectedProgramType ?? "Program type pending"} />
                    <SidebarPill label={`Confidence ${data.brief.confidenceLevel}`} muted />
                    <SidebarPill
                      label={
                        briefOpenQuestionCount > 0
                          ? `${briefOpenQuestionCount} open inputs`
                          : "Ready for planning"
                      }
                      tone={briefOpenQuestionCount > 0 ? "amber" : "green"}
                    />
                  </div>
                  <div className="mt-3">
                    <BriefSummary brief={data.brief.currentBrief} />
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#162034] px-8 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]">
                  <DocumentIcon />
                </div>
                <div className="mt-5 text-[18px] font-semibold text-[#eae5dc]">
                  Brief will appear here
                </div>
                <p className="mt-3 max-w-[250px] text-[12px] leading-6 text-[#9baabf]">
                  Describe your program in the chat and Innova will generate a structured program brief for review and approval.
                </p>
                <div className="mt-5 text-[11.5px] text-[#5e7088]">
                  Start by describing your program -&gt;
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-white/7 bg-[#111e30] px-3 py-3">
            <div className="space-y-2">
              {canGeneratePlan ? (
                <form action={generateProgramPlanAction}>
                  <input type="hidden" name="sessionId" value={activeSessionId ?? ""} />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[#b08a28] px-4 py-3 text-[12px] font-semibold text-[#06100f] transition hover:bg-[#ccaa4a]"
                  >
                    Generate execution plan
                  </button>
                </form>
              ) : hasPendingApproval && activeSessionId ? (
                <Link
                  href={`/app/create/${activeSessionId}/approvals`}
                  className="block w-full rounded-md bg-[#b08a28] px-4 py-3 text-center text-[12px] font-semibold text-[#06100f] transition hover:bg-[#ccaa4a]"
                >
                  Review approvals
                </Link>
              ) : canPrepareApprovals ? (
                <form action={prepareApprovalRequestAction}>
                  <input type="hidden" name="sessionId" value={activeSessionId ?? ""} />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[#b08a28] px-4 py-3 text-[12px] font-semibold text-[#06100f] transition hover:bg-[#ccaa4a]"
                  >
                    Prepare approval packet
                  </button>
                </form>
              ) : canExecuteApprovedPlan ? (
                <form action={executeApprovedPlanAction}>
                  <input type="hidden" name="sessionId" value={activeSessionId ?? ""} />
                  <input type="hidden" name="approvalRequestId" value={latestApproval?.id ?? ""} />
                  <button
                    type="submit"
                    className="w-full rounded-md bg-[#2d7a58] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-[#3e9a70]"
                  >
                    Execute approved foundation
                  </button>
                </form>
              ) : activeArtifact === "assets" && activeSessionId ? (
                <Link
                  href={
                    workspaceLandingAsset
                      ? `/app/create/${activeSessionId}/assets/${workspaceLandingAsset.itemKey}`
                      : `/app/create/${activeSessionId}/assets`
                  }
                  className="block w-full rounded-md bg-[#162034] px-4 py-3 text-center text-[12px] font-semibold text-[#eae5dc] transition hover:bg-[#1b2840]"
                >
                  {workspaceLandingAsset ? "Open full asset review" : "Review asset drafts"}
                </Link>
              ) : data.plan && activeSessionId ? (
                <Link
                  href={`/app/create/${activeSessionId}/plan`}
                  className="block w-full rounded-md bg-[#162034] px-4 py-3 text-center text-[12px] font-semibold text-[#eae5dc] transition hover:bg-[#1b2840]"
                >
                  Open plan workspace
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full rounded-md bg-[#b08a28] px-4 py-3 text-[12px] font-semibold text-[#06100f] opacity-45"
                >
                  Generate execution plan
                </button>
              )}
              {!canGeneratePlan &&
              !canPrepareApprovals &&
              !canExecuteApprovedPlan &&
              !hasPendingApproval ? (
                <div className="text-center text-[10px] leading-5 text-[#5e7088]">
                  {activeArtifact === "assets"
                    ? workspaceLandingAsset
                      ? "You are refining this asset inside the AI Workspace canvas"
                      : "Select an asset to open it inside the AI Workspace canvas"
                    : briefOpenQuestionCount > 0
                    ? `Requires ${briefOpenQuestionCount} brief inputs to unlock`
                    : data.plan
                      ? "Plan is ready for governed review"
                      : "Next action will unlock automatically"}
                </div>
              ) : null}
              {currentPrimaryHref && !hasPendingApproval ? (
                <Link
                  href={currentPrimaryHref}
                  className="block px-2 py-1 text-center text-[12px] text-[#7f90a6] transition hover:text-[#eae5dc]"
                >
                  {currentPrimaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </>
      }
    >
      {workspaceLandingAsset && activeSessionId ? (
        <div className="h-full overflow-y-auto bg-[#07101f] px-4 py-4 md:px-5">
          <LandingPageChatEditor
            key={`workspace-landing-asset-${workspaceLandingAsset.id}-${landingPageEditorMessages.length}`}
            sessionId={activeSessionId}
            assetKey={workspaceLandingAsset.itemKey}
            asset={workspaceLandingAsset}
            initialMessages={landingPageEditorMessages}
            embeddedInWorkspace
          />
        </div>
      ) : (
        <CreateWorkspaceLive
          key={`workspace-live-${activeSessionId ?? "new"}-${data.messages.length}-${data.runs.length}-${data.events.length}-${params.status ?? "idle"}-${params.error ?? "ok"}`}
          workspaceId={selectedWorkspace.workspaceId}
          sessionId={activeSessionId}
          initialSessions={data.sessions}
          initialMessages={data.messages}
          initialRuns={data.runs}
          initialEvents={data.events}
          initialPrompt={params.prompt ?? ""}
          initialStatus={params.status ?? null}
          initialError={params.error ?? null}
          statusCopy={statusCopy}
          templates={templates}
          stageLabel={stage.label}
          stageTone={stage.tone}
          userInitial={userInitial}
          canGeneratePlan={canGeneratePlan}
          canPrepareApprovals={canPrepareApprovals}
          canExecuteApprovedPlan={canExecuteApprovedPlan}
          hasApprovalRequest={hasApprovalHistory}
          hasPendingApproval={hasPendingApproval}
          latestApprovalId={latestApproval?.id ?? null}
          inlineBriefCard={
            data.brief
              ? {
                  openQuestionCount: briefOpenQuestionCount,
                  programType: data.brief.detectedProgramType,
                  format: getStringValue((data.brief.currentBrief as Record<string, unknown> | null)?.format),
                  regions: getArrayPreview((data.brief.currentBrief as Record<string, unknown> | null)?.regions),
                  teamPolicy: getStringValue((data.brief.currentBrief as Record<string, unknown> | null)?.teamPolicy),
                }
              : null
          }
        />
      )}
    </OperatorShell>
  );
}

function EmptySidebarCopy({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-[#1b2840] px-3 py-3 text-[11px] leading-5 text-[#9baabf]">
      {text}
    </div>
  );
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
    <div className="grid grid-cols-[68px_1fr] gap-x-3 py-1.5">
      <p className="pt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7f90a6]">
        {label}
      </p>
      <div
        className={`min-w-0 truncate text-[11.5px] leading-5 ${primary ? "text-[#eae5dc]" : "text-[#c8d3de]"}`}
        title={value}
      >
        <span className="truncate">{value}</span>
        {needsInput ? (
          <span className="ml-2 inline-flex items-center gap-1 rounded-md border border-[#c9973a40] bg-[#c9973a12] px-1.5 py-0.5 text-[9px] font-semibold text-[#e8c26d]">
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

function AssetWorkspaceSummary({ asset }: { asset: DerivedAsset }) {
  return (
    <div className="space-y-0">
      <SummaryField label="Type" value={getCompactValue(asset.previewTitle)} primary />
      <SummaryField label="Status" value={getCompactValue(asset.statusLabel)} />
      <SummaryField label="Meta" value={getCompactValue(asset.meta)} />
      <SummaryField
        label="Canvas"
        value={
          asset.editorSurface === "landing-page"
            ? "Conversational editor ready"
            : "Open full review"
        }
        needsInput={asset.editorSurface !== "landing-page"}
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
      ? "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]"
      : tone === "green"
        ? "border-[#2d7a5840] bg-[#2d7a5812] text-[#9ad0b7]"
        : tone === "blue"
          ? "border-[#3a6e9e44] bg-[#3a6e9e12] text-[#c4d8ec]"
        : muted
          ? "border-white/10 bg-white/[0.02] text-[#7f90a6]"
          : "border-white/10 bg-white/[0.03] text-[#9baabf]";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[9.5px] font-medium ${toneClass}`}
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

function getWorkspaceStage({
  hasBrief,
  hasPlan,
  openQuestionCount,
  hasApprovalRequest,
  hasPendingApproval,
  isApproved,
}: {
  hasBrief: boolean;
  hasPlan: boolean;
  openQuestionCount: number;
  hasApprovalRequest: boolean;
  hasPendingApproval: boolean;
  isApproved: boolean;
}) {
  if (!hasBrief) {
    return { label: "Drafting brief", tone: "gold" as const };
  }

  if (!hasPlan) {
    if (openQuestionCount > 0) {
      return {
        label: `${openQuestionCount} ${openQuestionCount === 1 ? "input" : "inputs"} needed`,
        tone: "amber" as const,
      };
    }

    return { label: "Ready for plan", tone: "green" as const };
  }

  if (isApproved) {
    return { label: "Ready to execute", tone: "green" as const };
  }

  if (hasPendingApproval) {
    return { label: "Approval review", tone: "gold" as const };
  }

  if (hasApprovalRequest) {
    return { label: "Approvals in progress", tone: "gold" as const };
  }

  return { label: "Ready for approvals", tone: "green" as const };
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
