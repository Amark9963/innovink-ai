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
  getProgramAccessRows,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreatePageProps = {
  searchParams?: Promise<{
    session?: string;
    workspace?: string;
    status?: string;
    error?: string;
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

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const data = await getAgentCreateWorkspaceData(supabase, user, {
    sessionId: params.session,
    workspaceId: params.workspace,
  });
  const programs = await getProgramAccessRows(supabase);

  if (data.workspaces.length === 0) {
    redirect("/app/onboarding");
  }

  const selectedWorkspace = data.selectedWorkspace ?? data.workspaces[0];
  const activeSession = data.activeSession;
  const activeSessionId = activeSession?.id ?? null;
  const canGeneratePlan =
    activeSessionId &&
    data.brief &&
    (data.brief.status === "collecting_requirements" ||
      data.brief.status === "ready_for_plan" ||
      data.brief.status === "plan_generated") &&
    !data.plan;
  const canPrepareApprovals = activeSessionId && data.plan && data.approvals.length === 0;
  const latestApproval = data.approvals[0] ?? null;
  const canExecuteApprovedPlan =
    activeSessionId && latestApproval?.status === "approved";

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
      headerActions={
        <button
          type="button"
          disabled
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#5e7088]"
        >
          Browse templates
        </button>
      }
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
            <div className="mb-4 rounded-xl border border-white/7 bg-[#162034] p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                Structured brief
              </div>
              <div className="text-[16px] font-semibold tracking-[-0.015em] text-[#eae5dc]">
                {data.brief?.title ?? "Brief will appear here"}
              </div>
              {data.brief ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3">
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
                  <BriefSummary brief={data.brief.currentBrief} />
                  <SidebarSection
                    title="Assumptions"
                    empty="No material assumptions captured yet."
                    items={Array.isArray(data.brief.assumptions) ? (data.brief.assumptions as string[]) : []}
                  />
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9baabf]">
                      Open questions
                    </div>
                    <div className="space-y-2">
                      {Array.isArray(data.brief.openQuestions) &&
                      data.brief.openQuestions.length > 0 ? (
                        (data.brief.openQuestions as Array<{
                          key?: string;
                          question?: string;
                          whyItMatters?: string;
                          priority?: string;
                        }>).map((question, index) => (
                          <article
                            key={`${question.key ?? "question"}-${index}`}
                            className="rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[12px] font-semibold text-[#eae5dc]">
                                {question.question}
                              </p>
                              <span className="rounded-sm border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.06em] text-[#9baabf]">
                                {question.priority ?? "open"}
                              </span>
                            </div>
                            {question.whyItMatters ? (
                              <p className="mt-2 text-[11px] leading-5 text-[#9baabf]">
                                {question.whyItMatters}
                              </p>
                            ) : null}
                          </article>
                        ))
                      ) : (
                        <EmptySidebarCopy text="Describe your program in the chat and Innova will generate a structured brief for review." />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <EmptySidebarCopy text="Describe your program in the chat and Innova will generate a structured brief for review." />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                Plan and approvals
              </div>
              <div className="text-[16px] font-semibold tracking-[-0.015em] text-[#eae5dc]">
                Controlled execution state
              </div>
              <div className="mt-3 space-y-3">
                {data.plan ? (
                  <>
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
                    <div className="space-y-2">
                      {data.planItems.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[12px] font-semibold text-[#eae5dc]">
                              {item.title}
                            </p>
                            <span className="rounded-sm border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[0.06em] text-[#9baabf]">
                              {item.itemType.replaceAll("_", " ")}
                            </span>
                          </div>
                          {item.description ? (
                            <p className="mt-2 text-[11px] leading-5 text-[#9baabf]">
                              {item.description}
                            </p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptySidebarCopy text="Plan will appear here after the brief reaches planning readiness." />
                )}

                {data.approvals.length > 0 ? (
                  <div className="space-y-2">
                    {data.approvals.map((approval) => (
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
                        <p className="mt-2 text-[10px] uppercase tracking-[0.06em] text-[#b08a28]">
                          Risk {approval.riskLevel} • requested{" "}
                          {formatDateTime(approval.requestedAt)}
                        </p>
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
                    ))}
                  </div>
                ) : null}

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
            </div>
          </div>
        </>
      }
    >
      <div className="flex h-[calc(100vh-56px)] flex-col bg-[#07101f]">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/7 bg-[#111e30] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2810] text-[11px] font-semibold text-[#ccaa4a] shadow-[0_0_10px_rgba(176,138,40,0.18)]">
              AI
            </div>
            <div>
              <div className="text-[13px] font-medium text-[#eae5dc]">
                Innova — AI Program Architect
              </div>
              <div className="text-[11px] text-[#9baabf]">
                Ready to build your program · Describe it in any format
              </div>
            </div>
          </div>
          <div className="text-[11px] text-[#5e7088]">
            {activeSession?.status ?? "Ready to start"}
          </div>
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

          <div className="mx-auto mb-7 max-w-[720px]">
            <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5e7088]">
              Quick-start templates
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                {
                  name: "Employee Hackathon",
                  description:
                    "Time-boxed internal sprint with team formation and judging rounds",
                  badge: "Most popular",
                },
                {
                  name: "Open Innovation Call",
                  description:
                    "External submissions with screening, scoring, and sponsor reporting",
                  badge: "External",
                },
                {
                  name: "Corporate Accelerator",
                  description:
                    "Multi-cohort program with mentoring tracks and milestone gates",
                  badge: "Multi-phase",
                },
                {
                  name: "Custom / Hybrid",
                  description:
                    "Describe any combination and Innova will configure from scratch",
                  badge: "Blank slate",
                },
              ].map((template) => (
                <div
                  key={template.name}
                  className="rounded-lg border border-white/7 bg-[#162034] p-4 transition hover:border-[#b08a2838] hover:bg-[#1b2840]"
                >
                  <div className="mb-2 text-[12.5px] font-semibold text-[#eae5dc]">
                    {template.name}
                  </div>
                  <div className="text-[11px] leading-5 text-[#9baabf]">
                    {template.description}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.06em] text-[#9baabf]">
                      {template.badge}
                    </span>
                    <span className="text-[11px] text-[#5e7088]">Use →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[720px] space-y-4">
            {data.messages.length > 0 ? (
              data.messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="flex max-w-[92%] gap-3">
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
                      {message.kind !== "chat" ? (
                        <div className="mt-2 text-[10px] uppercase tracking-[0.06em] text-[#5e7088]">
                          {message.kind.replaceAll("_", " ")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="flex max-w-[720px] gap-3">
                <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-md bg-[#b08a2810] text-[10px] font-semibold text-[#ccaa4a]">
                  AI
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-3 text-[10.5px] text-[#5e7088]">
                    <span className="font-semibold uppercase tracking-[0.08em]">Innova</span>
                    <span>Just now</span>
                  </div>
                  <div className="rounded-[16px] border border-white/7 bg-[#162034] px-4 py-3 text-[13px] leading-6 text-[#eae5dc]">
                    <p>
                      Hello — I&apos;m Innova, your AI program architect.
                    </p>
                    <p className="mt-2">
                      Tell me about the innovation program you want to run, and I&apos;ll
                      set up the full operational structure: brief, execution plan,
                      registration and submission flows, judging setup,
                      communications, and reporting.
                    </p>
                    <p className="mt-2 text-[#9baabf]">
                      You can describe it in plain language or paste an existing brief
                      to get started.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-white/7 bg-[#0c1525] px-6 py-4">
          <div className="mx-auto max-w-[720px]">
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
              <div className="rounded-xl border border-white/10 bg-[#0a1422] p-3">
                <textarea
                  name="message"
                  required
                  minLength={8}
                  rows={4}
                  placeholder="Describe the program you want to build — type, scope, timeline, requirements…"
                  className="min-h-[110px] w-full resize-none bg-transparent text-[13px] leading-6 text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-[10.5px] text-[#5e7088]">
                    Full program setup mode · real brief persistence · approval-gated execution
                  </div>
                  <button
                    type="submit"
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-[#b08a28] text-[#06100f] transition hover:bg-[#ccaa4a]"
                  >
                    →
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

function SidebarSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9baabf]">
        {title}
      </div>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="rounded-lg border border-white/7 bg-[#1b2840] px-3 py-3 text-[11px] leading-5 text-[#9baabf]"
            >
              {item}
            </div>
          ))
        ) : (
          <EmptySidebarCopy text={empty} />
        )}
      </div>
    </div>
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
