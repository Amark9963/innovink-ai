"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getCurrentUserOrNull,
  getProgramJudgingModerationData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const moderationDecisionSchema = z.object({
  programId: z.uuid(),
  submissionId: z.uuid(),
  decision: z.enum(["finalist", "shortlisted", "rejected"]),
  note: z.string().trim().min(8, "Please add a short moderation note."),
});

function buildModerationRedirect(
  programId: string,
  search: Record<string, string | null | undefined>,
): never {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value) {
      params.set(key, value);
    }
  }

  redirect(
    `/app/programs/${programId}/judging/moderation${params.size ? `?${params.toString()}` : ""}`,
  );
}

export async function recordModerationDecisionAction(formData: FormData) {
  const parsed = moderationDecisionSchema.safeParse({
    programId: formData.get("programId"),
    submissionId: formData.get("submissionId"),
    decision: formData.get("decision"),
    note: formData.get("note"),
  });

  const searchState = {
    submission: String(formData.get("submissionId") ?? ""),
    tab: String(formData.get("tab") ?? "score"),
    q: String(formData.get("q") ?? ""),
    scope: String(formData.get("scope") ?? "all"),
  };

  if (!parsed.success) {
    buildModerationRedirect(
      String(formData.get("programId") ?? ""),
      {
        ...searchState,
        error: parsed.error.issues[0]?.message ?? "Invalid moderation decision.",
      },
    );
  }
  const parsedData = parsed.data;

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const moderationData = await getProgramJudgingModerationData(
    supabase,
    user,
    parsedData.programId,
  );

  if (!moderationData) {
    buildModerationRedirect(parsedData.programId, {
      ...searchState,
      error: "Moderation access is unavailable.",
    });
  }
  const safeModerationData = moderationData;

  const candidate =
    safeModerationData.candidates.find(
      (item) => item.submissionId === parsedData.submissionId,
    ) ?? null;

  if (!candidate) {
    buildModerationRedirect(parsedData.programId, {
      ...searchState,
      error: "The selected submission could not be found.",
    });
  }
  const safeCandidate = candidate;

  const timestamp = new Date().toISOString();

  if (safeCandidate.status !== parsedData.decision) {
    const { error: submissionError } = await supabase
      .from("submissions")
      .update({
        status: parsedData.decision,
      })
      .eq("id", safeCandidate.submissionId);

    if (submissionError) {
      buildModerationRedirect(parsedData.programId, {
        ...searchState,
        error: submissionError.message,
      });
    }
  }

  const { error: historyError } = await supabase
    .from("submission_status_history")
    .insert({
      submission_id: safeCandidate.submissionId,
      previous_status: safeCandidate.status,
      new_status: parsedData.decision,
      changed_by: user.id,
      change_reason: parsedData.note,
      created_at: timestamp,
    });

  if (historyError) {
    buildModerationRedirect(parsedData.programId, {
      ...searchState,
      error: historyError.message,
    });
  }

  revalidatePath(`/app/programs/${parsedData.programId}/judging`);
  revalidatePath(`/app/programs/${parsedData.programId}/judging/moderation`);
  revalidatePath(`/p/${safeModerationData.program.slug}/dashboard`);
  revalidatePath(`/p/${safeModerationData.program.slug}/results`);

  buildModerationRedirect(parsedData.programId, {
    ...searchState,
    status:
      parsedData.decision === "finalist"
        ? "finalist-decision-recorded"
        : parsedData.decision === "shortlisted"
          ? "waitlist-decision-recorded"
          : "rejection-recorded",
  });
}
