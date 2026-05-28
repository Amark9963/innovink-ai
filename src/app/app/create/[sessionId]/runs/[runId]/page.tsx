import Link from "next/link";
import { notFound } from "next/navigation";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import { getExecutionRunDetail } from "@/lib/supabase/queries";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import {
  EmptyStateCard,
  ExecutionStepList,
  RunSummaryCard,
  StatusBadge,
  formatDateTime,
} from "@/app/app/create/_components/session-screen-primitives";

type RunDetailPageProps = {
  params: Promise<{
    sessionId: string;
    runId: string;
  }>;
};

export default async function ExecutionRunDetailPage({ params }: RunDetailPageProps) {
  const { sessionId, runId } = await params;
  const { supabase, data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);
  const detail = await getExecutionRunDetail(supabase, runId);

  if (!detail.run) {
    notFound();
  }

  const completed = detail.steps.filter((step) => step.status === "completed").length;
  const partial = detail.steps.filter((step) => step.status === "partial").length;
  const failed = detail.steps.filter((step) => step.status === "failed").length;
  const blocked = detail.steps.filter(
    (step) =>
      step.status === "queued" ||
      step.status === "running" ||
      step.status === "cancelled",
  ).length;

  return (
    <OperatorShell
      activeNav="execution"
      sessionId={sessionId}
      headerTitle="Execution Run Detail"
      headerSubtitle="Step-level run outcomes and follow-up actions"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
      headerActions={
        <Link
          href={`/app/create/${sessionId}/execution`}
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/5 hover:text-[#eae5dc]"
        >
          Back to execution
        </Link>
      }
    >
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] bg-[#07101f]">
        <main className="overflow-y-auto px-6 py-6">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-[#5e7088]">
            <Link href={`/app/create/${sessionId}/execution`} className="hover:text-[#9baabf]">
              Execution
            </Link>
            <span>›</span>
            <span className="text-[#9baabf]">Run {detail.run.id.slice(0, 8)}</span>
          </div>

          <RunSummaryCard run={detail.run} />

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <RunMetric value={String(detail.steps.length)} label="Steps" />
            <RunMetric value={String(completed)} label="Completed" tone="green" />
            <RunMetric value={String(partial)} label="Partial" tone="amber" />
            <RunMetric value={String(failed)} label="Failed" tone="red" />
            <RunMetric value={String(blocked)} label="Blocked" tone="muted" />
          </div>

          <div className="mt-6">
            {detail.steps.length > 0 ? (
              <ExecutionStepList steps={detail.steps} />
            ) : (
              <EmptyStateCard text="No run steps were recorded for this execution." />
            )}
          </div>
        </main>

        <aside className="overflow-y-auto border-l border-white/7 bg-[#111e30] px-5 py-6">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
            Run Summary
          </div>
          <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[12.5px] font-semibold text-[#eae5dc]">Status</div>
              <StatusBadge
                tone={
                  detail.run.status === "completed"
                    ? "green"
                    : detail.run.status === "partial"
                      ? "amber"
                      : detail.run.status === "failed"
                        ? "red"
                        : "muted"
                }
              >
                {detail.run.status}
              </StatusBadge>
            </div>
            <div className="space-y-2 text-[11px] text-[#9baabf]">
              <div>Started {formatDateTime(detail.run.startedAt ?? detail.run.createdAt)}</div>
              <div>Completed {formatDateTime(detail.run.completedAt)}</div>
              <div>Kind: {detail.run.executionKind}</div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
              Follow-up Actions
            </div>
            <div className="space-y-2">
              {failed > 0 ? (
                <div className="rounded-lg border border-[#9b3a3a33] bg-[#9b3a3a0d] px-3 py-3 text-[11px] leading-5 text-[#f1bcbc]">
                  Review failed steps and rerun the affected executor after correcting the underlying data or template issue.
                </div>
              ) : null}
              {partial > 0 ? (
                <div className="rounded-lg border border-[#c9973a33] bg-[#c9973a0d] px-3 py-3 text-[11px] leading-5 text-[#e8c26d]">
                  Partial steps completed with missing downstream records. Resolve the gap before publishing or notifying operators.
                </div>
              ) : null}
              {failed === 0 && partial === 0 ? (
                <div className="rounded-lg border border-[#2d7a5833] bg-[#2d7a580d] px-3 py-3 text-[11px] leading-5 text-[#9ad0b7]">
                  This run completed cleanly. The resulting objects are ready for downstream review and operations.
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </OperatorShell>
  );
}

function RunMetric({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: string;
  tone?: "default" | "green" | "amber" | "red" | "muted";
}) {
  const valueClass =
    tone === "green"
      ? "text-[#9ad0b7]"
      : tone === "amber"
        ? "text-[#e8c26d]"
        : tone === "red"
          ? "text-[#f1bcbc]"
          : tone === "muted"
            ? "text-[#9baabf]"
            : "text-[#eae5dc]";

  return (
    <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
      <div className={`text-[20px] font-semibold tracking-[-0.02em] ${valueClass}`}>{value}</div>
      <div className="mt-1 text-[11px] text-[#9baabf]">{label}</div>
    </div>
  );
}
