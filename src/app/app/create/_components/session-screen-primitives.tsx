import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { reviewApprovalRequestAction } from "@/app/app/create/actions";
import type {
  AgentCreateWorkspaceData,
  ApprovalRequestItemSummary,
  ApprovalRequestSummary,
  ExecutionRunStepSummary,
  ExecutionRunSummary,
  ProgramBriefSummary,
  ProgramBriefVersionSummary,
  ProgramPlanItemSummary,
} from "@/lib/supabase/queries";

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function parseRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

export function getStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function getArrayStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function StatusBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "gold" | "green" | "amber" | "red" | "muted" | "blue";
}) {
  return (
    <span
      className={cn(
        "rounded-sm border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.06em]",
        tone === "gold" && "border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]",
        tone === "green" && "border-[#2d7a5840] bg-[#2d7a5810] text-[#9ad0b7]",
        tone === "amber" && "border-[#c9973a40] bg-[#c9973a10] text-[#e8c26d]",
        tone === "red" && "border-[#9b3a3a44] bg-[#9b3a3a12] text-[#f1bcbc]",
        tone === "muted" && "border-white/10 bg-white/[0.03] text-[#9baabf]",
        tone === "blue" && "border-[#3a6e9e44] bg-[#3a6e9e12] text-[#c4d8ec]",
        tone === "default" && "border-white/10 bg-white/[0.03] text-[#9baabf]",
      )}
    >
      {children}
    </span>
  );
}

export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-2 border-b border-white/7 py-3 last:border-b-0 md:grid-cols-[140px_minmax(0,1fr)]">
      <div className="text-[11px] text-[#5e7088]">{label}</div>
      <div className="text-[12.5px] text-[#eae5dc]">{value && value.trim() ? value : "Not set"}</div>
    </div>
  );
}

export function EmptyStateCard({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-[#162034] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
      {text}
    </div>
  );
}

export function SessionTabs({
  sessionId,
  active,
  data,
}: {
  sessionId: string;
  active: "chat" | "brief" | "plan" | "assets" | "approvals" | "execution";
  data: AgentCreateWorkspaceData;
}) {
  const latestApproval = data.approvals[0] ?? null;

  const tabs = [
    { label: "Innova Chat", href: `/app/create?session=${sessionId}`, key: "chat" as const },
    {
      label: "Brief",
      href: `/app/create/${sessionId}/brief`,
      key: "brief" as const,
      badge: data.brief ? "ok" : null,
    },
    {
      label: "Plan",
      href: `/app/create/${sessionId}/plan`,
      key: "plan" as const,
      badge: data.plan ? "ok" : null,
    },
    {
      label: "Assets",
      href: `/app/create/${sessionId}/assets`,
      key: "assets" as const,
      count: data.planItems.length || null,
    },
    {
      label: "Approvals",
      href: `/app/create/${sessionId}/approvals`,
      key: "approvals" as const,
      count: data.approvals.filter((item) => item.status === "pending").length,
      badge:
        latestApproval?.status === "approved"
          ? "ok"
          : latestApproval?.status === "rejected"
            ? "warn"
            : null,
    },
    {
      label: "Execution",
      href: `/app/create/${sessionId}/execution`,
      key: "execution" as const,
      count: data.executionRuns.length,
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-white/7 bg-[#0c1525] px-5">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "flex h-11 items-center gap-2 border-b-2 border-transparent px-3 text-[12px] text-[#9baabf] transition hover:text-[#eae5dc]",
            active === tab.key && "border-b-[#b08a28] font-semibold text-[#ccaa4a]",
          )}
        >
          <span>{tab.label}</span>
          {tab.badge === "ok" ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2d7a58] px-1 text-[9px] font-bold text-white">
              ✓
            </span>
          ) : null}
          {tab.badge === "warn" ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9973a] px-1 text-[9px] font-bold text-[#07101f]">
              !
            </span>
          ) : null}
          {tab.count ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b08a28] px-1 text-[9px] font-bold text-[#07101f]">
              {tab.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export function BriefSummaryCard({ brief }: { brief: ProgramBriefSummary }) {
  const briefRecord = parseRecord(brief.currentBrief);
  const timeline = parseRecord(briefRecord.timeline);

  return (
    <div className="rounded-lg border border-white/7 bg-[#111e30] p-4">
      <InfoRow label="Objective" value={getStringValue(briefRecord.objective)} />
      <InfoRow label="Format" value={getStringValue(briefRecord.format)} />
      <InfoRow
        label="Regions"
        value={getArrayStrings(briefRecord.regions).join(", ")}
      />
      <InfoRow
        label="Participants"
        value={getArrayStrings(briefRecord.targetParticipants).join(", ")}
      />
      <InfoRow label="Team policy" value={getStringValue(briefRecord.teamPolicy)} />
      <InfoRow label="Registration" value={getStringValue(timeline.registrationWindow)} />
      <InfoRow label="Submission" value={getStringValue(timeline.submissionWindow)} />
      <InfoRow label="Program window" value={getStringValue(timeline.liveProgramWindow)} />
      <InfoRow label="Evaluation" value={getStringValue(briefRecord.evaluationModel)} />
      <InfoRow label="Mentoring" value={getStringValue(briefRecord.mentoringModel)} />
      <InfoRow
        label="Deliverables"
        value={getArrayStrings(briefRecord.deliverables).join(", ")}
      />
    </div>
  );
}

export function ApprovalActions({
  sessionId,
  approval,
}: {
  sessionId: string;
  approval: ApprovalRequestSummary;
}) {
  if (approval.status !== "pending") {
    return null;
  }

  return (
    <div className="mt-4 flex gap-2">
      <form action={reviewApprovalRequestAction} className="flex-1">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="approvalRequestId" value={approval.id} />
        <input type="hidden" name="decision" value="approved" />
        <button
          type="submit"
          className="w-full rounded-md bg-[#b08a28] px-3 py-2 text-[11.5px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
        >
          Approve
        </button>
      </form>
      <form action={reviewApprovalRequestAction} className="flex-1">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="approvalRequestId" value={approval.id} />
        <input type="hidden" name="decision" value="rejected" />
        <button
          type="submit"
          className="w-full rounded-md border border-white/10 px-3 py-2 text-[11.5px] font-semibold text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
        >
          Reject
        </button>
      </form>
    </div>
  );
}

export function PlanItemsList({ items }: { items: ProgramPlanItemSummary[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <article
          key={item.id}
          className="rounded-xl border border-white/7 bg-[#111e30] p-4"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#b08a2838] bg-[#b08a2810] text-[11px] font-semibold text-[#ccaa4a]">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[13px] font-semibold text-[#eae5dc]">{item.title}</h3>
                <StatusBadge tone={item.requiresApproval ? "gold" : "muted"}>
                  {item.requiresApproval ? "approval required" : "ready"}
                </StatusBadge>
                <StatusBadge tone="muted">{formatLabel(item.itemType)}</StatusBadge>
              </div>
              {item.description ? (
                <p className="mt-2 text-[11.5px] leading-6 text-[#9baabf]">{item.description}</p>
              ) : null}
              <PayloadHighlights payload={item.payload} />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ApprovalItemsList({ items }: { items: ApprovalRequestItemSummary[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-white/7 bg-[#111e30] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12.5px] font-semibold text-[#eae5dc]">{item.title}</div>
              <div className="mt-1 text-[10.5px] uppercase tracking-[0.06em] text-[#5e7088]">
                {formatLabel(item.itemType)}
              </div>
            </div>
            <StatusBadge tone={item.status === "approved" ? "green" : "gold"}>
              {item.status}
            </StatusBadge>
          </div>
          {item.description ? (
            <p className="mt-2 text-[11.5px] leading-6 text-[#9baabf]">{item.description}</p>
          ) : null}
          <PayloadHighlights payload={item.payload} />
        </article>
      ))}
    </div>
  );
}

export function ExecutionStepList({ steps }: { steps: ExecutionRunStepSummary[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <article key={step.id} className="rounded-xl border border-white/7 bg-[#111e30] p-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold",
                step.status === "completed" &&
                  "border-[#2d7a5840] bg-[#2d7a5812] text-[#9ad0b7]",
                step.status === "partial" &&
                  "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]",
                step.status === "failed" &&
                  "border-[#9b3a3a44] bg-[#9b3a3a12] text-[#f1bcbc]",
                (step.status === "queued" || step.status === "running" || step.status === "cancelled") &&
                  "border-white/10 bg-white/[0.03] text-[#9baabf]",
              )}
            >
              {step.displayOrder}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[13px] font-semibold text-[#eae5dc]">{step.title}</div>
                <StatusBadge tone={executionStatusTone(step.status)}>{step.status}</StatusBadge>
                {step.targetType ? (
                  <StatusBadge tone="muted">{step.targetType}</StatusBadge>
                ) : null}
              </div>
              <div className="mt-2 text-[11px] uppercase tracking-[0.06em] text-[#5e7088]">
                {formatLabel(step.stepType)}
              </div>
              <PayloadHighlights payload={step.outputPayload} />
              {step.errorPayload ? (
                <pre className="mt-3 overflow-x-auto rounded-lg border border-[#9b3a3a33] bg-[#9b3a3a0d] px-3 py-3 text-[10.5px] leading-5 text-[#f1bcbc]">
                  {JSON.stringify(step.errorPayload, null, 2)}
                </pre>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function RunSummaryCard({ run }: { run: ExecutionRunSummary }) {
  return (
    <div className="rounded-xl border border-white/7 bg-[#111e30] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
            {run.summary ?? "Execution run"}
          </div>
          <div className="mt-2 text-[11.5px] text-[#9baabf]">
            {formatLabel(run.executionKind)} · started {formatDateTime(run.startedAt ?? run.createdAt)}
          </div>
        </div>
        <StatusBadge tone={executionStatusTone(run.status)}>{run.status}</StatusBadge>
      </div>
    </div>
  );
}

export function VersionsList({
  versions,
  activeVersionId,
}: {
  versions: ProgramBriefVersionSummary[];
  activeVersionId: string | null;
}) {
  return (
    <div className="space-y-2">
      {versions.map((version) => (
        <div
          key={version.id}
          className={cn(
            "rounded-lg border px-3 py-3",
            version.id === activeVersionId
              ? "border-[#b08a2838] bg-[#b08a2810]"
              : "border-white/7 bg-[#111e30]",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] font-semibold text-[#eae5dc]">
              Version {version.versionNumber}
            </div>
            <StatusBadge tone={version.id === activeVersionId ? "gold" : "muted"}>
              {version.id === activeVersionId ? "current" : version.source}
            </StatusBadge>
          </div>
          <div className="mt-2 text-[10.5px] text-[#9baabf]">
            Confidence {version.confidenceLevel} · {formatDateTime(version.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PayloadHighlights({ payload }: { payload: unknown }) {
  const record = parseRecord(payload);
  const entries = Object.entries(record).slice(0, 4);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-[#9baabf]"
        >
          {key}: {summarizeValue(value)}
        </span>
      ))}
    </div>
  );
}

function summarizeValue(value: unknown) {
  if (typeof value === "string") {
    return value.length > 32 ? `${value.slice(0, 32)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `${value.length} items`;
  }

  if (value && typeof value === "object") {
    return `${Object.keys(value as Record<string, unknown>).length} fields`;
  }

  return "set";
}

function executionStatusTone(status: ExecutionRunSummary["status"] | ExecutionRunStepSummary["status"]) {
  switch (status) {
    case "completed":
      return "green";
    case "partial":
      return "amber";
    case "failed":
      return "red";
    default:
      return "muted";
  }
}
