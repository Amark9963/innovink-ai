import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getCurrentUserOrNull,
  getParticipantResultsDataBySlug,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./results.module.css";

type ParticipantResultsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ParticipantResultsPage({
  params,
}: ParticipantResultsPageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${slug}/results`)}`);
  }

  const results = await getParticipantResultsDataBySlug(supabase, user, slug);

  if (!results) {
    redirect(`/p/${slug}/dashboard`);
  }

  const outcome = deriveOutcome(results.registration.status, results.certificates);
  const isPublished = outcome.kind !== "pending";
  const teamLabel =
    results.team?.members.map((member) => member.fullName ?? member.email ?? "Participant").join(", ") ??
    (user.user_metadata.full_name ?? user.email ?? "Participant");
  const latestCertificate = results.certificates[0] ?? null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.brandMark}>IN</div>
          <div className={styles.brandName}>Innovink</div>
          <div className={styles.headerDivider} />
          <div className={styles.headerProgram}>{results.program.name}</div>
        </div>
        <div className={styles.headerIdentity}>
          {isPublished ? <span className={styles.publishedBadge}>Results Published</span> : null}
          <div className={styles.userAvatar}>
            {getInitials(user.user_metadata.full_name ?? user.email ?? "P")}
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.banner}>
          <div className={styles.bannerEmoji}>{outcome.emoji}</div>
          <div className={styles.bannerTitle}>{outcome.title}</div>
          <div className={styles.bannerSubtitle}>
            {results.program.name}
            {results.program.shortDescription ? ` · ${results.program.shortDescription}` : ""}
          </div>

          {isPublished ? (
            <div className={styles.bannerMetrics}>
              <div className={styles.metricBlock}>
                <div className={styles.metricValue}>{outcome.label}</div>
                <div className={styles.metricLabel}>Outcome</div>
              </div>
              <div className={styles.metricDivider} />
              <div className={styles.metricBlock}>
                <div className={styles.metricValue}>
                  {latestCertificate ? formatDate(latestCertificate.issuedAt) : "Published"}
                </div>
                <div className={styles.metricLabel}>Updated</div>
              </div>
              <div className={styles.metricDivider} />
              <div className={styles.metricBlock}>
                <div className={styles.metricValue}>
                  {results.certificates.length > 0 ? results.certificates.length : "—"}
                </div>
                <div className={styles.metricLabel}>Certificates</div>
              </div>
            </div>
          ) : (
            <div className={styles.pendingPanel}>
              <div className={styles.pendingHeading}>Results are not published yet</div>
              <div className={styles.pendingBody}>
                Your submission remains under governed review. When organizers publish outcomes,
                this space will update with your final status, next steps, and certificate access.
              </div>
            </div>
          )}

          <div className={styles.teamChip}>
            {results.team?.name ?? "Participant"} · {teamLabel}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Outcome Summary</div>
          </div>
          <div className={styles.summaryList}>
            <SummaryRow label="Registration status" value={formatStatus(results.registration.status)} />
            <SummaryRow
              label="Submission status"
              value={results.submission ? formatSubmissionStatus(results.submission.status) : "No submission yet"}
            />
            <SummaryRow
              label="Certificates issued"
              value={results.certificates.length > 0 ? `${results.certificates.length}` : "None yet"}
            />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Status Timeline</div>
          </div>
          <div className={styles.timeline}>
            {buildTimeline(results).map((item) => (
              <div key={`${item.title}-${item.timestamp}`} className={styles.timelineItem}>
                <div className={`${styles.timelineDot} ${item.highlight ? styles.timelineDotHighlight : ""}`} />
                <div>
                  <div className={styles.timelineTitle}>{item.title}</div>
                  <div className={styles.timelineMeta}>
                    {item.timestamp ? formatDateTime(item.timestamp) : "Awaiting update"}
                  </div>
                  {item.body ? <div className={styles.timelineBody}>{item.body}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Recognition & Documents</div>
          </div>
          {results.certificates.length > 0 ? (
            <div className={styles.certificateList}>
              {results.certificates.map((certificate) => (
                <div key={certificate.id} className={styles.certificateCard}>
                  <div>
                    <div className={styles.certificateTitle}>{certificate.title}</div>
                    <div className={styles.certificateMeta}>
                      {formatCertificateType(certificate.certificateType)} · issued {formatDate(certificate.issuedAt)}
                    </div>
                    {certificate.verificationCode ? (
                      <div className={styles.certificateVerification}>
                        Verification: {certificate.verificationCode}
                      </div>
                    ) : null}
                  </div>
                  {certificate.filePath ? (
                    <div className={styles.certificateActionMuted}>
                      Certificate file available in secure storage
                    </div>
                  ) : (
                    <a
                      href={`mailto:support@innovink.ai?subject=${encodeURIComponent(
                        `${results.program.name} certificate request`,
                      )}`}
                      className={styles.secondaryButton}
                    >
                      Request Certificate Copy
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              Certificates and formal recognition will appear here once they are issued by the
              program team.
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.nextStepsCard}`}>
          <div className={styles.cardTitle}>Next Steps</div>
          <div className={styles.nextStepsBody}>{outcome.nextSteps}</div>
          <div className={styles.nextActions}>
            {outcome.kind === "finalist" || outcome.kind === "winner" ? (
              <a
                href={`mailto:support@innovink.ai?subject=${encodeURIComponent(
                  `${results.program.name} finalist follow-up`,
                )}`}
                className={styles.primaryButton}
              >
                Confirm Follow-up
              </a>
            ) : (
              <Link href={`/p/${slug}/dashboard`} className={styles.primaryButton}>
                Return to Dashboard
              </Link>
            )}
            {latestCertificate ? (
              <a
                href={`mailto:support@innovink.ai?subject=${encodeURIComponent(
                  `${results.program.name} certificate delivery`,
                )}`}
                className={styles.secondaryButton}
              >
                Download Certificate
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function buildTimeline(results: NonNullable<Awaited<ReturnType<typeof getParticipantResultsDataBySlug>>>) {
  const items: Array<{
    title: string;
    timestamp: string | null;
    body: string | null;
    highlight?: boolean;
  }> = [];

  if (results.submission) {
    items.push({
      title: `Submission ${formatSubmissionStatus(results.submission.status)}`,
      timestamp: results.submission.updatedAt,
      body: `Your project package reached ${formatSubmissionStatus(results.submission.status).toLowerCase()}.`,
    });
  }

  for (const entry of results.participantStatusHistory.slice(0, 3)) {
    items.push({
      title: `Participant status updated to ${formatStatus(entry.newStatus)}`,
      timestamp: entry.createdAt,
      body: entry.changeReason,
      highlight: entry.newStatus === "finalist" || entry.newStatus === "winner",
    });
  }

  for (const certificate of results.certificates.slice(0, 2)) {
    items.push({
      title: `${formatCertificateType(certificate.certificateType)} certificate issued`,
      timestamp: certificate.issuedAt,
      body: certificate.title,
      highlight: true,
    });
  }

  return items.sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0;
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0;
    return rightTime - leftTime;
  });
}

function deriveOutcome(
  status: string,
  certificates: Array<{ certificateType: string }>,
) {
  const certificateTypes = new Set(certificates.map((item) => item.certificateType));

  if (status === "winner" || certificateTypes.has("winner")) {
    return {
      kind: "winner",
      emoji: "🏆",
      title: "Winning Team",
      subtitle: "Congratulations on your final result.",
      label: "Winner",
      nextSteps:
        "Your team has been selected as a winning outcome. Follow up with the organizer team for ceremony, reporting, and any post-program recognition logistics.",
    };
  }

  if (status === "finalist" || certificateTypes.has("finalist")) {
    return {
      kind: "finalist",
      emoji: "⭐",
      title: "Finalist",
      subtitle: "Your team advanced into the published finalist set.",
      label: "Finalist",
      nextSteps:
        "Your team has advanced into the finalist stage. Watch for organizer communication about demo day, presentation details, and any follow-up materials needed.",
    };
  }

  if (status === "rejected") {
    return {
      kind: "reviewed",
      emoji: "✓",
      title: "Review Complete",
      subtitle: "The program review cycle has concluded for this submission.",
      label: "Reviewed",
      nextSteps:
        "Your submission has completed the review cycle. Check your notifications for any follow-up guidance, recognition, or future program opportunities.",
    };
  }

  return {
    kind: "pending",
    emoji: "⏳",
    title: "Results Pending",
    subtitle: "Judging and outcome publication are still in progress.",
    label: "Pending",
    nextSteps:
      "Stay ready for a program update. Organizers will publish outcomes and notify participants once the review cycle is complete.",
  };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryRow}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{value}</div>
    </div>
  );
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatSubmissionStatus(value: string) {
  return value.replaceAll("_", " ");
}

function formatCertificateType(value: string) {
  return value.replaceAll("_", " ");
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
