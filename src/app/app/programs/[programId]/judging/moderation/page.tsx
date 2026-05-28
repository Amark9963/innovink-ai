import Link from "next/link";
import { redirect } from "next/navigation";
import { recordModerationDecisionAction } from "@/app/app/programs/[programId]/judging/moderation/actions";
import {
  getCurrentUserOrNull,
  getProgramJudgingModerationData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type ModerationTab = "score" | "submission" | "comments" | "conflicts";
type ScopeFilter = "all" | "pending" | "decided";

type ModerationPageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{
    error?: string;
    status?: string;
    submission?: string;
    tab?: string;
    decision?: string;
    q?: string;
    scope?: string;
  }>;
};

export default async function ProgramJudgingModerationPage({
  params,
  searchParams,
}: ModerationPageProps) {
  const { programId } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const moderationData = await getProgramJudgingModerationData(
    supabase,
    user,
    programId,
  );

  if (!moderationData) {
    redirect(`/app/programs/${programId}/judging`);
  }

  const tab = resolveTab(query.tab);
  const scope = resolveScope(query.scope);
  const searchTerm = query.q?.trim().toLowerCase() ?? "";
  const visibleCandidates = moderationData.candidates.filter((candidate) => {
    if (scope === "pending" && !isPending(candidate.status)) {
      return false;
    }
    if (scope === "decided" && isPending(candidate.status)) {
      return false;
    }
    if (!searchTerm) {
      return true;
    }

    const haystack = [
      candidate.teamName ?? "",
      candidate.title,
      candidate.problemStatement ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchTerm);
  });

  const selectedCandidate =
    visibleCandidates.find((candidate) => candidate.submissionId === query.submission) ??
    visibleCandidates[0] ??
    moderationData.candidates[0] ??
    null;

  if (!selectedCandidate && moderationData.candidates.length === 0) {
    return (
      <div className="flex h-full flex-col bg-[#07101f] text-[#eae5dc]">
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
                Moderation &amp; Final Decision
              </div>
            </div>
          </div>
          <Link
            href={`/app/programs/${programId}/judging`}
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Back to Judging
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-3xl rounded-3xl border border-white/8 bg-[#111e30] p-10 text-center">
            <div className="text-[26px] font-semibold tracking-[-0.03em] text-[#eae5dc]">
              Moderation opens when scored submissions are available
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-7 text-[#9baabf]">
              This workspace uses real judging outputs. Once teams have submitted final packages
              and judges have submitted scores, Innovink will surface variance, score breakdowns,
              conflict logs, and final-decision controls here.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href={`/app/programs/${programId}/judging`}
                className="rounded-md border border-white/10 px-4 py-2 text-[13px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
              >
                Return to Judging Setup
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pendingCandidates = visibleCandidates.filter((candidate) => isPending(candidate.status));
  const decidedCandidates = visibleCandidates.filter((candidate) => !isPending(candidate.status));
  const nextCandidate = getNextCandidate(visibleCandidates, selectedCandidate?.submissionId ?? null);
  const selectedDecision = resolveDecision(query.decision, selectedCandidate?.status ?? null);
  const actionLabel =
    selectedDecision === "finalist"
      ? "Confirm - Advance to Finalist"
      : selectedDecision === "shortlisted"
        ? "Confirm - Move to Waitlist"
        : "Confirm - Reject Submission";

  return (
    <div className="grid h-full grid-rows-[64px_1fr] grid-cols-[260px_minmax(0,1fr)_340px] overflow-hidden bg-[#07101f] text-[#eae5dc]">
      <header className="col-span-3 flex items-center justify-between border-b border-white/7 bg-[#0c1525] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2812] text-[13px] font-bold text-[#ccaa4a]">
            IN
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
              Innovink
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#b08a28]">
              Moderation &amp; Final Decision
            </div>
          </div>
          <div className="h-5 w-px bg-white/7" />
          <div className="text-[12px] text-[#9baabf]">{moderationData.program.name}</div>
          <div className="text-[11px] text-[#5e7088]">/ Judging Moderation</div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-[#b08a2833] bg-[#b08a2814] px-3 py-1 text-[11px] font-semibold text-[#ccaa4a]">
            Moderation Open
          </span>
          <Link
            href={`/app/programs/${programId}/judging`}
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Back to Judging
          </Link>
        </div>
      </header>

      <aside className="overflow-y-auto border-r border-white/7 bg-[#0c1525]">
        <div className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5e7088]">
          Teams - {visibleCandidates.length}
        </div>

        <form className="px-4 pb-3" method="get">
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="scope" value={scope} />
          <input
            name="q"
            defaultValue={query.q ?? ""}
            className="w-full rounded-md border border-white/10 bg-[#111e30] px-3 py-2 text-[12px] text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
            placeholder="Filter teams..."
          />
        </form>

        <div className="px-4 pb-4">
          <div className="mb-3 flex gap-2">
            {([
              ["all", "All"],
              ["pending", `Needs Review (${pendingCandidates.length})`],
              ["decided", `Decided (${decidedCandidates.length})`],
            ] as const).map(([value, label]) => (
              <Link
                key={value}
                href={buildModerationHref(programId, {
                  scope: value,
                  q: query.q ?? "",
                  tab,
                })}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] transition",
                  scope === value
                    ? "border-[#b08a2840] bg-[#b08a2812] text-[#ccaa4a]"
                    : "border-white/10 text-[#9baabf] hover:bg-white/[0.04] hover:text-[#eae5dc]",
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {pendingCandidates.length > 0 ? (
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#5e7088]">
              Needs Review ({pendingCandidates.length})
            </div>
          ) : null}
          <div className="space-y-1">
            {pendingCandidates.map((candidate) => (
              <CandidateListItem
                key={candidate.submissionId}
                active={selectedCandidate?.submissionId === candidate.submissionId}
                href={buildModerationHref(programId, {
                  submission: candidate.submissionId,
                  q: query.q ?? "",
                  scope,
                  tab,
                })}
                candidate={candidate}
              />
            ))}
          </div>

          {decidedCandidates.length > 0 ? (
            <>
              <div className="mb-2 mt-5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#5e7088]">
                Decided ({decidedCandidates.length})
              </div>
              <div className="space-y-1">
                {decidedCandidates.map((candidate) => (
                  <CandidateListItem
                    key={candidate.submissionId}
                    active={selectedCandidate?.submissionId === candidate.submissionId}
                    href={buildModerationHref(programId, {
                      submission: candidate.submissionId,
                      q: query.q ?? "",
                      scope,
                      tab,
                    })}
                    candidate={candidate}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </aside>

      <main className="overflow-y-auto px-6 py-6">
        {query.error ? (
          <div className="mb-4 rounded-xl border border-[#9b3a3a44] bg-[#9b3a3a12] px-4 py-3 text-[12px] text-[#f1bcbc]">
            {query.error}
          </div>
        ) : null}

        {query.status ? (
          <div className="mb-4 rounded-xl border border-[#2d7a5840] bg-[#2d7a5812] px-4 py-3 text-[12px] text-[#9ad0b7]">
            {query.status.replace(/-/g, " ")}
          </div>
        ) : null}

        {selectedCandidate ? (
          <>
            <section className="mb-5 rounded-2xl border border-white/10 bg-[#111e30] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <div className="text-[18px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
                      {selectedCandidate.teamName ?? selectedCandidate.title}
                    </div>
                    <span className="rounded-md border border-[#b08a2833] bg-[#b08a2812] px-2 py-1 text-[10px] font-semibold text-[#ccaa4a]">
                      {humanizeSubmissionStatus(selectedCandidate.status)}
                    </span>
                    {selectedCandidate.variance !== null ? (
                      <span
                        className={cn(
                          "rounded-md border px-2 py-1 text-[10px] font-semibold",
                          selectedCandidate.variance >= 10
                            ? "border-[#dc3c3c33] bg-[#dc3c3c12] text-[#e58f8f]"
                            : "border-[#2d7a5830] bg-[#2d7a5812] text-[#86c0a5]",
                        )}
                      >
                        Var {selectedCandidate.variance.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[12px] text-[#9baabf]">
                    {selectedCandidate.title} · {selectedCandidate.submittedScoresCount} submitted scores
                    {selectedCandidate.rank ? ` · Rank ${selectedCandidate.rank}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[24px] font-semibold text-[#ccaa4a]">
                    {selectedCandidate.averageScore !== null ? selectedCandidate.averageScore.toFixed(1) : "—"}
                  </div>
                  <div className="text-[11px] text-[#5e7088]">average / 100</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-[11.5px] text-[#9baabf]">
                <span>
                  Score range:{" "}
                  <strong className="font-medium text-[#d9d4cb]">
                    {selectedCandidate.scoreMin !== null && selectedCandidate.scoreMax !== null
                      ? `${selectedCandidate.scoreMin.toFixed(1)} - ${selectedCandidate.scoreMax.toFixed(1)}`
                      : "No submitted scores"}
                  </strong>
                </span>
                <span>
                  Conflicts:{" "}
                  <strong className="font-medium text-[#d9d4cb]">
                    {selectedCandidate.conflicts.length}
                  </strong>
                </span>
                <span>
                  Team members:{" "}
                  <strong className="font-medium text-[#d9d4cb]">
                    {selectedCandidate.teamMembers.length}
                  </strong>
                </span>
              </div>
            </section>

            <div className="mb-4 flex border-b border-white/7">
              {([
                ["score", "Score breakdown"],
                ["submission", "Submission"],
                ["comments", "Judge comments"],
                ["conflicts", "Conflict log"],
              ] as const).map(([value, label]) => (
                <Link
                  key={value}
                  href={buildModerationHref(programId, {
                    submission: selectedCandidate.submissionId,
                    q: query.q ?? "",
                    scope,
                    tab: value,
                    decision: selectedDecision,
                  })}
                  className={cn(
                    "border-b-2 px-3 py-2 text-[12px] transition",
                    tab === value
                      ? "border-[#b08a28] text-[#ccaa4a]"
                      : "border-transparent text-[#9baabf] hover:text-[#eae5dc]",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            {tab === "score" ? (
              <ScoreBreakdownPanel candidate={selectedCandidate} criteria={moderationData.criteria} />
            ) : null}
            {tab === "submission" ? <SubmissionPanel candidate={selectedCandidate} /> : null}
            {tab === "comments" ? <JudgeCommentsPanel candidate={selectedCandidate} /> : null}
            {tab === "conflicts" ? <ConflictPanel candidate={selectedCandidate} /> : null}

            <form action={recordModerationDecisionAction} className="mt-5 rounded-2xl border border-white/10 bg-[#111e30] p-5">
              <input type="hidden" name="programId" value={programId} />
              <input type="hidden" name="submissionId" value={selectedCandidate.submissionId} />
              <input type="hidden" name="tab" value={tab} />
              <input type="hidden" name="q" value={query.q ?? ""} />
              <input type="hidden" name="scope" value={scope} />

              <div className="mb-3 text-[13px] font-semibold text-[#eae5dc]">Final decision</div>
              <div className="space-y-2">
                <DecisionOption
                  value="finalist"
                  selected={selectedDecision === "finalist"}
                  title="Advance to Finalist"
                  description="Promote this team into the finalist pool for the program."
                  tone="green"
                />
                <DecisionOption
                  value="shortlisted"
                  selected={selectedDecision === "shortlisted"}
                  title="Waitlist / Shortlist"
                  description="Keep this team in the shortlist while final ranking and slot constraints are resolved."
                  tone="gold"
                />
                <DecisionOption
                  value="rejected"
                  selected={selectedDecision === "rejected"}
                  title="Reject"
                  description="Close the submission out of finalist consideration and retain the moderation rationale in history."
                  tone="red"
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[12px] text-[#9baabf]">Moderation note</div>
                <textarea
                  name="note"
                  defaultValue={selectedCandidate.latestDecisionNote ?? ""}
                  className="h-24 w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-3 text-[12px] leading-6 text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
                  placeholder="Explain the rationale for the final decision, outlier treatment, and any exceptions."
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  name="decision"
                  value={selectedDecision}
                  className={cn(
                    "flex-1 rounded-md px-4 py-3 text-[13px] font-semibold transition",
                    selectedDecision === "finalist"
                      ? "border border-[#2d7a5840] bg-[#2d7a5814] text-[#86c0a5] hover:bg-[#2d7a5822]"
                      : selectedDecision === "shortlisted"
                        ? "border border-[#b08a2840] bg-[#b08a2814] text-[#ccaa4a] hover:bg-[#b08a2820]"
                        : "border border-[#9b3a3a44] bg-[#9b3a3a14] text-[#f1bcbc] hover:bg-[#9b3a3a20]",
                  )}
                >
                  {actionLabel}
                </button>

                {nextCandidate ? (
                  <Link
                    href={buildModerationHref(programId, {
                      submission: nextCandidate.submissionId,
                      q: query.q ?? "",
                      scope,
                      tab,
                    })}
                    className="rounded-md border border-white/10 px-4 py-3 text-[13px] text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                  >
                    Next team →
                  </Link>
                ) : (
                  <span className="rounded-md border border-white/8 px-4 py-3 text-[13px] text-[#5e7088]">
                    No next team
                  </span>
                )}
              </div>
            </form>
          </>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#111e30] p-8 text-center text-[#9baabf]">
            No submissions match the current moderation filter.
          </div>
        )}
      </main>

      <aside className="overflow-y-auto border-l border-white/7 bg-[#0c1525] px-5 py-5">
        <div className="mb-3 text-[12px] font-semibold text-[#9baabf]">Track summary</div>
        <div className="space-y-3">
          <SummaryCard
            rows={[
              ["Total teams", String(moderationData.candidates.length)],
              ["Pending review", String(moderationData.pendingCount)],
              ["Decided", String(moderationData.decidedCount)],
              ["Finalists", String(moderationData.finalistsCount)],
              ["Winners", String(moderationData.winnersCount)],
              ["Rejected", String(moderationData.rejectedCount)],
            ]}
          />

          <div>
            <div className="mb-2 text-[12px] font-semibold text-[#9baabf]">
              Confirmed finalists
            </div>
            <div className="rounded-xl border border-white/10 bg-[#111e30]">
              {(moderationData.candidates.filter((candidate) => candidate.status === "finalist" || candidate.status === "winner")).slice(0, 5).map((candidate) => (
                <div
                  key={candidate.submissionId}
                  className="flex items-center justify-between border-b border-white/7 px-4 py-3 last:border-b-0"
                >
                  <div>
                    <div className="text-[12px] font-medium text-[#eae5dc]">
                      {candidate.teamName ?? candidate.title}
                    </div>
                    <div className="text-[10.5px] text-[#5e7088]">
                      Score {candidate.averageScore?.toFixed(1) ?? "—"}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-[#86c0a5]">
                    {candidate.status === "winner" ? "Winner" : "Finalist"}
                  </span>
                </div>
              ))}
              {moderationData.candidates.every(
                (candidate) => candidate.status !== "finalist" && candidate.status !== "winner",
              ) ? (
                <div className="px-4 py-4 text-[11px] text-[#5e7088]">
                  Finalists will appear here once moderation decisions are confirmed.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-[#b08a2833] bg-[#b08a2810] p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#b08a2840] bg-[#b08a2812] text-[9px] font-bold text-[#ccaa4a]">
                IN
              </div>
              <span className="text-[11px] font-semibold text-[#ccaa4a]">Innova</span>
            </div>
            <p className="text-[11.5px] leading-6 text-[#d9d4cb]">
              {selectedCandidate?.variance && selectedCandidate.variance >= 10
                ? `${selectedCandidate.teamName ?? selectedCandidate.title} has a high score spread. Review low outliers and conflict notes before you lock the final outcome.`
                : "Use this workspace to compare score spreads, judge comments, and conflict disclosures before you finalize the program outcome."}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CandidateListItem({
  active,
  href,
  candidate,
}: {
  active: boolean;
  href: string;
  candidate: {
    submissionId: string;
    teamName: string | null;
    title: string;
    averageScore: number | null;
    submittedScoresCount: number;
    variance: number | null;
    status: string;
    scoreMin: number | null;
    scoreMax: number | null;
  };
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-r-md border-l-2 px-3 py-3 transition",
        active
          ? "border-l-[#b08a28] bg-[#111e30]"
          : "border-l-transparent hover:bg-[#111e30]",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className={cn("text-[12.5px]", active ? "font-semibold text-[#eae5dc]" : "text-[#d9d4cb]")}>
          {candidate.teamName ?? candidate.title}
        </div>
        {candidate.variance !== null ? (
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
              candidate.variance >= 10
                ? "border-[#dc3c3c33] bg-[#dc3c3c12] text-[#e58f8f]"
                : "border-[#2d7a5830] bg-[#2d7a5812] text-[#86c0a5]",
            )}
          >
            Var {candidate.variance.toFixed(1)}
          </span>
        ) : (
          <span className="text-[10px] text-[#5e7088]">{humanizeSubmissionStatus(candidate.status)}</span>
        )}
      </div>
      <div className="text-[11px] text-[#5e7088]">
        Avg {candidate.averageScore?.toFixed(1) ?? "—"} · {candidate.submittedScoresCount} scores
        {candidate.scoreMin !== null && candidate.scoreMax !== null
          ? ` · ${candidate.scoreMin.toFixed(0)}-${candidate.scoreMax.toFixed(0)}`
          : ""}
      </div>
    </Link>
  );
}

function ScoreBreakdownPanel({
  candidate,
  criteria,
}: {
  candidate: NonNullable<Awaited<ReturnType<typeof getProgramJudgingModerationData>>>["candidates"][number];
  criteria: Awaited<ReturnType<typeof getProgramJudgingModerationData>> extends infer T
    ? T extends { criteria: infer C }
      ? C
      : never
    : never;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111e30]">
      <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))_72px] gap-3 border-b border-white/7 bg-[#162034] px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#5e7088]">
        <span>Judge</span>
        {criteria.map((criterion) => (
          <span key={criterion.id}>{criterion.label}</span>
        ))}
        <span className="text-right">Total</span>
      </div>

      <div className="px-4 py-2">
        {candidate.judgeScores.length > 0 ? (
          candidate.judgeScores.map((judgeScore) => (
            <div
              key={judgeScore.judgeUserId}
              className={cn(
                "grid grid-cols-[56px_repeat(5,minmax(0,1fr))_72px] gap-3 border-b border-white/7 px-0 py-3 last:border-b-0",
                candidate.variance !== null &&
                  judgeScore.totalScore !== null &&
                  candidate.averageScore !== null &&
                  Math.abs(judgeScore.totalScore - candidate.averageScore) >= 10
                  ? "rounded-lg bg-[#9b3a3a0c]"
                  : "",
              )}
            >
              <div className="flex items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#20344f] text-[9px] font-bold text-[#7db0d4]">
                  {getInitials(judgeScore.judgeName ?? judgeScore.judgeEmail ?? "J")}
                </div>
              </div>
              {judgeScore.criterionScores.map((criterionScore) => (
                <div key={criterionScore.criterionId}>
                  <div className="h-[5px] rounded-full bg-white/8">
                    <div
                      className={cn(
                        "h-[5px] rounded-full",
                        criterionScore.score !== null && candidate.averageScore !== null && judgeScore.totalScore !== null && Math.abs(judgeScore.totalScore - candidate.averageScore) >= 10
                          ? "bg-[#d16b6b]"
                          : "bg-[#b08a28]",
                      )}
                      style={{
                        width: `${criterionScore.score !== null ? Math.max(8, Math.min(100, (criterionScore.score / 20) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-[#9baabf]">
                    {criterionScore.score !== null ? criterionScore.score.toFixed(1) : "—"}
                  </div>
                </div>
              ))}
              <div
                className={cn(
                  "text-right text-[14px] font-semibold",
                  candidate.averageScore !== null &&
                    judgeScore.totalScore !== null &&
                    Math.abs(judgeScore.totalScore - candidate.averageScore) >= 10
                    ? "text-[#e58f8f]"
                    : "text-[#ccaa4a]",
                )}
              >
                {judgeScore.totalScore !== null ? judgeScore.totalScore.toFixed(1) : "—"}
              </div>
            </div>
          ))
        ) : (
          <div className="px-2 py-6 text-[12px] text-[#5e7088]">
            No submitted judge scores are available yet for this team.
          </div>
        )}
      </div>
    </section>
  );
}

function SubmissionPanel({
  candidate,
}: {
  candidate: NonNullable<Awaited<ReturnType<typeof getProgramJudgingModerationData>>>["candidates"][number];
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
      <div className="mb-3 text-[13px] font-semibold text-[#eae5dc]">Submission summary</div>
      <div className="space-y-3 text-[12px] leading-6 text-[#9baabf]">
        <div className="grid gap-2 md:grid-cols-[140px_1fr]">
          <span className="text-[#5e7088]">Problem</span>
          <span>{candidate.problemStatement ?? "No structured problem statement was captured."}</span>
        </div>
        <div className="grid gap-2 md:grid-cols-[140px_1fr]">
          <span className="text-[#5e7088]">Solution</span>
          <span>{candidate.solutionDescription ?? "No structured solution summary was captured."}</span>
        </div>
        <div className="grid gap-2 md:grid-cols-[140px_1fr]">
          <span className="text-[#5e7088]">Team</span>
          <span>
            {candidate.teamMembers.length > 0
              ? candidate.teamMembers
                  .map((member) => member.fullName ?? member.email ?? "Participant")
                  .join(", ")
              : "No team roster found."}
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {candidate.demoUrl ? (
          <a
            href={candidate.demoUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Open Demo
          </a>
        ) : null}
        {candidate.githubUrl ? (
          <a
            href={candidate.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/10 px-3 py-2 text-[12px] text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
          >
            Open Repo
          </a>
        ) : null}
      </div>
    </section>
  );
}

function JudgeCommentsPanel({
  candidate,
}: {
  candidate: NonNullable<Awaited<ReturnType<typeof getProgramJudgingModerationData>>>["candidates"][number];
}) {
  return (
    <section className="space-y-3">
      {candidate.judgeScores.length > 0 ? (
        candidate.judgeScores.map((judgeScore) => (
          <div key={judgeScore.judgeUserId} className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#eae5dc]">
                {judgeScore.judgeName ?? judgeScore.judgeEmail ?? "Judge"}
              </div>
              <div className="text-[11px] text-[#5e7088]">
                {judgeScore.totalScore !== null ? `Total ${judgeScore.totalScore.toFixed(1)}` : "No total"}
              </div>
            </div>
            {judgeScore.comments.length > 0 ? (
              <div className="space-y-2">
                {judgeScore.comments.map((comment, index) => (
                  <div key={`${judgeScore.judgeUserId}-${index}`} className="rounded-xl border border-white/7 bg-[#0c1525] px-3 py-3 text-[12px] leading-6 text-[#9baabf]">
                    {comment}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[12px] text-[#5e7088]">
                This judge did not leave criterion comments.
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5 text-[12px] text-[#5e7088]">
          Judge comments will appear here after score submissions include written rationale.
        </div>
      )}
    </section>
  );
}

function ConflictPanel({
  candidate,
}: {
  candidate: NonNullable<Awaited<ReturnType<typeof getProgramJudgingModerationData>>>["candidates"][number];
}) {
  return (
    <section className="space-y-3">
      {candidate.conflicts.length > 0 ? (
        candidate.conflicts.map((conflict) => (
          <div key={conflict.id} className="rounded-2xl border border-[#dc3c3c22] bg-[#9b3a3a0f] p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#f1c1c1]">
                {conflict.judgeName ?? "Judge conflict"}
              </div>
              <div className="text-[11px] text-[#c48d8d]">{formatDate(conflict.createdAt)}</div>
            </div>
            <div className="text-[12px] leading-6 text-[#e7b7b7]">{conflict.reason}</div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5 text-[12px] text-[#5e7088]">
          No conflict disclosures were logged for this submission.
        </div>
      )}
    </section>
  );
}

function DecisionOption({
  value,
  selected,
  title,
  description,
  tone,
}: {
  value: "finalist" | "shortlisted" | "rejected";
  selected: boolean;
  title: string;
  description: string;
  tone: "green" | "gold" | "red";
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition",
        selected
          ? tone === "green"
            ? "border-[#2d7a5840] bg-[#2d7a5810]"
            : tone === "gold"
              ? "border-[#b08a2840] bg-[#b08a2810]"
              : "border-[#9b3a3a44] bg-[#9b3a3a10]"
          : "border-white/10 bg-transparent hover:bg-white/[0.03]",
      )}
    >
      <input type="radio" name="decision" value={value} defaultChecked={selected} className="mt-1" />
      <div>
        <div
          className={cn(
            "text-[13px] font-semibold",
            tone === "green"
              ? selected
                ? "text-[#86c0a5]"
                : "text-[#d9d4cb]"
              : tone === "gold"
                ? selected
                  ? "text-[#ccaa4a]"
                  : "text-[#d9d4cb]"
                : selected
                  ? "text-[#f1c1c1]"
                  : "text-[#d9d4cb]",
          )}
        >
          {title}
        </div>
        <div className="mt-1 text-[12px] leading-6 text-[#9baabf]">{description}</div>
      </div>
    </label>
  );
}

function SummaryCard({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111e30] px-4 py-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between py-1.5 text-[11.5px]">
          <span className="text-[#9baabf]">{label}</span>
          <span className="font-medium text-[#eae5dc]">{value}</span>
        </div>
      ))}
    </div>
  );
}

function buildModerationHref(
  programId: string,
  params: {
    submission?: string | null;
    tab?: string | null;
    decision?: string | null;
    q?: string | null;
    scope?: string | null;
  },
) {
  const search = new URLSearchParams();
  if (params.submission) search.set("submission", params.submission);
  if (params.tab) search.set("tab", params.tab);
  if (params.decision) search.set("decision", params.decision);
  if (params.q) search.set("q", params.q);
  if (params.scope) search.set("scope", params.scope);

  return `/app/programs/${programId}/judging/moderation${search.size ? `?${search.toString()}` : ""}`;
}

function resolveTab(value?: string | null): ModerationTab {
  return value === "submission" || value === "comments" || value === "conflicts" ? value : "score";
}

function resolveScope(value?: string | null): ScopeFilter {
  return value === "pending" || value === "decided" ? value : "all";
}

function resolveDecision(
  value?: string | null,
  currentStatus?: string | null,
): "finalist" | "shortlisted" | "rejected" {
  if (value === "finalist" || value === "shortlisted" || value === "rejected") {
    return value;
  }
  if (currentStatus === "finalist") {
    return "finalist";
  }
  if (currentStatus === "shortlisted") {
    return "shortlisted";
  }
  if (currentStatus === "rejected") {
    return "rejected";
  }
  return "finalist";
}

function isPending(status: string) {
  return !["shortlisted", "finalist", "winner", "rejected"].includes(status);
}

function getNextCandidate<
  T extends {
    submissionId: string;
    status: string;
  },
>(candidates: T[], submissionId: string | null) {
  if (!submissionId) {
    return candidates.find((candidate) => isPending(candidate.status)) ?? null;
  }

  const pendingCandidates = candidates.filter((candidate) => isPending(candidate.status));
  const currentIndex = pendingCandidates.findIndex(
    (candidate) => candidate.submissionId === submissionId,
  );

  if (currentIndex >= 0) {
    return pendingCandidates[currentIndex + 1] ?? null;
  }

  return pendingCandidates[0] ?? null;
}

function humanizeSubmissionStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
