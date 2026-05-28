import Link from "next/link";
import { redirect } from "next/navigation";
import { saveJudgeScorecardAction } from "@/app/judge/[programId]/actions";
import {
  getJudgeCalibrationWorkspaceData,
  getCurrentUserOrNull,
  getJudgePortalData,
  getJudgeScorecardWorkspaceData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./scorecard.module.css";

type JudgeScorecardPageProps = {
  params: Promise<{ programId: string; assignmentId: string }>;
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function JudgeScorecardPage({
  params,
  searchParams,
}: JudgeScorecardPageProps) {
  const { programId, assignmentId } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const [workspace, portal, calibrationWorkspace] = await Promise.all([
    getJudgeScorecardWorkspaceData(supabase, user, programId, assignmentId),
    getJudgePortalData(supabase, user, programId),
    getJudgeCalibrationWorkspaceData(supabase, user, programId),
  ]);

  if (!workspace || !portal) {
    redirect(`/judge/${programId}/assignments`);
  }

  if (calibrationWorkspace?.exercise && calibrationWorkspace.existingSubmission?.status !== "submitted") {
    redirect(`/judge/${programId}/calibration`);
  }

  const assignmentIndex =
    portal.assignments.findIndex((assignment) => assignment.id === assignmentId) + 1;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerBrand}>
            <div className={styles.brandMark}>IN</div>
            <div className={styles.brandName}>Innovink</div>
          </div>
          <div className={styles.headerMid}>
            {workspace.program.name} › Judge Portal › Scorecard
          </div>
          <div className={styles.headerActions}>
            <button
              form="judge-scorecard-form"
              name="intent"
              value="save"
              type="submit"
              className={styles.secondaryButton}
            >
              Save Draft
            </button>
            <button
              form="judge-scorecard-form"
              name="intent"
              value="submit"
              type="submit"
              className={styles.primaryButton}
            >
              Submit Score
            </button>
            <div className={styles.headerAvatar}>
              {getInitials(user.user_metadata.full_name ?? user.email ?? "J")}
            </div>
          </div>
        </header>

        <div className={styles.navRail}>
          <div className={styles.navSectionLabel}>Judge Portal</div>
          <Link href={`/judge/${programId}/assignments`} className={styles.navItem}>
            My Assignments
          </Link>
          <div className={`${styles.navItem} ${styles.navItemActive}`}>Scorecard</div>
          <Link href={`/judge/${programId}/assignments`} className={styles.navItem}>
            Progress Tracker
          </Link>
          <div className={styles.navFooter}>
            <div className={styles.headerAvatar}>
              {getInitials(user.user_metadata.full_name ?? user.email ?? "J")}
            </div>
            <div>
              <div className={styles.navJudgeName}>
                {user.user_metadata.full_name ?? "Judge"}
              </div>
              <div className={styles.navJudgeRole}>
                {workspace.judgeRole.replaceAll("_", " ")}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.main}>
          {query.error ? <div className={styles.errorBanner}>{query.error.replace(/-/g, " ")}</div> : null}
          {query.status ? <div className={styles.successBanner}>{query.status.replace(/-/g, " ")}</div> : null}

          <div className={styles.submissionHeader}>
            <div className={styles.teamBadge}>
              {getInitials(workspace.assignment.teamName ?? "Team")}
            </div>
            <div className={styles.submissionMeta}>
              <div className={styles.submissionTitle}>{workspace.assignment.submissionTitle}</div>
              <div className={styles.submissionSub}>
                {workspace.assignment.teamName ?? "Team"} ·{" "}
                {workspace.assignment.teamMembers.map((member) => member.fullName ?? member.email ?? "Participant").join(", ")}
              </div>
            </div>
            <div className={styles.assignmentNav}>
              <div className={styles.assignmentCount}>
                Assignment {assignmentIndex} of {portal.assignments.length}
              </div>
              <div className={styles.assignmentButtons}>
                <Link href={`/judge/${programId}/assignments`} className={styles.ghostButton}>
                  ← Back
                </Link>
              </div>
            </div>
          </div>

          <div className={styles.summaryRow}>
            <div className={styles.totalCard}>
              <div className={styles.totalValue}>
                {workspace.assignment.scoreSubmission?.totalScore ?? 0}
              </div>
              <div className={styles.totalLabel}>Running Total</div>
              <div className={styles.totalSub}>of 100</div>
            </div>
            <div className={styles.materialsCard}>
              <div className={styles.materialsTitle}>Submission materials</div>
              <div className={styles.materialsActions}>
                {workspace.assignment.demoUrl ? (
                  <a href={workspace.assignment.demoUrl} target="_blank" rel="noreferrer" className={styles.ghostButton}>
                    Demo
                  </a>
                ) : null}
                {workspace.assignment.githubUrl ? (
                  <a href={workspace.assignment.githubUrl} target="_blank" rel="noreferrer" className={styles.ghostButton}>
                    GitHub Repo
                  </a>
                ) : null}
                <div className={styles.materialTag}>Submission Brief</div>
              </div>
              <div className={styles.materialSummary}>
                {workspace.assignment.problemStatement ??
                  workspace.assignment.solutionDescription ??
                  "Submission summary is available through the structured project package."}
              </div>
            </div>
          </div>

          <form id="judge-scorecard-form" action={saveJudgeScorecardAction} className={styles.form}>
            <input type="hidden" name="programId" value={programId} />
            <input type="hidden" name="assignmentId" value={assignmentId} />

            {workspace.criteria.map((criterion, index) => (
              <section
                key={criterion.id}
                className={`${styles.criterionCard} ${
                  index === 0 ? styles.criterionCardActive : ""
                }`}
              >
                <div className={styles.criterionHeader}>
                  <div>
                    <div className={styles.criterionTitle}>
                      Criterion {index + 1} — {criterion.label}
                    </div>
                    <div className={styles.criterionDescription}>
                      {criterion.description ?? "Use the rubric and supporting materials to score this criterion."}
                    </div>
                  </div>
                  <span
                    className={
                      criterion.existingScore !== null
                        ? styles.badgeAmber
                        : styles.badgeMuted
                    }
                  >
                    {criterion.existingScore !== null ? "In progress" : "Not started"}
                  </span>
                </div>

                <div className={styles.scoreLabel}>Score (0–{criterion.weight})</div>
                <div className={styles.scoreSelector}>
                  {buildScoreBands(criterion.weight).map((band) => (
                    <div
                      key={band.label}
                      className={`${styles.scoreBand} ${
                        criterion.existingScore !== null &&
                        criterion.existingScore >= band.min &&
                        criterion.existingScore <= band.max
                          ? styles.scoreBandSelected
                          : ""
                      }`}
                    >
                      <div>{band.label}</div>
                      <div className={styles.scoreBandCaption}>{band.caption}</div>
                    </div>
                  ))}
                </div>

                <div className={styles.scoreInputRow}>
                  <input
                    type="number"
                    name={`score:${criterion.id}`}
                    defaultValue={criterion.existingScore ?? ""}
                    min={0}
                    max={criterion.weight}
                    step="0.1"
                    className={styles.scoreInput}
                  />
                  <span className={styles.scoreInputSuffix}>/ {criterion.weight}</span>
                </div>

                <div className={styles.commentBlock}>
                  <div className={styles.commentLabel}>
                    Justification{criterion.requiresComment ? " (required)" : ""}
                  </div>
                  <textarea
                    name={`comment:${criterion.id}`}
                    defaultValue={criterion.existingComment ?? ""}
                    className={styles.commentInput}
                    placeholder="Explain your score — specific strengths and weaknesses observed..."
                  />
                </div>
              </section>
            ))}
          </form>
        </div>

        <aside className={styles.sidePanel}>
          <div className={styles.sidePanelHeader}>Innova Judging Assistant</div>
          <div className={styles.sidePanelBody}>
            <section className={styles.sideCardGold}>
              <div className={styles.sideCardTitle}>Calibration insight</div>
              <div className={styles.sideCardBody}>
                Your scoring will be compared against the active scorecard rubric and existing draft
                totals once this assignment is submitted.
              </div>
            </section>

            {workspace.criteria[0] ? (
              <section className={styles.sideCard}>
                <div className={styles.sideCardTitle}>
                  {workspace.criteria[0].label} — Rubric
                </div>
                <div className={styles.rubricRow}>
                  <div className={styles.rubricBand}>High</div>
                  <div className={styles.rubricText}>
                    Strong evidence, quantified impact, and clear execution maturity.
                  </div>
                </div>
                <div className={styles.rubricRow}>
                  <div className={styles.rubricBand}>Mid</div>
                  <div className={styles.rubricText}>
                    Good direction, but assumptions or execution details need validation.
                  </div>
                </div>
                <div className={styles.rubricRow}>
                  <div className={styles.rubricBand}>Low</div>
                  <div className={styles.rubricText}>
                    Limited evidence, weak rationale, or unclear implementation path.
                  </div>
                </div>
              </section>
            ) : null}

            <section className={styles.sideCard}>
              <div className={styles.sideCardTitle}>Panel status</div>
              <div className={styles.panelRow}>
                <span>Current assignment</span>
                <span>
                  {workspace.assignment.scoreSubmission?.status === "submitted"
                    ? "Submitted"
                    : workspace.assignment.scoreSubmission?.status === "draft"
                      ? "In progress"
                      : "Not started"}
                </span>
              </div>
              <div className={styles.panelRow}>
                <span>Conflicts declared</span>
                <span>{workspace.assignment.conflict ? "Yes" : "No"}</span>
              </div>
              <div className={styles.panelRow}>
                <span>Materials linked</span>
                <span>
                  {[workspace.assignment.demoUrl, workspace.assignment.githubUrl].filter(Boolean).length}
                </span>
              </div>
            </section>
          </div>
          <div className={styles.sidePanelFooter}>
            <button
              form="judge-scorecard-form"
              name="intent"
              value="save"
              type="submit"
              className={styles.secondaryButton}
            >
              Save Draft
            </button>
            <button
              form="judge-scorecard-form"
              name="intent"
              value="submit"
              type="submit"
              className={styles.primaryButton}
            >
              Submit Score
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function buildScoreBands(weight: number) {
  const quarter = Math.max(1, Math.round(weight / 4));
  return [
    { min: 0, max: quarter, label: `0–${quarter}`, caption: "Poor" },
    { min: quarter + 1, max: quarter * 2, label: `${quarter + 1}–${quarter * 2}`, caption: "Below avg" },
    {
      min: quarter * 2 + 1,
      max: quarter * 3,
      label: `${quarter * 2 + 1}–${quarter * 3}`,
      caption: "Average",
    },
    {
      min: quarter * 3 + 1,
      max: weight,
      label: `${quarter * 3 + 1}–${weight}`,
      caption: "Strong+",
    },
  ];
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
