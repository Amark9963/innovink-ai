import { notFound, redirect } from "next/navigation";
import { reviewMentorMatchAction } from "@/app/app/programs/[programId]/mentors/actions";
import { getCurrentUserOrNull, getProgramMentorMatchmakingData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../mentors.module.css";

type ProgramMentorMatchmakingPageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function ProgramMentorMatchmakingPage({
  params,
  searchParams,
}: ProgramMentorMatchmakingPageProps) {
  const { programId } = await params;
  const { status, error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/app/programs/${programId}/mentors/matchmaking`);
  }

  const data = await getProgramMentorMatchmakingData(supabase, user, programId);

  if (!data) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <div className={styles.title}>Mentor matchmaking review</div>
            <div className={styles.sub}>
              Review mentor-to-team recommendations from the latest run and decide which pairings should move forward.
            </div>
          </div>
        </section>

        {status || error ? (
          <div className={styles.notice}>
            {error ? "We could not update that recommendation." : `Status: ${status?.replaceAll("-", " ")}`}
          </div>
        ) : null}

        <section className={styles.card}>
          <div className={styles.cardTitle}>Latest match run</div>
          <div className={styles.cardSub}>
            {data.latestRun
              ? `${data.latestRun.status.replaceAll("_", " ")} · scope ${data.latestRun.runScope}`
              : "No mentor match run exists for this program yet."}
          </div>

          <div className={styles.table}>
            <div className={`${styles.tableRow} ${styles.tableHead}`}>
              <div>Team</div><div>Mentor</div><div>Score</div><div>Status</div><div>Reasoning</div><div>Action</div>
            </div>
            {data.recommendations.length ? (
              data.recommendations.map((row) => (
                <div key={row.id} className={styles.tableRow}>
                  <div>{row.teamName ?? "Unassigned team"}</div>
                  <div>{row.mentorName ?? "Mentor unavailable"}</div>
                  <div>{row.score !== null ? `${row.score.toFixed(1)}%` : "—"}</div>
                  <div>
                    <span
                      className={
                        row.status === "approved"
                          ? styles.pillSuccess
                          : row.status === "rejected"
                            ? styles.pillDanger
                            : styles.pillWarn
                      }
                    >
                      {row.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className={styles.meta}>{row.reasoningSummary ?? "No reasoning summary captured."}</div>
                  <div className={styles.actions}>
                    <form action={reviewMentorMatchAction}>
                      <input type="hidden" name="programId" value={programId} />
                      <input type="hidden" name="recommendationId" value={row.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button className={styles.button} type="submit">Approve</button>
                    </form>
                    <form action={reviewMentorMatchAction}>
                      <input type="hidden" name="programId" value={programId} />
                      <input type="hidden" name="recommendationId" value={row.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button className={styles.dangerButton} type="submit">Reject</button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.empty}>No match recommendations are available yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
