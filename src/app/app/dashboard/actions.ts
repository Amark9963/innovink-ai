"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSlugOrThrow } from "@/lib/utils/slugs";

const programCreationSchema = z
  .object({
    workspaceId: z.uuid(),
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().max(120).optional(),
    programType: z.string().trim().min(2).max(80),
    shortDescription: z.string().trim().max(240).optional(),
    visibility: z.enum(["private", "workspace", "organization", "public"]),
    startsAt: z.string().trim().optional(),
    registrationOpensAt: z.string().trim().optional(),
    registrationClosesAt: z.string().trim().optional(),
    submissionClosesAt: z.string().trim().optional(),
    endsAt: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    const registrationOpen = toIsoOrNull(value.registrationOpensAt);
    const registrationClose = toIsoOrNull(value.registrationClosesAt);
    const submissionClose = toIsoOrNull(value.submissionClosesAt);
    const startsAt = toIsoOrNull(value.startsAt);
    const endsAt = toIsoOrNull(value.endsAt);

    if (registrationOpen && registrationClose && registrationClose < registrationOpen) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Registration close must be after registration open.",
        path: ["registrationClosesAt"],
      });
    }

    if (startsAt && endsAt && endsAt < startsAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Program end must be after the program start.",
        path: ["endsAt"],
      });
    }

    if (registrationClose && submissionClose && submissionClose < registrationClose) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Submission close must not be earlier than registration close.",
        path: ["submissionClosesAt"],
      });
    }
  });

export type CreateProgramActionState = {
  error: string | null;
};

function toIsoOrNull(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export async function createProgramAction(
  _previousState: CreateProgramActionState,
  formData: FormData,
): Promise<CreateProgramActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be signed in to create a program.",
    };
  }

  const parsed = programCreationSchema.safeParse({
    workspaceId: formData.get("workspaceId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    programType: formData.get("programType"),
    shortDescription: formData.get("shortDescription"),
    visibility: formData.get("visibility"),
    startsAt: formData.get("startsAt"),
    registrationOpensAt: formData.get("registrationOpensAt"),
    registrationClosesAt: formData.get("registrationClosesAt"),
    submissionClosesAt: formData.get("submissionClosesAt"),
    endsAt: formData.get("endsAt"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid program input.",
    };
  }

  const normalizedSlug = parsed.data.slug
    ? ensureSlugOrThrow(parsed.data.slug, "Program slug")
    : ensureSlugOrThrow(parsed.data.name, "Program slug");

  const { error } = await supabase.rpc("bootstrap_program_creation", {
    workspace_id_input: parsed.data.workspaceId,
    name_input: parsed.data.name,
    slug_input: normalizedSlug,
    program_type_input: parsed.data.programType,
    short_description_input: parsed.data.shortDescription || undefined,
    visibility_input: parsed.data.visibility,
    starts_at_input: toIsoOrNull(parsed.data.startsAt) ?? undefined,
    registration_opens_at_input: toIsoOrNull(parsed.data.registrationOpensAt) ?? undefined,
    registration_closes_at_input:
      toIsoOrNull(parsed.data.registrationClosesAt) ?? undefined,
    submission_closes_at_input:
      toIsoOrNull(parsed.data.submissionClosesAt) ?? undefined,
    ends_at_input: toIsoOrNull(parsed.data.endsAt) ?? undefined,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "That program slug is already in use for this environment."
          : error.message,
    };
  }

  revalidatePath("/app/dashboard");
  return {
    error: null,
  };
}
