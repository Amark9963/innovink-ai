import Link from "next/link";
import type {
  AgentCreateWorkspaceData,
  ExecutionRunStepSummary,
  ExecutionRunSummary,
  ProgramAccessRow,
  ProgramPlanItemSummary,
} from "@/lib/supabase/queries";
import {
  EmptyStateCard,
  SessionTabs,
  StatusBadge,
  formatDate,
  formatDateTime,
} from "@/app/app/create/_components/session-screen-primitives";

type ExecutionReviewWorkspaceProps = {
  sessionId: string;
  data: AgentCreateWorkspaceData;
  programs: ProgramAccessRow[];
};

export function ExecutionReviewWorkspace({
  sessionId,
  data,
  programs,
}: ExecutionReviewWorkspaceProps) {
  const latestRun = data.executionRuns[0] ?? null;
  const linkedProgram =
    (data.brief?.programId
      ? programs.find((program) => program.id === data.brief?.programId)
      : null) ?? null;

  const stepMap = new Map(data.latestExecutionSteps.map((step) => [step.stepKey, step]));
  const totalPlanItems = data.planItems.length;
  const completedSteps = data.latestExecutionSteps.filter((step) => step.status === "completed").length;
  const partialSteps = data.latestExecutionSteps.filter((step) => step.status === "partial").length;
  const failedSteps = data.latestExecutionSteps.filter((step) => step.status === "failed").length;
  const blockedCount = partialSteps + failedSteps;
  const completionPercent =
    totalPlanItems > 0 ? Math.round((completedSteps / totalPlanItems) * 100) : 0;
  const phaseRows = buildExecutionRows(data.planItems, stepMap, latestRun);
  const timelineRows = phaseRows.slice(0, Math.max(phaseRows.length, 8));
  const recentEvents = buildRecentEvents(data.executionRuns, data.latestExecutionSteps, linkedProgram);
  const latestApproval = data.approvals[0] ?? null;
  const pendingApprovals = data.approvals.filter((item) => item.status === "pending").length;

  return (
    <div className="flex h-full flex-col bg-[#07101f]">
      <SessionTabs sessionId={sessionId} active="execution" data={data} />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_320px] overflow-hidden">
        <main className="overflow-y-auto px-6 py-6">
          <div className="mb-6 grid gap-3 md:grid-cols-4">
            <MetricCard
              value={linkedProgram ? "Linked" : "Draft"}
              label="Program record"
              accent="gold"
              detail={
                linkedProgram
                  ? `${linkedProgram.name} is bound to this workspace`
                  : "Execution will create the live program foundation"
              }
            />
            <MetricCard
              value={`${completionPercent}%`}
              label="Plan complete"
              accent="blue"
              detail={
                totalPlanItems > 0
                  ? `${completedSteps} of ${totalPlanItems} items completed`
                  : "Awaiting a generated plan"
              }
              progress={completionPercent}
            />
            <MetricCard
              value={String(data.executionRuns.length)}
              label="Execution runs"
              accent="green"
              detail={
                latestRun
                  ? `Latest run ${latestRun.status}`
                  : "No deterministic runs yet"
              }
            />
            <MetricCard
              value={String(blockedCount)}
              label="Open blockers"
              accent="amber"
              detail={
                blockedCount > 0
                  ? "Partial or failed steps need operator follow-up"
                  : pendingApprovals > 0
                    ? `${pendingApprovals} approval gates still open`
                    : "No active blockers"
              }
            />
          </div>

          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                Program Timeline
              </h1>
              <p className="mt-2 text-[12px] text-[#9baabf]">
                Deterministic execution turns approved plan items into real platform records and tracked downstream actions.
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

          {timelineRows.length > 0 ? (
            <div className="space-y-2">
              {timelineRows.map((item, index) => (
                <ExecutionTimelineRow
                  key={item.key}
                  item={item}
                  index={index + 1}
                  isLast={index === timelineRows.length - 1}
                />
              ))}
            </div>
          ) : (
            <EmptyStateCard text="Execution will appear here after a real plan has been generated and reviewed." />
          )}
        </main>

        <aside className="overflow-y-auto border-l border-white/7 bg-[#111e30] px-4 py-4">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
            Live Activity
          </div>

          <LiveStatCard
            label="Latest run outcome"
            value={latestRun ? latestRun.status : "Waiting"}
            detail={
              latestRun
                ? `Started ${formatDateTime(latestRun.startedAt ?? latestRun.createdAt)}`
                : "Execution starts after approval and operator trigger"
            }
            progress={completionPercent}
          />

          <LiveStatCard
            label="Program milestone"
            value={linkedProgram?.status ?? "Planning"}
            detail={
              linkedProgram
                ? `Registration closes ${formatDate(linkedProgram.registrationClosesAt)}`
                : "No linked program record yet"
            }
          />

          <div className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
            Ops Log
          </div>

          {recentEvents.length > 0 ? (
            <div className="space-y-0">
              {recentEvents.map((event) => (
                <article
                  key={event.id}
                  className="flex gap-3 border-b border-white/7 py-3 last:border-b-0"
                >
                  <div className="w-[76px] shrink-0 pt-1 text-[10px] text-[#5e7088]">
                    {event.time}
                  </div>
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold ${event.iconClass}`}
                  >
                    {event.icon}
                  </div>
                  <div className="text-[11.5px] leading-5 text-[#c8d3de]">{event.text}</div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyStateCard text="Execution events will appear here as soon as a real run starts writing step outcomes." />
          )}

          <div className="mt-6 rounded-xl border border-white/7 bg-[#162034] p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#b08a28]">
              Launch signals
            </div>
            <div className="space-y-2 text-[11px] text-[#9baabf]">
              <div>
                Approval state{" "}
                <span className="text-[#eae5dc]">
                  {latestApproval ? latestApproval.status : "not prepared"}
                </span>
              </div>
              <div>
                Registration opens{" "}
                <span className="text-[#eae5dc]">
                  {formatDate(linkedProgram?.registrationOpensAt ?? null)}
                </span>
              </div>
              <div>
                Submission closes{" "}
                <span className="text-[#eae5dc]">
                  {formatDate(linkedProgram?.submissionClosesAt ?? null)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

type ExecutionTimelineItem = {
  key: string;
  title: string;
  window: string;
  progressLabel: string;
  progressPercent: number | null;
  tone: "gold" | "green" | "amber" | "muted";
  stateLabel: string;
};

function ExecutionTimelineRow({
  item,
  index,
  isLast,
}: {
  item: ExecutionTimelineItem;
  index: number;
  isLast: boolean;
}) {
  const badgeTone =
    item.tone === "green"
      ? "green"
      : item.tone === "amber"
        ? "amber"
        : item.tone === "gold"
          ? "gold"
          : "muted";

  return (
    <div>
      <article
        className={`flex gap-4 rounded-xl border p-4 ${
          item.tone === "gold"
            ? "border-[#b08a28] bg-[linear-gradient(90deg,rgba(176,138,40,0.06),transparent)]"
            : item.tone === "amber"
              ? "border-[#c9973a40] bg-[#111e30]"
              : "border-white/7 bg-[#111e30]"
        }`}
      >
        <div className="w-7 shrink-0">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${
              item.tone === "gold"
                ? "border-[#b08a28] bg-[#b08a281a] text-[#ccaa4a]"
                : item.tone === "green"
                  ? "border-[#2d7a5840] bg-[#2d7a5812] text-[#9ad0b7]"
                  : item.tone === "amber"
                    ? "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]"
                    : "border-white/10 bg-[#162034] text-[#9baabf]"
            }`}
          >
            {index}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="text-[13px] font-semibold text-[#eae5dc]">{item.title}</div>
            <StatusBadge tone={badgeTone}>{item.stateLabel}</StatusBadge>
            <span className="ml-auto text-[10px] text-[#5e7088]">{item.window}</span>
          </div>

          {item.progressPercent !== null ? (
            <>
              <div className="h-[5px] overflow-hidden rounded-full bg-white/7">
                <div
                  className={`h-full rounded-full ${
                    item.tone === "green"
                      ? "bg-[#2d7a58]"
                      : item.tone === "amber"
                        ? "bg-[#c9973a]"
                        : "bg-[#b08a28]"
                  }`}
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-[#9baabf]">{item.progressLabel}</div>
            </>
          ) : (
            <div className="text-[11px] text-[#9baabf]">{item.progressLabel}</div>
          )}
        </div>
      </article>

      {!isLast ? <div className="ml-[13px] h-3 w-px bg-white/7" /> : null}
    </div>
  );
}

function MetricCard({
  value,
  label,
  detail,
  accent,
  progress,
}: {
  value: string;
  label: string;
  detail: string;
  accent: "gold" | "green" | "blue" | "amber";
  progress?: number;
}) {
  const accentClass =
    accent === "gold"
      ? "text-[#ccaa4a]"
      : accent === "green"
        ? "text-[#9ad0b7]"
        : accent === "blue"
          ? "text-[#c4d8ec]"
          : "text-[#e8c26d]";

  const progressClass =
    accent === "green" ? "bg-[#2d7a58]" : accent === "blue" ? "bg-[#3a6e9e]" : "bg-[#b08a28]";

  return (
    <div className="rounded-xl border border-white/7 bg-[#162034] p-4">
      <div className={`text-[22px] font-semibold tracking-[-0.02em] ${accentClass}`}>{value}</div>
      <div className="mt-1 text-[11.5px] text-[#9baabf]">{label}</div>
      {typeof progress === "number" ? (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/7">
          <div className={`h-full rounded-full ${progressClass}`} style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="mt-2 text-[10px] text-[#5e7088]">{detail}</div>
    </div>
  );
}

function LiveStatCard({
  label,
  value,
  detail,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  progress?: number;
}) {
  return (
    <div className="mb-3 rounded-xl border border-white/7 bg-[#162034] p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-[11px] text-[#9baabf]">{label}</div>
        <div className="text-[15px] font-semibold text-[#ccaa4a]">{value}</div>
      </div>
      {typeof progress === "number" ? (
        <div className="h-1 overflow-hidden rounded-full bg-white/7">
          <div className="h-full rounded-full bg-[#b08a28]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="mt-2 text-[10px] text-[#5e7088]">{detail}</div>
    </div>
  );
}

function buildExecutionRows(
  planItems: ProgramPlanItemSummary[],
  stepMap: Map<string, ExecutionRunStepSummary>,
  latestRun: ExecutionRunSummary | null,
) {
  return planItems.map((item) => {
    const step = stepMap.get(item.itemKey) ?? null;
    const state = step?.status ?? (latestRun ? "queued" : "not_started");

    if (state === "completed") {
      return {
        key: item.id,
        title: item.title,
        window: latestRun ? formatDateTime(latestRun.startedAt ?? latestRun.createdAt) : "Ready",
        progressLabel: "Completed during the latest deterministic run",
        progressPercent: 100,
        tone: "green" as const,
        stateLabel: "Complete",
      };
    }

    if (state === "partial") {
      return {
        key: item.id,
        title: item.title,
        window: "Needs operator follow-up",
        progressLabel: "Partially executed with missing downstream records",
        progressPercent: 62,
        tone: "amber" as const,
        stateLabel: "Partial",
      };
    }

    if (state === "failed") {
      return {
        key: item.id,
        title: item.title,
        window: "Blocked",
        progressLabel: "Execution failed and needs correction before rerun",
        progressPercent: 18,
        tone: "amber" as const,
        stateLabel: "Blocked",
      };
    }

    if (state === "queued" || state === "running") {
      return {
        key: item.id,
        title: item.title,
        window: latestRun ? "Current run" : "Ready",
        progressLabel: state === "running" ? "Executor is actively processing this item" : "Queued in the active execution run",
        progressPercent: state === "running" ? 45 : 12,
        tone: "gold" as const,
        stateLabel: state === "running" ? "Running" : "Active",
      };
    }

    return {
      key: item.id,
      title: item.title,
      window: "Upcoming",
      progressLabel: "Waiting for approval and deterministic execution",
      progressPercent: null,
      tone: "muted" as const,
      stateLabel: "Queued",
    };
  });
}

function buildRecentEvents(
  executionRuns: ExecutionRunSummary[],
  latestSteps: ExecutionRunStepSummary[],
  linkedProgram: ProgramAccessRow | null,
) {
  const events: Array<{
    id: string;
    time: string;
    icon: string;
    iconClass: string;
    text: string;
  }> = [];

  const latestRun = executionRuns[0] ?? null;
  if (latestRun) {
    events.push({
      id: `run-${latestRun.id}`,
      time: formatTimeLabel(latestRun.startedAt ?? latestRun.createdAt),
      icon: latestRun.status === "completed" ? "✓" : latestRun.status === "failed" ? "!" : "•",
      iconClass:
        latestRun.status === "completed"
          ? "border-[#2d7a5840] bg-[#2d7a5812] text-[#9ad0b7]"
          : latestRun.status === "failed"
            ? "border-[#9b3a3a44] bg-[#9b3a3a12] text-[#f1bcbc]"
            : "border-[#b08a2838] bg-[#b08a2812] text-[#ccaa4a]",
      text: latestRun.summary ?? "A deterministic execution run was started for this workspace.",
    });
  }

  latestSteps.slice(0, 5).forEach((step) => {
    events.push({
      id: step.id,
      time: step.status === "completed" ? "Complete" : step.status === "failed" ? "Failed" : "Step",
      icon: step.status === "completed" ? "✓" : step.status === "failed" ? "!" : "•",
      iconClass:
        step.status === "completed"
          ? "border-[#2d7a5840] bg-[#2d7a5812] text-[#9ad0b7]"
          : step.status === "failed"
            ? "border-[#9b3a3a44] bg-[#9b3a3a12] text-[#f1bcbc]"
            : step.status === "partial"
              ? "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]"
              : "border-[#3a6e9e44] bg-[#3a6e9e12] text-[#c4d8ec]",
      text:
        step.status === "completed"
          ? `${step.title} completed and wrote ${step.targetType ?? "downstream"} records.`
          : step.status === "failed"
            ? `${step.title} failed and needs operator review before a rerun.`
            : step.status === "partial"
              ? `${step.title} completed partially and still has follow-up actions.`
              : `${step.title} is queued in the current run.`,
    });
  });

  if (linkedProgram) {
    events.push({
      id: `program-${linkedProgram.id}`,
      time: "Program",
      icon: "✓",
      iconClass: "border-[#2d7a5840] bg-[#2d7a5812] text-[#9ad0b7]",
      text: `${linkedProgram.name} is linked to the workspace and ready for downstream launch operations.`,
    });
  }

  return events.slice(0, 7);
}

function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
