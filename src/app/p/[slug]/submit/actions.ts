"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getCurrentUserOrNull,
  getParticipantSubmissionWorkspaceDataBySlug,
} from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const participantSubmissionSchema = z.object({
  slug: z.string().trim().min(1),
  intent: z.enum(["save", "submit"]),
});

export async function updateParticipantSubmissionAction(formData: FormData) {
  const parsed = participantSubmissionSchema.safeParse({
    slug: formData.get("slug"),
    intent: formData.get("intent"),
  });

  if (!parsed.success) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/p/${parsed.data.slug}/submit`)}`);
  }

  const workspace = await getParticipantSubmissionWorkspaceDataBySlug(
    supabase,
    user,
    parsed.data.slug,
  );

  if (!workspace) {
    redirect(`/p/${parsed.data.slug}/register`);
  }

  if (!workspace.form) {
    redirect(`/p/${parsed.data.slug}/dashboard?error=submission-unavailable`);
  }

  const answerEntries = workspace.fields
    .filter((field) => field.fieldType !== "page_break")
    .map((field) => {
      const key = `field:${field.fieldKey}`;
      const rawValues = formData.getAll(key);
      return {
        field,
        value: normalizeAnswer(field.fieldType, rawValues),
      };
    });

  const missingRequiredFields = answerEntries.filter(
    (entry) => entry.field.isRequired && !hasAnswerValue(entry.field.fieldType, entry.value),
  );

  if (parsed.data.intent === "submit" && missingRequiredFields.length > 0) {
    redirect(`/p/${parsed.data.slug}/submit?error=incomplete`);
  }

  const answerMap = Object.fromEntries(
    answerEntries
      .filter((entry) => entry.value !== null)
      .map((entry) => [entry.field.fieldKey, entry.value]),
  );

  const submissionPatch = buildSubmissionPatch(answerMap, workspace.submission);
  const previousStatus = workspace.submission.status;
  const nextStatus =
    parsed.data.intent === "submit" ? ("submitted" as const) : previousStatus;

  const { error: submissionUpdateError } = await supabase
    .from("submissions")
    .update({
      ...submissionPatch,
      status: nextStatus,
      submitted_at:
        parsed.data.intent === "submit"
          ? workspace.submission.status === "submitted"
            ? undefined
            : new Date().toISOString()
          : undefined,
      submitted_by:
        parsed.data.intent === "submit"
          ? workspace.submission.status === "submitted"
            ? undefined
            : user.id
          : undefined,
    })
    .eq("id", workspace.submission.id);

  if (submissionUpdateError) {
    redirect(`/p/${parsed.data.slug}/submit?error=submission-save-failed`);
  }

  const nonEmptyAnswers = answerEntries
    .filter((entry) => entry.value !== null)
    .map((entry) => ({
      submission_id: workspace.submission.id,
      form_field_key: entry.field.fieldKey,
      answer: entry.value,
    }));

  if (nonEmptyAnswers.length > 0) {
    const { error: answersUpsertError } = await supabase
      .from("submission_answers")
      .upsert(nonEmptyAnswers, {
        onConflict: "submission_id,form_field_key",
      });

    if (answersUpsertError) {
      redirect(`/p/${parsed.data.slug}/submit?error=submission-answers-failed`);
    }
  }

  const emptyFieldKeys = answerEntries
    .filter((entry) => entry.value === null)
    .map((entry) => entry.field.fieldKey);

  if (emptyFieldKeys.length > 0) {
    const { error: answersDeleteError } = await supabase
      .from("submission_answers")
      .delete()
      .eq("submission_id", workspace.submission.id)
      .in("form_field_key", emptyFieldKeys);

    if (answersDeleteError) {
      redirect(`/p/${parsed.data.slug}/submit?error=submission-answers-failed`);
    }
  }

  if (previousStatus !== nextStatus) {
    const { error: statusHistoryError } = await supabase
      .from("submission_status_history")
      .insert({
        submission_id: workspace.submission.id,
        previous_status: previousStatus,
        new_status: nextStatus,
        changed_by: user.id,
        change_reason:
          parsed.data.intent === "submit"
            ? "Participant submitted final package"
            : "Participant saved draft changes",
      });

    if (statusHistoryError) {
      redirect(`/p/${parsed.data.slug}/submit?error=status-history-failed`);
    }
  }

  if (parsed.data.intent === "submit") {
    redirect(`/p/${parsed.data.slug}/dashboard?status=submitted`);
  }

  redirect(`/p/${parsed.data.slug}/submit?status=saved`);
}

function buildSubmissionPatch(
  answers: Record<string, unknown>,
  submission: {
    title: string;
    problemStatement: string | null;
    solutionDescription: string | null;
    demoUrl: string | null;
    githubUrl: string | null;
    aiUsageDisclosure: string | null;
  },
) {
  const techStack = findStringArray(answers, ["tech_stack", "technology_stack"]);

  return {
    title:
      findFirstString(answers, ["solution_title", "project_title", "submission_title", "title"]) ??
      submission.title,
    problem_statement:
      findFirstString(answers, [
        "problem_statement",
        "challenge_statement",
        "problem",
      ]) ?? submission.problemStatement,
    solution_description:
      findFirstString(answers, [
        "solution_description",
        "solution_summary",
        "proposed_solution",
        "describe_solution",
      ]) ?? submission.solutionDescription,
    demo_url:
      findFirstString(answers, [
        "demo_url",
        "demo_video",
        "video_link",
        "video_url",
      ]) ?? submission.demoUrl,
    github_url:
      findFirstString(answers, [
        "github_url",
        "repository_url",
        "repo_url",
        "code_repository",
      ]) ?? submission.githubUrl,
    ai_usage_disclosure:
      findFirstString(answers, [
        "ai_usage_disclosure",
        "ai_tools_used",
        "ai_disclosure",
      ]) ?? submission.aiUsageDisclosure,
    ...(techStack.length > 0 ? { tech_stack: techStack } : {}),
  };
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

function hasAnswerValue(fieldType: string, value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (fieldType === "consent_checkbox") {
    return value === true;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return value;
  }

  return Boolean(value);
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

function findStringArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      const items = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);

      if (items.length > 0) {
        return items;
      }
    }
  }

  return [];
}
