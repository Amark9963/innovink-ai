import Link from "next/link";
import { redirect } from "next/navigation";
import {
  executeApprovedPlanAction,
  generateProgramPlanAction,
  prepareApprovalRequestAction,
  reviewApprovalRequestAction,
} from "@/app/app/create/actions";
import { CreateWorkspaceLive } from "@/app/app/create/_components/create-workspace-live";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import {
  getAgentCreateWorkspaceData,
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
  }>;
};

const statusCopy: Record<string, string> = {
  "brief-updated":
    "The PM agent updated the structured brief and captured the next operational questions.",
  "brief-ready":
    "The brief now has enough structure to draft a serious execution plan.",
  "plan-generated":
    "A proposed execution plan is ready for review and downstream approvals.",
  "approval-packet-ready":
    "The approval packet is ready. The next step is deterministic execution into the live platform.",
  "approval-approved":
    "The approval packet is approved. The PM workspace can now move into deterministic execution.",
  "approval-rejected":
    "The approval packet was rejected. Refine the plan or the brief before proceeding.",
  "execution-complete":
    "The approved program foundation executed successfully.",
  "execution-partial":
    "The approved foundation executed successfully, with some downstream executors still pending implementation.",
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
  const isFirstRun =
    data.sessions.length === 0 &&
    data.messages.length === 0 &&
    !data.brief &&
    !data.plan &&
    data.approvals.length === 0;

  const userName = user.user_metadata.full_name ?? user.email ?? "Operator";

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
      headerActions={
        <Link
          href={`/app/create?workspace=${selectedWorkspace.workspaceId}&prompt=${encodeURIComponent(
            "Show recommended program templates for this workspace and explain which one fits best.",
          )}`}
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
        >
          Browse templates
        </Link>
      }
      mainClassName="overflow-hidden"
      rightPanel={
        <>
          <div className="flex border-b border-white/7 bg-[#0c1525] px-3 pt-3">
            {["Brief", "Plan", "Assets", "Approvals"].map((tab, index) => (
              <div
                key={tab}
                className={`rounded-t-md px-3 py-2 text-[11.5px] ${
                  index === 0
                    ? "border border-b-0 border-white/10 bg-[#111e30] font-medium text-[#eae5dc]"
                    : "text-[#5e7088]"
                }`}
              >
                {tab}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {data.brief ? (
              <div className="space-y-4">
                <section className="rounded-xl border border-white/7 bg-[#162034] p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                    Structured brief
                  </div>
                  <div className="text-[16px] font-semibold tracking-[-0.015em] text-[#eae5dc]">
                    {data.brief.title ?? "Program Brief"}
                  </div>
                  <div className="mt-3 rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9baabf]">
                      Program type
                    </div>
                    <div className="mt-1 text-[12.5px] font-medium text-[#eae5dc]">
                      {data.brief.detectedProgramType ?? "Not identified yet"}
                    </div>
                    <div className="mt-1 text-[10.5px] text-[#5e7088]">
                      Confidence: {data.brief.confidenceLevel}
                    </div>
                  </div>
                  <div className="mt-3">
                    <BriefSummary brief={data.brief.currentBrief} />
                  </div>
                </section>

                <section className="rounded-xl border border-white/7 bg-[#162034] p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                    Plan and approvals
                  </div>
                  <div className="text-[16px] font-semibold tracking-[-0.015em] text-[#eae5dc]">
                    Controlled execution state
                  </div>
                  <div className="mt-3 space-y-3">
                    {data.plan ? (
                      <div className="rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[12.5px] font-semibold text-[#eae5dc]">
                            {data.plan.title ?? "Execution plan"}
                          </p>
                          <span className="rounded-sm border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.06em] text-[#9baabf]">
                            {data.plan.status}
                          </span>
                        </div>
                        {data.plan.summary ? (
                          <p className="mt-2 text-[11px] leading-5 text-[#9baabf]">
                            {data.plan.summary}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <EmptySidebarCopy text="Plan will appear here once the brief is ready for planning." />
                    )}

                    {data.approvals.length > 0
                      ? data.approvals.map((approval) => (
                          <article
                            key={approval.id}
                            className="rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[12px] font-semibold text-[#eae5dc]">
                                {approval.title}
                              </p>
                              <span className="rounded-sm border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.06em] text-[#9baabf]">
                                {approval.status}
                              </span>
                            </div>
                            {approval.summary ? (
                              <p className="mt-2 text-[11px] leading-5 text-[#9baabf]">
                                {approval.summary}
                              </p>
                            ) : null}
                            {approval.status === "pending" && activeSessionId ? (
                              <div className="mt-3 flex gap-2">
                                <form action={reviewApprovalRequestAction} className="flex-1">
                                  <input type="hidden" name="sessionId" value={activeSessionId} />
                                  <input
                                    type="hidden"
                                    name="approvalRequestId"
                                    value={approval.id}
                                  />
                                  <input type="hidden" name="decision" value="approved" />
                                  <button
                                    type="submit"
                                    className="w-full rounded-md bg-[#2d7a581a] px-3 py-2 text-[11.5px] font-semibold text-[#9ad0b7] transition hover:bg-[#2d7a5830]"
                                  >
                                    Approve
                                  </button>
                                </form>
                                <form action={reviewApprovalRequestAction} className="flex-1">
                                  <input type="hidden" name="sessionId" value={activeSessionId} />
                                  <input
                                    type="hidden"
                                    name="approvalRequestId"
                                    value={approval.id}
                                  />
                                  <input type="hidden" name="decision" value="rejected" />
                                  <button
                                    type="submit"
                                    className="w-full rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                                  >
                                    Reject
                                  </button>
                                </form>
                              </div>
                            ) : null}
                          </article>
                        ))
                      : null}

                    <div className="space-y-2 pt-1">
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
                      ) : null}
                      {canPrepareApprovals ? (
                        <form action={prepareApprovalRequestAction}>
                          <input type="hidden" name="sessionId" value={activeSessionId ?? ""} />
                          <button
                            type="submit"
                            className="w-full rounded-md border border-white/10 px-4 py-3 text-[12px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                          >
                            Prepare approval packet
                          </button>
                        </form>
                      ) : null}
                      {canExecuteApprovedPlan ? (
                        <form action={executeApprovedPlanAction}>
                          <input type="hidden" name="sessionId" value={activeSessionId ?? ""} />
                          <input
                            type="hidden"
                            name="approvalRequestId"
                            value={latestApproval?.id ?? ""}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-md bg-[#2d7a58] px-4 py-3 text-[12px] font-semibold text-white transition hover:bg-[#3e9a70]"
                          >
                            Execute approved foundation
                          </button>
                        </form>
                      ) : null}
                    </div>
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
        </>
      }
    >
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
        isFirstRun={isFirstRun}
        templates={templates}
      />
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

  return (
    <div className="space-y-3 rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3">
      <InfoRow label="Objective" value={getStringValue(briefRecord.objective)} />
      <InfoRow label="Format" value={getStringValue(briefRecord.format)} />
      <InfoRow label="Target participants" value={targetParticipants} />
      <InfoRow label="Regions" value={regions} />
      <InfoRow label="Team policy" value={getStringValue(briefRecord.teamPolicy)} />
      <InfoRow label="Registration" value={timeline.registrationWindow} />
      <InfoRow label="Submission" value={timeline.submissionWindow} />
      <InfoRow label="Program window" value={timeline.liveProgramWindow} />
      <InfoRow label="Evaluation" value={getStringValue(briefRecord.evaluationModel)} />
      <InfoRow label="Mentoring" value={getStringValue(briefRecord.mentoringModel)} />
      <InfoRow
        label="Sponsor visibility"
        value={getStringValue(briefRecord.sponsorVisibility)}
      />
      <InfoRow label="Key deliverables" value={deliverables} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9baabf]">
        {label}
      </p>
      <p className="mt-1 text-[11.5px] leading-5 text-[#eae5dc]">
        {value && value.trim().length > 0 ? value : "Not set"}
      </p>
    </div>
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

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getArrayPreview(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").join(", ")
    : null;
}
