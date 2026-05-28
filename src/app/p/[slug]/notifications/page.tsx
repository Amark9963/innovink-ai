import Link from "next/link";
import { redirect } from "next/navigation";
import {
  markAllNotificationsReadAction,
  openNotificationAction,
} from "@/app/p/[slug]/notifications/actions";
import {
  getCurrentUserOrNull,
  getParticipantNotificationsDataBySlug,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./notifications.module.css";

type ParticipantNotificationItem = {
  id: string;
  title: string;
  body: string;
  status: "unread" | "read" | "archived";
  sourceType: string | null;
  actionRequired: boolean;
  deepLink: string | null;
  createdAt: string;
};

type ParticipantNotificationsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    filter?: string;
    error?: string;
    status?: string;
  }>;
};

export default async function ParticipantNotificationsPage({
  params,
  searchParams,
}: ParticipantNotificationsPageProps) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const filter = query.filter ?? "all";
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${slug}/notifications`)}`);
  }

  const notificationsData = await getParticipantNotificationsDataBySlug(
    supabase,
    user,
    slug,
  );

  if (!notificationsData) {
    redirect(`/p/${slug}/dashboard`);
  }

  const unreadCount = notificationsData.notifications.filter((item) => item.status === "unread").length;
  const filteredNotifications = notificationsData.notifications.filter((item) =>
    matchesFilter(item.sourceType, filter),
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.brandMark}>IN</div>
          <div className={styles.brandName}>Innovink</div>
          <div className={styles.headerDivider} />
          <div className={styles.headerProgram}>{notificationsData.program.name}</div>
        </div>

        <div className={styles.headerIdentity}>
          {notificationsData.team ? (
            <div className={styles.teamBadge}>
              <div className={styles.teamAvatar}>
                {getInitials(notificationsData.team.name)}
              </div>
              <div className={styles.teamName}>{notificationsData.team.name}</div>
            </div>
          ) : null}
          <div className={styles.userAvatar}>
            {getInitials(user.user_metadata.full_name ?? user.email ?? "P")}
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>Notifications</div>
            <div className={styles.pageSubtitle}>{unreadCount} unread</div>
          </div>
          <div className={styles.pageActions}>
            <form action={markAllNotificationsReadAction}>
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" className={styles.ghostButton}>
                Mark all read
              </button>
            </form>
            <a
              href={`mailto:support@innovink.ai?subject=${encodeURIComponent(
                `${notificationsData.program.name} notification settings`,
              )}`}
              className={styles.secondaryButton}
            >
              Settings
            </a>
          </div>
        </div>

        {query.status ? <div className={styles.successBanner}>{formatMessage(query.status)}</div> : null}
        {query.error ? <div className={styles.errorBanner}>{formatMessage(query.error)}</div> : null}

        <div className={styles.filterTabs}>
          {[
            { key: "all", label: "All" },
            { key: "program", label: "Program" },
            { key: "team", label: "Team" },
            { key: "mentor", label: "Mentor" },
            { key: "submission", label: "Submission" },
          ].map((tab) => (
            <Link
              key={tab.key}
              href={`/p/${slug}/notifications?filter=${tab.key}`}
              className={`${styles.filterTab} ${filter === tab.key ? styles.filterTabActive : ""}`}
            >
              {tab.label}
              {tab.key === "all" && unreadCount > 0 ? (
                <span className={styles.filterCount}>{unreadCount}</span>
              ) : null}
            </Link>
          ))}
        </div>

        {groupNotificationsByDay(filteredNotifications).map((group) => (
          <section key={group.label} className={styles.groupSection}>
            <div className={styles.groupLabel}>{group.label}</div>
            <div className={styles.groupCard}>
              {group.items.map((item) => {
                const nextPath =
                  item.deepLink && item.deepLink.startsWith("/")
                    ? item.deepLink
                    : `/p/${slug}/notifications?status=notification-read`;

                return (
                  <form key={item.id} action={openNotificationAction} className={styles.notificationRow}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="notificationId" value={item.id} />
                    <input type="hidden" name="nextPath" value={nextPath} />

                    <button type="submit" className={`${styles.notificationButton} ${item.status === "unread" ? styles.notificationUnread : ""}`}>
                      <span className={`${styles.notificationDot} ${item.status === "unread" ? styles.notificationDotUnread : ""}`} />
                      <span className={`${styles.notificationIcon} ${iconClass(item.sourceType)}`}>
                        {iconGlyph(item.sourceType)}
                      </span>
                      <span className={styles.notificationContent}>
                        <span className={styles.notificationTitle}>{item.title}</span>
                        <span className={styles.notificationBody}>{item.body}</span>
                        <span className={styles.notificationMeta}>
                          {item.actionRequired ? "Action available" : "View details"}
                        </span>
                      </span>
                      <span className={styles.notificationTime}>{formatRelative(item.createdAt)}</span>
                    </button>
                  </form>
                );
              })}
            </div>
          </section>
        ))}

        <div className={styles.footerLinks}>
          <a
            href={`mailto:support@innovink.ai?subject=${encodeURIComponent(
              `${notificationsData.program.name} notification preferences`,
            )}`}
          >
            Manage notification preferences
          </a>
          <span>·</span>
          <a
            href={`mailto:support@innovink.ai?subject=${encodeURIComponent(
              `${notificationsData.program.name} unsubscribe request`,
            )}`}
          >
            Unsubscribe from email
          </a>
        </div>
      </div>
    </main>
  );
}

function matchesFilter(sourceType: string | null, filter: string) {
  if (filter === "all") {
    return true;
  }

  const normalized = (sourceType ?? "").toLowerCase();

  if (filter === "program") {
    return /program|announcement|deadline|milestone/.test(normalized);
  }

  if (filter === "team") {
    return /team|invite|member/.test(normalized);
  }

  if (filter === "mentor") {
    return /mentor|session|booking/.test(normalized);
  }

  if (filter === "submission") {
    return /submission|review|score/.test(normalized);
  }

  return true;
}

function groupNotificationsByDay(notifications: ParticipantNotificationItem[]) {
  const groups = new Map<string, ParticipantNotificationItem[]>();

  for (const notification of notifications) {
    const label = relativeDayLabel(notification.createdAt);
    const bucket = groups.get(label) ?? [];
    bucket.push(notification);
    groups.set(label, bucket);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

function relativeDayLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
      86400000,
  );

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return "Earlier this week";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function iconGlyph(sourceType: string | null) {
  const normalized = (sourceType ?? "").toLowerCase();
  if (/mentor|session|booking/.test(normalized)) {
    return "◎";
  }
  if (/submission|score|review/.test(normalized)) {
    return "◆";
  }
  if (/support|message|reply/.test(normalized)) {
    return "◌";
  }
  return "◇";
}

function iconClass(sourceType: string | null) {
  const normalized = (sourceType ?? "").toLowerCase();
  if (/mentor|session|booking/.test(normalized)) {
    return styles.iconMentor;
  }
  if (/submission|score|review/.test(normalized)) {
    return styles.iconSubmission;
  }
  if (/support|message|reply/.test(normalized)) {
    return styles.iconSupport;
  }
  return styles.iconProgram;
}

function formatRelative(value: string) {
  const date = new Date(value);
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
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

function formatMessage(value: string) {
  if (value === "all-read") {
    return "All notifications marked as read.";
  }

  if (value === "notification-read") {
    return "Notification opened.";
  }

  return value.replace(/-/g, " ");
}
