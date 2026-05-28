"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectToManager(
  programId: string,
  sponsorId?: string | null,
  searchParam?: string,
): never {
  const params = new URLSearchParams();

  if (sponsorId) {
    params.set("sponsor", sponsorId);
  }

  if (searchParam) {
    const extra = new URLSearchParams(searchParam);
    extra.forEach((value, key) => params.set(key, value));
  }

  const query = params.toString();
  redirect(`/app/programs/${programId}/sponsor-report${query ? `?${query}` : ""}`);
}

const sponsorReportActionSchema = z.object({
  programId: z.uuid(),
  sponsorId: z.uuid(),
  generatedReportId: z.uuid(),
});

export async function scheduleSponsorReportAction(formData: FormData) {
  const parsed = sponsorReportActionSchema.safeParse({
    programId: formData.get("programId"),
    sponsorId: formData.get("sponsorId"),
    generatedReportId: formData.get("generatedReportId"),
  });

  if (!parsed.success) {
    const fallbackProgramId = String(formData.get("programId") ?? "");
    const fallbackSponsorId = String(formData.get("sponsorId") ?? "");
    redirectToManager(
      fallbackProgramId,
      fallbackSponsorId,
      `error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid sponsor report request.")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("generated_reports")
    .update({
      status: "approved",
    })
    .eq("id", parsed.data.generatedReportId)
    .eq("program_id", parsed.data.programId);

  if (error) {
    redirectToManager(
      parsed.data.programId,
      parsed.data.sponsorId,
      `error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/app/programs/${parsed.data.programId}/sponsor-report`);
  redirectToManager(
    parsed.data.programId,
    parsed.data.sponsorId,
    "status=report-scheduled",
  );
}

export async function sendSponsorReportNowAction(formData: FormData) {
  const parsed = sponsorReportActionSchema.safeParse({
    programId: formData.get("programId"),
    sponsorId: formData.get("sponsorId"),
    generatedReportId: formData.get("generatedReportId"),
  });

  if (!parsed.success) {
    const fallbackProgramId = String(formData.get("programId") ?? "");
    const fallbackSponsorId = String(formData.get("sponsorId") ?? "");
    redirectToManager(
      fallbackProgramId,
      fallbackSponsorId,
      `error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid sponsor report send request.")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("generated_reports")
    .update({
      status: "published",
    })
    .eq("id", parsed.data.generatedReportId)
    .eq("program_id", parsed.data.programId);

  if (error) {
    redirectToManager(
      parsed.data.programId,
      parsed.data.sponsorId,
      `error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath(`/app/programs/${parsed.data.programId}/sponsor-report`);
  redirectToManager(
    parsed.data.programId,
    parsed.data.sponsorId,
    "status=report-marked-sent",
  );
}
