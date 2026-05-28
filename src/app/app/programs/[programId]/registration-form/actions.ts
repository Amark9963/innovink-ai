"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectToManager(programId: string, searchParam?: string): never {
  redirect(
    `/app/programs/${programId}/registration-form${
      searchParam ? `?${searchParam}` : ""
    }`,
  );
}

const publishSchema = z.object({
  programId: z.uuid(),
  formId: z.uuid(),
});

export async function publishProgramRegistrationFormAction(formData: FormData) {
  const parsed = publishSchema.safeParse({
    programId: formData.get("programId"),
    formId: formData.get("formId"),
  });

  if (!parsed.success) {
    const fallbackProgramId = String(formData.get("programId") ?? "");
    redirectToManager(
      fallbackProgramId,
      `error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid publish request.")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("forms")
    .update({
      status: "active",
    })
    .eq("id", parsed.data.formId)
    .eq("program_id", parsed.data.programId)
    .eq("kind", "registration")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectToManager(
      parsed.data.programId,
      `error=${encodeURIComponent(error?.message ?? "Unable to publish the registration form.")}`,
    );
  }

  revalidatePath(`/app/programs/${parsed.data.programId}/registration-form`);
  redirectToManager(parsed.data.programId, "status=form-published");
}
