import Link from "next/link";
import { redirect } from "next/navigation";
import { submitJudgeConflictDeclarationAction } from "@/app/judge/[programId]/actions";
import { getCurrentUserOrNull, getJudgePortalData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./onboarding.module.css";

type JudgeOnboardingPageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{
    flagged?: string;
    error?: string;
  }>;
};

export default async function JudgeOnboardingPage({
  params,
  searchParams,
}: JudgeOnboardingPageProps) {
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

  const queryFlags = new Set(
    String(query.flagged ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const flaggedAssignments = portal.assignments.filter(
    (assignment) => assignment.conflict || queryFlags.has(assignment.id),
  );

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.headerBrand}>
            <div className={styles.brandMark}>IN</div>
            <div className={styles.brandName}>Innovink</div>
          </div>
          <div className={styles.headerMid}>
            Judge Onboarding · {portal.program.name}
          </div>
          <div className={styles.headerAvatar}>
            {getInitials(user.user_metadata.full_name ?? user.email ?? "J")}
          </div>
        </header>

        <div className={styles.main}>
          <div className={styles.stepIndicator}>
            <StepNode label="Welcome" state="done" />
            <div className={styles.stepConnector} />
            <StepNode label="Conflict of Interest" state="active" />
            <div className={styles.stepConnector} />
            <StepNode label="Scoring Criteria" state="pending" />
            <div className={styles.stepConnector} />
            <StepNode label="Assignments" state="pending" />
          </div>

          {query.error ? <div className={styles.errorBanner}>{query.error.replace(/-/g, " ")}</div> : null}

          <form action={submitJudgeConflictDeclarationAction}>
            <input type="hidden" name="programId" value={portal.program.id} />
            <input
              type="hidden"
              name="flaggedIds"
              value={flaggedAssignments.map((assignment) => assignment.id).join(",")}
            />

            <section className={styles.card}>
              <div className={styles.heroRow}>
                <div className={styles.heroIcon}>✦</div>
                <div>
                  <div className={styles.heroTitle}>Conflict of Interest Declaration</div>
                  <div className={styles.heroBody}>
                    Review your assigned submissions below. Flag any team where you have a prior
                    employment, investment, personal relationship, or direct competition conflict.
                    Flagged submissions will be visible for reassignment by program operators.
                  </div>
                </div>
              </div>

              <div className={styles.infoBanner}>
                Your assignment: {portal.assignments.length} submissions · scoring window closes{" "}
                {portal.program.submissionClosesAt ? formatDate(portal.program.submissionClosesAt) : "TBD"}
              </div>

              <div className={styles.sectionLabel}>Review Assigned Submissions</div>
              <div className={styles.assignmentList}>
                {portal.assignments.map((assignment) => {
                  const flagged = Boolean(assignment.conflict) || queryFlags.has(assignment.id);
                  const nextFlags = new Set(queryFlags);
                  if (flagged) {
                    nextFlags.delete(assignment.id);
                  } else {
                    nextFlags.add(assignment.id);
                  }
                  const nextFlagQuery = Array.from(nextFlags).join(",");

                  return (
                    <div
                      key={assignment.id}
                      className={`${styles.assignmentRow} ${flagged ? styles.assignmentRowFlagged : ""}`}
                    >
                      <div className={styles.assignmentCheckbox}>{flagged ? "✓" : ""}</div>
                      <div className={styles.assignmentContent}>
                        <div className={styles.assignmentTitle}>
                          {assignment.teamName ?? "Team"} — {assignment.submissionTitle}
                        </div>
                        <div className={styles.assignmentMeta}>
                          Team lead:{" "}
                          {assignment.teamMembers.find((member) => member.isLead)?.fullName ??
                            assignment.teamMembers[0]?.fullName ??
                            "Unknown"}{" "}
                          · {assignment.teamMembers.length} members
                        </div>
                        {flagged ? (
                          <div className={styles.flaggedBox}>
                            <div className={styles.flaggedLabel}>
                              {assignment.conflict ? "COI already declared" : "COI flagged"}
                            </div>
                            {assignment.conflict ? (
                              <div className={styles.flaggedReason}>{assignment.conflict.reason}</div>
                            ) : (
                              <select
                                name={`reason:${assignment.id}`}
                                className={styles.reasonSelect}
                                defaultValue="Prior employment"
                              >
                                <option>Prior employment</option>
                                <option>Investment / financial interest</option>
                                <option>Personal relationship with team member</option>
                                <option>Direct competitor</option>
                                <option>Other</option>
                              </select>
                            )}
                          </div>
                        ) : null}
                      </div>
                      {assignment.conflict ? (
                        <span className={styles.lockedTag}>Declared</span>
                      ) : (
                        <Link
                          href={
                            nextFlagQuery
                              ? `/judge/${portal.program.id}/onboarding?flagged=${nextFlagQuery}`
                              : `/judge/${portal.program.id}/onboarding`
                          }
                          className={styles.rowAction}
                        >
                          {flagged ? "Unflag" : "Flag COI"}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={styles.declarationCard}>
              <div className={styles.declarationBody}>
                I confirm that the information provided above is accurate and complete. I understand
                that failing to declare a conflict of interest may result in score invalidation and
                removal from the judging panel.
              </div>
            </section>

            <div className={styles.footerRow}>
              <Link href="/app/dashboard" className={styles.backButton}>
                ← Back
              </Link>
              <div className={styles.footerActions}>
                <div className={styles.footerMeta}>
                  {flaggedAssignments.length} flagged ·{" "}
                  {Math.max(0, portal.assignments.length - flaggedAssignments.length)} cleared
                </div>
                <button type="submit" className={styles.primaryButton}>
                  Submit Declaration &amp; Continue →
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function StepNode({
  label,
  state,
}: {
  label: string;
  state: "done" | "active" | "pending";
}) {
  return (
    <div className={styles.stepNode}>
      <div
        className={`${styles.stepCircle} ${
          state === "done"
            ? styles.stepCircleDone
            : state === "active"
              ? styles.stepCircleActive
              : styles.stepCirclePending
        }`}
      >
        {state === "done" ? "✓" : state === "active" ? "2" : "•"}
      </div>
      <div className={styles.stepLabel}>{label}</div>
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
