import Link from "next/link";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import { generateProgramPlanAction } from "@/app/app/create/actions";
import { PlanReviewWorkspace } from "@/app/app/create/_components/plan-review-workspace";
import { EmptyStateCard } from "@/app/app/create/_components/session-screen-primitives";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import type { ProgramPlanItemSummary } from "@/lib/supabase/queries";

type PlanPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ExecutionPlanPage({ params }: PlanPageProps) {
  const { sessionId } = await params;
  const { data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const canGeneratePlan =
    data.brief &&
    (data.brief.status === "collecting_requirements" ||
      data.brief.status === "ready_for_plan" ||
      data.brief.status === "plan_generated") &&
    !data.plan;

  const editPrompt =
    "Refine the execution plan. I want to adjust the phase sequencing, check for scheduling conflicts, and confirm any blocked approval-sensitive tasks before we proceed.";
  const autoFixPrompt =
    "Review the execution plan for scheduling conflicts and propose a cleaner timeline adjustment that preserves the launch date if possible.";
  const requestChangesPrompt =
    "The execution plan needs revision. Please review the current phases, dependencies, and milestone timing, then suggest a tighter operator-ready version.";
  const reviewAssetsHref = `/app/create/${sessionId}/assets`;

  return (
    <OperatorShell
      activeNav="execution-plan"
      sessionId={sessionId}
      headerTitle="Execution Plan"
      headerSubtitle="Structured delivery phases and approval requirements"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <PlanTabs
          sessionId={sessionId}
          approvalCount={data.approvals.filter((item) => item.status === "pending").length}
          executionCount={data.executionRuns.length}
        />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {data.plan ? (
            <PlanReviewWorkspace
              planTitle={data.plan.title ?? "Execution plan"}
              planSummary={data.plan.summary}
              generatedAtLabel={`last updated ${formatDateTime(data.plan.updatedAt)}`}
              phases={buildPhases(data.planItems)}
              milestones={buildMilestones(data.planItems)}
              approvalRequirements={buildApprovalRequirements(data.plan.approvalRequirements)}
              assumptions={getArrayStrings(data.plan.assumptions)}
              autoFixHref={buildCreateHref(sessionId, autoFixPrompt)}
              editHref={buildCreateHref(sessionId, editPrompt)}
              reviewAssetsHref={reviewAssetsHref}
              requestChangesHref={buildCreateHref(sessionId, requestChangesPrompt)}
            />
          ) : (
            <div className="flex h-full flex-col">
              <div className="mb-5 rounded-lg border border-[#b08a2838] bg-[#b08a2810] px-4 py-3 text-[12px] text-[#e4d8b4]">
                Innova uses the approved brief to map deterministic work into phased setup items. Review the plan before you move into asset review.
              </div>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                    Execution Plan
                  </h1>
                  <p className="mt-2 text-[12px] text-[#9baabf]">
                    The plan has not been generated yet.
                  </p>
                </div>
                {canGeneratePlan ? (
                  <form action={generateProgramPlanAction}>
                    <input type="hidden" name="sessionId" value={sessionId} />
                    <input type="hidden" name="redirectTo" value="plan" />
                    <button
                      type="submit"
                      className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                    >
                      Generate Plan
                    </button>
                  </form>
                ) : null}
              </div>
              <EmptyStateCard text="The plan has not been generated yet. Continue refining the brief or generate the plan from this screen." />
            </div>
          )}
        </div>
      </div>
    </OperatorShell>
  );
}

function PlanTabs({
  sessionId,
  approvalCount,
  executionCount,
}: {
  sessionId: string;
  approvalCount: number;
  executionCount: number;
}) {
  const tabs = [
    { label: "Innova Chat", href: `/app/create?session=${sessionId}` },
    { label: "Brief", href: `/app/create/${sessionId}/brief`, badge: "✓" },
    { label: "Plan", href: `/app/create/${sessionId}/plan`, badge: "✓" },
    { label: "Assets", href: `/app/create/${sessionId}/assets` },
    { label: "Approvals", href: `/app/create/${sessionId}/approvals`, count: approvalCount || null },
    { label: "Execution", href: `/app/create/${sessionId}/execution`, count: executionCount || null },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-white/7 bg-[#0c1525] px-5">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className={`flex h-11 items-center gap-2 border-b-2 px-3 text-[12px] transition ${
            tab.label === "Plan"
              ? "border-b-[#b08a28] font-semibold text-[#ccaa4a]"
              : "border-b-transparent text-[#9baabf] hover:text-[#eae5dc]"
          }`}
        >
          <span>{tab.label}</span>
          {tab.badge ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2d7a58] px-1 text-[9px] font-bold text-white">
              {tab.badge}
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

function buildPhases(items: ProgramPlanItemSummary[]) {
  const phaseBuckets = [
    { id: "setup", title: "Setup & Configuration", subtitle: "Foundation and operator setup", match: ["foundation", "landing_page", "judging_setup"] },
    { id: "launch", title: "Launch & Registration", subtitle: "Public launch and intake activation", match: ["registration_form", "communications_pack"] },
    { id: "submission", title: "Submission & Evaluation", subtitle: "Submission flow and scoring readiness", match: ["submission_form", "judging_setup"] },
    { id: "mentoring", title: "Mentoring & Support", subtitle: "Operator support and participant enablement", match: ["mentoring_setup", "sponsor_reporting"] },
    { id: "operations", title: "Readiness & Operations", subtitle: "Readiness, controls, and live oversight", match: ["launch_readiness", "operations_control", "sponsor_reporting"] },
  ];

  const grouped = phaseBuckets.map((bucket, index) => {
    const tasks = items
      .filter((item) => bucket.match.some((key) => item.itemType.includes(key) || item.itemKey.includes(key)))
      .map((item, taskIndex) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: taskIndex === 0 && index < 2 ? ("active" as const) : index === 0 ? ("done" as const) : ("upcoming" as const),
        meta: item.requiresApproval ? "Approval sensitive" : taskIndex === 0 && index < 2 ? "In progress" : "Queued",
        requiresApproval: item.requiresApproval,
      }));

    return {
      id: bucket.id,
      number: index + 1,
      title: bucket.title,
      subtitle: bucket.subtitle,
      status: tasks.length === 0 ? ("upcoming" as const) : index === 0 ? ("done" as const) : index < 2 ? ("active" as const) : ("upcoming" as const),
      completion:
        tasks.length === 0
          ? 0
          : Math.round(
              (tasks.filter((task) => task.status === "done").length / tasks.length) * 100,
            ) || (index < 2 ? 28 : 0),
      tasks,
    };
  });

  const leftoverItems = items.filter(
    (item) =>
      !phaseBuckets.some((bucket) =>
        bucket.match.some((key) => item.itemType.includes(key) || item.itemKey.includes(key)),
      ),
  );

  if (leftoverItems.length > 0) {
    grouped[0]?.tasks.push(
      ...leftoverItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: "active" as const,
        meta: item.requiresApproval ? "Approval sensitive" : "Queued",
        requiresApproval: item.requiresApproval,
      })),
    );
    grouped[0].completion = Math.max(grouped[0].completion, 35);
  }

  return grouped.filter((phase) => phase.tasks.length > 0);
}

function buildMilestones(items: ProgramPlanItemSummary[]) {
  const base = [
    { id: "launch", title: "Registration Opens", dateLabel: "After launch assets are approved", status: "on_track" as const, note: "On track" },
    { id: "submissions", title: "Submission Deadline", dateLabel: "Triggered from the brief timeline", status: "upcoming" as const, note: "Pending operator confirmation" },
    { id: "judging", title: "Round 2 Judging", dateLabel: "Requires judge allocation lock", status: "conflict" as const, note: "Needs PM review" },
    { id: "demo", title: "Demo Day / Awards", dateLabel: "Scheduled from launch readiness", status: "upcoming" as const, note: "Depends on final plan approval" },
  ];

  if (items.length < 4) {
    return base.slice(0, 2);
  }

  return base;
}

function buildApprovalRequirements(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }

    const record = entry as Record<string, unknown>;
    if (
      typeof record.key !== "string" ||
      typeof record.title !== "string" ||
      typeof record.description !== "string"
    ) {
      return [];
    }

    const riskLevel: "low" | "medium" | "high" =
      record.riskLevel === "high" || record.riskLevel === "medium" || record.riskLevel === "low"
        ? record.riskLevel
        : "medium";

    return [
      {
        key: record.key,
        title: record.title,
        description: record.description,
        riskLevel,
      },
    ];
  });
}

function buildCreateHref(sessionId: string, prompt: string) {
  return `/app/create?session=${sessionId}&prompt=${encodeURIComponent(prompt)}`;
}

function getArrayStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "just now";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
