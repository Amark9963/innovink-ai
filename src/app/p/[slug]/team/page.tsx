import Link from "next/link";
import { redirect } from "next/navigation";
import {
  inviteTeamMemberAction,
  makeTeamLeadAction,
  resendTeamInviteAction,
  revokeTeamInviteAction,
  updateTeamSettingsAction,
} from "@/app/p/[slug]/team/actions";
import {
  getCurrentUserOrNull,
  getParticipantTeamManagementDataBySlug,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import styles from "./team-management.module.css";

type TeamManagementPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    member?: string;
    error?: string;
    status?: string;
  }>;
};

export default async function ParticipantTeamManagementPage({
  params,
  searchParams,
}: TeamManagementPageProps) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${slug}/team`)}`);
  }

  const teamData = await getParticipantTeamManagementDataBySlug(supabase, user, slug);

  if (!teamData) {
    redirect(`/p/${slug}/dashboard`);
  }

  const selectedMember =
    teamData.team.members.find((member) => member.userId === query.member) ?? null;
  const pendingInvites = teamData.pendingInvites.filter((invite) => invite.status === "pending");
  const availableSpots = Math.max(
    0,
    6 - teamData.team.members.length - pendingInvites.length,
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <div className={styles.brandMark}>IN</div>
          <div className={styles.brandName}>Innovink</div>
          <div className={styles.headerDivider} />
          <div className={styles.headerProgram}>{teamData.program.name}</div>
          <div className={styles.headerChevron}>›</div>
          <div className={styles.headerTeam}>{teamData.team.name}</div>
        </div>
        <div className={styles.headerAvatar}>
          {getInitials(user.user_metadata.full_name ?? user.email ?? "P")}
        </div>
      </header>

      <div className={styles.shell}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>{teamData.team.name} Team</div>
            <div className={styles.pageSubtitle}>
              {teamData.program.name} · {teamData.program.shortDescription ?? "Participant team"} ·{" "}
              {teamData.team.members.length} of 6 spots filled
            </div>
          </div>
          <div className={styles.pageActions}>
            <span className={styles.badgeGreen}>Active</span>
            <span className={styles.badgeMuted}>
              Team Lead: {teamData.team.members.find((member) => member.isLead)?.fullName ?? "Lead"}
            </span>
          </div>
        </div>

        {query.status ? <div className={styles.successBanner}>{formatMessage(query.status)}</div> : null}
        {query.error ? <div className={styles.errorBanner}>{formatMessage(query.error)}</div> : null}

        <section className={styles.cardTable}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Team Members</div>
            <span className={styles.badgeMuted}>
              {teamData.team.members.length} members · {availableSpots} spots open
            </span>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {teamData.team.members.map((member) => (
                <tr key={member.userId}>
                  <td>
                    <div className={styles.memberCell}>
                      <div className={styles.memberAvatar}>
                        {getInitials(member.fullName ?? member.email ?? "U")}
                      </div>
                      <div className={styles.memberName}>
                        {member.fullName ?? member.email ?? "Participant"}
                      </div>
                    </div>
                  </td>
                  <td>{member.email ?? "No email on profile"}</td>
                  <td>
                    <span className={member.isLead ? styles.badgeGold : styles.badgeMuted}>
                      {member.isLead ? "Team Lead" : "Member"}
                    </span>
                  </td>
                  <td className={styles.mutedCell}>Active member</td>
                  <td>
                    <div className={styles.statusChip}>
                      <span className={styles.statusDot} />
                      <span>Active</span>
                    </div>
                  </td>
                  <td>
                    <Link
                      href={`/p/${slug}/team?member=${member.userId}`}
                      className={styles.ghostButtonSmall}
                    >
                      Options
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {selectedMember ? (
          <section className={styles.card}>
            <div className={styles.cardTitle}>Member Actions</div>
            <div className={styles.memberActionRow}>
              <div>
                <div className={styles.memberActionTitle}>
                  {selectedMember.fullName ?? selectedMember.email ?? "Participant"}
                </div>
                <div className={styles.memberActionBody}>
                  {selectedMember.isLead
                    ? "Current team lead. Lead transfer is only needed when another member should own the team."
                    : "Review this member and promote to team lead if responsibility needs to shift."}
                </div>
              </div>

              <div className={styles.memberActionButtons}>
                {selectedMember.email ? (
                  <a
                    href={`mailto:${selectedMember.email}`}
                    className={styles.secondaryButtonSmall}
                  >
                    Email Member
                  </a>
                ) : null}
                {!selectedMember.isLead && teamData.team.isLead ? (
                  <form action={makeTeamLeadAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="targetId" value={selectedMember.userId} />
                    <button type="submit" className={styles.primaryButtonSmall}>
                      Make Team Lead
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className={styles.card}>
          <div className={styles.cardHeaderSimple}>
            <div className={styles.cardTitle}>Pending Invitations</div>
            <span className={styles.badgeAmber}>{pendingInvites.length} pending</span>
          </div>

          {pendingInvites.length > 0 ? (
            <div className={styles.inviteList}>
              {pendingInvites.map((invite) => (
                <div key={invite.id} className={styles.inviteRow}>
                  <div className={styles.inviteInfo}>
                    <div className={styles.inviteAvatar}>?</div>
                    <div>
                      <div className={styles.inviteEmail}>{invite.email}</div>
                      <div className={styles.inviteMeta}>
                        Invited {formatDate(invite.createdAt)} · Expires {formatDate(invite.expiresAt)}
                      </div>
                    </div>
                  </div>

                  <div className={styles.inviteActions}>
                    <span className={styles.badgeAmber}>Pending</span>
                    {teamData.team.isLead ? (
                      <>
                        <form action={resendTeamInviteAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="targetId" value={invite.id} />
                          <button type="submit" className={styles.ghostButtonSmall}>
                            Resend
                          </button>
                        </form>
                        <form action={revokeTeamInviteAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="targetId" value={invite.id} />
                          <button type="submit" className={styles.ghostDangerSmall}>
                            Cancel
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyText}>No pending invites right now.</div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle}>Invite a New Member</div>
          <form action={inviteTeamMemberAction}>
            <input type="hidden" name="slug" value={slug} />
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="colleague@example.com"
                  className={styles.formInput}
                  required
                  disabled={!teamData.team.isLead || availableSpots <= 0}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Role</label>
                <select
                  name="role"
                  className={styles.formInput}
                  disabled={!teamData.team.isLead || availableSpots <= 0}
                >
                  <option value="member">Member</option>
                  <option value="team_lead">Team Lead</option>
                </select>
              </div>
            </div>
            <div className={styles.formFooter}>
              <div className={styles.formHint}>
                {availableSpots} spot{availableSpots === 1 ? "" : "s"} available (max 6 per team)
              </div>
              <button
                type="submit"
                className={styles.primaryButtonSmall}
                disabled={!teamData.team.isLead || availableSpots <= 0}
              >
                Send Invitation
              </button>
            </div>
          </form>
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle}>Team Settings</div>
          <form action={updateTeamSettingsAction} className={styles.settingsForm}>
            <input type="hidden" name="slug" value={slug} />
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Team Name</label>
              <input
                name="teamName"
                defaultValue={teamData.team.name}
                className={styles.formInput}
                disabled={!teamData.team.isLead}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Project Title</label>
              <input
                name="projectIdea"
                defaultValue={teamData.team.projectIdea ?? ""}
                className={styles.formInput}
                disabled={!teamData.team.isLead}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Track</label>
              <input
                value={teamData.program.shortDescription ?? "Program track"}
                className={styles.formInput}
                disabled
                readOnly
              />
              <div className={styles.formHint}>Track is locked after submission work begins.</div>
            </div>
            <div className={styles.formFooter}>
              <div className={styles.formHint}>
                Only the team lead can update team settings.
              </div>
              <button
                type="submit"
                className={styles.primaryButtonSmall}
                disabled={!teamData.team.isLead}
              >
                Save Team Settings
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
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
    return "TBD";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatMessage(value: string) {
  switch (value) {
    case "invite-sent":
      return "Team invitation sent.";
    case "invite-resent":
      return "Invitation resent with a fresh expiration window.";
    case "invite-revoked":
      return "Pending invitation cancelled.";
    case "settings-saved":
      return "Team settings updated.";
    case "lead-updated":
      return "Team lead updated.";
    case "lead-unchanged":
      return "That member is already the active team lead.";
    case "team-full":
      return "This team is already at capacity.";
    case "member-exists":
      return "That person is already on the team.";
    case "invite-exists":
      return "A pending invite already exists for that email.";
    default:
      return value.replace(/-/g, " ");
  }
}
