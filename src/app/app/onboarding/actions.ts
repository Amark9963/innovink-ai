"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspaceAccessRows } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSlugOrThrow } from "@/lib/utils/slugs";

export type OnboardingActionState = {
  error: string | null;
};

const unifiedOnboardingSchema = z.object({
  organizationName: z.string().trim().min(2).max(120),
  workspaceName: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(1).max(120),
  programTypes: z.array(z.string().trim().min(1)).min(1).max(6),
});

// Creates the org+workspace and writes operating defaults in a single form
// submission. Redirects to the AI Workspace on success so the PM lands directly
// in the product without a dashboard stop.
export async function createWorkspaceWithDefaults(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a workspace." };
  }

  const parsed = unifiedOnboardingSchema.safeParse({
    organizationName: formData.get("organizationName"),
    workspaceName: formData.get("workspaceName"),
    timezone: formData.get("timezone"),
    programTypes: formData.getAll("programTypes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid setup input." };
  }

  try {
    const organizationSlug = ensureSlugOrThrow(
      parsed.data.organizationName,
      "Organization slug",
    );
    const workspaceSlug = ensureSlugOrThrow(
      parsed.data.workspaceName,
      "Workspace slug",
    );

    // Step 1 — create org + workspace + owner membership via RPC
    const { error: rpcError } = await supabase.rpc(
      "bootstrap_workspace_onboarding",
      {
        billing_email_input: undefined,
        organization_name_input: parsed.data.organizationName,
        organization_slug_input: organizationSlug,
        workspace_name_input: parsed.data.workspaceName,
        workspace_slug_input: workspaceSlug,
      },
    );

    if (rpcError) {
      return {
        error:
          rpcError.code === "23505"
            ? "That organization or workspace name is already taken. Choose a more specific name."
            : rpcError.message,
      };
    }

    // Step 2 — write operating defaults immediately.
    // participantSelfSignupAllowed and requireApprovalBeforePublish default to
    // true (sensible enterprise defaults); PMs can adjust in workspace settings.
    const workspaces = await getWorkspaceAccessRows(supabase, user);
    const primaryWorkspace = workspaces[0];

    if (primaryWorkspace) {
      const current =
        typeof primaryWorkspace.aiSettings === "object" &&
        primaryWorkspace.aiSettings !== null &&
        !Array.isArray(primaryWorkspace.aiSettings)
          ? (primaryWorkspace.aiSettings as Record<string, unknown>)
          : {};

      const aiSettings = {
        ...current,
        onboarding: {
          completedAt: new Date().toISOString(),
          timezone: parsed.data.timezone,
          participantSelfSignupAllowed: true,
          requireApprovalBeforePublish: true,
          programTypes: parsed.data.programTypes,
        },
      };

      await supabase
        .from("workspaces")
        .update({ ai_settings: aiSettings })
        .eq("id", primaryWorkspace.workspaceId);
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create the workspace. Please try again.",
    };
  }

  revalidatePath("/app");
  revalidatePath("/app/create");
  redirect("/app/create");
}
