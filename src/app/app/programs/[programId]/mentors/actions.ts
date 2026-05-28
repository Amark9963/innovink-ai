"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUserOrNull } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mentorMatchReviewSchema = z.object({
  programId: z.uuid(),
  recommendationId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
});

export async function reviewMentorMatchAction(formData: FormData) {
  const parsed = mentorMatchReviewSchema.safeParse({
    programId: formData.get("programId"),
    recommendationId: formData.get("recommendationId"),
    decision: formData.get("decision"),
  });

  const programId = String(formData.get("programId") ?? "");

  if (!parsed.success) {
    redirect(`/app/programs/${programId}/mentors/matchmaking?error=invalid-match`);
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=/app/programs/${parsed.data.programId}/mentors/matchmaking`);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("program_memberships")
    .select("role")
    .eq("program_id", parsed.data.programId)
    .eq("user_id", user.id)
    .in("role", ["program_manager", "program_editor", "mentor_manager"])
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw membershipError;
  }

  if (!membership) {
    redirect("/app/dashboard");
  }

  const { error } = await supabase
    .from("mentor_match_recommendations")
    .update({ status: parsed.data.decision === "approve" ? "approved" : "rejected" })
    .eq("id", parsed.data.recommendationId);

  if (error) {
    throw error;
  }

  redirect(
    `/app/programs/${parsed.data.programId}/mentors/matchmaking?status=${
      parsed.data.decision === "approve" ? "match-approved" : "match-rejected"
    }`,
  );
}
