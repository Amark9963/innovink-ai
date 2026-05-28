import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserOrNull, getJudgePortalData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./assignments.module.css";

type JudgeAssignmentsPageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{
    status?: string;
  }>;
};

export default async function JudgeAssignmentsPage({
  params,
  searchParams,
}: JudgeAssignmentsPageProps) {
  const { programId } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const portal = await getJudgePortalData(supabase, user, programId);
  if (!portal) {
    redirect("/app/dashboard");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.brandMark}>IN</div>
          <div className={styles.brandName}>Innovink</div>
        </div>
        <div className={styles.headerMid}>{portal.program.name} › Judge Portal › My Assignments</div>
        <div className={styles.headerAvatar}>
          {getInitials(user.user_metadata.full_name ?? user.email ?? "J")}
        </div>
      </header>

      <div className={styles.main}>
        <div className={styles.topRow}>
          <div>
            <div className={styles.pageTitle}>My Assignments</div>
            <div className={styles.pageSubtitle}>
              {portal.program.name}
              {portal.program.submissionClosesAt
                ? ` · Due ${formatDate(portal.program.submissionClosesAt)}`
                : ""}
            </div>
          </div>
          <div className={styles.statGrid}>
            <StatCard label="Submitted" value={String(portal.progress.assignmentsCompleted)} tone="green" />
            <StatCard label="In Progress" value={String(portal.progress.assignmentsInProgress)} tone="gold" />
            <StatCard label="Not Started" value={String(portal.progress.assignmentsNotStarted)} tone="slate" />
            <StatCard label="Days Left" value={portal.progress.daysLeft !== null ? String(portal.progress.daysLeft) : "—"} tone="plain" />
          </div>
        </div>

        {query.status ? <div className={styles.successBanner}>{query.status.replace(/-/g, " ")}</div> : null}

        <section className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div className={styles.progressTitle}>Overall Progress</div>
            <div className={styles.progressMeta}>
              {portal.progress.assignmentsCompleted + portal.progress.assignmentsInProgress} of{" "}
              {portal.progress.assignmentsTotal} assignments complete or in progress
            </div>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${
                  portal.progress.assignmentsTotal > 0
                    ? Math.round(
                        ((portal.progress.assignmentsCompleted + portal.progress.assignmentsInProgress) /
                          portal.progress.assignmentsTotal) *
                          100,
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </section>

        <section className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Team & Project</th>
                <th>Materials</th>
                <th>Scores by Criterion</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {portal.assignments.map((assignment, index) => (
                <tr
                  key={assignment.id}
                  className={
                    assignment.scoreSubmission?.status === "draft" ? styles.rowActive : ""
                  }
                >
                  <td>{index + 1}</td>
                  <td>
                    <div className={styles.primaryCell}>{assignment.teamName ?? "Team"}</div>
                    <div className={styles.secondaryCell}>{assignment.submissionTitle}</div>
                  </td>
                  <td>
                    <div className={styles.tagList}>
                      {assignment.demoUrl ? <span className={styles.tagBlue}>Demo</span> : null}
                      {assignment.githubUrl ? <span className={styles.tagBlue}>Repo</span> : null}
                      <span className={styles.tagBlue}>Submission</span>
                    </div>
                  </td>
                  <td>
                    {assignment.scoreSubmission ? (
                      <div className={styles.scoreMeta}>Draft or submitted scores available</div>
                    ) : (
                      <div className={styles.scoreMetaMuted}>No scoring started</div>
                    )}
                  </td>
                  <td>
                    <div
                      className={
                        assignment.scoreSubmission?.totalScore !== null
                          ? styles.totalScore
                          : styles.totalScoreMuted
                      }
                    >
                      {assignment.scoreSubmission?.totalScore !== null
                        ? assignment.scoreSubmission?.totalScore
                        : "—"}
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        assignment.scoreSubmission?.status === "submitted"
                          ? styles.badgeGreen
                          : assignment.scoreSubmission?.status === "draft"
                            ? styles.badgeAmber
                            : styles.badgeMuted
                      }
                    >
                      {assignment.scoreSubmission?.status === "submitted"
                        ? "Submitted"
                        : assignment.scoreSubmission?.status === "draft"
                          ? "In Progress"
                          : "Not Started"}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/judge/${portal.program.id}/score/${assignment.id}`}
                      className={
                        assignment.scoreSubmission?.status === "submitted"
                          ? styles.ghostButton
                          : assignment.scoreSubmission?.status === "draft"
                            ? styles.primaryButton
                            : styles.secondaryButton
                      }
                    >
                      {assignment.scoreSubmission?.status === "submitted"
                        ? "View"
                        : assignment.scoreSubmission?.status === "draft"
                          ? "Continue →"
                          : "Start →"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "gold" | "slate" | "plain";
}) {
  return (
    <div className={styles.statCard}>
      <div
        className={`${styles.statValue} ${
          tone === "green"
            ? styles.statValueGreen
            : tone === "gold"
              ? styles.statValueGold
              : tone === "slate"
                ? styles.statValueSlate
                : ""
        }`}
      >
        {value}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
