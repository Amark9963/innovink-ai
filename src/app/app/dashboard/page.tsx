import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import {
  getCurrentUserOrNull,
  getProgramAccessRows,
  getWorkspaceAccessRows,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const [{ data: recentApprovals, error: approvalsError }, { data: recentSessions, error: sessionsError }] =
    await Promise.all([
      supabase
        .from("approval_requests")
        .select("id, title, summary, status, program_id, requested_at")
        .eq("requested_by", user.id)
        .order("requested_at", { ascending: false })
        .limit(4),
      supabase
        .from("agent_sessions")
        .select("id, title, status, updated_at, workspace_id")
        .eq("created_by", user.id)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  if (approvalsError) {
    throw approvalsError;
  }

  if (sessionsError) {
    throw sessionsError;
  }

  const activePrograms = programs.filter((program) =>
    ["draft", "configured", "published", "in_review"].includes(program.status),
  );
  const pendingApprovals = (recentApprovals ?? []).filter(
    (approval) => approval.status === "pending",
  );
  const activeWorkstreams = (recentSessions ?? []).filter(
    (session) => session.status === "active",
  );

  const userName = user.user_metadata.full_name ?? user.email ?? "Operator";

  return (
    <OperatorShell
      activeNav="overview"
      headerTitle={workspaces[0].organizationName}
      headerSubtitle={workspaces[0].workspaceName}
      organizationName={workspaces[0].organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={workspaces}
      programs={programs}
      headerActions={
        <>
          <button
            type="button"
            disabled
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#5e7088]"
          >
            Browse templates
          </button>
          <button
            type="button"
            disabled
            className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#5e7088]"
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
        </>
      }
    >
      <div className="mx-auto max-w-[1200px] px-8 py-7">
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
              <span className="font-medium text-[#bc4f4f]">
                {activePrograms.length === 0 ? "no active program deadlines" : `${activePrograms.length} active programs`}
              </span>{" "}
              across your workspace.
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-4">
          <MetricCard
            label="Active Programs"
            value={String(activePrograms.length)}
            accent="gold"
            sublabel={`${programs.length} total visible records`}
          />
          <MetricCard
            label="Pending Approvals"
            value={String(pendingApprovals.length)}
            accent="amber"
            sublabel={`${recentApprovals?.length ?? 0} recent requests`}
          />
          <MetricCard
            label="AI Workstreams"
            value={String(activeWorkstreams.length)}
            accent="blue"
            sublabel={`${recentSessions?.length ?? 0} recent sessions`}
          />
          <MetricCard
            label="Workspace Footprint"
            value={String(workspaces.length)}
            accent="steel"
            sublabel="Active tenant scopes"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#eae5dc]">Active Programs</div>
              <span className="text-[11.5px] text-[#5e7088]">View all</span>
            </div>

            <div className="mb-6 grid gap-3 xl:grid-cols-3">
              {programs.length > 0 ? (
                programs.slice(0, 6).map((program) => (
                  <article
                    key={program.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/7 bg-[#162034] p-[18px] transition hover:border-white/10 hover:bg-[#1b2840]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[13.5px] font-semibold leading-5 text-[#eae5dc]">
                          {program.name}
                        </div>
                        <div className="mt-1 text-[11.5px] text-[#9baabf]">
                          {program.programType} · {program.workspaceName}
                        </div>
                      </div>
                      <ProgramBadge status={program.status} />
                    </div>
                    <div className="text-[11.5px] text-[#5e7088]">
                      {program.registrationClosesAt
                        ? `Registration closes ${formatShortDate(program.registrationClosesAt)}`
                        : "Registration window not set"}
                    </div>
                    <div className="mt-auto flex items-center gap-2">
                      <Link
                        href={`/app/programs/${program.id}/landing-page`}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/app/create?workspace=${program.workspaceId}`}
                        className="rounded-md bg-[#b08a28] px-3 py-1.5 text-[11.5px] font-medium text-[#06100f] transition hover:bg-[#ccaa4a]"
                      >
                        AI Workspace
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#162034] p-5 text-[12px] leading-6 text-[#9baabf] xl:col-span-3">
                  No live program records yet. Use the AI workspace to create the
                  first governed program.
                </div>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#eae5dc]">Recent Activity</div>
              <span className="text-[11.5px] text-[#5e7088]">Latest PM workstreams</span>
            </div>

            <div className="rounded-xl border border-white/7 bg-[#162034] px-4 py-3">
              {recentSessions && recentSessions.length > 0 ? (
                recentSessions.map((session, index) => {
                  const workspace = workspaces.find(
                    (item) => item.workspaceId === session.workspace_id,
                  );

                  return (
                    <div
                      key={session.id}
                      className={`flex items-start gap-3 py-3 ${
                        index < recentSessions.length - 1 ? "border-b border-white/[0.035]" : ""
                      }`}
                    >
                      <div className="mt-0.5 flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#b08a2810] text-[10px] font-semibold text-[#ccaa4a]">
                        AI
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] leading-5 text-[#9baabf]">
                          {session.title ?? "Untitled AI program workspace"}
                        </div>
                        <div className="mt-1 text-[10.5px] text-[#5e7088]">
                          {workspace?.workspaceName ?? "Workspace"} · Updated{" "}
                          {formatShortDateTime(session.updated_at)}
                        </div>
                      </div>
                      <span className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.06em] text-[#9baabf]">
                        {session.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-[12px] leading-6 text-[#9baabf]">
                  No PM activity yet. Start in the AI workspace to generate the first
                  brief and execution plan.
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
                      className="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-white/[0.035]"
                    >
                      <div
                        className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
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
                          Requested {formatShortDateTime(approval.requested_at)}
                        </div>
                      </div>
                      <span className="rounded-md border border-[#2d7a5840] bg-[#2d7a581a] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#9ad0b7]">
                        {approval.status}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 text-center text-[12px] text-[#5e7088]">
                    Review in the AI workspace
                  </div>
                </>
              ) : (
                <div className="px-2 py-3 text-[12px] leading-6 text-[#9baabf]">
                  No approval packets are waiting right now.
                </div>
              )}
            </div>

            <div className="mb-3 text-[13px] font-semibold text-[#eae5dc]">Innova Insights</div>
            <div className="space-y-3">
              <InsightCard
                title="Program creation should start in AI Workspace"
                body="The reviewed flow is now centered on chat-driven program setup. Use the New Program action to generate a brief, plan, assets, approvals, and execution path."
              />
              <InsightCard
                title="Workspace foundation is active"
                body={`${workspaces.length} workspace scope${workspaces.length === 1 ? "" : "s"} ready for governed program setup and review.`}
              />
              <InsightCard
                title="No placeholder data paths"
                body="This dashboard renders only records available through current tenant visibility and server-side auth checks."
              />
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
  accent,
}: {
  label: string;
  value: string;
  sublabel: string;
  accent: "gold" | "amber" | "blue" | "steel";
}) {
  const accentClasses: Record<typeof accent, string> = {
    gold: "border-l-[#b08a28] text-[#ccaa4a]",
    amber: "border-l-[#c9973a] text-[#dba84a]",
    blue: "border-l-[#4d87bc] text-[#4d87bc]",
    steel: "border-l-[#6080a0] text-[#eae5dc]",
  };

  return (
    <div className={`rounded-xl border border-white/7 border-l-2 bg-[#162034] p-5 ${accentClasses[accent]}`}>
      <div className="text-[28px] font-bold leading-none">{value}</div>
      <div className="mt-2 text-[12px] font-medium text-[#eae5dc]">{label}</div>
      <div className="mt-1 text-[11px] text-[#5e7088]">{sublabel}</div>
    </div>
  );
}

function ProgramBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-[#c9973a1a] text-[#dba84a] border-[#c9973a38]",
    configured: "bg-[#c9973a1a] text-[#dba84a] border-[#c9973a38]",
    published: "bg-[#2d7a581a] text-[#9ad0b7] border-[#2d7a5840]",
    in_review: "bg-[#3a6e9e1a] text-[#84b1d6] border-[#3a6e9e40]",
    completed: "bg-white/[0.05] text-[#9baabf] border-white/10",
    archived: "bg-white/[0.05] text-[#5e7088] border-white/10",
  };

  return (
    <span className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em] ${styles[status] ?? styles.archived}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
      <div className="mb-2 text-[12px] font-semibold text-[#eae5dc]">{title}</div>
      <div className="text-[11px] leading-5 text-[#9baabf]">{body}</div>
    </div>
  );
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
