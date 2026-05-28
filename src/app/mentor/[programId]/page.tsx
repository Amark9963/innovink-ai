import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserOrNull, getMentorPortalData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./mentor-portal.module.css";
import { formatDateTime, humanizeSessionType, MentorSidebar, mentorBadgeClass } from "./mentor-layout";

type MentorWorkspacePageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function MentorWorkspacePage({ params, searchParams }: MentorWorkspacePageProps) {
  const { programId } = await params;
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${programId}`);
  }

  const portal = await getMentorPortalData(supabase, user, programId);

  if (!portal) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <MentorSidebar current="workspace" programId={programId} portal={portal} />

        <main className={styles.main}>
          <section className={styles.heroCard}>
            <div>
              <div className={styles.eyebrow}>Mentor Workspace</div>
              <div className={styles.title}>Guide teams with real session, booking, and note workflows</div>
              <div className={styles.subtitle}>
                Review your assigned teams, respond to incoming bookings, and keep structured mentor notes
                inside the same governed program workflow.
              </div>
              {status ? (
                <div className={styles.cardSub} style={{ marginTop: 12 }}>
                  Status: {status.replaceAll("-", " ")}
                </div>
              ) : null}
            </div>
            <div className={styles.heroActions}>
              <Link href={`/mentor/${programId}/availability`} className={styles.button}>
                Manage availability
              </Link>
              <Link href={`/mentor/${programId}/bookings`} className={styles.ghostButton}>
                Review bookings
              </Link>
            </div>
          </section>

          <section className={styles.metrics}>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Assigned teams</div>
              <div className={styles.metricValue}>{portal.stats.assignedTeams}</div>
              <div className={styles.metricMeta}>Teams already connected to your mentor sessions</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Upcoming sessions</div>
              <div className={styles.metricValue}>{portal.stats.upcomingSessions}</div>
              <div className={styles.metricMeta}>Confirmed sessions still ahead of you</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Pending bookings</div>
              <div className={styles.metricValue}>{portal.stats.pendingBookings}</div>
              <div className={styles.metricMeta}>Requests waiting for your review</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Open availability</div>
              <div className={styles.metricValue}>{portal.stats.availabilitySlots}</div>
              <div className={styles.metricMeta}>Future slots currently visible for booking</div>
            </div>
          </section>

          <section className={styles.gridTwo}>
            <div className={styles.mainCard}>
              <div className={styles.cardTitle}>Upcoming mentor sessions</div>
              <div className={styles.cardSub}>The next live interactions scheduled against your mentor membership.</div>
              <div className={styles.stack} style={{ marginTop: 14 }}>
                {portal.sessions.length ? (
                  portal.sessions.slice(0, 6).map((session) => (
                    <div key={session.id} className={styles.listRow}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {humanizeSessionType(session.sessionType)}
                        </div>
                        <div className={styles.listMeta}>
                          {formatDateTime(session.startsAt)} · {session.teamNames.join(", ") || "Individual team"}
                        </div>
                        <div className={styles.listMeta}>
                          Participants: {session.participantNames.join(", ") || "Not assigned yet"}
                        </div>
                      </div>
                      <div className={styles.rowActions}>
                        <span className={mentorBadgeClass(session.status)}>{session.status.replaceAll("_", " ")}</span>
                        <Link href={`/mentor/${programId}/sessions/${session.id}`} className={styles.ghostButton}>
                          Open
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    No mentor sessions are scheduled yet. Finish your mentor profile, publish availability,
                    and the booking queue will start routing teams into real sessions.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.mainCard}>
              <div className={styles.cardTitle}>Pending booking queue</div>
              <div className={styles.cardSub}>Requests that need your attention before a session can be confirmed.</div>
              <div className={styles.stack} style={{ marginTop: 14 }}>
                {portal.bookingRequests.length ? (
                  portal.bookingRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className={styles.miniCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div className={styles.miniTitle}>
                          {request.teamName ?? request.requesterName ?? "Program participant"}
                        </div>
                        <span className={mentorBadgeClass(request.status)}>
                          {request.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <div className={styles.miniMeta}>
                        {humanizeSessionType(request.sessionType)} · {formatDateTime(request.requestedStartsAt)}
                      </div>
                      <div className={styles.miniMeta}>{request.sessionGoals ?? "No session goals provided yet."}</div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    No booking requests are waiting right now. New requests will appear here as teams engage
                    with your published availability.
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>

        <aside className={styles.panel}>
          <div className={styles.cardTitle}>Profile readiness</div>
          <div className={styles.panelList}>
            <div className={styles.miniCard}>
              <div className={styles.miniTitle}>{portal.profile.displayName}</div>
              <div className={styles.miniMeta}>
                {portal.profile.title ?? "Mentor title pending"} · {portal.profile.organizationName ?? "Organization pending"}
              </div>
              <div className={styles.miniMeta}>
                Expertise: {portal.profile.expertiseTags.join(", ") || "Add expertise tags in onboarding"}
              </div>
            </div>
            <div className={styles.asideStat}>
              <span>Mentor membership</span>
              <strong>{portal.membership.status.replaceAll("_", " ")}</strong>
            </div>
            <div className={styles.asideStat}>
              <span>Max load</span>
              <strong>{portal.profile.maxMentoringLoad ?? portal.membership.maxSessions ?? "Not set"}</strong>
            </div>
            <div className={styles.asideStat}>
              <span>Formats</span>
              <strong>{portal.profile.sessionFormatPreferences.length || 0}</strong>
            </div>
          </div>

          <div className={styles.cardTitle} style={{ marginTop: 8 }}>Innova mentor assistant</div>
          <div className={styles.notice}>
            Innovink uses your profile, expertise tags, availability, and session history to keep bookings and
            mentor matching auditable. Update the profile before opening more slots if your focus has changed.
          </div>

          <div className={styles.rowActions}>
            <Link href={`/mentor/${programId}/onboarding`} className={styles.button}>
              Update profile
            </Link>
            <Link href={`/mentor/${programId}/availability`} className={styles.ghostButton}>
              Open schedule
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
