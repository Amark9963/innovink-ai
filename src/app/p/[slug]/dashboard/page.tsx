import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserOrNull, getParticipantDashboardDataBySlug } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./participant-dashboard.module.css";

type ParticipantDashboardPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    status?: string;
  }>;
};

export default async function ParticipantDashboardPage({
  params,
  searchParams,
}: ParticipantDashboardPageProps) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${slug}/dashboard`)}`);
  }

  const dashboard = await getParticipantDashboardDataBySlug(supabase, user, slug);

  if (!dashboard) {
    redirect(`/p/${slug}`);
  }

  if (!dashboard.registration) {
    redirect(`/p/${slug}/register`);
  }

  const initials = getInitials(user.user_metadata.full_name ?? user.email ?? "Participant");
  const teamInitials = getInitials(dashboard.team?.name ?? dashboard.program.name);
  const timeline = buildTimeline(dashboard.program);
  const currentPhaseIndex = dashboard.submission?.status === "submitted" ? 3 : 2;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrandRow}>
          <div className={styles.brandMark}>IN</div>
          <div className={styles.brandName}>Innovink</div>
          <div className={styles.headerDivider} />
          <div className={styles.headerProgram}>{dashboard.program.name}</div>
        </div>

        <div className={styles.headerIdentity}>
          <div className={styles.teamChip}>
            <div className={styles.teamChipAvatar}>{teamInitials}</div>
            <div className={styles.teamChipLabel}>{dashboard.team?.name ?? "Unassigned team"}</div>
          </div>
          <div className={styles.userAvatar}>{initials}</div>
        </div>
      </header>

      <div className={styles.content}>
        {query.status ? <div className={styles.statusBanner}>{formatStatus(query.status)}</div> : null}

        <section className={styles.timelineCard}>
          <div className={styles.sectionEyebrow}>Program Timeline</div>
          <div className={styles.timelineSteps}>
            {timeline.map((step, index) => {
              const state =
                index < currentPhaseIndex ? "done" : index === currentPhaseIndex ? "active" : "future";
              return (
                <div key={step.label} className={styles.phaseStep}>
                  <div
                    className={`${styles.phaseDot} ${
                      state === "done"
                        ? styles.phaseDotDone
                        : state === "active"
                          ? styles.phaseDotActive
                          : ""
                    }`}
                  >
                    {state === "done" ? "✓" : index + 1}
                  </div>
                  <div
                    className={`${styles.phaseLabel} ${
                      state === "done"
                        ? styles.phaseLabelDone
                        : state === "active"
                          ? styles.phaseLabelActive
                          : styles.phaseLabelMuted
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className={styles.phaseDate}>{step.dateLabel}</div>
                </div>
              );
            })}
          </div>
        </section>

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.cardTitle}>{dashboard.team?.name ?? "Your Team"}</div>
                <div className={styles.cardSub}>
                  {dashboard.team
                    ? `${dashboard.team.members.length} members · registration ${dashboard.registration.status}`
                    : "Your registration is active"}
                </div>
              </div>
              <span className={styles.activeBadge}>Active</span>
            </div>

            {dashboard.team ? (
              <div className={styles.memberWrap}>
                {dashboard.team.members.map((member) => (
                  <div key={member.userId} className={styles.memberChip}>
                    <div className={styles.memberAvatar}>{getInitials(member.fullName ?? member.email ?? "U")}</div>
                    <div>
                      <div className={styles.memberName}>{member.fullName ?? member.email ?? "Participant"}</div>
                      <div className={styles.memberRole}>{member.isLead ? "Team Lead" : "Member"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyText}>
                Your registration exists, but a team has not been attached yet.
              </div>
            )}
          </section>

          <section className={`${styles.card} ${styles.submissionCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Submission Status</div>
              <span className={styles.progressBadge}>
                {dashboard.submission?.status.replaceAll("_", " ") ?? "Not started"}
              </span>
            </div>

            <div className={styles.progressMeta}>
              <span>Completion</span>
              <strong>{dashboard.submission?.completionPercent ?? 0}%</strong>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${dashboard.submission?.completionPercent ?? 0}%` }}
              />
            </div>

            <div className={styles.deadlineNote}>
              Deadline: {formatDate(dashboard.program.submissionClosesAt) ?? "TBD"}
            </div>

            <Link href={`/p/${slug}/submit`} className={styles.primaryButton}>
              {dashboard.submission?.status === "submitted" ? "Review Submission" : "Continue Submission →"}
            </Link>
          </section>
        </div>

        <section className={styles.resourcesBlock}>
          <div className={styles.resourcesTitle}>Resources</div>
          <div className={styles.resourceGrid}>
            <Link href={`/p/${slug}/team`} className={styles.resourceCard}>
              <div className={styles.resourceIcon}>◈</div>
              <div className={styles.resourceCardTitle}>Team Management</div>
              <div className={styles.resourceCardBody}>Manage members, invites, and team settings</div>
              <div className={styles.resourceAction}>Open team workspace</div>
            </Link>
            <Link href={`/p/${slug}#faq`} className={styles.resourceCard}>
              <div className={styles.resourceIcon}>◎</div>
              <div className={styles.resourceCardTitle}>Program Guide</div>
              <div className={styles.resourceCardBody}>Rules, eligibility, and FAQ</div>
              <div className={styles.resourceAction}>Open guide</div>
            </Link>
            <Link href={`/p/${slug}/submit`} className={styles.resourceCard}>
              <div className={styles.resourceIcon}>◆</div>
              <div className={styles.resourceCardTitle}>Submission Workspace</div>
              <div className={styles.resourceCardBody}>Continue building your project package</div>
              <div className={styles.resourceAction}>Open workspace</div>
            </Link>
            <Link href={`/p/${slug}/notifications`} className={styles.resourceCard}>
              <div className={styles.resourceIcon}>◌</div>
              <div className={styles.resourceCardTitle}>Notifications</div>
              <div className={styles.resourceCardBody}>Track program updates, mentor sessions, and submission alerts</div>
              <div className={styles.resourceAction}>Open inbox</div>
            </Link>
            <Link href={`/p/${slug}/results`} className={styles.resourceCard}>
              <div className={styles.resourceIcon}>★</div>
              <div className={styles.resourceCardTitle}>Results & Status</div>
              <div className={styles.resourceCardBody}>View participant outcome, certificates, and published next steps</div>
              <div className={styles.resourceAction}>Open results view</div>
            </Link>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Upcoming</div>
          </div>
          <div className={styles.timelineList}>
            {buildUpcomingItems(dashboard).map((item) => (
              <div key={`${item.title}-${item.meta}`} className={styles.timelineItem}>
                <div className={`${styles.timelineMarker} ${item.active ? styles.timelineMarkerActive : styles.timelineMarkerUpcoming}`} />
                <div>
                  <div className={styles.timelineItemTitle}>{item.title}</div>
                  <div className={styles.timelineItemMeta}>{item.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function buildTimeline(program: {
  registrationClosesAt: string | null;
  startsAt: string | null;
  submissionClosesAt: string | null;
  endsAt: string | null;
}) {
  return [
    { label: "Registration", dateLabel: formatDate(program.registrationClosesAt) ?? "Open" },
    { label: "Team Formation", dateLabel: formatDate(program.startsAt) ?? "Next" },
    { label: "Hacking Phase", dateLabel: formatDate(program.startsAt) ?? "Active" },
    { label: "Demo Day", dateLabel: formatDate(program.endsAt) ?? "TBD" },
    { label: "Results", dateLabel: formatDate(program.endsAt) ?? "TBD" },
  ];
}

function buildUpcomingItems(dashboard: Awaited<ReturnType<typeof getParticipantDashboardDataBySlug>>) {
  const base = [];

  if (dashboard?.mentorSessions.length) {
    base.push(
      ...dashboard.mentorSessions.map((session, index) => ({
        title: session.title.replaceAll("_", " "),
        meta: `${formatDateTime(session.startsAt)} · ${session.status.replaceAll("_", " ")}`,
        active: index === 0,
      })),
    );
  }

  base.push({
    title: "Submission deadline",
    meta: formatDate(dashboard?.program.submissionClosesAt ?? null) ?? "TBD",
    active: base.length === 0,
  });

  return base.slice(0, 3);
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(value: string) {
  if (value === "registered") {
    return "Registration complete. Your participant dashboard is ready.";
  }

  return value.replace(/-/g, " ");
}
