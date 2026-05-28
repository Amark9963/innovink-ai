import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerParticipantAction } from "@/app/p/[slug]/register/actions";
import { getCurrentUserOrNull, getPublicRegistrationPageBySlug, type ProgramFormFieldSummary } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./register.module.css";

type RegistrationPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function ParticipantRegistrationPage({
  params,
  searchParams,
}: RegistrationPageProps) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${slug}/register`)}`);
  }

  const registrationPage = await getPublicRegistrationPageBySlug(supabase, slug);

  if (!registrationPage) {
    redirect(`/p/${slug}`);
  }

  const { data: existingRegistration } = await supabase
    .from("program_registrations")
    .select("id")
    .eq("program_id", registrationPage.program.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const grouped = groupRegistrationFields(registrationPage.fields);
  const title = registrationPage.landingPage.title ?? registrationPage.program.name;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div>
            <div className={styles.sidebarBrand}>INNOVINK</div>
            <div className={styles.sidebarRule} />
            <div className={styles.sidebarTitle}>{title}</div>
            <div className={styles.sidebarSubtitle}>
              {registrationPage.landingPage.seoDescription ??
                registrationPage.program.shortDescription ??
                "Secure your place in the published participant flow."}
            </div>
          </div>

          <div className={styles.stepIndicator}>
            <div className={`${styles.stepDot} ${styles.stepDotActive}`}>1</div>
            <div className={styles.stepLine} />
            <div className={styles.stepDot}>2</div>
            <div className={styles.stepLine} />
            <div className={styles.stepDot}>3</div>
          </div>
          <div className={styles.stepLabels}>
            <span className={styles.stepLabelActive}>Team Info</span>
            <span className={styles.stepLabelMuted}>Members</span>
            <span className={styles.stepLabelMuted}>Confirm</span>
          </div>

          <div className={styles.benefitsBlock}>
            <div className={styles.benefitsEyebrow}>What you get</div>
            {buildBenefits(registrationPage.program.name).map((benefit) => (
              <div key={benefit.title} className={styles.benefitRow}>
                <div className={styles.benefitIcon}>{benefit.icon}</div>
                <div>
                  <div className={styles.benefitTitle}>{benefit.title}</div>
                  <div className={styles.benefitBody}>{benefit.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarSecurity}>256-bit TLS · SOC 2 Type II</div>
            <div className={styles.sidebarFooterText}>
              Powered by <span className={styles.sidebarFooterBrand}>Innovink</span>
            </div>
          </div>
        </aside>

        <section className={styles.main}>
          <div className={styles.mainInner}>
            <div className={styles.mainHeader}>
              <div className={styles.mainTitle}>Register Your Team</div>
              <div className={styles.mainSubtitle}>Step 1 of 3 · Team information</div>
            </div>

            {query.error ? (
              <div className={styles.errorBanner}>{formatStatusMessage(query.error)}</div>
            ) : null}

            {query.status ? (
              <div className={styles.successBanner}>{formatStatusMessage(query.status)}</div>
            ) : null}

            {existingRegistration ? (
              <div className={styles.infoCard}>
                <div className={styles.infoCardTitle}>You are already registered</div>
                <div className={styles.infoCardBody}>
                  Your participant record already exists for this program. The next participant
                  screens will build on that live registration rather than creating a duplicate.
                </div>
                <div className={styles.actions}>
                  <Link href={`/p/${slug}`} className={styles.ghostButton}>
                    ← Back to program page
                  </Link>
                </div>
              </div>
            ) : !registrationPage.registrationForm ? (
              <div className={styles.infoCard}>
                <div className={styles.infoCardTitle}>Registration is not open yet</div>
                <div className={styles.infoCardBody}>
                  This published program does not have an active registration form at the moment.
                </div>
                <div className={styles.actions}>
                  <Link href={`/p/${slug}`} className={styles.ghostButton}>
                    ← Back to program page
                  </Link>
                </div>
              </div>
            ) : (
              <form action={registerParticipantAction}>
                <input type="hidden" name="slug" value={slug} />

                {grouped.core.length > 0 ? (
                  <FieldCard title="Team Information">
                    {grouped.core.map((field) => (
                      <div key={field.id} className={styles.fieldBlock}>
                        <FieldRenderer field={field} />
                      </div>
                    ))}
                  </FieldCard>
                ) : null}

                {grouped.track ? (
                  <FieldCard title={grouped.track.label}>
                    <FieldRenderer field={grouped.track} />
                  </FieldCard>
                ) : null}

                {grouped.additional.length > 0 ? (
                  <FieldCard title="Additional Background" subtle>
                    {grouped.additional.map((field) => (
                      <div key={field.id} className={styles.fieldBlock}>
                        <FieldRenderer field={field} />
                      </div>
                    ))}
                  </FieldCard>
                ) : null}

                <div className={styles.actions}>
                  <Link href={`/p/${slug}`} className={styles.ghostButton}>
                    ← Back
                  </Link>
                  <button type="submit" className={styles.primaryButton}>
                    Complete Registration →
                  </button>
                </div>

                <div className={styles.footerNote}>
                  Already registered? Return to the program page and continue from the active
                  participant journey.
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function FieldCard({
  title,
  subtle,
  children,
}: {
  title: string;
  subtle?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={subtle ? styles.cardSubtle : styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      {children}
    </div>
  );
}

function FieldRenderer({ field }: { field: ProgramFormFieldSummary }) {
  const inputName = `field:${field.fieldKey}`;

  if (field.fieldType === "single_choice" || field.fieldType === "dropdown") {
    const isTrackStyle = /track|challenge|focus/i.test(`${field.fieldKey} ${field.label}`);

    if (isTrackStyle && field.choices.length > 0) {
      return (
        <div>
          <FieldLabel field={field} />
          <div className={styles.trackList}>
            {field.choices.map((choice, index) => (
              <label key={choice.id} className={styles.trackOption}>
                <input
                  type="radio"
                  name={inputName}
                  value={choice.value}
                  defaultChecked={index === 0}
                  className={styles.hiddenChoice}
                />
                <span className={styles.trackRadio} />
                <span>
                  <span className={styles.trackTitle}>{choice.label}</span>
                  <span className={styles.trackBody}>{choice.value}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        <FieldLabel field={field} />
        <select name={inputName} required={field.isRequired} className={styles.select}>
          <option value="">Select</option>
          {field.choices.map((choice) => (
            <option key={choice.id} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
        {field.helpText ? <div className={styles.helpText}>{field.helpText}</div> : null}
      </div>
    );
  }

  if (field.fieldType === "multiple_choice") {
    return (
      <div>
        <FieldLabel field={field} />
        <div className={styles.checkboxList}>
          {field.choices.map((choice) => (
            <label key={choice.id} className={styles.checkboxRow}>
              <input type="checkbox" name={inputName} value={choice.value} />
              <span>{choice.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.fieldType === "long_text") {
    return (
      <div>
        <FieldLabel field={field} />
        <textarea
          name={inputName}
          required={field.isRequired}
          placeholder={field.placeholder ?? "Add context"}
          className={styles.textarea}
        />
        {field.helpText ? <div className={styles.helpText}>{field.helpText}</div> : null}
      </div>
    );
  }

  if (field.fieldType === "consent_checkbox") {
    return (
      <label className={styles.checkboxRow}>
        <input type="checkbox" name={inputName} value="true" required={field.isRequired} />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.fieldType === "section_header") {
    return <div className={styles.inlineSectionHeader}>{field.label}</div>;
  }

  const inputType =
    field.fieldType === "email"
      ? "email"
      : field.fieldType === "phone"
        ? "tel"
        : field.fieldType === "url" || field.fieldType === "video_link"
          ? "url"
          : field.fieldType === "number"
            ? "number"
            : field.fieldType === "date"
              ? "date"
              : "text";

  return (
    <div>
      <FieldLabel field={field} />
      <input
        type={inputType}
        name={inputName}
        required={field.isRequired}
        placeholder={field.placeholder ?? ""}
        className={styles.input}
      />
      {field.helpText ? <div className={styles.helpText}>{field.helpText}</div> : null}
    </div>
  );
}

function FieldLabel({ field }: { field: ProgramFormFieldSummary }) {
  return (
    <label className={styles.label}>
      {field.label}
      {field.isRequired ? <span className={styles.required}>*</span> : null}
    </label>
  );
}

function groupRegistrationFields(fields: ProgramFormFieldSummary[]) {
  const track = fields.find((field) =>
    /track|challenge|focus/i.test(`${field.fieldKey} ${field.label}`),
  );

  const core = fields.filter((field) => {
    if (track && field.id === track.id) {
      return false;
    }

    return /team|lead|name|email|department|office|location|size/i.test(
      `${field.fieldKey} ${field.label}`,
    );
  });

  const additional = fields.filter(
    (field) => !core.some((coreField) => coreField.id === field.id) && (!track || field.id !== track.id),
  );

  return { core, track: track ?? null, additional };
}

function buildBenefits(programName: string) {
  return [
    {
      icon: "◆",
      title: "Governed participant flow",
      body: `Registration, submission, and judging for ${programName} stay coordinated in one platform.`,
    },
    {
      icon: "◎",
      title: "Mentor-ready operations",
      body: "The PM workspace can attach mentoring, communications, and live support around your team journey.",
    },
    {
      icon: "◌",
      title: "Human-reviewed outcomes",
      body: "Program decisions, scoring, and final reporting remain governed even when AI assists operators.",
    },
    {
      icon: "◇",
      title: "Enterprise-grade trust",
      body: "Participant data, access, and workflow transitions stay protected by platform controls and auditability.",
    },
  ];
}

function formatStatusMessage(value: string) {
  if (value === "registered") {
    return "Registration complete. Your participant record and team shell have been created.";
  }

  if (value === "already-registered") {
    return "You already have an active registration for this program.";
  }

  return value.replace(/-/g, " ");
}
