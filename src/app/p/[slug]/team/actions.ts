"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getCurrentUserOrNull,
  getParticipantTeamManagementDataBySlug,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inviteTeamMemberSchema = z.object({
  slug: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.enum(["member", "team_lead"]).default("member"),
});

const teamActionSchema = z.object({
  slug: z.string().trim().min(1),
  targetId: z.string().trim().uuid(),
});

const teamSettingsSchema = z.object({
  slug: z.string().trim().min(1),
  teamName: z.string().trim().min(2).max(120),
  projectIdea: z.string().trim().max(240).optional().or(z.literal("")),
});

export async function inviteTeamMemberAction(formData: FormData) {
  const parsed = inviteTeamMemberSchema.safeParse({
    slug: formData.get("slug"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/team`)}`);
  }

  const teamData = await getParticipantTeamManagementDataBySlug(
    supabase,
    user,
    parsed.data.slug,
  );

  if (!teamData || !teamData.team.isLead) {
    redirect(`/p/${parsed.data.slug}/team?error=invite-not-allowed`);
  }

  if (teamData.team.members.length + teamData.pendingInvites.filter((invite) => invite.status === "pending").length >= 6) {
    redirect(`/p/${parsed.data.slug}/team?error=team-full`);
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  if (
    teamData.team.members.some(
      (member) => member.email?.toLowerCase() === normalizedEmail,
    )
  ) {
    redirect(`/p/${parsed.data.slug}/team?error=member-exists`);
  }

  if (
    teamData.pendingInvites.some(
      (invite) => invite.email.toLowerCase() === normalizedEmail && invite.status === "pending",
    )
  ) {
    redirect(`/p/${parsed.data.slug}/team?error=invite-exists`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  const { error } = await supabase.from("team_invites").insert({
    team_id: teamData.team.id,
    email: normalizedEmail,
    invited_by: user.id,
    invited_user_id: profile?.id ?? null,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    redirect(`/p/${parsed.data.slug}/team?error=invite-failed`);
  }

  redirect(`/p/${parsed.data.slug}/team?status=invite-sent`);
}

export async function resendTeamInviteAction(formData: FormData) {
  const parsed = teamActionSchema.safeParse({
    slug: formData.get("slug"),
    targetId: formData.get("targetId"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/team`)}`);
  }

  const teamData = await getParticipantTeamManagementDataBySlug(
    supabase,
    user,
    parsed.data.slug,
  );

  if (!teamData || !teamData.team.isLead) {
    redirect(`/p/${parsed.data.slug}/team?error=invite-not-allowed`);
  }

  const { error } = await supabase
    .from("team_invites")
    .update({
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      responded_at: null,
    })
    .eq("id", parsed.data.targetId)
    .eq("team_id", teamData.team.id);

  if (error) {
    redirect(`/p/${parsed.data.slug}/team?error=invite-resend-failed`);
  }

  redirect(`/p/${parsed.data.slug}/team?status=invite-resent`);
}

export async function revokeTeamInviteAction(formData: FormData) {
  const parsed = teamActionSchema.safeParse({
    slug: formData.get("slug"),
    targetId: formData.get("targetId"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/team`)}`);
  }

  const teamData = await getParticipantTeamManagementDataBySlug(
    supabase,
    user,
    parsed.data.slug,
  );

  if (!teamData || !teamData.team.isLead) {
    redirect(`/p/${parsed.data.slug}/team?error=invite-not-allowed`);
  }

  const { error } = await supabase
    .from("team_invites")
    .update({
      status: "revoked",
      responded_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.targetId)
    .eq("team_id", teamData.team.id);

  if (error) {
    redirect(`/p/${parsed.data.slug}/team?error=invite-revoke-failed`);
  }

  redirect(`/p/${parsed.data.slug}/team?status=invite-revoked`);
}

export async function makeTeamLeadAction(formData: FormData) {
  const parsed = teamActionSchema.safeParse({
    slug: formData.get("slug"),
    targetId: formData.get("targetId"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/team`)}`);
  }

  const teamData = await getParticipantTeamManagementDataBySlug(
    supabase,
    user,
    parsed.data.slug,
  );

  if (!teamData || !teamData.team.isLead) {
    redirect(`/p/${parsed.data.slug}/team?error=lead-change-not-allowed`);
  }

  const currentLead = teamData.team.members.find((member) => member.isLead);
  if (!currentLead || currentLead.userId === parsed.data.targetId) {
    redirect(`/p/${parsed.data.slug}/team?status=lead-unchanged`);
  }

  const { error: demoteError } = await supabase
    .from("team_members")
    .update({ is_lead: false })
    .eq("team_id", teamData.team.id)
    .eq("user_id", currentLead.userId);

  if (demoteError) {
    redirect(`/p/${parsed.data.slug}/team?error=lead-change-failed`);
  }

  const { error: promoteError } = await supabase
    .from("team_members")
    .update({ is_lead: true })
    .eq("team_id", teamData.team.id)
    .eq("user_id", parsed.data.targetId);

  if (promoteError) {
    redirect(`/p/${parsed.data.slug}/team?error=lead-change-failed`);
  }

  redirect(`/p/${parsed.data.slug}/team?status=lead-updated`);
}

export async function updateTeamSettingsAction(formData: FormData) {
  const parsed = teamSettingsSchema.safeParse({
    slug: formData.get("slug"),
    teamName: formData.get("teamName"),
    projectIdea: formData.get("projectIdea"),
  });

  if (!parsed.success) {
    redirect("/app");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/team`)}`);
  }

  const teamData = await getParticipantTeamManagementDataBySlug(
    supabase,
    user,
    parsed.data.slug,
  );

  if (!teamData || !teamData.team.isLead) {
    redirect(`/p/${parsed.data.slug}/team?error=settings-not-allowed`);
  }

  const { error } = await supabase
    .from("teams")
    .update({
      name: parsed.data.teamName,
      project_idea: parsed.data.projectIdea || null,
    })
    .eq("id", teamData.team.id);

  if (error) {
    redirect(`/p/${parsed.data.slug}/team?error=settings-save-failed`);
  }

  redirect(`/p/${parsed.data.slug}/team?status=settings-saved`);
}
