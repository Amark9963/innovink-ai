import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentUserOrNull } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  sessionId: z.uuid(),
  assetKey: z.string().trim().min(1).max(120),
  draftPayload: z.record(z.string(), z.unknown()),
});

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function getDraftTitle(payload: Record<string, unknown>, fallback: string | null) {
  return typeof payload.title === "string" && payload.title.trim().length > 0
    ? payload.title.trim()
    : fallback ?? "Landing page draft";
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid landing page save request." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("agent_sessions")
    .select("id, brief_id, organization_id, workspace_id, program_id")
    .eq("id", parsed.data.sessionId)
    .eq("created_by", user.id)
    .single();

  if (sessionError || !session || !session.brief_id) {
    return NextResponse.json(
      { error: sessionError?.message ?? "That landing page workspace could not be found." },
      { status: 404 },
    );
  }

  const { data: latestArtifact, error: artifactError } = await supabase
    .from("agent_artifacts")
    .select("id, title")
    .eq("session_id", parsed.data.sessionId)
    .eq("artifact_type", "landing_page")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (artifactError || !latestArtifact) {
    return NextResponse.json(
      { error: artifactError?.message ?? "Landing page draft not found." },
      { status: 404 },
    );
  }

  const draftTitle = getDraftTitle(parsed.data.draftPayload, latestArtifact.title);
  const savedAt = new Date().toISOString();

  const { data: savedArtifact, error: insertError } = await supabase
    .from("agent_artifacts")
    .insert({
      session_id: parsed.data.sessionId,
      run_id: null,
      task_id: null,
      organization_id: session.organization_id,
      workspace_id: session.workspace_id,
      program_id: session.program_id,
      artifact_type: "landing_page",
      status: "ready_for_review",
      source_table: "agent_artifacts",
      source_id: latestArtifact.id,
      title: draftTitle,
      summary: "Manual inline landing-page edits saved by the PM.",
      artifact_payload: toJson({
        ...parsed.data.draftPayload,
        savedAt,
        revisionSummary: "Manual inline landing-page edits saved by the PM.",
      }),
      version_label: "manual-save",
      created_by_run_id: null,
    })
    .select("id")
    .single();

  if (insertError || !savedArtifact) {
    return NextResponse.json(
      { error: insertError?.message ?? "Unable to save landing page draft." },
      { status: 500 },
    );
  }

  revalidatePath("/app/create");
  revalidatePath(`/app/create/${parsed.data.sessionId}/assets`);
  revalidatePath(`/app/create/${parsed.data.sessionId}/assets/${parsed.data.assetKey}`);

  return NextResponse.json({
    artifactId: savedArtifact.id,
    status: "saved",
  });
}
