"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserOrNull, getMentorPortalData, getMentorSessionDetailData } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mentorOnboardingSchema = z.object({
  programId: z.uuid(),
  displayName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional(),
  organizationName: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(1500).optional(),
  expertiseTags: z.string().trim().max(500).optional(),
  stagePreferences: z.string().trim().max(500).optional(),
  sessionFormatPreferences: z.string().trim().max(500).optional(),
  languages: z.string().trim().max(300).optional(),
  regions: z.string().trim().max(300).optional(),
  maxMentoringLoad: z.coerce.number().int().min(1).max(200).optional(),
});

const availabilitySlotSchema = z.object({
  programId: z.uuid(),
  sessionType: z.enum([
    "one_to_one",
    "team_office_hour",
    "expert_review",
    "pitch_coaching",
    "group_clinic",
    "panel_session",
  ]),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().trim().min(1).max(120),
  capacity: z.coerce.number().int().min(1).max(50).default(1),
});

const toggleSlotSchema = z.object({
  programId: z.uuid(),
  slotId: z.uuid(),
  nextState: z.enum(["true", "false"]),
});

const bookingReviewSchema = z.object({
  programId: z.uuid(),
  bookingId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
});

const sessionNoteSchema = z.object({
  programId: z.uuid(),
  sessionId: z.uuid(),
  content: z.string().trim().min(3).max(4000),
  noteType: z.string().trim().min(1).max(80).default("session_note"),
  visibility: z.enum(["private_mentor", "shared_with_pm", "shared_with_participant"]),
});

const sessionCompleteSchema = z.object({
  programId: z.uuid(),
  sessionId: z.uuid(),
});

export async function saveMentorOnboardingAction(formData: FormData) {
  const parsed = mentorOnboardingSchema.safeParse({
    programId: formData.get("programId"),
    displayName: formData.get("displayName"),
    title: formData.get("title") ?? undefined,
    organizationName: formData.get("organizationName") ?? undefined,
    bio: formData.get("bio") ?? undefined,
    expertiseTags: formData.get("expertiseTags") ?? undefined,
    stagePreferences: formData.get("stagePreferences") ?? undefined,
    sessionFormatPreferences: formData.get("sessionFormatPreferences") ?? undefined,
    languages: formData.get("languages") ?? undefined,
    regions: formData.get("regions") ?? undefined,
    maxMentoringLoad:
      formData.get("maxMentoringLoad") && String(formData.get("maxMentoringLoad")).trim().length > 0
        ? formData.get("maxMentoringLoad")
        : undefined,
  });

  const programId = String(formData.get("programId") ?? "");

  if (!parsed.success) {
    redirect(`/mentor/${programId}/onboarding?error=invalid-profile`);
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${parsed.data.programId}/onboarding`);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("program_memberships")
    .select("role")
    .eq("program_id", parsed.data.programId)
    .eq("user_id", user.id)
    .in("role", ["mentor", "mentor_manager", "program_manager"])
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    redirect("/app/dashboard");
  }

  const existingProfile = await supabase
    .from("mentor_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfile.error) {
    throw existingProfile.error;
  }

  const profilePayload = {
    user_id: user.id,
    display_name: parsed.data.displayName,
    title: emptyToNull(parsed.data.title),
    organization_name: emptyToNull(parsed.data.organizationName),
    bio: emptyToNull(parsed.data.bio),
    max_mentoring_load: parsed.data.maxMentoringLoad ?? null,
    stage_preferences: splitCsv(parsed.data.stagePreferences),
    session_format_preferences: splitCsv(parsed.data.sessionFormatPreferences),
    languages: splitCsv(parsed.data.languages),
    regions: splitCsv(parsed.data.regions),
  };

  const profileResult = existingProfile.data
    ? await supabase
        .from("mentor_profiles")
        .update(profilePayload)
        .eq("id", existingProfile.data.id)
        .select("id")
        .single()
    : await supabase.from("mentor_profiles").insert(profilePayload).select("id").single();

  if (profileResult.error) {
    throw profileResult.error;
  }

  const profileId = profileResult.data.id;

  const { error: deleteTagsError } = await supabase
    .from("mentor_expertise_tags")
    .delete()
    .eq("mentor_profile_id", profileId);

  if (deleteTagsError) {
    throw deleteTagsError;
  }

  const expertiseTags = splitCsv(parsed.data.expertiseTags);
  if (expertiseTags.length > 0) {
    const { error: insertTagsError } = await supabase.from("mentor_expertise_tags").insert(
      expertiseTags.map((tag) => ({
        mentor_profile_id: profileId,
        tag_type: "expertise",
        tag_value: tag,
      })),
    );

    if (insertTagsError) {
      throw insertTagsError;
    }
  }

  const existingMentorMembership = await supabase
    .from("mentor_program_memberships")
    .select("id")
    .eq("program_id", parsed.data.programId)
    .eq("mentor_profile_id", profileId)
    .maybeSingle();

  if (existingMentorMembership.error) {
    throw existingMentorMembership.error;
  }

  if (existingMentorMembership.data) {
    const { error: updateMembershipError } = await supabase
      .from("mentor_program_memberships")
      .update({
        status: "active",
        max_sessions: parsed.data.maxMentoringLoad ?? null,
      })
      .eq("id", existingMentorMembership.data.id);

    if (updateMembershipError) {
      throw updateMembershipError;
    }
  } else {
    const { error: insertMembershipError } = await supabase
      .from("mentor_program_memberships")
      .insert({
        mentor_profile_id: profileId,
        program_id: parsed.data.programId,
        status: "active",
        created_by: user.id,
        max_sessions: parsed.data.maxMentoringLoad ?? null,
      });

    if (insertMembershipError) {
      throw insertMembershipError;
    }
  }

  redirect(`/mentor/${parsed.data.programId}?status=onboarding-saved`);
}

export async function createMentorAvailabilitySlotAction(formData: FormData) {
  const parsed = availabilitySlotSchema.safeParse({
    programId: formData.get("programId"),
    sessionType: formData.get("sessionType"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    timezone: formData.get("timezone"),
    capacity: formData.get("capacity"),
  });

  const programId = String(formData.get("programId") ?? "");

  if (!parsed.success) {
    redirect(`/mentor/${programId}/availability?error=invalid-slot`);
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${parsed.data.programId}/availability`);
  }

  const portal = await getMentorPortalData(supabase, user, parsed.data.programId);

  if (!portal?.membership.id) {
    redirect(`/mentor/${parsed.data.programId}/onboarding?error=profile-required`);
  }

  const { error } = await supabase.from("mentor_availability_slots").insert({
    mentor_program_membership_id: portal.membership.id,
    session_type: parsed.data.sessionType,
    starts_at: new Date(parsed.data.startsAt).toISOString(),
    ends_at: new Date(parsed.data.endsAt).toISOString(),
    timezone: parsed.data.timezone,
    capacity: parsed.data.capacity,
    is_available: true,
  });

  if (error) {
    throw error;
  }

  redirect(`/mentor/${parsed.data.programId}/availability?status=slot-added`);
}

export async function toggleMentorAvailabilitySlotAction(formData: FormData) {
  const parsed = toggleSlotSchema.safeParse({
    programId: formData.get("programId"),
    slotId: formData.get("slotId"),
    nextState: formData.get("nextState"),
  });

  const programId = String(formData.get("programId") ?? "");

  if (!parsed.success) {
    redirect(`/mentor/${programId}/availability?error=invalid-slot`);
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${parsed.data.programId}/availability`);
  }

  const portal = await getMentorPortalData(supabase, user, parsed.data.programId);

  if (!portal?.membership.id) {
    redirect(`/mentor/${parsed.data.programId}/onboarding?error=profile-required`);
  }

  const { error } = await supabase
    .from("mentor_availability_slots")
    .update({ is_available: parsed.data.nextState === "true" })
    .eq("id", parsed.data.slotId)
    .eq("mentor_program_membership_id", portal.membership.id);

  if (error) {
    throw error;
  }

  redirect(`/mentor/${parsed.data.programId}/availability?status=slot-updated`);
}

export async function reviewMentorBookingAction(formData: FormData) {
  const parsed = bookingReviewSchema.safeParse({
    programId: formData.get("programId"),
    bookingId: formData.get("bookingId"),
    decision: formData.get("decision"),
  });

  const programId = String(formData.get("programId") ?? "");

  if (!parsed.success) {
    redirect(`/mentor/${programId}/bookings?error=invalid-booking`);
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${parsed.data.programId}/bookings`);
  }

  const portal = await getMentorPortalData(supabase, user, parsed.data.programId);

  if (!portal?.membership.id) {
    redirect(`/mentor/${parsed.data.programId}/onboarding?error=profile-required`);
  }

  const { data: booking, error: bookingError } = await supabase
    .from("mentor_booking_requests")
    .select(
      "id, team_id, requester_user_id, requested_starts_at, requested_ends_at, session_type, mentor_program_membership_id, program_id",
    )
    .eq("id", parsed.data.bookingId)
    .eq("mentor_program_membership_id", portal.membership.id)
    .maybeSingle();

  if (bookingError) {
    throw bookingError;
  }

  if (!booking) {
    redirect(`/mentor/${parsed.data.programId}/bookings?error=booking-missing`);
  }

  if (parsed.data.decision === "reject") {
    const { error } = await supabase
      .from("mentor_booking_requests")
      .update({
        status: "cancelled",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (error) {
      throw error;
    }

    redirect(`/mentor/${parsed.data.programId}/bookings?status=booking-rejected`);
  }

  const { error: bookingUpdateError } = await supabase
    .from("mentor_booking_requests")
    .update({
      status: "confirmed",
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  if (bookingUpdateError) {
    throw bookingUpdateError;
  }

  const existingSession = await supabase
    .from("mentor_sessions")
    .select("id")
    .eq("mentor_booking_request_id", booking.id)
    .maybeSingle();

  if (existingSession.error) {
    throw existingSession.error;
  }

  let sessionId = existingSession.data?.id ?? null;

  if (!sessionId) {
    const { data: session, error: sessionError } = await supabase
      .from("mentor_sessions")
      .insert({
        mentor_booking_request_id: booking.id,
        mentor_program_membership_id: portal.membership.id,
        program_id: booking.program_id,
        session_type: booking.session_type,
        starts_at: booking.requested_starts_at,
        ends_at: booking.requested_ends_at,
        timezone: "UTC",
        status: "confirmed",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (sessionError) {
      throw sessionError;
    }

    sessionId = session.id;

    const participantRows = [
      booking.team_id
        ? { mentor_session_id: session.id, team_id: booking.team_id, user_id: null, role_in_session: "team" }
        : null,
      {
        mentor_session_id: session.id,
        team_id: booking.team_id,
        user_id: booking.requester_user_id,
        role_in_session: "requester",
      },
    ].filter((row): row is NonNullable<typeof row> => row !== null);

    if (participantRows.length > 0) {
      const { error: participantInsertError } = await supabase
        .from("mentor_session_participants")
        .insert(participantRows);

      if (participantInsertError) {
        throw participantInsertError;
      }
    }
  }

  redirect(`/mentor/${parsed.data.programId}/sessions/${sessionId}?status=booking-confirmed`);
}

export async function addMentorSessionNoteAction(formData: FormData) {
  const parsed = sessionNoteSchema.safeParse({
    programId: formData.get("programId"),
    sessionId: formData.get("sessionId"),
    content: formData.get("content"),
    noteType: formData.get("noteType") ?? "session_note",
    visibility: formData.get("visibility"),
  });

  const programId = String(formData.get("programId") ?? "");

  if (!parsed.success) {
    redirect(`/mentor/${programId}/sessions/${String(formData.get("sessionId") ?? "")}?error=invalid-note`);
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${parsed.data.programId}/sessions/${parsed.data.sessionId}`);
  }

  const detail = await getMentorSessionDetailData(
    supabase,
    user,
    parsed.data.programId,
    parsed.data.sessionId,
  );

  if (!detail) {
    redirect(`/mentor/${parsed.data.programId}/bookings?error=session-missing`);
  }

  const { error } = await supabase.from("mentor_session_notes").insert({
    mentor_session_id: parsed.data.sessionId,
    author_user_id: user.id,
    content: parsed.data.content,
    note_type: parsed.data.noteType,
    visibility: parsed.data.visibility,
  });

  if (error) {
    throw error;
  }

  redirect(`/mentor/${parsed.data.programId}/sessions/${parsed.data.sessionId}?status=note-added`);
}

export async function completeMentorSessionAction(formData: FormData) {
  const parsed = sessionCompleteSchema.safeParse({
    programId: formData.get("programId"),
    sessionId: formData.get("sessionId"),
  });

  const programId = String(formData.get("programId") ?? "");

  if (!parsed.success) {
    redirect(`/mentor/${programId}/bookings?error=invalid-session`);
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/mentor/${parsed.data.programId}/sessions/${parsed.data.sessionId}`);
  }

  const detail = await getMentorSessionDetailData(
    supabase,
    user,
    parsed.data.programId,
    parsed.data.sessionId,
  );

  if (!detail) {
    redirect(`/mentor/${parsed.data.programId}/bookings?error=session-missing`);
  }

  const { error } = await supabase
    .from("mentor_sessions")
    .update({ status: "completed" })
    .eq("id", parsed.data.sessionId);

  if (error) {
    throw error;
  }

  redirect(`/mentor/${parsed.data.programId}/sessions/${parsed.data.sessionId}?status=session-completed`);
}

function emptyToNull(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function splitCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
