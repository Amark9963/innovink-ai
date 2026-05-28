import { notFound, redirect } from "next/navigation";
import {
  createMentorAvailabilitySlotAction,
  toggleMentorAvailabilitySlotAction,
} from "@/app/mentor/[programId]/actions";
import { getCurrentUserOrNull, getMentorPortalData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../mentor-portal.module.css";
import { formatDateTime, humanizeSessionType, MentorSidebar, mentorBadgeClass } from "../mentor-layout";

type MentorAvailabilityPageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function MentorAvailabilityPage({ params, searchParams }: MentorAvailabilityPageProps) {
  const { programId } = await params;
  const { status, error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${programId}/availability`);
  }

  const portal = await getMentorPortalData(supabase, user, programId);

  if (!portal) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <MentorSidebar current="availability" programId={programId} portal={portal} />

        <main className={styles.main}>
          <section className={styles.heroCard}>
            <div>
              <div className={styles.eyebrow}>Availability</div>
              <div className={styles.title}>Publish real mentor slots instead of emailing calendars around</div>
              <div className={styles.subtitle}>
                The booking queue reads these slots directly. Add concrete time windows and Innovink will route
                teams through the governed session workflow.
              </div>
            </div>
          </section>

          <section className={styles.mainCard}>
            <div className={styles.cardTitle}>Add availability slot</div>
            <div className={styles.cardSub}>This first implementation keeps slots simple and explicit so they stay reliable.</div>
            {status || error ? (
              <div className={styles.notice} style={{ marginTop: 14 }}>
                {error ? "We could not update the slot. Check the values and try again." : `Status: ${status?.replaceAll("-", " ")}`}
              </div>
            ) : null}
            <form action={createMentorAvailabilitySlotAction} className={styles.formGrid} style={{ marginTop: 18 }}>
              <input type="hidden" name="programId" value={programId} />
              <div className={styles.field}>
                <label className={styles.label}>Session type</label>
                <select className={styles.select} name="sessionType" defaultValue="one_to_one">
                  <option value="one_to_one">1-on-1</option>
                  <option value="team_office_hour">Team office hour</option>
                  <option value="expert_review">Expert review</option>
                  <option value="pitch_coaching">Pitch coaching</option>
                  <option value="group_clinic">Group clinic</option>
                  <option value="panel_session">Panel session</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Timezone</label>
                <input className={styles.input} name="timezone" defaultValue="UTC" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Start</label>
                <input className={styles.input} type="datetime-local" name="startsAt" required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>End</label>
                <input className={styles.input} type="datetime-local" name="endsAt" required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Capacity</label>
                <input className={styles.input} type="number" min={1} max={50} name="capacity" defaultValue={1} />
              </div>
              <div className={styles.fieldFull}>
                <button className={styles.button} type="submit">Add slot</button>
              </div>
            </form>
          </section>

          <section className={styles.tableCard}>
            <div className={styles.cardTitle}>Published availability</div>
            <div className={styles.cardSub}>Toggle any slot on or off without deleting its history.</div>
            <div className={styles.table} style={{ marginTop: 16 }}>
              <div className={`${styles.tableRow} ${styles.tableHead}`}>
                <div>Slot</div>
                <div>Format</div>
                <div>Capacity</div>
                <div>Status</div>
                <div>Action</div>
              </div>
              {portal.availabilitySlots.length ? (
                portal.availabilitySlots.map((slot) => (
                  <div key={slot.id} className={styles.tableRow}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{formatDateTime(slot.startsAt)}</div>
                      <div className={styles.listMeta}>
                        Ends {formatDateTime(slot.endsAt)} · {slot.timezone}
                      </div>
                    </div>
                    <div>{humanizeSessionType(slot.sessionType)}</div>
                    <div>{slot.capacity}</div>
                    <div>
                      <span className={mentorBadgeClass(slot.isAvailable ? "active" : "paused")}>
                        {slot.isAvailable ? "available" : "hidden"}
                      </span>
                    </div>
                    <div>
                      <form action={toggleMentorAvailabilitySlotAction}>
                        <input type="hidden" name="programId" value={programId} />
                        <input type="hidden" name="slotId" value={slot.id} />
                        <input type="hidden" name="nextState" value={slot.isAvailable ? "false" : "true"} />
                        <button className={styles.ghostButton} type="submit">
                          {slot.isAvailable ? "Hide slot" : "Reopen"}
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  No availability has been published yet. Add the first slot above and the mentor booking flow
                  will have real capacity to work with.
                </div>
              )}
            </div>
          </section>
        </main>

        <aside className={styles.panel}>
          <div className={styles.cardTitle}>Why this matters</div>
          <div className={styles.notice}>
            The participant and PM surfaces only book mentor sessions that come through these slots. This keeps
            the workflow governed and prevents “off-platform” scheduling drift.
          </div>
        </aside>
      </div>
    </div>
  );
}
