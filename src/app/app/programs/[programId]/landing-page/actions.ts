"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureSlugOrThrow } from "@/lib/utils/slugs";

function redirectToManager(programId: string, searchParam?: string): never {
  redirect(
    `/app/programs/${programId}/landing-page${
      searchParam ? `?${searchParam}` : ""
    }`,
  );
}

const publishSchema = z.object({
  programId: z.uuid(),
  versionId: z.uuid(),
  publishedSlug: z.string().trim().min(1).max(120),
});

export async function createLandingPageDraftAction(formData: FormData) {
  const programId = String(formData.get("programId") ?? "");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("bootstrap_landing_page_draft", {
    program_id_input: programId,
  });

  if (error) {
    redirectToManager(programId, `error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/app/programs/${programId}/landing-page`);
  redirectToManager(programId, "status=draft-created");
}

export async function generateLandingPageDraftAction(formData: FormData) {
  const programId = String(formData.get("programId") ?? "");
  const supabase = await createSupabaseServerClient();

  const { data: draftData, error: draftError } = await supabase.rpc(
    "bootstrap_landing_page_draft",
    {
      program_id_input: programId,
    },
  );

  if (draftError) {
    redirectToManager(programId, `error=${encodeURIComponent(draftError.message)}`);
  }

  const draft = (
    draftData as
      | Array<{
          landing_page_id: string;
          landing_page_version_id: string;
          version_number: number;
        }>
      | null
  )?.[0];

  if (!draft) {
    redirectToManager(programId, "error=Unable%20to%20create%20landing%20page%20draft");
  }

  const { error: functionError } = await supabase.functions.invoke(
    "generate-landing-page-draft",
    {
      body: {
        programId,
        landingPageId: draft.landing_page_id,
        landingPageVersionId: draft.landing_page_version_id,
        versionNumber: draft.version_number,
      },
    },
  );

  if (functionError) {
    redirectToManager(programId, `error=${encodeURIComponent(functionError.message)}`);
  }

  revalidatePath(`/app/programs/${programId}/landing-page`);
  redirectToManager(programId, "status=ai-draft-generated");
}

export async function publishLandingPageAction(formData: FormData) {
  const parsed = publishSchema.safeParse({
    programId: formData.get("programId"),
    versionId: formData.get("versionId"),
    publishedSlug: formData.get("publishedSlug"),
  });

  if (!parsed.success) {
    const fallbackProgramId = String(formData.get("programId") ?? "");
    redirectToManager(
      fallbackProgramId,
      `error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid publish request.")}`,
    );
  }

  const values = parsed.data;
  const supabase = await createSupabaseServerClient();
  const normalizedSlug = ensureSlugOrThrow(values.publishedSlug, "Published slug");

  const { error } = await supabase.rpc("publish_landing_page_version", {
    program_id_input: values.programId,
    landing_page_version_id_input: values.versionId,
    published_slug_input: normalizedSlug,
  });

  if (error) {
    redirectToManager(
      values.programId,
      `error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/app/programs/${values.programId}/landing-page`);
  revalidatePath(`/p/${normalizedSlug}`);
  redirectToManager(values.programId, "status=published");
}
