import { notFound, redirect } from "next/navigation";
import { saveMentorOnboardingAction } from "@/app/mentor/[programId]/actions";
import { getCurrentUserOrNull, getMentorPortalData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "../mentor-portal.module.css";
import { MentorSidebar } from "../mentor-layout";

type MentorOnboardingPageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function MentorOnboardingPage({ params, searchParams }: MentorOnboardingPageProps) {
  const { programId } = await params;
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${programId}/onboarding`);
  }

  const portal = await getMentorPortalData(supabase, user, programId);

  if (!portal) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <MentorSidebar current="onboarding" programId={programId} portal={portal} />

        <main className={styles.main}>
          <section className={styles.heroCard}>
            <div>
              <div className={styles.eyebrow}>Mentor Onboarding</div>
              <div className={styles.title}>Build the mentor profile teams and PMs will trust</div>
              <div className={styles.subtitle}>
                This profile drives matchmaking, booking quality, and session readiness. Keep it specific so
                Innovink routes the right teams into your availability.
              </div>
            </div>
          </section>

          <section className={styles.mainCard}>
            <div className={styles.cardTitle}>Expertise & mentor profile</div>
            <div className={styles.cardSub}>A focused profile produces cleaner team matching and better session requests.</div>
            {error ? (
              <div className={styles.notice} style={{ marginTop: 14 }}>
                We could not save the profile. Check the required fields and try again.
              </div>
            ) : null}
            <form action={saveMentorOnboardingAction} className={styles.formGrid} style={{ marginTop: 18 }}>
              <input type="hidden" name="programId" value={programId} />

              <div className={styles.field}>
                <label className={styles.label}>Display name</label>
                <input className={styles.input} name="displayName" defaultValue={portal.profile.displayName} required />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Role / title</label>
                <input className={styles.input} name="title" defaultValue={portal.profile.title ?? ""} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Organization</label>
                <input className={styles.input} name="organizationName" defaultValue={portal.profile.organizationName ?? ""} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Max mentoring load</label>
                <input
                  className={styles.input}
                  name="maxMentoringLoad"
                  type="number"
                  min={1}
                  defaultValue={portal.profile.maxMentoringLoad ?? portal.membership.maxSessions ?? 6}
                />
              </div>
              <div className={styles.fieldFull}>
                <label className={styles.label}>Bio</label>
                <textarea className={styles.textarea} name="bio" defaultValue={portal.profile.bio ?? ""} />
              </div>
              <div className={styles.fieldFull}>
                <label className={styles.label}>Expertise tags</label>
                <input
                  className={styles.input}
                  name="expertiseTags"
                  defaultValue={portal.profile.expertiseTags.join(", ")}
                  placeholder="AI, climate tech, enterprise SaaS, hardware, venture scale-up"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Stage preferences</label>
                <input
                  className={styles.input}
                  name="stagePreferences"
                  defaultValue={portal.profile.stagePreferences.join(", ")}
                  placeholder="ideation, MVP, pilot, go-to-market"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Session formats</label>
                <input
                  className={styles.input}
                  name="sessionFormatPreferences"
                  defaultValue={portal.profile.sessionFormatPreferences.join(", ")}
                  placeholder="1:1, office hours, pitch coaching"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Languages</label>
                <input className={styles.input} name="languages" defaultValue={portal.profile.languages.join(", ")} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Regions</label>
                <input className={styles.input} name="regions" defaultValue={portal.profile.regions.join(", ")} />
              </div>

              <div className={styles.fieldFull}>
                <div className={styles.rowActions}>
                  <button className={styles.button} type="submit">Save mentor profile</button>
                </div>
              </div>
            </form>
          </section>
        </main>

        <aside className={styles.panel}>
          <div className={styles.cardTitle}>Profile checklist</div>
          <div className={styles.panelList}>
            <div className={styles.asideStat}>
              <span>Expertise tags</span>
              <strong>{portal.profile.expertiseTags.length}</strong>
            </div>
            <div className={styles.asideStat}>
              <span>Stage preferences</span>
              <strong>{portal.profile.stagePreferences.length}</strong>
            </div>
            <div className={styles.asideStat}>
              <span>Languages</span>
              <strong>{portal.profile.languages.length}</strong>
            </div>
          </div>
          <div className={styles.notice}>
            Mockup-wise this is the “mentor profile” moment, but it is backed by the real
            `mentor_profiles`, `mentor_expertise_tags`, and `mentor_program_memberships` tables.
          </div>
        </aside>
      </div>
    </div>
  );
}
