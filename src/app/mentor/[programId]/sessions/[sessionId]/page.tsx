import { notFound, redirect } from "next/navigation";
import { addMentorSessionNoteAction, completeMentorSessionAction } from "@/app/mentor/[programId]/actions";
import { getCurrentUserOrNull, getMentorSessionDetailData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../../mentor-portal.module.css";
import { formatDateTime, humanizeSessionType, MentorSidebar, mentorBadgeClass } from "../../mentor-layout";

type MentorSessionDetailPageProps = {
  params: Promise<{ programId: string; sessionId: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
};

export default async function MentorSessionDetailPage({ params, searchParams }: MentorSessionDetailPageProps) {
  const { programId, sessionId } = await params;
  const { status, error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${programId}/sessions/${sessionId}`);
  }

  const detail = await getMentorSessionDetailData(supabase, user, programId, sessionId);

  if (!detail) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <MentorSidebar current="workspace" programId={programId} portal={detail.portal} />

        <main className={styles.main}>
          <section className={styles.heroCard}>
            <div>
              <div className={styles.eyebrow}>Session Detail</div>
              <div className={styles.title}>{humanizeSessionType(detail.session.sessionType)}</div>
              <div className={styles.subtitle}>
                {formatDateTime(detail.session.startsAt)} · {detail.session.timezone} · Teams:{" "}
                {detail.session.teamNames.join(", ") || "TBA"}
              </div>
            </div>
            <div className={styles.heroActions}>
              <span className={mentorBadgeClass(detail.session.status)}>
                {detail.session.status.replaceAll("_", " ")}
              </span>
              {detail.session.status !== "completed" ? (
                <form action={completeMentorSessionAction}>
                  <input type="hidden" name="programId" value={programId} />
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <button className={styles.button} type="submit">Mark completed</button>
                </form>
              ) : null}
            </div>
          </section>

          {status || error ? (
            <div className={styles.notice}>
              {error ? "We could not update the session." : `Status: ${status?.replaceAll("-", " ")}`}
            </div>
          ) : null}

          <section className={styles.gridTwo}>
            <div className={styles.mainCard}>
              <div className={styles.cardTitle}>Session context</div>
              <div className={styles.stack} style={{ marginTop: 14 }}>
                <div className={styles.miniCard}>
                  <div className={styles.miniTitle}>Participants</div>
                  <div className={styles.miniMeta}>
                    {detail.session.participantNames.join(", ") || "No named participants attached yet."}
                  </div>
                </div>
                <div className={styles.miniCard}>
                  <div className={styles.miniTitle}>Teams</div>
                  <div className={styles.miniMeta}>
                    {detail.session.teamNames.join(", ") || "No team linked to this session."}
                  </div>
                </div>
                <div className={styles.miniCard}>
                  <div className={styles.miniTitle}>Structured context</div>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.65,
                      color: "#9fb0c4",
                      fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
                    }}
                  >
                    {JSON.stringify(detail.session.sessionContext ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className={styles.mainCard}>
              <div className={styles.cardTitle}>Add session note</div>
              <div className={styles.cardSub}>Notes persist to the real mentoring tables and can stay private or be shared.</div>
              <form action={addMentorSessionNoteAction} className={styles.formGrid} style={{ marginTop: 16 }}>
                <input type="hidden" name="programId" value={programId} />
                <input type="hidden" name="sessionId" value={sessionId} />
                <div className={styles.field}>
                  <label className={styles.label}>Note type</label>
                  <input className={styles.input} name="noteType" defaultValue="session_summary" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Visibility</label>
                  <select className={styles.select} name="visibility" defaultValue="shared_with_pm">
                    <option value="private_mentor">Private mentor</option>
                    <option value="shared_with_pm">Shared with PM</option>
                    <option value="shared_with_participant">Shared with participant</option>
                  </select>
                </div>
                <div className={styles.fieldFull}>
                  <label className={styles.label}>Note</label>
                  <textarea className={styles.textarea} name="content" required />
                </div>
                <div className={styles.fieldFull}>
                  <button className={styles.button} type="submit">Save note</button>
                </div>
              </form>
            </div>
          </section>

          <section className={styles.mainCard}>
            <div className={styles.cardTitle}>Session notes</div>
            <div className={styles.stack} style={{ marginTop: 14 }}>
              {detail.session.notes.length ? (
                detail.session.notes.map((note) => (
                  <div key={note.id} className={styles.sessionNote}>
                    <div className={styles.sessionNoteMeta}>
                      {note.authorName ?? "Mentor"} · {note.noteType} · {note.visibility.replaceAll("_", " ")} ·{" "}
                      {formatDateTime(note.createdAt)}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.7 }}>{note.content}</div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No notes yet for this session.</div>
              )}
            </div>
          </section>
        </main>

        <aside className={styles.panel}>
          <div className={styles.cardTitle}>Session summary</div>
          <div className={styles.asideStat}>
            <span>Status</span>
            <strong>{detail.session.status.replaceAll("_", " ")}</strong>
          </div>
          <div className={styles.asideStat}>
            <span>Participants</span>
            <strong>{detail.session.participantNames.length}</strong>
          </div>
          <div className={styles.asideStat}>
            <span>Notes logged</span>
            <strong>{detail.session.notes.length}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
