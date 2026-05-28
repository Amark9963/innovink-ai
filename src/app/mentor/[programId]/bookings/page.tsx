import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { reviewMentorBookingAction } from "@/app/mentor/[programId]/actions";
import { getCurrentUserOrNull, getMentorPortalData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../mentor-portal.module.css";
import { formatDateTime, humanizeSessionType, MentorSidebar, mentorBadgeClass } from "../mentor-layout";

type MentorBookingsPageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function MentorBookingsPage({ params, searchParams }: MentorBookingsPageProps) {
  const { programId } = await params;
  const { status, error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${programId}/bookings`);
  }

  const portal = await getMentorPortalData(supabase, user, programId);

  if (!portal) {
    notFound();
  }

  const pendingRequests = portal.bookingRequests.filter((request) =>
    ["requested", "pending_approval", "draft"].includes(request.status),
  );

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <MentorSidebar current="bookings" programId={programId} portal={portal} />

        <main className={styles.main}>
          <section className={styles.heroCard}>
            <div>
              <div className={styles.eyebrow}>Bookings</div>
              <div className={styles.title}>Approve mentor bookings into real sessions</div>
              <div className={styles.subtitle}>
                Each confirmed booking becomes a real mentor session record with participants attached, so notes,
                status changes, and follow-up all stay inside the program.
              </div>
            </div>
          </section>

          {status || error ? (
            <div className={styles.notice}>
              {error ? "We could not update that booking request." : `Status: ${status?.replaceAll("-", " ")}`}
            </div>
          ) : null}

          <section className={styles.mainCard}>
            <div className={styles.cardTitle}>Pending approvals</div>
            <div className={styles.cardSub}>Review each request before the session is created.</div>
            <div className={styles.stack} style={{ marginTop: 16 }}>
              {pendingRequests.length ? (
                pendingRequests.map((request) => (
                  <div key={request.id} className={styles.miniCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div className={styles.miniTitle}>
                        {request.teamName ?? request.requesterName ?? "Program participant"}
                      </div>
                      <span className={mentorBadgeClass(request.status)}>{request.status.replaceAll("_", " ")}</span>
                    </div>
                    <div className={styles.miniMeta}>
                      {humanizeSessionType(request.sessionType)} · {formatDateTime(request.requestedStartsAt)} to{" "}
                      {formatDateTime(request.requestedEndsAt)}
                    </div>
                    <div className={styles.miniMeta}>
                      {request.sessionGoals ?? "No session goals were attached to this request."}
                    </div>
                    <div className={styles.rowActions} style={{ marginTop: 12 }}>
                      <form action={reviewMentorBookingAction}>
                        <input type="hidden" name="programId" value={programId} />
                        <input type="hidden" name="bookingId" value={request.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <button className={styles.button} type="submit">Approve booking</button>
                      </form>
                      <form action={reviewMentorBookingAction}>
                        <input type="hidden" name="programId" value={programId} />
                        <input type="hidden" name="bookingId" value={request.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <button className={styles.dangerButton} type="submit">Reject</button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  No booking approvals are waiting. Once teams start using the published mentoring flow, requests will land here.
                </div>
              )}
            </div>
          </section>

          <section className={styles.tableCard}>
            <div className={styles.cardTitle}>Confirmed and historical requests</div>
            <div className={styles.table} style={{ marginTop: 16 }}>
              <div className={`${styles.tableRow} ${styles.tableHead}`}>
                <div>Requester</div>
                <div>Format</div>
                <div>Requested time</div>
                <div>Status</div>
                <div>Action</div>
              </div>
              {portal.bookingRequests.length ? (
                portal.bookingRequests.map((request) => (
                  <div key={request.id} className={styles.tableRow}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{request.teamName ?? request.requesterName ?? "Participant"}</div>
                      <div className={styles.listMeta}>{request.sessionGoals ?? "No goals attached"}</div>
                    </div>
                    <div>{humanizeSessionType(request.sessionType)}</div>
                    <div>{formatDateTime(request.requestedStartsAt)}</div>
                    <div><span className={mentorBadgeClass(request.status)}>{request.status.replaceAll("_", " ")}</span></div>
                    <div>
                      {request.status === "confirmed" ? (
                        <Link href={`/mentor/${programId}`} className={styles.ghostButton}>Back to workspace</Link>
                      ) : (
                        <span className={styles.statusText}>Handled above</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No booking records yet.</div>
              )}
            </div>
          </section>
        </main>

        <aside className={styles.panel}>
          <div className={styles.cardTitle}>Flow reminder</div>
          <div className={styles.notice}>
            Approving a booking here creates a real `mentor_sessions` row and attaches team/requester participants.
            That keeps the next screen, session detail, fully live.
          </div>
        </aside>
      </div>
    </div>
  );
}
