import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserOrNull, getProgramMentorOversightData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./mentors.module.css";

type ProgramMentorOversightPageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramMentorOversightPage({ params }: ProgramMentorOversightPageProps) {
  const { programId } = await params;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/app/programs/${programId}/mentors`);
  }

  const oversight = await getProgramMentorOversightData(supabase, user, programId);

  if (!oversight) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <div className={styles.title}>Mentor oversight</div>
            <div className={styles.sub}>
              Keep mentor capacity, bookings, session load, and flagged match recommendations in one governed
              operational surface for {oversight.program.name}.
            </div>
          </div>
          <div className={styles.actions}>
            <Link href={`/app/programs/${programId}/mentors/matchmaking`} className={styles.button}>
              Review matching
            </Link>
          </div>
        </section>

        <section className={styles.metrics}>
          <div className={styles.metric}><div className={styles.metricLabel}>Mentors confirmed</div><div className={styles.metricValue}>{oversight.metrics.mentorsConfirmed}</div></div>
          <div className={styles.metric}><div className={styles.metricLabel}>Mentors pending</div><div className={styles.metricValue}>{oversight.metrics.mentorsPending}</div></div>
          <div className={styles.metric}><div className={styles.metricLabel}>Total capacity</div><div className={styles.metricValue}>{oversight.metrics.totalCapacity}</div></div>
          <div className={styles.metric}><div className={styles.metricLabel}>Scheduled sessions</div><div className={styles.metricValue}>{oversight.metrics.scheduledSessions}</div></div>
          <div className={styles.metric}><div className={styles.metricLabel}>Pending bookings</div><div className={styles.metricValue}>{oversight.metrics.pendingBookings}</div></div>
          <div className={styles.metric}><div className={styles.metricLabel}>Flagged matches</div><div className={styles.metricValue}>{oversight.metrics.flaggedMatches}</div></div>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Mentor roster</div>
            <div className={styles.cardSub}>Capacity, session load, and expertise for each mentor membership.</div>
            <div className={styles.table}>
              <div className={`${styles.tableRow} ${styles.tableHead}`}>
                <div>Mentor</div><div>Expertise</div><div>Status</div><div>Sessions</div><div>Open slots</div><div>Next</div>
              </div>
              {oversight.mentors.length ? (
                oversight.mentors.map((mentor) => (
                  <div key={mentor.membershipId} className={styles.tableRow}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{mentor.displayName}</div>
                      <div className={styles.meta}>{mentor.title ?? "Mentor"} · {mentor.organizationName ?? "Organization pending"}</div>
                    </div>
                    <div>{mentor.expertiseTags.join(", ") || "No tags yet"}</div>
                    <div><span className={mentor.status === "active" ? styles.pillSuccess : styles.pillWarn}>{mentor.status.replaceAll("_", " ")}</span></div>
                    <div>{mentor.confirmedSessions}</div>
                    <div>{mentor.availabilitySlots}</div>
                    <div>{mentor.nextSessionAt ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(mentor.nextSessionAt)) : "—"}</div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>No mentor memberships exist for this program yet.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Flagged mentor gaps</div>
            <div className={styles.cardSub}>Recommendations that still need PM review or more mentor coverage.</div>
            <div className={styles.stack}>
              {oversight.flaggedRecommendations.length ? (
                oversight.flaggedRecommendations.slice(0, 6).map((item) => (
                  <div key={item.id} className={styles.row}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.teamName ?? "Unassigned team"}</div>
                      <div className={styles.meta}>{item.mentorName ?? "No mentor linked"} · {item.reasoningSummary ?? "Review match fit and capacity."}</div>
                    </div>
                    <div>
                      <div className={item.status === "rejected" ? styles.pillDanger : styles.pillWarn}>{item.status.replaceAll("_", " ")}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>No flagged recommendations right now.</div>
              )}
            </div>
            <div className={styles.notice} style={{ marginTop: 16 }}>
              This view is driven by the real mentor run, recommendation, booking, and session tables. It is not a demo roster.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
