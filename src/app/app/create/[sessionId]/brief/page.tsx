import Link from "next/link";
import { OperatorShell } from "@/components/enterprise/operator-shell";
import { generateProgramPlanAction } from "@/app/app/create/actions";
import { BriefSidePanel } from "@/app/app/create/_components/brief-side-panel";
import { ExportBriefButton } from "@/app/app/create/_components/brief-page-controls";
import {
  EmptyStateCard,
  SessionTabs,
  StatusBadge,
  buildWorkspaceHref,
  getArrayStrings,
  parseRecord,
} from "@/app/app/create/_components/session-screen-primitives";
import { loadSessionScreenData } from "@/app/app/create/_lib/load-session-screen-data";
import { getProgramBriefVersions } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils/cn";

type BriefPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function ProgramBriefPage({ params }: BriefPageProps) {
  const { sessionId } = await params;
  const { supabase, data, programs, selectedWorkspace, user, userName } =
    await loadSessionScreenData(sessionId);

  const versions = data.brief ? await getProgramBriefVersions(supabase, data.brief.id) : [];
  const briefRecord = parseRecord(data.brief?.currentBrief);
  const timeline = parseRecord(briefRecord.timeline);

  const completeness = briefCompleteness(data.brief?.openQuestions, briefRecord);
  const prizeMissing = !getString(briefRecord.prizeStructure) && !getString(briefRecord.prizeTiers);
  const judgeMissing = !getString(briefRecord.judgeAllocation) && !getString(briefRecord.judgingPanel);
  const activePlanExists = Boolean(data.plan);

  const requestChangesPrompt =
    "Refine the program brief. I want to review any unresolved assumptions, tighten the eligibility rules, and update any sections that still need operator input.";
  const definePrizesPrompt =
    "Update the brief with a concrete prize structure for this program, including tiers, recognition format, and any region-specific awards.";
  const assignJudgesPrompt =
    "Update the brief and planning assumptions with a realistic judge allocation model for Round 1 and Round 2.";
  const mentoringPrompt =
    "Add structured mentor office hours to this program and explain how they should affect the plan and participant experience.";

  const approveHref = activePlanExists
    ? `/app/create/${sessionId}/plan`
    : `/app/create/${sessionId}/plan`;

  const suggestions = [
    ...(prizeMissing
      ? [
          {
            id: "prize-structure",
            title: "Add prize structure",
            body: "Prize tiers should be defined before registration opens so the launch kit and communications pack stay aligned.",
            tone: "required" as const,
            primaryLabel: "Define prizes",
            primaryHref: buildCreateHref(sessionId, definePrizesPrompt),
            secondaryLabel: "Ask Innova",
            secondaryHref: buildCreateHref(
              sessionId,
              "Recommend a strong enterprise-safe prize structure for this program and explain why it fits the current brief.",
            ),
          },
        ]
      : []),
    {
      id: "mentoring",
      title: "Consider adding mentor hours",
      body: "Structured mentor office hours usually improve submission quality and give Innova more concrete planning inputs for the launch kit.",
      tone: "optional" as const,
      primaryLabel: "Add to brief",
      primaryHref: buildCreateHref(sessionId, mentoringPrompt),
      secondaryLabel: "Dismiss",
    },
    ...(judgeMissing
      ? [
          {
            id: "judge-allocation",
            title: "Confirm judge allocation",
            body: "The brief still needs a clearer judge allocation model so the execution plan can avoid approval blockers later.",
            tone: "recommended" as const,
            primaryLabel: "Assign judges",
            primaryHref: buildCreateHref(sessionId, assignJudgesPrompt),
            secondaryLabel: "Dismiss",
          },
        ]
      : []),
  ];

  return (
    <OperatorShell
      activeNav="program-brief"
      sessionId={sessionId}
      headerTitle="Program Brief Review"
      headerSubtitle="AI-generated operating brief for approval"
      organizationName={selectedWorkspace.organizationName}
      userName={userName}
      userEmail={user.email}
      workspaces={data.workspaces}
      programs={programs}
      headerActions={
        <Link
          href={buildWorkspaceHref(sessionId, "brief")}
          className="rounded-md border border-white/10 px-3 py-1.5 text-[11.5px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
        >
          Back to AI Workspace
        </Link>
      }
      workspacePrimaryMode
      rightPanel={
        <BriefSidePanel
          versions={versions}
          activeVersionId={data.brief?.activeVersionId ?? null}
          suggestions={suggestions}
          approveHref={approveHref}
          requestChangesHref={buildCreateHref(sessionId, requestChangesPrompt)}
        />
      }
    >
      <div className="flex h-full flex-col bg-[#07101f]">
        <SessionTabs sessionId={sessionId} active="brief" data={data} />

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-[#5e7088]">
            <Link href="/app/dashboard" className="hover:text-[#9baabf]">
              Programs
            </Link>
            <span>›</span>
            <span className="hover:text-[#9baabf]">{data.brief?.title ?? "Program workspace"}</span>
            <span>›</span>
            <span className="text-[#9baabf]">Program Brief</span>
          </div>

          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                Program Brief
              </h1>
              <p className="mt-2 text-[12px] text-[#9baabf]">
                AI-generated · {versions[0] ? `v${versions[0].versionNumber}` : "v1.0"} · Last updated{" "}
                {formatDateTime(data.brief?.updatedAt ?? null)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportBriefButton />
              <Link
                href={buildCreateHref(sessionId, requestChangesPrompt)}
                className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Edit
              </Link>
              {activePlanExists ? (
                <Link
                  href={`/app/create/${sessionId}/plan`}
                  className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                >
                  Review Plan →
                </Link>
              ) : (
                <form action={generateProgramPlanAction}>
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <input type="hidden" name="redirectTo" value="plan" />
                  <button
                    type="submit"
                    className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                  >
                    Approve Brief →
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-[#b08a2838] bg-[#b08a2810] px-4 py-3 text-[12px] text-[#e4d8b4]">
            Innova pre-filled this brief from your chat session. Review each section and approve it before moving into plan generation.
          </div>

          {data.brief ? (
            <>
              <div className="mb-5 rounded-xl border border-white/7 bg-[#111e30] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[12.5px] font-medium text-[#eae5dc]">Brief completeness</div>
                  <div className="text-[13px] font-semibold text-[#ccaa4a]">{completeness}%</div>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-[#b08a28]" style={{ width: `${completeness}%` }} />
                </div>
                <div className="text-[11px] text-[#9baabf]">
                  {Array.isArray(data.brief.openQuestions) && data.brief.openQuestions.length > 0 ? (
                    <>
                      {data.brief.openQuestions.length} unresolved input item
                      {data.brief.openQuestions.length === 1 ? "" : "s"} remain before the plan is fully operator-ready.
                    </>
                  ) : (
                    <>The current brief is complete enough to proceed into execution planning.</>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/7 bg-[#162034]">
                <BriefSection
                  number={1}
                  title="Program Identity"
                  meta={`${countIdentityFields(briefRecord)} fields`}
                  complete
                >
                  <BriefRow label="Program name" value={data.brief.title ?? "Untitled program"} accent />
                  <BriefRow label="Program type" value={data.brief.detectedProgramType ?? "Not identified yet"} />
                  <BriefRow label="Objective" value={getString(briefRecord.objective)} />
                  <BriefRow label="Format" value={getString(briefRecord.format)} />
                  <BriefRow label="Created by" value="Innova" />
                </BriefSection>

                <BriefSection
                  number={2}
                  title="Scope & Eligibility"
                  meta="5 fields"
                  complete={!hasOpenQuestion(data.brief.openQuestions, ["eligibility", "region", "team"])}
                >
                  <BriefRow label="Regions" value={getArrayStrings(briefRecord.regions).join(", ")} />
                  <BriefRow label="Eligibility" value={getString(briefRecord.eligibility)} />
                  <BriefRow label="Target participants" value={getArrayStrings(briefRecord.targetParticipants).join(", ")} />
                  <BriefRow label="Team policy" value={getString(briefRecord.teamPolicy)} />
                  <BriefRow label="Deliverables" value={getArrayStrings(briefRecord.deliverables).join(", ")} />
                </BriefSection>

                <BriefSection
                  number={3}
                  title="Key Dates"
                  meta="4 fields"
                  complete={!hasOpenQuestion(data.brief.openQuestions, ["date", "timeline", "schedule"])}
                >
                  <BriefRow label="Registration" value={getString(timeline.registrationWindow)} />
                  <BriefRow label="Program window" value={getString(timeline.liveProgramWindow)} />
                  <BriefRow label="Submission" value={getString(timeline.submissionWindow)} />
                  <BriefRow label="Decision / reporting" value={getString(timeline.reportingWindow)} />
                </BriefSection>

                <BriefSection
                  number={4}
                  title="Prizes & Recognition"
                  meta={prizeMissing ? "Needs input" : "Configured"}
                  complete={!prizeMissing}
                >
                  {prizeMissing ? (
                    <div className="mb-3 rounded-md border border-[#c9973a40] bg-[#c9973a12] px-3 py-3 text-[11.5px] text-[#e8c26d]">
                      Prize structure is not defined yet. Add tiers and recognition format before registration opens.
                    </div>
                  ) : null}
                  <BriefRow label="Prize structure" value={getString(briefRecord.prizeStructure)} accent={!prizeMissing} />
                  <BriefRow label="Recognition" value={getString(briefRecord.recognitionPlan)} />
                  <BriefRow label="Ceremony format" value={getString(briefRecord.ceremonyFormat)} />
                </BriefSection>

                <BriefSection
                  number={5}
                  title="Output & Reporting"
                  meta="4 fields"
                  complete
                  last
                >
                  <BriefRow label="Evaluation" value={getString(briefRecord.evaluationModel)} />
                  <BriefRow label="Mentoring" value={getString(briefRecord.mentoringModel)} />
                  <BriefRow label="Sponsor visibility" value={getString(briefRecord.sponsorVisibility)} />
                  <BriefRow label="Report model" value={getString(briefRecord.reportModel)} />
                </BriefSection>
              </div>
            </>
          ) : (
            <EmptyStateCard text="This session does not have a structured brief yet. Continue the conversation in the AI workspace to generate one." />
          )}
        </div>
      </div>
    </OperatorShell>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BriefTabs({
  sessionId,
  planExists,
  approvalCount,
  executionCount,
}: {
  sessionId: string;
  planExists: boolean;
  approvalCount: number;
  executionCount: number;
}) {
  const tabs = [
    { label: "Back to AI Workspace", href: `/app/create?session=${sessionId}` },
    { label: "Brief", href: `/app/create/${sessionId}/brief`, badge: "✓" },
    { label: "Plan", href: `/app/create/${sessionId}/plan`, badge: planExists ? "✓" : null },
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
          className={cn(
            "flex h-11 items-center gap-2 border-b-2 border-transparent px-3 text-[12px] text-[#9baabf] transition hover:text-[#eae5dc]",
            tab.label === "Brief" && "border-b-[#b08a28] font-semibold text-[#ccaa4a]",
          )}
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

function BriefSection({
  number,
  title,
  meta,
  complete,
  children,
  last = false,
}: {
  number: number;
  title: string;
  meta: string;
  complete: boolean;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={cn("border-b border-white/7", last && "border-b-0")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border text-[9.5px] font-bold",
            complete
              ? "border-[#b08a2838] bg-[#b08a2810] text-[#ccaa4a]"
              : "border-[#c9973a40] bg-[#c9973a12] text-[#e8c26d]",
          )}
        >
          {number}
        </div>
        <div className="flex-1 text-[13px] font-medium text-[#eae5dc]">{title}</div>
        <div className="text-[11px] text-[#5e7088]">{meta}</div>
        <StatusBadge tone={complete ? "green" : "amber"}>{complete ? "complete" : "needs input"}</StatusBadge>
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function BriefRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value?: string | null;
  accent?: boolean;
}) {
  return (
    <div className="grid items-baseline gap-2 border-b border-white/[0.05] py-2.5 last:border-b-0 md:grid-cols-[140px_minmax(0,1fr)]">
      <div className="text-[11.5px] text-[#9baabf]">{label}</div>
      <div className={cn("text-[12.5px] text-[#eae5dc]", accent && "font-medium text-[#ccaa4a]")}>
        {value && value.trim() ? value : "Not set"}
      </div>
    </div>
  );
}

function buildCreateHref(sessionId: string, prompt: string) {
  const params = new URLSearchParams({
    session: sessionId,
    prompt,
  });

  return `/app/create?${params.toString()}`;
}

function briefCompleteness(openQuestions: unknown, briefRecord: Record<string, unknown>) {
  const openQuestionCount = Array.isArray(openQuestions) ? openQuestions.length : 0;
  const populatedFields = [
    getString(briefRecord.objective),
    getString(briefRecord.format),
    getString(briefRecord.teamPolicy),
    getString(briefRecord.evaluationModel),
    getString(briefRecord.mentoringModel),
    getString(parseRecord(briefRecord.timeline).registrationWindow),
    getString(parseRecord(briefRecord.timeline).submissionWindow),
  ].filter(Boolean).length;

  return Math.max(48, Math.min(98, 58 + populatedFields * 5 - openQuestionCount * 7));
}

function countIdentityFields(briefRecord: Record<string, unknown>) {
  return [
    getString(briefRecord.objective),
    getString(briefRecord.format),
    getString(briefRecord.programName),
    getString(briefRecord.language),
    getString(briefRecord.programType),
  ].filter(Boolean).length || 5;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function hasOpenQuestion(openQuestions: unknown, keywords: string[]) {
  if (!Array.isArray(openQuestions)) {
    return false;
  }

  return openQuestions.some((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }

    const record = entry as Record<string, unknown>;
    const question = typeof record.question === "string" ? record.question.toLowerCase() : "";
    return keywords.some((keyword) => question.includes(keyword));
  });
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
