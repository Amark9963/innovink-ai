import Link from "next/link";
import styles from "./mentor-portal.module.css";
import type { MentorPortalData } from "@/lib/supabase/queries";

type MentorSidebarProps = {
  programId: string;
  current: "workspace" | "onboarding" | "availability" | "bookings";
  portal: MentorPortalData;
};

export function MentorSidebar({ programId, current, portal }: MentorSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.navLabel}>Mentor Portal</div>
        <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700 }}>{portal.program.name}</div>
        <div className={styles.cardSub}>
          {portal.profile.displayName}
          {portal.profile.organizationName ? ` · ${portal.profile.organizationName}` : ""}
        </div>
      </div>

      <nav className={styles.nav}>
        <Link
          href={`/mentor/${programId}`}
          className={current === "workspace" ? styles.navLinkActive : styles.navLink}
        >
          <span>Workspace</span>
          <span className={styles.statusText}>{portal.stats.upcomingSessions}</span>
        </Link>
        <Link
          href={`/mentor/${programId}/onboarding`}
          className={current === "onboarding" ? styles.navLinkActive : styles.navLink}
        >
          <span>Profile</span>
          <span className={styles.statusText}>{portal.profile.expertiseTags.length}</span>
        </Link>
        <Link
          href={`/mentor/${programId}/availability`}
          className={current === "availability" ? styles.navLinkActive : styles.navLink}
        >
          <span>Availability</span>
          <span className={styles.statusText}>{portal.stats.availabilitySlots}</span>
        </Link>
        <Link
          href={`/mentor/${programId}/bookings`}
          className={current === "bookings" ? styles.navLinkActive : styles.navLink}
        >
          <span>Bookings</span>
          <span className={styles.statusText}>{portal.stats.pendingBookings}</span>
        </Link>
      </nav>

      <div className={styles.notice}>
        Innovink keeps mentor operations governed. Profile, availability, bookings, and notes stay tied
        to the real mentoring workflow instead of a side spreadsheet.
      </div>
    </aside>
  );
}

export function mentorBadgeClass(status: string) {
  if (["active", "confirmed", "completed", "approved", "booked"].includes(status)) {
    return styles.pillSuccess;
  }

  if (["invited", "pending_approval", "requested", "suggested", "draft"].includes(status)) {
    return styles.pillWarn;
  }

  if (["rejected", "cancelled", "expired", "archived", "paused", "no_show"].includes(status)) {
    return styles.pillDanger;
  }

  return styles.pill;
}

export function formatDateTime(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function humanizeSessionType(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
