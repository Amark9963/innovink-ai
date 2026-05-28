import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prepareApprovalRequestAction } from "@/app/app/create/actions";
import {
  activateJudgingAction,
  upsertJudgeCalibrationExerciseAction,
} from "@/app/app/programs/[programId]/judging/actions";
import type {
  JudgingJudgeSummary,
  LinkedAgentSessionSummary,
  ProgramJudgeCalibrationManagerData,
  ProgramJudgingManagerData,
  ScorecardCriterionSummary,
} from "@/lib/supabase/queries";
import {
  getCurrentUserOrNull,
  getLatestAgentSessionForProgram,
  getProgramById,
  getProgramJudgeCalibrationManagerData,
  getProgramJudgingManagerData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type JudgingTab = "rubric" | "judges" | "assignment" | "calibration";

type JudgingRouteProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{
    error?: string;
    status?: string;
    tab?: string;
    criterion?: string;
  }>;
};

export default async function ProgramJudgingManager({
  params,
  searchParams,
}: JudgingRouteProps) {
  const { programId } = await params;
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const [program, judgingState, calibrationState, linkedSession] = await Promise.all([
    getProgramById(supabase, programId),
    getProgramJudgingManagerData(supabase, programId),
    getProgramJudgeCalibrationManagerData(supabase, programId),
    getLatestAgentSessionForProgram(supabase, user.id, programId),
  ]);

  if (!program) {
    notFound();
  }

  const tab = resolveJudgingTab(resolvedSearchParams.tab);
  const activeScorecard =
    judgingState.scorecards.find((scorecard) => scorecard.isActive) ??
    judgingState.scorecards[0] ??
    null;
  const visibleCriteria = activeScorecard
    ? judgingState.criteria.filter((criterion) => criterion.scorecardId === activeScorecard.id)
    : [];
  const selectedCriterion =
    visibleCriteria.find((criterion) => criterion.id === resolvedSearchParams.criterion) ??
    visibleCriteria[0] ??
    null;
  const canRequestApproval = Boolean(linkedSession && judgingState.scorecards.length > 0);
  const activeJudges = judgingState.judges.filter((judge) => judge.progressTotal > 0 || judge.assignmentCount > 0);
  const displayJudges = activeJudges.length > 0 ? activeJudges : judgingState.judges;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#07101f] text-[#eae5dc]">
      <header className="flex items-center justify-between border-b border-white/7 bg-[#0c1525] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2812] text-[13px] font-bold text-[#ccaa4a]">
            IN
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
              Innovink
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#b08a28]">
              Judging Setup
            </div>
          </div>
          <div className="h-5 w-px bg-white/7" />
          <div className="text-[12px] text-[#9baabf]">{program.name}</div>
          <div className="text-[11px] text-[#5e7088]">/ Judging Setup</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-[#9baabf]">
            {displayJudges.length} judges · {visibleCriteria.length} criteria
          </div>

          <Link
            href={buildManagerRoute(program.id, {
              tab: tab === "calibration" ? "rubric" : "calibration",
              criterionId: selectedCriterion?.id ?? null,
            })}
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            {tab === "calibration" ? "Back to Rubric" : "Preview Judge View"}
          </Link>

          <Link
            href={`/app/programs/${program.id}/judging/moderation`}
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Moderation Workspace
          </Link>

          {canRequestApproval ? (
            <form action={prepareApprovalRequestAction}>
              <input type="hidden" name="sessionId" value={linkedSession!.id} />
              <input type="hidden" name="redirectTo" value="approvals" />
              <button
                type="submit"
                className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Send for Approval
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md border border-white/8 px-3 py-2 text-[12px] font-medium text-[#5e7088]"
            >
              Send for Approval
            </button>
          )}

          {visibleCriteria.length > 0 ? (
            <form action={activateJudgingAction}>
              <input type="hidden" name="programId" value={program.id} />
              <button
                type="submit"
                className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
              >
                Activate Judging
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-md bg-[#6c5a22] px-4 py-2 text-[12px] font-semibold text-[#07101f]"
            >
              Activate Judging
            </button>
          )}
        </div>
      </header>

      {resolvedSearchParams.error ? (
        <div className="border-b border-[#9b3a3a44] bg-[#9b3a3a12] px-6 py-3 text-[12px] text-[#f1bcbc]">
          {resolvedSearchParams.error}
        </div>
      ) : null}

      {resolvedSearchParams.status ? (
        <div className="border-b border-[#2d7a5840] bg-[#2d7a5812] px-6 py-3 text-[12px] text-[#9ad0b7]">
          {resolvedSearchParams.status.replace(/-/g, " ")}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/7 px-6 py-3">
          {([
            ["rubric", "Rubric"],
            ["judges", `Judges (${displayJudges.length})`],
            ["assignment", "Assignment"],
            ["calibration", "Calibration"],
          ] as const).map(([key, label]) => (
            <Link
              key={key}
              href={buildManagerRoute(program.id, {
                tab: key,
                criterionId: selectedCriterion?.id ?? null,
              })}
              className={cn(
                "rounded-md px-3 py-2 text-[12px] transition",
                tab === key
                  ? "border border-white/10 bg-[#162034] font-medium text-[#eae5dc]"
                  : "text-[#5e7088] hover:bg-white/[0.04] hover:text-[#eae5dc]",
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_360px] gap-5 overflow-hidden px-6 py-6">
          <main className="overflow-y-auto pr-1">
            {tab === "rubric" ? (
              <RubricPanel
                programId={program.id}
                linkedSession={linkedSession}
                scorecardName={activeScorecard?.name ?? "Judging Rubric"}
                scorecardDescription={
                  activeScorecard
                    ? `${visibleCriteria.length} criteria · ${Math.round(
                        visibleCriteria.reduce((sum, criterion) => sum + criterion.weight, 0),
                      )} point scale`
                    : "No scorecard created yet"
                }
                criteria={visibleCriteria}
                selectedCriterionId={selectedCriterion?.id ?? null}
              />
            ) : null}

            {tab === "judges" ? (
              <JudgesPanel
                linkedSession={linkedSession}
                judges={displayJudges}
              />
            ) : null}

            {tab === "assignment" ? (
              <AssignmentPanel
                judgingState={judgingState}
                linkedSession={linkedSession}
              />
            ) : null}

            {tab === "calibration" ? (
              <CalibrationPanel
                programId={program.id}
                criteria={visibleCriteria}
                scorecardName={activeScorecard?.name ?? "Judge score preview"}
                calibrationState={calibrationState}
                linkedSession={linkedSession}
              />
            ) : null}
          </main>

          <aside className="overflow-y-auto">
            {tab === "rubric" ? (
              <RubricSidebar
                programId={program.id}
                linkedSession={linkedSession}
                judgingState={judgingState}
                displayJudges={displayJudges}
              />
            ) : null}

            {tab === "judges" ? (
              <JudgesSidebar judgingState={judgingState} />
            ) : null}

            {tab === "assignment" ? (
              <AssignmentSidebar linkedSession={linkedSession} judgingState={judgingState} />
            ) : null}

            {tab === "calibration" ? (
              <CalibrationSidebar
                calibrationState={calibrationState}
                linkedSession={linkedSession}
              />
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function RubricPanel({
  programId,
  linkedSession,
  scorecardName,
  scorecardDescription,
  criteria,
  selectedCriterionId,
}: {
  programId: string;
  linkedSession: LinkedAgentSessionSummary | null;
  scorecardName: string;
  scorecardDescription: string;
  criteria: ScorecardCriterionSummary[];
  selectedCriterionId: string | null;
}) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[16px] font-semibold text-[#eae5dc]">{scorecardName}</div>
          <div className="mt-1 text-[12px] text-[#9baabf]">{scorecardDescription}</div>
        </div>
        <div className="flex gap-2">
          {linkedSession ? (
            <>
              <Link
                href={buildCreateHref(
                  linkedSession.id,
                  "Refine the current judging rubric and keep it aligned with the approved program goals and submission package.",
                )}
                className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Edit Rubric
              </Link>
              <Link
                href={buildCreateHref(
                  linkedSession.id,
                  "Add a new judging criterion to the current scorecard and make sure the total weight remains coherent.",
                )}
                className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                + Add Criterion
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => (
          <Link
            key={criterion.id}
            href={buildManagerRoute(programId, {
              tab: "rubric",
              criterionId: criterion.id,
            })}
            className={cn(
              "block rounded-2xl border bg-[#111e30] p-5 transition hover:border-white/20",
              selectedCriterionId === criterion.id
                ? "border-[#b08a28] shadow-[0_0_0_1px_rgba(176,138,40,0.15)]"
                : "border-white/10",
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#b08a2838] bg-[#b08a2810] text-[12px] font-bold text-[#ccaa4a]">
                  {Math.round(criterion.weight)}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[#eae5dc]">{criterion.label}</div>
                  <div className="mt-1 text-[11px] text-[#9baabf]">
                    {criterion.description ?? "Criterion description pending refinement"}
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#9baabf]">{criterion.weight} pts</div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-[#1a2738]">
              <div
                className="h-full rounded-full bg-[#b08a28]"
                style={{ width: `${Math.max(8, Math.min(100, criterion.weight))}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {buildScaleBuckets(criterion.weight).map((bucket) => (
                <div
                  key={bucket.label}
                  className={cn(
                    "rounded-md border px-2 py-2 text-center",
                    bucket.highlighted
                      ? "border-[#b08a2838] bg-[#b08a2810]"
                      : "border-white/8 bg-[#162034]",
                  )}
                >
                  <div
                    className={cn(
                      "text-[11px] font-semibold",
                      bucket.highlighted ? "text-[#ccaa4a]" : "text-[#9baabf]",
                    )}
                  >
                    {bucket.range}
                  </div>
                  <div className="mt-1 text-[9.5px] text-[#5e7088]">{bucket.label}</div>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-[#111e30] px-4 py-3">
        <span className="text-[12px] text-[#9baabf]">Total weight</span>
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-[#1a2738]">
            <div
              className={cn(
                "h-full rounded-full",
                totalWeight >= 100 ? "bg-[#2d7a58]" : "bg-[#b08a28]",
              )}
              style={{ width: `${Math.min(100, totalWeight)}%` }}
            />
          </div>
          <span
            className={cn(
              "text-[13px] font-semibold",
              totalWeight >= 100 ? "text-[#9ad0b7]" : "text-[#ccaa4a]",
            )}
          >
            {Math.round(totalWeight)} / 100 pts
          </span>
        </div>
      </div>
    </div>
  );
}

function JudgesPanel({
  linkedSession,
  judges,
}: {
  linkedSession: LinkedAgentSessionSummary | null;
  judges: JudgingJudgeSummary[];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-[16px] font-semibold text-[#eae5dc]">Judge Panel</div>
          <div className="mt-1 text-[12px] text-[#9baabf]">
            {judges.length} active judge memberships in this program
          </div>
        </div>
        {linkedSession ? (
          <Link
            href={buildCreateHref(
              linkedSession.id,
              "Review the current judge panel, identify gaps in expertise or coverage, and suggest the next actions for judge allocation.",
            )}
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Ask Innova
          </Link>
        ) : null}
      </div>

      <div className="space-y-3">
        {judges.length > 0 ? (
          judges.map((judge) => (
            <div
              key={judge.membershipId}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111e30] p-4"
            >
              <AvatarBadge name={judge.fullName ?? judge.email ?? "Judge"} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-[#eae5dc]">
                  {judge.fullName ?? "Unnamed judge"}
                </div>
                <div className="mt-1 text-[10.5px] text-[#9baabf]">
                  {judge.email ?? "No email on profile"}
                  {judge.isJudgeManager ? " · Judge Manager" : " · Judge"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[#9baabf]">
                  {judge.assignmentCount} assignments
                </div>
                <div className="mt-1 text-[10px] text-[#5e7088]">
                  {judge.progressCompleted}/{judge.progressTotal} completed
                </div>
              </div>
            </div>
          ))
        ) : (
          <EmptyStateCard>
            No judges are assigned to this program yet. Add judges through the PM workspace or invite flow before activation.
          </EmptyStateCard>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-[#111e30] p-4">
        <div className="mb-3 text-[12px] font-semibold text-[#eae5dc]">Judge Assignment Readiness</div>
        <div className="space-y-2">
          {judges.slice(0, 3).map((judge) => (
            <div
              key={judge.membershipId}
              className="flex items-center justify-between rounded-md bg-[#162034] px-3 py-2 text-[11.5px]"
            >
              <span className="text-[#9baabf]">{judge.fullName ?? judge.email ?? "Judge"}</span>
              <span className="text-[#eae5dc]">{judge.assignmentCount} assigned</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AssignmentPanel({
  judgingState,
  linkedSession,
}: {
  judgingState: ProgramJudgingManagerData;
  linkedSession: LinkedAgentSessionSummary | null;
}) {
  const judgeCount = judgingState.judges.length;
  const averageAssignments =
    judgeCount > 0 ? Math.round(judgingState.totalAssignments / judgeCount) : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[16px] font-semibold text-[#eae5dc]">Assignment Overview</div>
        <div className="mt-1 text-[12px] text-[#9baabf]">
          Current allocation health across judges, conflicts, and rubric readiness
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total assignments" value={String(judgingState.totalAssignments)} />
        <MetricCard label="Avg per judge" value={String(averageAssignments)} />
        <MetricCard label="Conflicts logged" value={String(judgingState.totalConflicts)} />
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111e30] p-4">
        <div className="mb-3 text-[12px] font-semibold text-[#eae5dc]">Operational Notes</div>
        <div className="space-y-2">
          <AssignmentRow
            label="Blind review mode"
            value={
              judgingState.rounds.some((round) => round.isBlindReview)
                ? "Enabled"
                : "Open review"
            }
          />
          <AssignmentRow
            label="Evaluation rounds"
            value={String(judgingState.rounds.length)}
          />
          <AssignmentRow
            label="Active scorecards"
            value={String(judgingState.scorecards.filter((scorecard) => scorecard.isActive).length)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111e30] p-4">
        <div className="mb-3 text-[12px] font-semibold text-[#eae5dc]">Conflict Watch</div>
        {judgingState.totalConflicts > 0 ? (
          <div className="rounded-md border border-[#9b3a3a44] bg-[#9b3a3a12] px-3 py-3 text-[11.5px] leading-6 text-[#f1bcbc]">
            {judgingState.totalConflicts} conflict records are currently logged. Review the judge roster and submission ownership before activation.
          </div>
        ) : (
          <div className="rounded-md border border-[#2d7a5840] bg-[#2d7a5812] px-3 py-3 text-[11.5px] leading-6 text-[#9ad0b7]">
            No known judge conflicts are currently logged for this program.
          </div>
        )}
      </div>

      {linkedSession ? (
        <Link
          href={buildCreateHref(
            linkedSession.id,
            "Review the judging assignments and conflict posture for this program. Suggest the next PM actions before activation.",
          )}
          className="inline-flex rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
        >
          Ask Innova for assignment review
        </Link>
      ) : null}
    </div>
  );
}

function CalibrationPanel({
  programId,
  criteria,
  scorecardName,
  calibrationState,
  linkedSession,
}: {
  programId: string;
  criteria: ScorecardCriterionSummary[];
  scorecardName: string;
  calibrationState: ProgramJudgeCalibrationManagerData;
  linkedSession: LinkedAgentSessionSummary | null;
}) {
  const exercise = calibrationState.exercise;
  const activeScorecardId = calibrationState.scorecard?.id ?? null;

  if (!activeScorecardId) {
    return (
      <EmptyStateCard>
        Create or activate a judging scorecard first. Calibration is tied to the active scorecard and cannot be configured until the rubric exists.
      </EmptyStateCard>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[16px] font-semibold text-[#eae5dc]">Judge Calibration Exercise</div>
        <div className="mt-1 text-[12px] text-[#9baabf]">
          Configure the reference exercise judges must complete before live scoring opens.
        </div>
      </div>

      <form action={upsertJudgeCalibrationExerciseAction} className="rounded-2xl border border-white/10 bg-[#111e30] p-4">
        <input type="hidden" name="programId" value={programId} />
        <input type="hidden" name="scorecardId" value={activeScorecardId} />

        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[13px] font-semibold text-[#eae5dc]">
              {exercise ? exercise.title : "Create calibration exercise"}
            </div>
            <div className="mt-1 text-[11px] text-[#9baabf]">
              {scorecardName} · {criteria.length} criteria
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-[11px] font-medium text-[#9baabf]">Exercise title</label>
            <input
              name="title"
              defaultValue={exercise?.title ?? "Smart Cities calibration reference"}
              className="w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-[12px] text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-medium text-[#9baabf]">Reference code</label>
            <input
              name="referenceCode"
              defaultValue={exercise?.referenceCode ?? ""}
              placeholder="CAL-SC-01"
              className="w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-[12px] text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[11px] font-medium text-[#9baabf]">Instructions</label>
          <textarea
            name="instructions"
            defaultValue={
              exercise?.instructions ??
              "Score this reference submission using the judging rubric. Your scores will be compared against the panel consensus before live scoring opens."
            }
            className="h-20 w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-3 text-[12px] leading-6 text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
          />
        </div>

        <div className="mt-4 grid gap-4">
          <CalibrationTextarea
            name="problemSummary"
            label="Problem summary"
            defaultValue={exercise?.problemSummary ?? ""}
          />
          <CalibrationTextarea
            name="solutionSummary"
            label="Solution summary"
            defaultValue={exercise?.solutionSummary ?? ""}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <CalibrationTextarea
              name="validationSummary"
              label="Validation summary"
              defaultValue={exercise?.validationSummary ?? ""}
            />
            <CalibrationTextarea
              name="teamSummary"
              label="Team summary"
              defaultValue={exercise?.teamSummary ?? ""}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-[11px] font-medium text-[#9baabf]">Consensus total</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              name="consensusTotalScore"
              defaultValue={exercise?.consensusTotalScore ?? 70}
              className="w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-[12px] text-[#eae5dc] outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-medium text-[#9baabf]">Pitch deck URL</label>
            <input
              name="pitchDeckUrl"
              defaultValue={exercise?.pitchDeckUrl ?? ""}
              className="w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-[12px] text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-medium text-[#9baabf]">Demo URL</label>
            <input
              name="demoUrl"
              defaultValue={exercise?.demoUrl ?? ""}
              className="w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2.5 text-[12px] text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-[11px] font-medium text-[#9baabf]">PM note to judges</label>
          <textarea
            name="managerNote"
            defaultValue={exercise?.managerNote ?? ""}
            className="h-20 w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-3 text-[12px] leading-6 text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
            placeholder="Explain why this reference sits in the expected scoring band and when judges should request moderation help."
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-[11px] text-[#9baabf]">
            {exercise
              ? `${calibrationState.completedJudges} of ${calibrationState.totalJudges} judges completed calibration`
              : "Saving this exercise will make it available in the judge portal."}
          </div>
          <button
            type="submit"
            className="rounded-md bg-[#b08a28] px-4 py-2 text-[12px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
          >
            {exercise ? "Update calibration exercise" : "Create calibration exercise"}
          </button>
        </div>
      </form>

      {exercise ? (
        <div className="rounded-2xl border border-white/10 bg-[#111e30] p-4">
          <div className="mb-4 text-[13px] font-semibold text-[#eae5dc]">Judge-facing preview</div>
          <div className="space-y-4">
            {criteria.length > 0 ? (
              criteria.slice(0, 4).map((criterion) => (
                <div key={criterion.id} className="rounded-lg bg-[#162034] px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[12px] font-medium text-[#eae5dc]">{criterion.label}</div>
                    <div className="text-[10px] text-[#5e7088]">{criterion.weight} pts</div>
                  </div>
                  <div className="mb-2 text-[11px] text-[#9baabf]">
                    {criterion.description ?? "Judge-facing criterion description pending refinement."}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[60%] rounded-full bg-[#b08a28]" />
                    </div>
                    <div className="text-[10px] text-[#ccaa4a]">Consensus band</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyStateCard>
                No active scorecard exists yet. Generate judging setup in the PM workspace before using calibration.
              </EmptyStateCard>
            )}
          </div>
        </div>
      ) : null}

      {linkedSession ? (
        <Link
          href={buildCreateHref(
            linkedSession.id,
            "Review the current judging scorecard and the calibration exercise. Suggest refinements to the calibration briefing before judges start scoring.",
          )}
          className="inline-flex rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
        >
          Ask Innova for calibration guidance
        </Link>
      ) : null}
    </div>
  );
}

function RubricSidebar({
  programId,
  linkedSession,
  judgingState,
  displayJudges,
}: {
  programId: string;
  linkedSession: LinkedAgentSessionSummary | null;
  judgingState: ProgramJudgingManagerData;
  displayJudges: JudgingJudgeSummary[];
}) {
  return (
    <div className="space-y-4">
      <SidebarCard title="Judging Configuration">
        <SidebarRow
          label="Judging mode"
          value={
            judgingState.rounds.some((round) => round.isBlindReview)
              ? "Blind judging"
              : "Open judging"
          }
        />
        <SidebarRow
          label="Assignments per submission"
          value={displayJudges.length > 0 ? "3 judges target" : "No judge panel yet"}
        />
        <SidebarRow
          label="Tie-break method"
          value="Human review required"
        />
      </SidebarCard>

      <SidebarCard title="Judge Panel">
        <div className="space-y-3">
          {displayJudges.slice(0, 3).map((judge) => (
            <div
              key={judge.membershipId}
              className="flex items-center gap-3 rounded-md border border-white/10 bg-[#162034] px-3 py-3"
            >
              <AvatarBadge name={judge.fullName ?? judge.email ?? "Judge"} />
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-medium text-[#eae5dc]">
                  {judge.fullName ?? "Unnamed judge"}
                </div>
                <div className="mt-1 text-[10px] text-[#5e7088]">
                  {judge.isJudgeManager ? "Judge Manager" : "Judge"}
                </div>
              </div>
              <span className="rounded-full border border-[#2d7a5840] bg-[#2d7a5812] px-2 py-1 text-[9px] font-medium text-[#9ad0b7]">
                Active
              </span>
            </div>
          ))}
          {displayJudges.length > 3 ? (
            <Link
              href={buildManagerRoute(programId, { tab: "judges" })}
              className="inline-flex text-[10.5px] font-medium text-[#9baabf] transition hover:text-[#eae5dc]"
            >
              View all {displayJudges.length} judges →
            </Link>
          ) : null}
        </div>
      </SidebarCard>

      <SidebarCard title="Innova AI Pre-Score" accent>
        <div className="text-[11.5px] leading-6 text-[#9baabf]">
          Innova can pre-score submissions against the rubric as a reference. Final scoring remains human.
        </div>
        {linkedSession ? (
          <div className="mt-3 flex gap-2">
            <Link
              href={buildCreateHref(
                linkedSession.id,
                "Configure the AI pre-score setup for judging and keep it advisory-only for judges.",
              )}
              className="flex-1 rounded-md border border-white/10 px-3 py-2 text-center text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
            >
              Configure
            </Link>
            <Link
              href={buildCreateHref(
                linkedSession.id,
                "Run a test AI pre-score using the current judging rubric and summarize the result for PM review.",
              )}
              className="flex-1 rounded-md bg-[#b08a28] px-3 py-2 text-center text-[11px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
            >
              Run Test Score
            </Link>
          </div>
        ) : null}
      </SidebarCard>
    </div>
  );
}

function CalibrationTextarea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-medium text-[#9baabf]">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        className="h-20 w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-3 text-[12px] leading-6 text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
      />
    </div>
  );
}

function JudgesSidebar({ judgingState }: { judgingState: ProgramJudgingManagerData }) {
  const managerCount = judgingState.judges.filter((judge) => judge.isJudgeManager).length;

  return (
    <div className="space-y-4">
      <SidebarCard title="Judge Coverage">
        <SidebarRow label="Judge memberships" value={String(judgingState.judges.length)} />
        <SidebarRow label="Judge managers" value={String(managerCount)} />
        <SidebarRow label="Conflicts logged" value={String(judgingState.totalConflicts)} />
      </SidebarCard>

      <SidebarCard title="Progress Snapshot">
        {judgingState.judges.length > 0 ? (
          <div className="space-y-3">
            {judgingState.judges.slice(0, 4).map((judge) => (
              <div key={judge.membershipId}>
                <div className="flex items-center justify-between text-[10.5px] text-[#9baabf]">
                  <span>{judge.fullName ?? judge.email ?? "Judge"}</span>
                  <span>
                    {judge.progressCompleted}/{judge.progressTotal}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#3a6e9e]"
                    style={{
                      width:
                        judge.progressTotal > 0
                          ? `${(judge.progressCompleted / judge.progressTotal) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11.5px] text-[#9baabf]">No judge progress data yet.</div>
        )}
      </SidebarCard>
    </div>
  );
}

function AssignmentSidebar({
  linkedSession,
  judgingState,
}: {
  linkedSession: LinkedAgentSessionSummary | null;
  judgingState: ProgramJudgingManagerData;
}) {
  return (
    <div className="space-y-4">
      <SidebarCard title="Assignment Summary">
        <SidebarRow label="Total assignments" value={String(judgingState.totalAssignments)} />
        <SidebarRow label="Conflicts" value={String(judgingState.totalConflicts)} />
        <SidebarRow label="Rounds" value={String(judgingState.rounds.length)} />
      </SidebarCard>

      <SidebarCard title="Next Actions">
        <div className="space-y-2 text-[11.5px] leading-6 text-[#9baabf]">
          <div>Confirm judge panel capacity before launching round 1.</div>
          <div>Review any conflict records before publishing assignments.</div>
          <div>Validate scoring criteria weights sum cleanly to 100.</div>
        </div>
        {linkedSession ? (
          <Link
            href={buildCreateHref(
              linkedSession.id,
              "Prepare the final judging assignments and summarize any operational issues that need PM attention before activation.",
            )}
            className="mt-3 inline-flex rounded-md border border-white/10 px-3 py-2 text-[11px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Ask Innova
          </Link>
        ) : null}
      </SidebarCard>
    </div>
  );
}

function CalibrationSidebar({
  calibrationState,
  linkedSession,
}: {
  calibrationState: ProgramJudgeCalibrationManagerData;
  linkedSession: LinkedAgentSessionSummary | null;
}) {
  const exercise = calibrationState.exercise;

  return (
    <div className="space-y-4">
      <SidebarCard title="Calibration Status">
        <SidebarRow label="Judges invited" value={String(calibrationState.totalJudges)} />
        <SidebarRow label="Completed" value={String(calibrationState.completedJudges)} />
        <SidebarRow
          label="Consensus score"
          value={
            exercise?.consensusTotalScore !== null && exercise?.consensusTotalScore !== undefined
              ? `${exercise.consensusTotalScore.toFixed(1)} / 100`
              : "Not set"
          }
        />
        <SidebarRow
          label="Score spread"
          value={
            calibrationState.scoreMin !== null && calibrationState.scoreMax !== null
              ? `${calibrationState.scoreMin.toFixed(1)}-${calibrationState.scoreMax.toFixed(1)}`
              : "No submissions yet"
          }
        />
      </SidebarCard>

      <SidebarCard title="Scoring Anchors">
        {exercise?.scoringAnchors.length ? (
          <div className="space-y-3">
            {exercise.scoringAnchors.map((anchor) => (
              <div key={anchor.rangeLabel} className="rounded-md bg-[#162034] px-3 py-3">
                <div
                  className={cn(
                    "text-[11px] font-semibold",
                    anchor.highlighted ? "text-[#ccaa4a]" : "text-[#eae5dc]",
                  )}
                >
                  {anchor.rangeLabel}
                </div>
                <div className="mt-1 text-[10.5px] leading-5 text-[#9baabf]">{anchor.note}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11.5px] text-[#9baabf]">
            Save a calibration exercise to generate the default scoring anchors for judges.
          </div>
        )}
      </SidebarCard>

      <SidebarCard title="Innova Assist" accent>
        <div className="text-[11.5px] leading-6 text-[#9baabf]">
          Innova can summarize calibration gaps and propose judge briefing notes before the panel starts.
        </div>
        {linkedSession ? (
          <Link
            href={buildCreateHref(
              linkedSession.id,
              "Generate a short calibration briefing for judges based on the current rubric and program context.",
            )}
            className="mt-3 inline-flex rounded-md bg-[#b08a28] px-3 py-2 text-[11px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
          >
            Generate briefing
          </Link>
        ) : null}
      </SidebarCard>
    </div>
  );
}

function SidebarCard({
  title,
  accent = false,
  children,
}: {
  title: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent
          ? "border-[#b08a2838] bg-[#b08a2810]"
          : "border-white/10 bg-[#111e30]",
      )}
    >
      <div className={cn("mb-3 text-[12px] font-semibold", accent ? "text-[#ccaa4a]" : "text-[#eae5dc]")}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11.5px]">
      <span className="text-[#9baabf]">{label}</span>
      <span className="font-medium text-[#eae5dc]">{value}</span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111e30] p-4">
      <div className="text-[10px] uppercase tracking-[0.08em] text-[#5e7088]">{label}</div>
      <div className="mt-2 text-[24px] font-semibold text-[#eae5dc]">{value}</div>
    </div>
  );
}

function AssignmentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-[#162034] px-3 py-3 text-[11.5px]">
      <span className="text-[#9baabf]">{label}</span>
      <span className="font-medium text-[#eae5dc]">{value}</span>
    </div>
  );
}

function AvatarBadge({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3a6e9e33] bg-[#3a6e9e14] text-[11px] font-semibold text-[#7fb5e7]">
      {initials || "IN"}
    </div>
  );
}

function EmptyStateCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-[#111e30] px-4 py-4 text-[12px] leading-6 text-[#9baabf]">
      {children}
    </div>
  );
}

function resolveJudgingTab(tab?: string): JudgingTab {
  if (tab === "judges" || tab === "assignment" || tab === "calibration") {
    return tab;
  }

  return "rubric";
}

function buildManagerRoute(
  programId: string,
  options?: {
    tab?: JudgingTab;
    criterionId?: string | null;
  },
) {
  const params = new URLSearchParams();
  if (options?.tab && options.tab !== "rubric") params.set("tab", options.tab);
  if (options?.criterionId) params.set("criterion", options.criterionId);
  const query = params.toString();
  return `/app/programs/${programId}/judging${query ? `?${query}` : ""}`;
}

function buildCreateHref(sessionId: string, prompt: string) {
  const params = new URLSearchParams({ session: sessionId, prompt });
  return `/app/create?${params.toString()}`;
}

function buildScaleBuckets(weight: number) {
  const max = Math.max(4, Math.round(weight));
  const quarter = Math.max(1, Math.round(max / 4));

  return [
    { range: `1–${quarter}`, label: "Incremental", highlighted: false },
    { range: `${quarter + 1}–${quarter * 2}`, label: "Improved", highlighted: false },
    { range: `${quarter * 2 + 1}–${quarter * 3}`, label: "Novel", highlighted: false },
    { range: `${quarter * 3 + 1}–${max}`, label: "Breakthrough", highlighted: true },
  ];
}
