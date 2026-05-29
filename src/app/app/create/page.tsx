import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import {
  executeApprovedPlanAction,
  generateProgramPlanAction,
  prepareApprovalRequestAction,
  reviewApprovalRequestAction,
  sendCreateAgentMessageAction,
} from "@/app/app/create/actions";
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
      <div className="flex h-[calc(100vh-56px)] flex-col bg-[#07101f]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/7 bg-[#111e30] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2810] text-[11px] font-semibold text-[#ccaa4a] shadow-[0_0_16px_rgba(176,138,40,0.22)]">
              AI
            </div>
            <div>
              <div className="text-[13px] font-medium text-[#eae5dc]">
                Innova - AI Program Architect
              </div>
              <div className="text-[11px] text-[#9baabf]">
                Ready to build your program · Describe it in any format
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={data.sessions.length === 0}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            History
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-7">
          {params.error ? (
            <div className="mx-auto mb-5 max-w-[580px] rounded-lg border border-[#9b3a3a66] bg-[#9b3a3a1a] px-4 py-3 text-[12px] text-[#f1bcbc]">
              {params.error}
            </div>
          ) : null}
          {params.status && statusCopy[params.status] ? (
            <div className="mx-auto mb-5 max-w-[580px] rounded-lg border border-[#3a6e9e40] bg-[#3a6e9e1a] px-4 py-3 text-[12px] text-[#c4d8ec]">
              {statusCopy[params.status]}
            </div>
          ) : null}
          {params.prompt ? (
            <div className="mx-auto mb-5 max-w-[580px] rounded-lg border border-[#b08a2838] bg-[#b08a2810] px-4 py-3 text-[12px] text-[#e4d8b4]">
              Innova loaded a follow-up prompt from the review workspace. You can edit it before sending.
            </div>
          ) : null}

          {isFirstRun ? (
            <div className="mx-auto mb-6 max-w-[860px] rounded-xl border border-[#b08a2838] bg-[#162034] p-5">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#ccaa4a]">
                First program workflow
              </div>
              <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                Start with one clear program description
              </div>
              <p className="mt-2 max-w-[720px] text-[12.5px] leading-6 text-[#9baabf]">
                Tell Innova what kind of program you want to run, who it is for, the timeline, and any governance requirements. Innovink will draft the brief, plan, launch assets, and approval path from there.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <QuickStartPrompt
                  href={`/app/create?workspace=${selectedWorkspace.workspaceId}&prompt=${encodeURIComponent(
                    "Create a global employee hackathon for our organization with team formation, registration, submission, two judging rounds, and a sponsor-safe final report.",
                  )}`}
                  title="Use a proven pattern"
                  body="Start from a structured template prompt instead of a blank message."
                />
                <QuickStartPrompt
                  href={`/app/create?workspace=${selectedWorkspace.workspaceId}&prompt=${encodeURIComponent(
                    "I already have a rough program idea. Help me turn it into a governed program brief and execution plan.",
                  )}`}
                  title="Refine a rough idea"
                  body="Let Innova ask follow-up questions and structure the program for you."
                />
                <QuickStartPrompt
                  href={`/app/create?workspace=${selectedWorkspace.workspaceId}&prompt=${encodeURIComponent(
                    "Import an existing brief or summarize the kind of program we want to run and prepare the launch workflow.",
                  )}`}
                  title="Work from existing material"
                  body="Bring an existing brief, concept note, or outline into the AI workspace."
                />
              </div>
            </div>
          ) : null}

          <div className="mx-auto mb-7 max-w-[580px]">
            <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5e7088]">
              Quick-start templates
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {templates.map((template) => (
                <Link
                  key={template.name}
                  href={`/app/create?workspace=${selectedWorkspace.workspaceId}&prompt=${encodeURIComponent(template.prompt)}`}
                  className="rounded-lg border border-white/7 bg-[#162034] p-[14px] transition hover:-translate-y-px hover:border-[#b08a2838] hover:bg-[#1b2840]"
                >
                  <div
                    className={`mb-[10px] flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-semibold ${template.iconClass}`}
                  >
                    <TemplateIcon label={template.name} />
                  </div>
                  <div className="mb-1 text-[12.5px] font-semibold text-[#eae5dc]">
                    {template.name}
                  </div>
                  <div className="text-[11px] leading-[1.45] text-[#9baabf]">
                    {template.description}
                  </div>
                  <div className="mt-[10px] flex items-center justify-between">
                    <span className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.06em] text-[#9baabf]">
                      {template.badge}
                    </span>
                    <span className="text-[11px] text-[#5e7088]">Use -&gt;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[580px] space-y-4">
            {data.messages.length > 0 ? (
              data.messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex max-w-full gap-3">
                    {message.role !== "user" ? (
                      <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-md bg-[#b08a2810] text-[10px] font-semibold text-[#ccaa4a]">
                        AI
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-3 text-[10.5px] text-[#5e7088]">
                        <span className="font-semibold uppercase tracking-[0.08em]">
                          {message.role === "user" ? "Program Manager" : "Innova"}
                        </span>
                        <span>{formatDateTime(message.createdAt)}</span>
                      </div>
                      <div
                        className={`rounded-[16px] border px-4 py-3 text-[13px] leading-6 ${
                          message.role === "user"
                            ? "border-[#21486f] bg-[#16375a] text-white"
                            : "border-white/7 bg-[#162034] text-[#eae5dc]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.contentText}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="flex max-w-[580px] gap-3">
                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-md bg-[#b08a2810] text-[10px] font-semibold text-[#ccaa4a]">
                  AI
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-3 text-[10.5px] text-[#5e7088]">
                    <span className="font-semibold uppercase tracking-[0.08em]">Innova</span>
                    <span>Just now</span>
                  </div>
                  <div className="rounded-[2px_16px_16px_16px] border border-white/7 bg-[#162034] px-4 py-3 text-[13px] leading-6 text-[#eae5dc]">
                    <p>Hello - I&apos;m Innova, your AI program architect.</p>
                    <p className="mt-3">
                      Tell me about the innovation program you want to run, and I&apos;ll set up the full operational structure: program brief, execution plan, registration and submission flows, judging setup, communications, and reporting.
                    </p>
                    <p className="mt-3 text-[12px] text-[#9baabf]">
                      You can describe it in plain language, use a template above, or paste an existing brief to get started.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/app/create?workspace=${selectedWorkspace.workspaceId}&prompt=${encodeURIComponent(
                          "Create an employee hackathon for our organization with registration, submission, judging, and reporting.",
                        )}`}
                        className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                      >
                        Use example prompt
                      </Link>
                      <Link
                        href={`/app/create?workspace=${selectedWorkspace.workspaceId}&prompt=${encodeURIComponent(
                          "Help me choose the best program template for my workspace and explain why.",
                        )}`}
                        className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                      >
                        Ask for recommendations
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/7 bg-[#0c1525] px-6 py-4">
          <div className="mx-auto max-w-[720px]">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#5e7088]">
                Mode
              </span>
              <div className="rounded-sm border border-[#b08a2838] bg-[#b08a2810] px-2 py-1 text-[10.5px] text-[#ccaa4a]">
                Full program setup
              </div>
              <div className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] text-[#9baabf]">
                Brief only
              </div>
              <div className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[10.5px] text-[#9baabf]">
                Plan only
              </div>
            </div>

            {data.sessions.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {data.sessions.slice(0, 4).map((session) => (
                  <Link
                    key={session.id}
                    href={`/app/create?session=${session.id}&workspace=${session.workspaceId}`}
                    className={`rounded-sm border px-2 py-1 text-[10.5px] ${
                      session.id === activeSessionId
                        ? "border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]"
                        : "border-white/10 bg-white/[0.03] text-[#9baabf]"
                    }`}
                  >
                    {session.title ?? "Untitled workspace"}
                  </Link>
                ))}
              </div>
            ) : null}

            <form action={sendCreateAgentMessageAction}>
              <input type="hidden" name="workspaceId" value={selectedWorkspace.workspaceId} />
              {activeSessionId ? (
                <input type="hidden" name="sessionId" value={activeSessionId} />
              ) : null}
              <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#0a1422] px-4 py-3">
                <textarea
                  name="message"
                  defaultValue={params.prompt ?? ""}
                  required
                  minLength={8}
                  rows={4}
                  placeholder="Describe the program you want to build - type, scope, timeline, requirements... e.g. 'Run a global employee hackathon for APAC and Europe, teams of 4, registration next Monday, six week sprint, two judging rounds, sponsor-safe report required.'"
                  className="min-h-[110px] flex-1 resize-none bg-transparent text-[13px] leading-6 text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
                />
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[#5e7088] transition hover:bg-white/[0.03] hover:text-[#9baabf]"
                  >
                    <PaperclipIcon />
                  </button>
                  <button
                    type="submit"
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-[#b08a28] text-[#06100f] transition hover:bg-[#ccaa4a]"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </OperatorShell>
  );
}

function QuickStartPrompt({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-white/7 bg-[#1b2840] p-4 transition hover:border-[#b08a2838] hover:bg-[#21324f]"
    >
      <div className="text-[12.5px] font-semibold text-[#eae5dc]">{title}</div>
      <div className="mt-2 text-[11.5px] leading-5 text-[#9baabf]">{body}</div>
      <div className="mt-3 text-[11px] text-[#ccaa4a]">Load prompt -&gt;</div>
    </Link>
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
      <InfoRow label="Sponsor visibility" value={getStringValue(briefRecord.sponsorVisibility)} />
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

function TemplateIcon({ label }: { label: string }) {
  if (label === "Employee Hackathon") return <SparkIcon />;
  if (label === "Open Innovation Call") return <InboxIcon />;
  if (label === "Corporate Accelerator") return <CalendarIcon />;
  if (label === "Venture Client Scouting") return <CompassIcon />;
  if (label === "Incubator Program") return <DocumentIcon />;

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 1.5 9.5 5 14 7l-4.5 1.5L8 13 6.5 8.5 2 7l4.5-2L8 1.5Z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1.5 9.5h13M1.5 9.5l3-8h7l3 8v4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-4Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="1.5" y="3.5" width="13" height="11" rx="1" />
      <path d="M5 1.5v4M11 1.5v4M1.5 7.5h13" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9.5 6.5-3 3 1.2-4.2 4.3-1.1-2.5 2.3Z" />
      <circle cx="8" cy="8" r="5.5" />
    </svg>
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

function PaperclipIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m13.5 7.5-6 6a3.5 3.5 0 0 1-5-5l7-7a2.3 2.3 0 0 1 3.3 3.3l-7 7a1.2 1.2 0 0 1-1.7-1.7l6-6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2 1 7l5 3 2 5 6-13Z" />
      <path d="m6 10 3-3" />
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
