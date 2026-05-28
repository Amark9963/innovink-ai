"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserOrNull, getPublicRegistrationPageBySlug } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugifySegment } from "@/lib/utils/slugs";

const registerParticipantSchema = z.object({
  slug: z.string().trim().min(1),
});

export async function registerParticipantAction(formData: FormData) {
  const parsed = registerParticipantSchema.safeParse({
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/register`)}`);
  }

  const registrationPage = await getPublicRegistrationPageBySlug(supabase, parsed.data.slug);

  if (!registrationPage || !registrationPage.registrationForm) {
    redirect(`/p/${parsed.data.slug}/register?error=registration-unavailable`);
  }

  const { data: existingRegistration, error: existingRegistrationError } = await supabase
    .from("program_registrations")
    .select("id")
    .eq("program_id", registrationPage.program.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingRegistrationError) {
    redirect(`/p/${parsed.data.slug}/register?error=registration-check-failed`);
  }

  if (existingRegistration) {
    redirect(`/p/${parsed.data.slug}/register?status=already-registered`);
  }

  const answerEntries = registrationPage.fields.map((field) => {
    const key = `field:${field.fieldKey}`;
    const rawValues = formData.getAll(key);
    return {
      field,
      value: normalizeAnswer(field.fieldType, rawValues),
    };
  });

  const registrationData = Object.fromEntries(
    answerEntries
      .filter((entry) => entry.value !== null)
      .map((entry) => [entry.field.fieldKey, entry.value]),
  );

  const teamName =
    findFirstString(registrationData, ["team_name", "team", "team_title"]) ??
    `${user.user_metadata.full_name ?? user.email?.split("@")[0] ?? "Innovators"} team`;

  const location =
    findFirstString(registrationData, ["office_location", "location", "region"]) ?? null;
  const background =
    findFirstString(registrationData, ["innovation_background", "background", "experience"]) ?? null;

  const { data: participantProfile, error: participantProfileError } = await supabase
    .from("participant_profiles")
    .upsert(
      {
        user_id: user.id,
        location,
        bio: background,
        profile_data: registrationData,
      },
      {
        onConflict: "user_id",
      },
    )
    .select("id")
    .single();

  if (participantProfileError) {
    redirect(`/p/${parsed.data.slug}/register?error=participant-profile-failed`);
  }

  const { data: programRegistration, error: registrationError } = await supabase
    .from("program_registrations")
    .insert({
      program_id: registrationPage.program.id,
      user_id: user.id,
      participant_profile_id: participantProfile.id,
      accepted_terms_at: new Date().toISOString(),
      registration_data: registrationData,
    })
    .select("id")
    .single();

  if (registrationError) {
    redirect(`/p/${parsed.data.slug}/register?error=registration-create-failed`);
  }

  const answersToInsert = answerEntries
    .filter((entry) => entry.value !== null)
    .map((entry) => ({
      program_registration_id: programRegistration.id,
      form_field_key: entry.field.fieldKey,
      answer: entry.value,
    }));

  if (answersToInsert.length > 0) {
    const { error: answersError } = await supabase
      .from("registration_answers")
      .insert(answersToInsert);

    if (answersError) {
      redirect(`/p/${parsed.data.slug}/register?error=registration-answers-failed`);
    }
  }

  const uniqueTeamSlug = await createUniqueTeamSlug(
    supabase,
    registrationPage.program.id,
    slugifySegment(teamName) || "team",
  );

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      program_id: registrationPage.program.id,
      name: teamName,
      slug: uniqueTeamSlug,
      team_bio: background,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (teamError) {
    redirect(`/p/${parsed.data.slug}/register?error=team-create-failed`);
  }

  const { error: teamMemberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    program_registration_id: programRegistration.id,
    is_lead: true,
  });

  if (teamMemberError) {
    redirect(`/p/${parsed.data.slug}/register?error=team-member-failed`);
  }

  redirect(`/p/${parsed.data.slug}/dashboard?status=registered`);
}

async function createUniqueTeamSlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  programId: string,
  baseSlug: string,
) {
  let candidate = baseSlug;

  for (let index = 0; index < 8; index += 1) {
    const { data, error } = await supabase
      .from("teams")
      .select("id")
      .eq("program_id", programId)
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate = `${baseSlug}-${index + 2}`;
  }

  return `${baseSlug}-${Date.now().toString().slice(-4)}`;
}

function normalizeAnswer(fieldType: string, rawValues: FormDataEntryValue[]) {
  const values = rawValues
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (values.length === 0) {
    if (fieldType === "consent_checkbox") {
      return false;
    }

    return null;
  }

  if (fieldType === "multiple_choice") {
    return values;
  }

  if (fieldType === "consent_checkbox") {
    return true;
  }

  if (fieldType === "number") {
    const numeric = Number(values[0]);
    return Number.isFinite(numeric) ? numeric : values[0];
  }

  return values[0];
}

function findFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}
