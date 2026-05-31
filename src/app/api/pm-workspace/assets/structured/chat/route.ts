import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentUserOrNull } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ─── Schema ───────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  sessionId: z.uuid(),
  assetKey: z.string().trim().min(1).max(120),
  assetType: z.enum(["registration_form", "submission_form", "judging_setup"]),
  message: z.string().trim().min(2).max(2000),
});

// ─── Stream types ─────────────────────────────────────────────────────────────

type StreamEvent =
  | { type: "status"; title: string; body: string }
  | { type: "delta"; text: string }
  | { type: "done"; status: string; payload: unknown }
  | { type: "error"; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function writeLine(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: StreamEvent,
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
}

function chunkText(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const refineFunctionByAssetType = {
  registration_form: "refine-registration-form-draft",
  submission_form: "refine-submission-form-draft",
  judging_setup: "refine-judging-setup-draft",
} as const;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid structured asset editor request." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUserOrNull(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── Load session ────────────────────────────────────────────────────────────
  const { data: session, error: sessionError } = await supabase
    .from("agent_sessions")
    .select("id, brief_id, organization_id, workspace_id, program_id")
    .eq("id", parsed.data.sessionId)
    .eq("created_by", user.id)
    .single();

  if (sessionError || !session || !session.brief_id) {
    return NextResponse.json(
      { error: "Workspace session not found." },
      { status: 404 },
    );
  }

  // ── Load brief + artifact + recent messages in parallel ─────────────────────
  const [
    { data: briefRow, error: briefError },
    { data: artifactRow, error: artifactError },
    { data: messageRows },
  ] = await Promise.all([
    supabase
      .from("program_briefs")
      .select("id, organization_id, workspace_id, program_id, title, detected_program_type")
      .eq("id", session.brief_id)
      .single(),
    supabase
      .from("agent_artifacts")
      .select("id, title, artifact_payload, artifact_type, status, created_at")
      .eq("session_id", parsed.data.sessionId)
      .eq("artifact_type", parsed.data.assetType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agent_messages")
      .select("role, content_text, content_payload, created_at")
      .eq("session_id", parsed.data.sessionId)
      .order("created_at", { ascending: false })
      .limit(16),
  ]);

  if (briefError || !briefRow) {
    return NextResponse.json(
      { error: briefError?.message ?? "Program brief not found." },
      { status: 404 },
    );
  }

  if (artifactError || !artifactRow) {
    return NextResponse.json(
      { error: "Asset draft not found. Generate the asset first." },
      { status: 404 },
    );
  }

  // ── Build conversation context ───────────────────────────────────────────────
  const conversationTurns = (messageRows ?? [])
    .filter((m) => {
      if (m.role !== "user" && m.role !== "assistant") return false;
      if (!m.content_text) return false;
      const payload = m.content_payload as Record<string, unknown> | null;
      if (!payload) return true;
      // Only include messages that are about this asset type
      return (
        payload.assetType === parsed.data.assetType ||
        payload.assetKey === parsed.data.assetKey ||
        // Include general workspace messages too
        !payload.assetType
      );
    })
    .slice(0, 8)
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content_text as string,
    }));

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        // ── Save user message ────────────────────────────────────────────────
        await supabase.from("agent_messages").insert({
          session_id: parsed.data.sessionId,
          brief_id: session.brief_id,
          role: "user",
          kind: "chat",
          content_text: parsed.data.message,
          content_payload: toJson({
            source: "structured_asset_editor",
            assetType: parsed.data.assetType,
            assetKey: parsed.data.assetKey,
          }),
          actor_user_id: user.id,
        });

        writeLine(controller, encoder, {
          type: "status",
          title: assetTypeLabel(parsed.data.assetType),
          body: `Updating the ${assetTypeLabel(parsed.data.assetType).toLowerCase()} based on your instruction...`,
        });

        // ── Call the edge function ──────────────────────────────────────────
        const { data: fnResult, error: fnError } = await supabase.functions.invoke(
          refineFunctionByAssetType[parsed.data.assetType],
          {
            body: {
              sessionId: parsed.data.sessionId,
              instruction: parsed.data.message,
              assetType: parsed.data.assetType,
              currentPayload: artifactRow.artifact_payload,
              briefTitle: briefRow.title,
              detectedProgramType: briefRow.detected_program_type,
              conversationTurns,
            },
          },
        );

        if (fnError || !fnResult?.ok) {
          const errMsg = fnError?.message ?? fnResult?.error ?? "Asset refinement failed.";
          throw new Error(errMsg);
        }

        const refinedPayload = fnResult.payload as Record<string, unknown>;
        const assistantMessage: string =
          fnResult.assistantMessage ??
          `I updated the ${assetTypeLabel(parsed.data.assetType).toLowerCase()} based on your request.`;

        // ── Update the artifact with the refined payload ────────────────────
        await supabase
          .from("agent_artifacts")
          .update({
            artifact_payload: toJson(refinedPayload),
            status: "ready_for_review",
          })
          .eq("id", artifactRow.id);

        // ── Save assistant message ──────────────────────────────────────────
        await supabase.from("agent_messages").insert({
          session_id: parsed.data.sessionId,
          brief_id: session.brief_id,
          role: "assistant",
          kind: "chat",
          content_text: assistantMessage,
          content_payload: toJson({
            source: "structured_asset_editor",
            assetType: parsed.data.assetType,
            assetKey: parsed.data.assetKey,
            refinedPayload,
          }),
          model_name: fnResult.model ?? null,
        });

        await supabase
          .from("agent_sessions")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", parsed.data.sessionId);

        // ── Stream the assistant message as deltas ──────────────────────────
        for (const chunk of chunkText(assistantMessage)) {
          writeLine(controller, encoder, { type: "delta", text: chunk + " " });
          await delay(18);
        }

        revalidatePath("/app/create");
        writeLine(controller, encoder, {
          type: "done",
          status: "asset-refined",
          payload: refinedPayload,
        });
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The asset editor could not process that request.";
        writeLine(controller, encoder, { type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function assetTypeLabel(assetType: string): string {
  switch (assetType) {
    case "registration_form": return "Registration form";
    case "submission_form": return "Submission form";
    case "judging_setup": return "Judging setup";
    default: return "Asset";
  }
}
