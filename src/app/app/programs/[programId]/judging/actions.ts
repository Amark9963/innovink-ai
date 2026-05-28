"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectToManager(programId: string, searchParam?: string): never {
  redirect(
    `/app/programs/${programId}/judging${searchParam ? `?${searchParam}` : ""}`,
  );
}

const activateSchema = z.object({
  programId: z.uuid(),
});

const calibrationExerciseSchema = z.object({
  programId: z.uuid(),
  scorecardId: z.uuid(),
  title: z.string().trim().min(3).max(120),
  referenceCode: z.string().trim().max(40).optional(),
  instructions: z.string().trim().max(1200).optional(),
  problemSummary: z.string().trim().max(1200).optional(),
  solutionSummary: z.string().trim().max(1200).optional(),
  validationSummary: z.string().trim().max(1200).optional(),
  teamSummary: z.string().trim().max(800).optional(),
  pitchDeckUrl: z.union([z.literal(""), z.url()]).optional(),
  demoUrl: z.union([z.literal(""), z.url()]).optional(),
  consensusTotalScore: z.coerce.number().min(0).max(100),
  managerNote: z.string().trim().max(1200).optional(),
});

export async function activateJudgingAction(formData: FormData) {
  const parsed = activateSchema.safeParse({
    programId: formData.get("programId"),
  });

  if (!parsed.success) {
    const fallbackProgramId = String(formData.get("programId") ?? "");
    redirectToManager(
      fallbackProgramId,
      `error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid judging activation request.")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: round, error: roundError } = await supabase
    .from("evaluation_rounds")
    .select("id, starts_at")
    .eq("program_id", parsed.data.programId)
    .order("round_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (roundError) {
    redirectToManager(
      parsed.data.programId,
      `error=${encodeURIComponent(roundError.message)}`,
    );
  }

  if (!round) {
    redirectToManager(parsed.data.programId, "error=No%20judging%20round%20exists%20yet");
  }

  const [{ error: scorecardError }, { error: roundUpdateError }] = await Promise.all([
    supabase
      .from("scorecards")
      .update({ is_active: true })
      .eq("program_id", parsed.data.programId),
    round.starts_at
      ? Promise.resolve({ error: null })
      : supabase
          .from("evaluation_rounds")
          .update({ starts_at: now })
          .eq("id", round.id),
  ]);

  if (scorecardError) {
    redirectToManager(
      parsed.data.programId,
      `error=${encodeURIComponent(scorecardError.message)}`,
    );
  }

  if (roundUpdateError) {
    redirectToManager(
      parsed.data.programId,
      `error=${encodeURIComponent(roundUpdateError.message)}`,
    );
  }

  revalidatePath(`/app/programs/${parsed.data.programId}/judging`);
  redirectToManager(parsed.data.programId, "status=judging-activated");
}

export async function upsertJudgeCalibrationExerciseAction(formData: FormData) {
  const parsed = calibrationExerciseSchema.safeParse({
    programId: formData.get("programId"),
    scorecardId: formData.get("scorecardId"),
    title: formData.get("title"),
    referenceCode: formData.get("referenceCode"),
    instructions: formData.get("instructions"),
    problemSummary: formData.get("problemSummary"),
    solutionSummary: formData.get("solutionSummary"),
    validationSummary: formData.get("validationSummary"),
    teamSummary: formData.get("teamSummary"),
    pitchDeckUrl: formData.get("pitchDeckUrl"),
    demoUrl: formData.get("demoUrl"),
    consensusTotalScore: formData.get("consensusTotalScore"),
    managerNote: formData.get("managerNote"),
  });

  const fallbackProgramId = String(formData.get("programId") ?? "");

  if (!parsed.success) {
    redirectToManager(
      fallbackProgramId,
      `tab=calibration&error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid calibration exercise.")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingExercise, error: existingExerciseError } = await supabase
    .from("judge_calibration_exercises")
    .select("id")
    .eq("program_id", parsed.data.programId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingExerciseError) {
    redirectToManager(
      parsed.data.programId,
      `tab=calibration&error=${encodeURIComponent(existingExerciseError.message)}`,
    );
  }

  const payload = {
    program_id: parsed.data.programId,
    scorecard_id: parsed.data.scorecardId,
    title: parsed.data.title,
    reference_code: emptyToNull(parsed.data.referenceCode),
    instructions: emptyToNull(parsed.data.instructions),
    problem_summary: emptyToNull(parsed.data.problemSummary),
    solution_summary: emptyToNull(parsed.data.solutionSummary),
    validation_summary: emptyToNull(parsed.data.validationSummary),
    team_summary: emptyToNull(parsed.data.teamSummary),
    pitch_deck_url: emptyToNull(parsed.data.pitchDeckUrl),
    demo_url: emptyToNull(parsed.data.demoUrl),
    consensus_total_score: parsed.data.consensusTotalScore,
    manager_note: emptyToNull(parsed.data.managerNote),
    scoring_anchors: buildDefaultCalibrationAnchors(parsed.data.consensusTotalScore),
    created_by: user.id,
    is_active: true,
  };

  const mutation = existingExercise
    ? supabase
        .from("judge_calibration_exercises")
        .update(payload)
        .eq("id", existingExercise.id)
    : supabase.from("judge_calibration_exercises").insert(payload);

  const { error: mutationError } = await mutation;

  if (mutationError) {
    redirectToManager(
      parsed.data.programId,
      `tab=calibration&error=${encodeURIComponent(mutationError.message)}`,
    );
  }

  revalidatePath(`/app/programs/${parsed.data.programId}/judging`);
  revalidatePath(`/judge/${parsed.data.programId}/calibration`);
  redirectToManager(parsed.data.programId, "tab=calibration&status=calibration-exercise-saved");
}

function emptyToNull(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function buildDefaultCalibrationAnchors(consensusTotalScore: number) {
  const rounded = Math.round(consensusTotalScore);
  return [
    {
      rangeLabel: "90-100 pts",
      note: "Exceptional across all criteria. Ready for acceleration or external funding.",
    },
    {
      rangeLabel: "70-89 pts",
      note: "Strong submission with clear strengths. Minor gaps in one or two criteria.",
    },
    {
      rangeLabel: `Reference -> ${rounded} pts`,
      note: "Use this reference exercise to align on what a strong but not perfect submission looks like.",
      highlighted: true,
    },
    {
      rangeLabel: "50-69 pts",
      note: "Promising but early-stage. Significant gaps in validation or feasibility.",
    },
    {
      rangeLabel: "< 50 pts",
      note: "Insufficient evidence, unclear problem, or ineligible submission.",
    },
  ];
}
