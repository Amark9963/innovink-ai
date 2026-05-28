import Link from "next/link";
import { redirect } from "next/navigation";
import { saveJudgeCalibrationAction } from "@/app/judge/[programId]/actions";
import {
  getCurrentUserOrNull,
  getJudgeCalibrationWorkspaceData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type CalibrationPageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{
    error?: string;
    status?: string;
    tab?: string;
  }>;
};

type CalibrationTab = "reference" | "anchors" | "alignment";

export default async function JudgeCalibrationPage({
  params,
  searchParams,
}: CalibrationPageProps) {
  const { programId } = await params;
  const query = (await searchParams) ?? {};
  const tab = resolveCalibrationTab(query.tab);
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const workspace = await getJudgeCalibrationWorkspaceData(
    supabase,
    user,
    programId,
  );

  if (!workspace || !workspace.exercise || !workspace.scorecard) {
    redirect(`/judge/${programId}/assignments?error=calibration-unavailable`);
  }

  const runningTotal = workspace.criteria.reduce(
    (sum, criterion) => sum + (criterion.existingScore ?? 0),
    0,
  );

  return (
    <div className="grid h-full grid-rows-[64px_1fr] grid-cols-[minmax(0,1fr)_360px] overflow-hidden bg-[#07101f] text-[#eae5dc]">
      <header className="col-span-2 flex items-center justify-between border-b border-white/7 bg-[#0c1525] px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#b08a2838] bg-[#b08a2812] text-[13px] font-bold text-[#ccaa4a]">
            IN
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.02em] text-[#eae5dc]">
              Innovink
            </div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-[#b08a28]">
              Judge Calibration
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11.5px] text-[#9baabf]">Calibration required before scoring</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#33214f] text-[11px] font-semibold text-[#b497e5]">
            {getInitials(user.user_metadata.full_name ?? user.email ?? "J")}
          </div>
        </div>
      </header>

      <main className="overflow-y-auto px-7 py-6">
        <div className="mb-6 flex items-center gap-3 text-[12px]">
          <StepNode label="Access verified" state="done" />
          <div className="h-px w-6 bg-white/10" />
          <StepNode label="Conflict disclosure" state="done" />
          <div className="h-px w-6 bg-white/10" />
          <StepNode label="Calibration" state="active" />
          <div className="h-px w-6 bg-white/10" />
          <StepNode label="Score submissions" state="pending" />
        </div>

        {query.error ? (
          <div className="mb-4 rounded-xl border border-[#9b3a3a44] bg-[#9b3a3a12] px-4 py-3 text-[12px] text-[#f1bcbc]">
            {query.error.replace(/-/g, " ")}
          </div>
        ) : null}

        {query.status ? (
          <div className="mb-4 rounded-xl border border-[#2d7a5840] bg-[#2d7a5812] px-4 py-3 text-[12px] text-[#9ad0b7]">
            {query.status.replace(/-/g, " ")}
          </div>
        ) : null}

        <div className="mb-5 rounded-2xl border border-[#b08a2838] bg-[linear-gradient(135deg,rgba(176,138,40,0.07),rgba(176,138,40,0.03))] p-5">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-[#b08a2840] bg-[#b08a2812] text-[14px] text-[#ccaa4a]">
              i
            </div>
            <div>
              <div className="text-[14px] font-semibold text-[#eae5dc]">
                Scoring Calibration Exercise
              </div>
              <div className="mt-1 text-[12.5px] leading-6 text-[#9baabf]">
                {workspace.exercise.instructions ??
                  "Score this reference submission using the judging rubric. Your result will be compared against the panel consensus before live scoring opens."}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-[#9baabf]">
                <span>
                  <strong className="font-semibold text-[#eae5dc]">
                    {workspace.alignment.totalJudges}
                  </strong>{" "}
                  judges in track
                </span>
                <span>
                  <strong className="font-semibold text-[#eae5dc]">
                    {workspace.alignment.completedJudges}
                  </strong>{" "}
                  completed calibration
                </span>
                <span>
                  Consensus score:{" "}
                  <strong className="font-semibold text-[#ccaa4a]">
                    {workspace.exercise.consensusTotalScore?.toFixed(1) ?? "—"} / 100
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-5 flex border-b border-white/7">
          {([
            ["reference", "Reference Submission"],
            ["anchors", "Rubric Anchors"],
            ["alignment", "Panel Alignment"],
          ] as const).map(([value, label]) => (
            <Link
              key={value}
              href={`/judge/${programId}/calibration?tab=${value}`}
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

        {tab === "reference" ? (
          <>
            <div className="mb-5 rounded-2xl border border-white/10 bg-[#111e30] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-[#eae5dc]">
                    {workspace.exercise.title}
                  </div>
                  <div className="mt-1 text-[11.5px] text-[#5e7088]">
                    {workspace.exercise.referenceCode ?? "Calibration reference"} · Used for calibration only
                  </div>
                </div>
                <span className="rounded-md border border-[#b08a2840] bg-[#b08a2812] px-2 py-1 text-[10px] font-semibold text-[#ccaa4a]">
                  Calibration
                </span>
              </div>

              <div className="space-y-2 text-[12.5px]">
                <SummaryRow label="Problem" value={workspace.exercise.problemSummary} />
                <SummaryRow label="Solution" value={workspace.exercise.solutionSummary} />
                <SummaryRow label="Validation" value={workspace.exercise.validationSummary} />
                <SummaryRow label="Team" value={workspace.exercise.teamSummary} />
              </div>

              <div className="mt-4 flex gap-2">
                {workspace.exercise.pitchDeckUrl ? (
                  <a
                    href={workspace.exercise.pitchDeckUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11.5px] text-[#7fb5e7] transition hover:text-[#b3d5f2]"
                  >
                    View pitch deck
                  </a>
                ) : null}
                {workspace.exercise.pitchDeckUrl && workspace.exercise.demoUrl ? (
                  <span className="text-[#5e7088]">·</span>
                ) : null}
                {workspace.exercise.demoUrl ? (
                  <a
                    href={workspace.exercise.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11.5px] text-[#7fb5e7] transition hover:text-[#b3d5f2]"
                  >
                    Watch demo
                  </a>
                ) : null}
              </div>
            </div>

            <form action={saveJudgeCalibrationAction} className="space-y-5">
              <input type="hidden" name="programId" value={programId} />

              <div className="rounded-2xl border border-white/10 bg-[#111e30]">
                <div className="px-5 py-4">
                  <div className="mb-3 text-[13px] font-semibold text-[#eae5dc]">
                    Score this submission
                  </div>
                  <div className="space-y-4">
                    {workspace.criteria.map((criterion) => (
                      <div key={criterion.id} className="border-b border-white/7 py-4 last:border-b-0">
                        <div className="mb-2 flex items-start justify-between gap-4">
                          <div>
                            <div className="text-[12.5px] font-semibold text-[#eae5dc]">
                              {criterion.label}
                            </div>
                            <div className="mt-1 text-[11.5px] leading-6 text-[#9baabf]">
                              {criterion.description ?? "Use the rubric and reference materials to score this criterion."}
                            </div>
                          </div>
                          <div className="text-[13px] font-semibold text-[#ccaa4a]">
                            {criterion.existingScore !== null ? criterion.existingScore.toFixed(1) : "—"}{" "}
                            <span className="text-[11px] font-normal text-[#5e7088]">/ {criterion.weight}</span>
                          </div>
                        </div>

                        <div className="mb-2 h-[6px] rounded-full bg-white/10">
                          <div
                            className="h-[6px] rounded-full bg-[linear-gradient(90deg,rgba(176,138,40,.6),rgba(176,138,40,1))]"
                            style={{
                              width: `${criterion.existingScore !== null ? Math.max(6, (criterion.existingScore / criterion.weight) * 100) : 0}%`,
                            }}
                          />
                        </div>

                        <div className="mb-3 flex justify-between text-[10px] text-[#5e7088]">
                          <span>0 — Needs work</span>
                          <span>{criterion.weight / 2} — Adequate</span>
                          <span>{criterion.weight} — Exemplary</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min={0}
                            max={criterion.weight}
                            step="0.1"
                            name={`score:${criterion.id}`}
                            defaultValue={criterion.existingScore ?? ""}
                            className="w-24 rounded-xl border border-white/10 bg-[#0c1525] px-3 py-2 text-[12px] text-[#eae5dc] outline-none"
                          />
                          <span className="text-[11px] text-[#9baabf]">/ {criterion.weight}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[13px] font-semibold text-[#eae5dc]">Your total score</div>
                  <div className="text-[24px] font-semibold text-[#ccaa4a]">
                    {runningTotal.toFixed(1)} <span className="text-[13px] font-normal text-[#5e7088]">/ 100</span>
                  </div>
                </div>
                <div className="mb-2 text-[12px] text-[#9baabf]">
                  Calibration notes (optional - visible to PM only)
                </div>
                <textarea
                  name="notes"
                  defaultValue={workspace.existingSubmission?.notes ?? ""}
                  className="h-20 w-full rounded-xl border border-white/10 bg-[#0c1525] px-3 py-3 text-[12px] leading-6 text-[#eae5dc] outline-none placeholder:text-[#5e7088]"
                  placeholder="Note anything that influenced your scores, such as strong validation evidence or weak execution details."
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  name="intent"
                  value="save"
                  className="rounded-md border border-white/10 px-4 py-3 text-[12px] font-medium text-[#9baabf] transition hover:bg-white/[0.04] hover:text-[#eae5dc]"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  name="intent"
                  value="submit"
                  className="rounded-md bg-[#b08a28] px-4 py-3 text-[13px] font-semibold text-[#07101f] transition hover:bg-[#ccaa4a]"
                >
                  Submit Calibration Scores →
                </button>
              </div>
            </form>
          </>
        ) : null}

        {tab === "anchors" ? (
          <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
            <div className="mb-4 text-[13px] font-semibold text-[#eae5dc]">Scoring anchors</div>
            <div className="space-y-3">
              {workspace.exercise.scoringAnchors.map((anchor) => (
                <div key={anchor.rangeLabel} className="flex items-start justify-between gap-4 border-b border-white/7 py-3 last:border-b-0">
                  <div
                    className={cn(
                      "text-[12px]",
                      anchor.highlighted ? "font-semibold text-[#ccaa4a]" : "text-[#d9d4cb]",
                    )}
                  >
                    {anchor.rangeLabel}
                  </div>
                  <div className="max-w-[360px] text-right text-[11.5px] leading-6 text-[#9baabf]">
                    {anchor.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "alignment" ? (
          <div className="rounded-2xl border border-white/10 bg-[#111e30] p-5">
            <div className="mb-4 text-[13px] font-semibold text-[#eae5dc]">Panel alignment</div>
            <div className="space-y-3">
              {workspace.alignment.judgeTotals.length > 0 ? (
                workspace.alignment.judgeTotals.map((judgeTotal) => (
                  <div key={judgeTotal.judgeUserId} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#20344f] text-[9px] font-bold text-[#7fb5e7]">
                      {getInitials(judgeTotal.judgeName ?? "J")}
                    </div>
                    <div className="flex-1">
                      <div className="h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-[#3a6e9e]"
                          style={{
                            width: `${judgeTotal.totalScore !== null ? Math.max(6, judgeTotal.totalScore) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-10 text-right text-[11px] text-[#d9d4cb]">
                      {judgeTotal.totalScore !== null ? judgeTotal.totalScore.toFixed(0) : "—"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[12px] text-[#5e7088]">
                  Submitted calibration scores will appear here after judges complete the exercise.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <aside className="overflow-y-auto border-l border-white/7 bg-[#0c1525] px-5 py-5">
        <div className="mb-4 text-[12px] font-semibold text-[#9baabf]">Panel Alignment</div>
        <div className="rounded-2xl border border-white/10 bg-[#111e30] p-4">
          <div className="mb-3 flex items-center justify-between text-[11.5px]">
            <span className="text-[#9baabf]">Score distribution</span>
            <span className="font-medium text-[#eae5dc]">
              {workspace.alignment.scoreMin !== null && workspace.alignment.scoreMax !== null
                ? `${workspace.alignment.scoreMin.toFixed(1)}-${workspace.alignment.scoreMax.toFixed(1)} pts`
                : "No scores yet"}
            </span>
          </div>

          <SidebarMetric label="Mean" value={workspace.alignment.meanScore !== null ? workspace.alignment.meanScore.toFixed(1) : "—"} />
          <SidebarMetric label="Std deviation" value={workspace.alignment.stdDeviation !== null ? workspace.alignment.stdDeviation.toFixed(1) : "—"} />
          <SidebarMetric
            label="Your score"
            value={
              workspace.existingSubmission?.totalScore != null
                ? workspace.existingSubmission.totalScore.toFixed(1)
                : "—"
            }
          />
        </div>

        <div className="mt-4 text-[12px] font-semibold text-[#9baabf]">PM note</div>
        <div className="mt-2 rounded-2xl border border-[#b08a2838] bg-[#b08a2810] p-4 text-[11.5px] leading-6 text-[#d9d4cb]">
          {workspace.exercise.managerNote ??
            "If your calibration score falls materially outside the panel range, the program team may request a short alignment conversation before live scoring opens."}
        </div>
      </aside>
    </div>
  );
}

function resolveCalibrationTab(value?: string): CalibrationTab {
  return value === "anchors" || value === "alignment" ? value : "reference";
}

function StepNode({
  label,
  state,
}: {
  label: string;
  state: "done" | "active" | "pending";
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold",
          state === "done"
            ? "border-[#2d7a5840] bg-[#2d7a5814] text-[#86c0a5]"
            : state === "active"
              ? "border-[#b08a2840] bg-[#b08a2814] text-[#ccaa4a]"
              : "border-white/10 bg-[#111e30] text-[#5e7088]",
        )}
      >
        {state === "done" ? "✓" : state === "active" ? "3" : "•"}
      </div>
      <span
        className={cn(
          "text-[12px]",
          state === "active" ? "font-medium text-[#eae5dc]" : "text-[#9baabf]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-2 md:grid-cols-[130px_1fr]">
      <span className="text-[#5e7088]">{label}</span>
      <span className="text-[#9baabf]">{value ?? "Not provided yet."}</span>
    </div>
  );
}

function SidebarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex items-center justify-between text-[11.5px]">
      <span className="text-[#9baabf]">{label}</span>
      <span className="font-medium text-[#eae5dc]">{value}</span>
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
