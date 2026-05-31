import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentUserOrNull } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  sessionId: z.uuid(),
  assetKey: z.string().trim().min(1).max(120),
});

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid landing page undo request." },
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

  const { data: artifacts, error: artifactError } = await supabase
    .from("agent_artifacts")
    .select("id, title, artifact_payload")
    .eq("session_id", parsed.data.sessionId)
    .eq("artifact_type", "landing_page")
    .order("created_at", { ascending: false })
    .limit(2);

  if (artifactError) {
    return NextResponse.json({ error: artifactError.message }, { status: 500 });
  }

  const currentArtifact = artifacts?.[0] ?? null;
  const previousArtifact = artifacts?.[1] ?? null;
  const previousPayload = asRecord(previousArtifact?.artifact_payload);

  if (!currentArtifact || !previousArtifact || !previousPayload) {
    return NextResponse.json(
      { error: "There is no previous landing page revision to restore." },
      { status: 409 },
    );
  }

  const restoredPayload = {
    ...previousPayload,
    restoredAt: new Date().toISOString(),
    revisionSummary: "Previous landing-page revision restored by the PM.",
  };

  const { data: restoredArtifact, error: insertError } = await supabase
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
      source_id: currentArtifact.id,
      title: previousArtifact.title ?? currentArtifact.title ?? "Landing page draft",
      summary: "Previous landing-page revision restored by the PM.",
      artifact_payload: toJson(restoredPayload),
      version_label: "restored",
      created_by_run_id: null,
    })
    .select("id")
    .single();

  if (insertError || !restoredArtifact) {
    return NextResponse.json(
      { error: insertError?.message ?? "Unable to restore landing page revision." },
      { status: 500 },
    );
  }

  revalidatePath("/app/create");
  revalidatePath(`/app/create/${parsed.data.sessionId}/assets`);
  revalidatePath(`/app/create/${parsed.data.sessionId}/assets/${parsed.data.assetKey}`);

  return NextResponse.json({
    artifactId: restoredArtifact.id,
    draftPayload: restoredPayload,
    status: "restored",
  });
}
