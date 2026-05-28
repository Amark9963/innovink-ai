import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import {
  getCurrentUserOrNull,
  getProgramAccessRows,
  getWorkspaceAccessRows,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ApprovalRow = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  program_id: string | null;
  requested_at: string;
};

type SessionRow = {
  id: string;
  title: string | null;
  status: string;
  updated_at: string;
  workspace_id: string;
};

type ActivityItem = {
  kind: string;
  sortDate: string;
  title: string;
  time: string;
  iconClass: string;
  icon: ReactNode;
  badge?: string;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const workspaces = await getWorkspaceAccessRows(supabase, user);
  const programs = await getProgramAccessRows(supabase);

  if (workspaces.length === 0) {
    redirect("/app/onboarding");
  }

  const [
    { data: recentApprovals, error: approvalsError },
    { data: recentSessions, error: sessionsError },
    { count: participantCount, error: participantsError },
  ] = await Promise.all([
    supabase
      .from("approval_requests")
      .select("id, title, summary, status, program_id, requested_at")
      .order("requested_at", { ascending: false })
      .limit(4),
    supabase
      .from("agent_sessions")
      .select("id, title, status, updated_at, workspace_id")
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("program_registrations")
      .select("id", { count: "exact", head: true }),
  ]);

  if (approvalsError) throw approvalsError;
  if (sessionsError) throw sessionsError;
  if (participantsError) throw participantsError;

  const activePrograms = programs.filter((program) =>
    ["draft", "configured", "published", "in_review"].includes(program.status),
  );
  const pendingApprovals = (recentApprovals ?? []).filter(
    (approval) => approval.status === "pending",
  );
  const deadlinesThisWeek = countDeadlinesThisWeek(activePrograms);
  const userName = user.user_metadata.full_name ?? user.email ?? "Operator";
  const primaryWorkspace = workspaces[0];
  const activityFeed = buildActivityFeed({
    approvals: (recentApprovals ?? []) as ApprovalRow[],
    sessions: (recentSessions ?? []) as SessionRow[],
    programs: activePrograms,
  });

  return (
    <OperatorShell
      activeNav="overview"
      headerTitle={primaryWorkspace.workspaceName}
      headerSubtitle={undefined}
      organizationName={primaryWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={workspaces}
      programs={programs}
      headerActions={
        <>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            <BellIcon />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            <SettingsIcon />
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-[1240px] px-8 py-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 text-[22px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
              Good morning, {firstName(userName)}.
            </div>
            <div className="text-[13px] text-[#9baabf]">
              You have{" "}
              <span className="font-medium text-[#dba84a]">
                {pendingApprovals.length} items awaiting approval
              </span>{" "}
              and{" "}
              <span className="font-medium text-[#d66d6d]">
                {deadlinesThisWeek} upcoming deadline{deadlinesThisWeek === 1 ? "" : "s"}
              </span>{" "}
              this week.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-medium text-[#9baabf]"
            >
              Browse templates
            </button>
            <button
              type="button"
              disabled
              className="rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-medium text-[#9baabf]"
            >
              Import brief
            </button>
            <Link
              href="/app/create"
              className="inline-flex items-center gap-2 rounded-md bg-[#b08a28] px-4 py-2 text-[12.5px] font-semibold text-[#06100f] transition hover:bg-[#ccaa4a]"
            >
              <span className="text-[14px] leading-none">+</span>
              New Program
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-4">
          <MetricCard
            label="Active Programs"
            value={String(activePrograms.length)}
            sublabel={`${countStatus(activePrograms, "draft") + countStatus(activePrograms, "configured")} in setup · ${countStatus(activePrograms, "published")} live · ${countStatus(activePrograms, "in_review")} in review`}
            variant="gold"
          />
          <MetricCard
            label="Pending Approvals"
            value={String(pendingApprovals.length)}
            sublabel={`${pendingApprovals.filter((item) => isRecent(item.requested_at, 2)).length} require urgent action`}
            variant="amber"
          />
          <MetricCard
            label="Total Participants"
            value={String(participantCount ?? 0)}
            sublabel={participantCount && participantCount > 0 ? "Across visible program registrations" : "No participant registrations yet"}
            variant="blue"
          />
          <MetricCard
            label="Deadlines This Week"
            value={String(deadlinesThisWeek)}
            sublabel={describeUpcomingDeadline(activePrograms)}
            variant="red"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#eae5dc]">Active Programs</div>
              <span className="text-[11.5px] text-[#5e7088]">View all →</span>
            </div>

            <div className="mb-6 grid gap-3 xl:grid-cols-3">
              {activePrograms.length > 0 ? (
                activePrograms.slice(0, 3).map((program) => (
                  <article
                    key={program.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/7 bg-[#162034] p-[18px] transition hover:-translate-y-px hover:border-white/10 hover:bg-[#1b2840]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[13.5px] font-semibold leading-5 text-[#eae5dc]">
                          {program.name}
                        </div>
                        <div className="mt-[3px] text-[11.5px] text-[#9baabf]">
                          {program.programType} · {program.workspaceName}
                        </div>
                      </div>
                      <ProgramBadge status={program.status} />
                    </div>

                    <ProgressBlock program={program} />

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="text-[11.5px] text-[#9baabf]">
                        {describePrimaryProgramDeadline(program)}
                      </div>
                      <div className="flex gap-[5px]">
                        <Link
                          href={`/app/programs/${program.id}/landing-page`}
                          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                        >
                          Open
                        </Link>
                        {program.status === "draft" || program.status === "configured" ? (
                          <Link
                            href={`/app/create?workspace=${program.workspaceId}`}
                            className="rounded-md bg-[#2d7a581a] px-3 py-1.5 text-[11.5px] font-medium text-[#9ad0b7] transition hover:bg-[#2d7a5830]"
                          >
                            Continue setup
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf]"
                          >
                            Reports
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#162034] p-5 text-[12px] leading-6 text-[#9baabf] xl:col-span-3">
                  No visible program records yet. Use the AI workspace to create the first governed program.
                </div>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#eae5dc]">Recent Activity</div>
              <span className="text-[11.5px] text-[#5e7088]">View all →</span>
            </div>

            <div className="rounded-xl border border-white/7 bg-[#162034] px-4 py-3">
              {activityFeed.length > 0 ? (
                activityFeed.map((item, index) => (
                  <div
                    key={`${item.kind}-${index}`}
                    className={`flex items-start gap-[10px] py-[9px] ${
                      index < activityFeed.length - 1 ? "border-b border-white/[0.035]" : ""
                    }`}
                  >
                    <div className={`mt-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-md ${item.iconClass}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] leading-[1.45] text-[#d6dee8]">{item.title}</div>
                      <div className="mt-[2px] text-[10.5px] text-[#5e7088]">{item.time}</div>
                    </div>
                    {item.badge ? <ActivityBadge label={item.badge} /> : null}
                  </div>
                ))
              ) : (
                <div className="py-4 text-[12px] leading-6 text-[#9baabf]">
                  No PM activity yet. Start in the AI workspace to generate the first brief and execution plan.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 text-[13px] font-semibold text-[#eae5dc]">Approval Queue</div>
            <div className="mb-4 rounded-xl border border-white/7 bg-[#162034] p-3">
              {recentApprovals && recentApprovals.length > 0 ? (
                <>
                  {recentApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center gap-[10px] rounded-md px-[10px] py-[9px] transition hover:bg-white/[0.035]"
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          approval.status === "pending"
                            ? "bg-[#c9973a] shadow-[0_0_8px_rgba(201,151,58,0.7)]"
                            : approval.status === "approved"
                              ? "bg-[#3e9a70]"
                              : "bg-[#6080a0]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium text-[#eae5dc]">
                          {approval.title}
                        </div>
                        <div className="text-[11px] text-[#5e7088]">
                          {approval.summary ?? "Program approval packet"}
                        </div>
                      </div>
                      <Link
                        href="/app/create"
                        className="rounded-md bg-[#2d7a581a] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#9ad0b7] transition hover:bg-[#2d7a5830]"
                      >
                        {approval.status === "pending" ? "Approve" : approval.status}
                      </Link>
                    </div>
                  ))}
                  <div className="px-[10px] pt-2 text-center text-[12px] text-[#5e7088]">
                    View all {recentApprovals.length} items →
                  </div>
                </>
              ) : (
                <div className="px-2 py-3 text-[12px] leading-6 text-[#9baabf]">
                  No approval packets are waiting right now.
                </div>
              )}
            </div>

            <div className="mb-3 text-[13px] font-semibold text-[#eae5dc]">Innova Insights</div>
            <div className="space-y-[10px]">
              <InsightCard
                highlighted
                body={
                  activePrograms[0]
                    ? `Registration for ${activePrograms[0].name} is approaching. Communication templates and launch assets should be reviewed before the next milestone.`
                    : "The AI workspace is ready. Start from a template or describe a new program to generate the first governed launch kit."
                }
                actionLabel={activePrograms[0] ? "Open workspace →" : "Start with AI →"}
                actionHref="/app/create"
              />
              <InsightCard
                body={
                  pendingApprovals.length > 0
                    ? `${pendingApprovals.length} approval item${pendingApprovals.length === 1 ? "" : "s"} are waiting on program-manager review.`
                    : "No approval blockers are active right now across your visible workspace scopes."
                }
                actionLabel="Review queue →"
                actionHref="/app/create"
              />
            </div>

            <div className="mb-3 mt-4 text-[13px] font-semibold text-[#eae5dc]">Quick Access</div>
            <div className="flex flex-col gap-[2px]">
              <QuickAccessItem label="Program Brief templates" />
              <QuickAccessItem label="Reporting center" />
              <QuickAccessItem label="Judge management" />
            </div>
          </div>
        </div>
      </div>
    </OperatorShell>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  variant,
}: {
  label: string;
  value: string;
  sublabel: string;
  variant: "gold" | "amber" | "blue" | "red";
}) {
  const variantClasses = {
    gold: "border-l-[#b08a28] text-[#e7c46b]",
    amber: "border-l-[#c9973a] text-[#dba84a]",
    blue: "border-l-[#4d87bc] text-[#84b1d6]",
    red: "border-l-[#bc4f4f] text-[#d66d6d]",
  } as const;

  return (
    <div className={`rounded-xl border border-white/7 border-l-2 bg-[#162034] p-5 ${variantClasses[variant]}`}>
      <div className="text-[28px] font-bold leading-none">{value}</div>
      <div className="mt-2 text-[12px] font-medium text-[#eae5dc]">{label}</div>
      <div className="mt-1 text-[11px] text-[#5e7088]">{sublabel}</div>
    </div>
  );
}

function ProgramBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; className: string }> = {
    draft: { label: "In Setup", className: "bg-[#c9973a1a] text-[#dba84a] border-[#c9973a38]" },
    configured: { label: "In Setup", className: "bg-[#c9973a1a] text-[#dba84a] border-[#c9973a38]" },
    published: { label: "Live", className: "bg-[#2d7a581a] text-[#9ad0b7] border-[#2d7a5840]" },
    in_review: { label: "Planning", className: "bg-white/[0.05] text-[#9baabf] border-white/10" },
    completed: { label: "Completed", className: "bg-white/[0.05] text-[#9baabf] border-white/10" },
    archived: { label: "Archived", className: "bg-white/[0.05] text-[#5e7088] border-white/10" },
  };

  const display = statusMap[status] ?? statusMap.archived;

  return (
    <span className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] ${display.className}`}>
      {display.label}
    </span>
  );
}

function ProgressBlock({
  program,
}: {
  program: Awaited<ReturnType<typeof getProgramAccessRows>>[number];
}) {
  const progress = getProgramProgress(program);

  return (
    <div>
      <div className="mb-[5px] flex items-center justify-between text-[11px] text-[#9baabf]">
        <span>{progress.label}</span>
        <span className={progress.valueClass}>{progress.valueText}</span>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-white/[0.05]">
        <div className={`h-full rounded-full ${progress.barClass}`} style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}

function InsightCard({
  body,
  actionLabel,
  actionHref,
  highlighted = false,
}: {
  body: string;
  actionLabel: string;
  actionHref: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlighted
          ? "border-[#b08a2838] bg-[#162034]"
          : "border-white/7 bg-[#162034]"
      }`}
    >
      <div className="mb-[10px] flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]">
          <SparkIcon />
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#b08a28]">
          Innova
        </div>
      </div>
      <div className="mb-[10px] text-[12.5px] leading-6 text-[#d6dee8]">{body}</div>
      <Link
        href={actionHref}
        className="flex w-full items-center justify-center rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-[11.5px] text-[#9baabf] transition hover:bg-white/[0.05] hover:text-[#eae5dc]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function QuickAccessItem({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-md px-[10px] py-2 text-left text-[12.5px] text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
    >
      <SquareChartIcon />
      {label}
    </button>
  );
}

function ActivityBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-[#c9973a1a] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#dba84a]">
      {label}
    </span>
  );
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6v3l-1.5 2h12l-1.5-2V6C12.5 3.5 10.5 1.5 8 1.5Z" />
      <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1 1M11.8 11.8l1 1M12.8 3.2l-1 1M4.2 11.8l-1 1" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 1.5 9.5 5 14 7l-4.5 1.5L8 13 6.5 8.5 2 7l4.5-2L8 1.5Z" />
    </svg>
  );
}

function SquareChartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="1" />
      <path d="M5 11V7M8 11V5M11 11V3.5" />
    </svg>
  );
}

function buildActivityFeed({
  approvals,
  sessions,
  programs,
}: {
  approvals: ApprovalRow[];
  sessions: SessionRow[];
  programs: Awaited<ReturnType<typeof getProgramAccessRows>>;
}) {
  const approvalItems: ActivityItem[] = approvals.map((approval) => {
    const program = programs.find((item) => item.id === approval.program_id);
    return {
      kind: "approval",
      sortDate: approval.requested_at,
      title:
        approval.summary ??
        `${approval.title} requires review in the governed approval workflow.`,
      time: `${formatShortDateTime(approval.requested_at)} · ${program?.name ?? "Program workspace"}`,
      badge: approval.status === "pending" ? "Needs approval" : undefined,
      iconClass: "bg-[#b08a2810] text-[#ccaa4a]",
      icon: <SparkIcon />,
    };
  });

  const sessionItems: ActivityItem[] = sessions.map((session) => ({
    kind: "session",
    sortDate: session.updated_at,
    title: `${session.title ?? "Untitled AI workspace"} was updated in Innova.`,
    time: `${formatShortDateTime(session.updated_at)} · AI Workspace`,
    iconClass: "bg-[#1b3351] text-[#84b1d6]",
    icon: <InboxSparkIcon />,
  }));

  return [...approvalItems, ...sessionItems]
    .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
    .slice(0, 5);
}

function InboxSparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1.5 9.5h13M1.5 9.5l3-8h7l3 8v4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-4Z" />
    </svg>
  );
}

function getProgramProgress(
  program: Awaited<ReturnType<typeof getProgramAccessRows>>[number],
) {
  if (program.status === "published") {
    return {
      label: "Applications received",
      valueText: program.registrationClosesAt ? `Live` : "Open",
      valueClass: "text-[#84b1d6]",
      percent: 24,
      barClass: "bg-[#4d87bc]",
    };
  }

  if (program.status === "draft" || program.status === "configured") {
    return {
      label: "Brief completeness",
      valueText: "82%",
      valueClass: "text-[#dba84a]",
      percent: 82,
      barClass: "bg-[#c9973a]",
    };
  }

  return {
    label: "Brief completion",
    valueText: "Draft",
    valueClass: "text-[#9baabf]",
    percent: 20,
    barClass: "bg-[#6080a0]",
  };
}

function describePrimaryProgramDeadline(
  program: Awaited<ReturnType<typeof getProgramAccessRows>>[number],
) {
  if (program.registrationOpensAt) {
    return `Registration ${isFuture(program.registrationOpensAt) ? "opens" : "opened"} ${formatShortDate(program.registrationOpensAt)}`;
  }

  if (program.registrationClosesAt) {
    return `Closes ${formatShortDate(program.registrationClosesAt)}`;
  }

  if (program.startsAt) {
    return `Kickoff ${formatShortDate(program.startsAt)}`;
  }

  return "Timeline pending";
}

function describeUpcomingDeadline(
  programs: Awaited<ReturnType<typeof getProgramAccessRows>>,
) {
  const upcoming = getUpcomingDates(programs).slice(0, 2);
  if (upcoming.length === 0) {
    return "No program milestones in the next 7 days";
  }

  return upcoming
    .map((item) => `${item.label} ${formatShortDate(item.date)}`)
    .join(" · ");
}

function getUpcomingDates(programs: Awaited<ReturnType<typeof getProgramAccessRows>>) {
  const upcoming: Array<{ label: string; date: string }> = [];
  const now = new Date();
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);

  for (const program of programs) {
    const candidates = [
      { label: "reg opens", date: program.registrationOpensAt },
      { label: "reg closes", date: program.registrationClosesAt },
      { label: "submission closes", date: program.submissionClosesAt },
    ];

    for (const candidate of candidates) {
      if (!candidate.date) continue;
      const parsed = new Date(candidate.date);
      if (parsed >= now && parsed <= weekAhead) {
        upcoming.push(candidate as { label: string; date: string });
      }
    }
  }

  return upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function countDeadlinesThisWeek(
  programs: Awaited<ReturnType<typeof getProgramAccessRows>>,
) {
  return getUpcomingDates(programs).length;
}

function countStatus(
  programs: Awaited<ReturnType<typeof getProgramAccessRows>>,
  status: string,
) {
  return programs.filter((program) => program.status === status).length;
}

function isRecent(value: string, days: number) {
  const parsed = new Date(value).getTime();
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  return parsed >= threshold;
}

function isFuture(value: string) {
  return new Date(value).getTime() >= Date.now();
}

function firstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? "there";
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
