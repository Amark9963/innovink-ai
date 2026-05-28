import Link from "next/link";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import {
  EmptyStateCard,
  ExecutionStepList,
  SessionTabs,
  StatusBadge,
  formatDate,
  formatDateTime,
} from "@/app/app/create/_components/session-screen-primitives";

type ExecutionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ExecutionPage({ params }: ExecutionPageProps) {
  const { sessionId } = await params;
  const { data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const latestRun = data.executionRuns[0] ?? null;
  const completedSteps = data.latestExecutionSteps.filter((step) => step.status === "completed").length;
  const openIssues = data.latestExecutionSteps.filter(
    (step) => step.status === "failed" || step.status === "partial",
  ).length;

  return (
    <OperatorShell
      activeNav="execution"
      sessionId={sessionId}
      headerTitle="Execution"
      headerSubtitle="Deterministic execution state and run outputs"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="execution" data={data} />

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] overflow-hidden">
          <main className="overflow-y-auto px-6 py-6">
            <div className="mb-6 grid gap-3 md:grid-cols-4">
              <MetricCard
                value={String(data.executionRuns.length)}
                label="Execution runs"
                accent="gold"
                detail={latestRun ? `Latest ${latestRun.status}` : "No runs yet"}
              />
              <MetricCard
                value={String(completedSteps)}
                label="Completed steps"
                accent="green"
                detail={latestRun ? `${data.latestExecutionSteps.length} in latest run` : "Awaiting execution"}
              />
              <MetricCard
                value={data.brief?.programId ? "Linked" : "Draft"}
                label="Program record"
                accent="blue"
                detail={data.brief?.programId ? "Execution bound to live program" : "No live program yet"}
              />
              <MetricCard
                value={String(openIssues)}
                label="Open issues"
                accent="amber"
                detail={openIssues > 0 ? "Needs follow-up" : "No active blockers"}
              />
            </div>

            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                  Program Execution
                </h1>
                <p className="mt-2 text-[12px] text-[#9baabf]">
                  Track deterministic runs, step outcomes, and downstream objects created from approved plans.
                </p>
              </div>
              {latestRun ? (
                <Link
                  href={`/app/create/${sessionId}/runs/${latestRun.id}`}
                  className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                >
                  Open run detail →
                </Link>
              ) : null}
            </div>

            {latestRun ? (
              <>
                <div className="mb-5 rounded-xl border border-white/7 bg-[#162034] p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <h2 className="text-[16px] font-semibold text-[#eae5dc]">
                      Latest Run
                    </h2>
                    <StatusBadge
                      tone={
                        latestRun.status === "completed"
                          ? "green"
                          : latestRun.status === "partial"
                            ? "amber"
                            : latestRun.status === "failed"
                              ? "red"
                              : "muted"
                      }
                    >
                      {latestRun.status}
                    </StatusBadge>
                  </div>
                  <div className="grid gap-3 text-[11.5px] text-[#9baabf] md:grid-cols-3">
                    <div>Started {formatDateTime(latestRun.startedAt ?? latestRun.createdAt)}</div>
                    <div>Completed {formatDateTime(latestRun.completedAt)}</div>
                    <div>Kind: {latestRun.executionKind}</div>
                  </div>
                  {latestRun.summary ? (
                    <p className="mt-4 text-[12px] leading-6 text-[#9baabf]">{latestRun.summary}</p>
                  ) : null}
                </div>

                <ExecutionStepList steps={data.latestExecutionSteps} />
              </>
            ) : (
              <EmptyStateCard text="No execution runs exist yet. Approve the packet and execute the plan from the PM workspace first." />
            )}
          </main>

          <aside className="overflow-y-auto border-l border-white/7 bg-[#111e30] px-4 py-4">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
              Run history
            </div>
            {data.executionRuns.length > 0 ? (
              <div className="space-y-3">
                {data.executionRuns.map((run) => (
                  <Link
                    key={run.id}
                    href={`/app/create/${sessionId}/runs/${run.id}`}
                    className="block rounded-xl border border-white/7 bg-[#162034] p-4 transition hover:border-[#b08a2838] hover:bg-[#1b2840]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12px] font-semibold text-[#eae5dc]">
                        {run.summary ?? "Execution run"}
                      </div>
                      <StatusBadge
                        tone={
                          run.status === "completed"
                            ? "green"
                            : run.status === "partial"
                              ? "amber"
                              : run.status === "failed"
                                ? "red"
                                : "muted"
                        }
                      >
                        {run.status}
                      </StatusBadge>
                    </div>
                    <div className="mt-2 text-[10.5px] text-[#9baabf]">
                      {formatDateTime(run.startedAt ?? run.createdAt)}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyStateCard text="Run history will appear after the first approved execution." />
            )}

            <div className="mt-6 rounded-xl border border-white/7 bg-[#162034] p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
                Program milestones
              </div>
              <div className="space-y-2 text-[11px] text-[#9baabf]">
                <div>Registration opens {formatDate(data.brief?.programId ? programs.find((program) => program.id === data.brief?.programId)?.registrationOpensAt ?? null : null)}</div>
                <div>Registration closes {formatDate(data.brief?.programId ? programs.find((program) => program.id === data.brief?.programId)?.registrationClosesAt ?? null : null)}</div>
                <div>Submission closes {formatDate(data.brief?.programId ? programs.find((program) => program.id === data.brief?.programId)?.submissionClosesAt ?? null : null)}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </OperatorShell>
  );
}

function MetricCard({
  value,
  label,
  detail,
  accent,
}: {
  value: string;
  label: string;
  detail: string;
  accent: "gold" | "green" | "blue" | "amber";
}) {
  const accentClass =
    accent === "gold"
      ? "text-[#ccaa4a]"
      : accent === "green"
        ? "text-[#9ad0b7]"
        : accent === "blue"
          ? "text-[#c4d8ec]"
          : "text-[#e8c26d]";

  return (
    <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
      <div className={`text-[22px] font-semibold tracking-[-0.02em] ${accentClass}`}>{value}</div>
      <div className="mt-1 text-[11.5px] text-[#9baabf]">{label}</div>
      <div className="mt-2 text-[10px] text-[#5e7088]">{detail}</div>
    </div>
  );
}
