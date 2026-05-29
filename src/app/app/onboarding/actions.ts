"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspaceAccessRows } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSlugOrThrow } from "@/lib/utils/slugs";

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  organizationSlug: z.string().trim().max(120).optional(),
  workspaceName: z.string().trim().min(2).max(120),
  workspaceSlug: z.string().trim().max(120).optional(),
  billingEmail: z.email().optional().or(z.literal("")),
});

export type OnboardingActionState = {
  error: string | null;
};

const operatingDefaultsSchema = z.object({
  timezone: z.string().trim().min(1).max(120),
  participantSelfSignupAllowed: z.enum(["yes", "no"]),
  requireApprovalBeforePublish: z.enum(["yes", "no"]),
  programTypes: z.array(z.string().trim().min(1)).min(1).max(6),
});

export async function createWorkspaceOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be signed in to create an organization workspace.",
    };
  }

  const parsed = onboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
    organizationSlug: formData.get("organizationSlug"),
    workspaceName: formData.get("workspaceName"),
    workspaceSlug: formData.get("workspaceSlug"),
    billingEmail: formData.get("billingEmail"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid onboarding input.",
    };
  }

  try {
    const organizationSlug = parsed.data.organizationSlug
      ? ensureSlugOrThrow(parsed.data.organizationSlug, "Organization slug")
      : ensureSlugOrThrow(parsed.data.organizationName, "Organization slug");
    const workspaceSlug = parsed.data.workspaceSlug
      ? ensureSlugOrThrow(parsed.data.workspaceSlug, "Workspace slug")
      : ensureSlugOrThrow(parsed.data.workspaceName, "Workspace slug");

    const { error } = await supabase.rpc("bootstrap_workspace_onboarding", {
      billing_email_input: parsed.data.billingEmail || undefined,
      organization_name_input: parsed.data.organizationName,
      organization_slug_input: organizationSlug,
      workspace_name_input: parsed.data.workspaceName,
      workspace_slug_input: workspaceSlug,
    });

    if (error) {
      return {
        error:
          error.code === "23505"
            ? "One of those slugs is already in use. Choose a more specific workspace identity."
            : error.message,
      };
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create the initial organization workspace.",
    };
  }

  revalidatePath("/app");
  redirect("/app/onboarding");
}

function mergeWorkspaceAiSettings(
  current: unknown,
  nextOnboarding: {
    completedAt: string;
    timezone: string;
    participantSelfSignupAllowed: boolean;
    requireApprovalBeforePublish: boolean;
    programTypes: string[];
  },
) {
  const currentObject =
    typeof current === "object" && current !== null && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};

  return {
    ...currentObject,
    onboarding: nextOnboarding,
  };
}

export async function completeWorkspaceOnboardingDefaults(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be signed in to complete onboarding.",
    };
  }

  const parsed = operatingDefaultsSchema.safeParse({
    timezone: formData.get("timezone"),
    participantSelfSignupAllowed: formData.get("participantSelfSignupAllowed"),
    requireApprovalBeforePublish: formData.get("requireApprovalBeforePublish"),
    programTypes: formData.getAll("programTypes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid operating defaults.",
    };
  }

  try {
    const workspaces = await getWorkspaceAccessRows(supabase, user);
    const primaryWorkspace = workspaces[0];

    if (!primaryWorkspace) {
      return {
        error: "Create the initial workspace before saving operating defaults.",
      };
    }

    const nextAiSettings = mergeWorkspaceAiSettings(primaryWorkspace.aiSettings, {
      completedAt: new Date().toISOString(),
      timezone: parsed.data.timezone,
      participantSelfSignupAllowed: parsed.data.participantSelfSignupAllowed === "yes",
      requireApprovalBeforePublish: parsed.data.requireApprovalBeforePublish === "yes",
      programTypes: parsed.data.programTypes,
    });

    const { error } = await supabase
      .from("workspaces")
      .update({ ai_settings: nextAiSettings })
      .eq("id", primaryWorkspace.workspaceId);

    if (error) {
      return {
        error: error.message,
      };
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to save operating defaults.",
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/onboarding");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/create");
  redirect("/app/dashboard?status=onboarding-complete");
}
