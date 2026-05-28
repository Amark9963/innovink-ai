"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getJudgeCalibrationWorkspaceData,
  getCurrentUserOrNull,
  getJudgePortalData,
  getJudgeScorecardWorkspaceData,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const judgeProgramSchema = z.object({
  programId: z.string().trim().uuid(),
});

const judgeScoreSchema = judgeProgramSchema.extend({
  assignmentId: z.string().trim().uuid(),
  intent: z.enum(["save", "submit"]),
});

const judgeCalibrationSchema = judgeProgramSchema.extend({
  intent: z.enum(["save", "submit"]),
});

export async function submitJudgeConflictDeclarationAction(formData: FormData) {
  const parsed = judgeProgramSchema.safeParse({
    programId: formData.get("programId"),
  });

  if (!parsed.success) {
    redirect("/app/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const portal = await getJudgePortalData(supabase, user, parsed.data.programId);
  if (!portal) {
    redirect("/app/dashboard");
  }

  const flaggedIds = String(formData.get("flaggedIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const existingConflicts = new Set(
    portal.assignments
      .filter((assignment) => assignment.conflict)
      .map((assignment) => assignment.submissionId),
  );

  for (const assignment of portal.assignments) {
    const isFlagged =
      flaggedIds.includes(assignment.id) ||
      (assignment.conflict ? existingConflicts.has(assignment.submissionId) : false);

    if (isFlagged && !assignment.conflict) {
      const reason =
        String(formData.get(`reason:${assignment.id}`) ?? "").trim() ||
        "Potential conflict declared during judge onboarding";

      const { error } = await supabase.from("judge_conflicts").insert({
        program_id: portal.program.id,
        submission_id: assignment.submissionId,
        judge_user_id: user.id,
        reported_by: user.id,
        reason,
      });

      if (error) {
        redirect(`/judge/${portal.program.id}/onboarding?error=conflict-save-failed`);
      }
    }

  }

  const calibrationWorkspace = await getJudgeCalibrationWorkspaceData(
    supabase,
    user,
    portal.program.id,
  );

  if (calibrationWorkspace?.exercise && calibrationWorkspace.existingSubmission?.status !== "submitted") {
    redirect(`/judge/${portal.program.id}/calibration?status=onboarding-complete`);
  }

  redirect(`/judge/${portal.program.id}/assignments?status=onboarding-complete`);
}

export async function saveJudgeScorecardAction(formData: FormData) {
  const parsed = judgeScoreSchema.safeParse({
    programId: formData.get("programId"),
    assignmentId: formData.get("assignmentId"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    redirect("/app/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const workspace = await getJudgeScorecardWorkspaceData(
    supabase,
    user,
    parsed.data.programId,
    parsed.data.assignmentId,
  );

  if (!workspace || !workspace.scorecard) {
    redirect(`/judge/${parsed.data.programId}/assignments?error=scorecard-unavailable`);
  }

  const totalScore = workspace.criteria.reduce((sum, criterion) => {
    const rawScore = formData.get(`score:${criterion.id}`);
    const parsedScore =
      typeof rawScore === "string" && rawScore.trim() !== ""
        ? Number(rawScore)
        : null;
    return sum + (Number.isFinite(parsedScore) ? parsedScore ?? 0 : 0);
  }, 0);

  const incompleteRequired = workspace.criteria.some((criterion) => {
    const rawScore = formData.get(`score:${criterion.id}`);
    const parsedScore =
      typeof rawScore === "string" && rawScore.trim() !== ""
        ? Number(rawScore)
        : null;
    const rawComment = String(formData.get(`comment:${criterion.id}`) ?? "").trim();

    if (!Number.isFinite(parsedScore)) {
      return true;
    }

    if (criterion.requiresComment && rawComment.length === 0) {
      return true;
    }

    return false;
  });

  if (parsed.data.intent === "submit" && incompleteRequired) {
    redirect(
      `/judge/${parsed.data.programId}/score/${parsed.data.assignmentId}?error=incomplete-scorecard`,
    );
  }

  let scoreSubmissionId = workspace.assignment.scoreSubmission?.id ?? null;

  if (!scoreSubmissionId) {
    const { data: createdScoreSubmission, error: createScoreSubmissionError } = await supabase
      .from("score_submissions")
      .insert({
        program_id: workspace.program.id,
        submission_id: workspace.assignment.submissionId,
        scorecard_id: workspace.scorecard.id,
        judge_assignment_id: workspace.assignment.id,
        judge_user_id: user.id,
        status: parsed.data.intent === "submit" ? "submitted" : "draft",
        total_score: totalScore,
        submitted_at:
          parsed.data.intent === "submit" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (createScoreSubmissionError) {
      redirect(
        `/judge/${parsed.data.programId}/score/${parsed.data.assignmentId}?error=score-save-failed`,
      );
    }

    scoreSubmissionId = createdScoreSubmission.id;
  } else {
    const { error: updateScoreSubmissionError } = await supabase
      .from("score_submissions")
      .update({
        status: parsed.data.intent === "submit" ? "submitted" : "draft",
        total_score: totalScore,
        submitted_at:
          parsed.data.intent === "submit"
            ? new Date().toISOString()
            : workspace.assignment.scoreSubmission?.submittedAt ?? null,
      })
      .eq("id", scoreSubmissionId)
      .eq("judge_user_id", user.id);

    if (updateScoreSubmissionError) {
      redirect(
        `/judge/${parsed.data.programId}/score/${parsed.data.assignmentId}?error=score-save-failed`,
      );
    }
  }

  const scoreRows = workspace.criteria.map((criterion) => {
    const rawScore = formData.get(`score:${criterion.id}`);
    const parsedScore =
      typeof rawScore === "string" && rawScore.trim() !== ""
        ? Number(rawScore)
        : null;

    return {
      score_submission_id: scoreSubmissionId,
      scorecard_criterion_id: criterion.id,
      numeric_score: Number.isFinite(parsedScore) ? parsedScore : null,
    };
  });

  const { error: scoreRowsError } = await supabase
    .from("scores")
    .upsert(scoreRows, {
      onConflict: "score_submission_id,scorecard_criterion_id",
    });

  if (scoreRowsError) {
    redirect(
      `/judge/${parsed.data.programId}/score/${parsed.data.assignmentId}?error=score-save-failed`,
    );
  }

  const comments = workspace.criteria
    .map((criterion) => ({
      criterionId: criterion.id,
      text: String(formData.get(`comment:${criterion.id}`) ?? "").trim(),
    }))
    .filter((comment) => comment.text.length > 0);

  const { error: commentDeleteError } = await supabase
    .from("score_comments")
    .delete()
    .eq("score_submission_id", scoreSubmissionId);

  if (commentDeleteError) {
    redirect(
      `/judge/${parsed.data.programId}/score/${parsed.data.assignmentId}?error=comment-save-failed`,
    );
  }

  if (comments.length > 0) {
    const { error: commentsInsertError } = await supabase
      .from("score_comments")
      .insert(
        comments.map((comment) => ({
          score_submission_id: scoreSubmissionId,
          scorecard_criterion_id: comment.criterionId,
          comment_text: comment.text,
          created_by: user.id,
        })),
      );

    if (commentsInsertError) {
      redirect(
        `/judge/${parsed.data.programId}/score/${parsed.data.assignmentId}?error=comment-save-failed`,
      );
    }
  }

  if (parsed.data.intent === "submit") {
    redirect(`/judge/${parsed.data.programId}/assignments?status=score-submitted`);
  }

  redirect(`/judge/${parsed.data.programId}/score/${parsed.data.assignmentId}?status=draft-saved`);
}

export async function saveJudgeCalibrationAction(formData: FormData) {
  const parsed = judgeCalibrationSchema.safeParse({
    programId: formData.get("programId"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    redirect("/app/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect("/login");
  }

  const workspace = await getJudgeCalibrationWorkspaceData(
    supabase,
    user,
    parsed.data.programId,
  );

  if (!workspace || !workspace.exercise || !workspace.scorecard) {
    redirect(`/judge/${parsed.data.programId}/assignments?error=calibration-unavailable`);
  }

  const missingRequiredScores = workspace.criteria.some((criterion) => {
    const rawValue = formData.get(`score:${criterion.id}`);
    const numericValue =
      typeof rawValue === "string" && rawValue.trim() !== "" ? Number(rawValue) : null;
    return !Number.isFinite(numericValue);
  });

  if (parsed.data.intent === "submit" && missingRequiredScores) {
    redirect(`/judge/${parsed.data.programId}/calibration?error=incomplete-calibration`);
  }

  const totalScore = workspace.criteria.reduce((sum, criterion) => {
    const rawValue = formData.get(`score:${criterion.id}`);
    const numericValue =
      typeof rawValue === "string" && rawValue.trim() !== "" ? Number(rawValue) : null;
    return sum + (Number.isFinite(numericValue) ? numericValue ?? 0 : 0);
  }, 0);

  const notes = String(formData.get("notes") ?? "").trim();
  let calibrationSubmissionId = workspace.existingSubmission?.id ?? null;

  if (!calibrationSubmissionId) {
    const { data: createdSubmission, error: createSubmissionError } = await supabase
      .from("judge_calibration_submissions")
      .insert({
        program_id: parsed.data.programId,
        calibration_exercise_id: workspace.exercise.id,
        judge_user_id: user.id,
        status: parsed.data.intent === "submit" ? "submitted" : "draft",
        total_score: totalScore,
        notes: notes.length > 0 ? notes : null,
        submitted_at: parsed.data.intent === "submit" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (createSubmissionError) {
      redirect(`/judge/${parsed.data.programId}/calibration?error=calibration-save-failed`);
    }

    calibrationSubmissionId = createdSubmission.id;
  } else {
    const { error: updateSubmissionError } = await supabase
      .from("judge_calibration_submissions")
      .update({
        status: parsed.data.intent === "submit" ? "submitted" : "draft",
        total_score: totalScore,
        notes: notes.length > 0 ? notes : null,
        submitted_at:
          parsed.data.intent === "submit"
            ? new Date().toISOString()
            : workspace.existingSubmission?.submittedAt ?? null,
      })
      .eq("id", calibrationSubmissionId)
      .eq("judge_user_id", user.id);

    if (updateSubmissionError) {
      redirect(`/judge/${parsed.data.programId}/calibration?error=calibration-save-failed`);
    }
  }

  const scoreRows = workspace.criteria.map((criterion) => {
    const rawValue = formData.get(`score:${criterion.id}`);
    const numericValue =
      typeof rawValue === "string" && rawValue.trim() !== "" ? Number(rawValue) : null;

    return {
      calibration_submission_id: calibrationSubmissionId,
      scorecard_criterion_id: criterion.id,
      numeric_score: Number.isFinite(numericValue) ? numericValue : null,
    };
  });

  const { error: scoreRowsError } = await supabase
    .from("judge_calibration_scores")
    .upsert(scoreRows, {
      onConflict: "calibration_submission_id,scorecard_criterion_id",
    });

  if (scoreRowsError) {
    redirect(`/judge/${parsed.data.programId}/calibration?error=calibration-save-failed`);
  }

  if (parsed.data.intent === "submit") {
    redirect(`/judge/${parsed.data.programId}/assignments?status=calibration-submitted`);
  }

  redirect(`/judge/${parsed.data.programId}/calibration?status=draft-saved`);
}
