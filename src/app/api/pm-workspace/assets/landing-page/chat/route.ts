import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";
import { getCurrentUserOrNull } from "@/lib/supabase/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  sessionId: z.uuid(),
  assetKey: z.string().trim().min(1).max(120),
  message: z.string().trim().min(8).max(2000),
});

type StreamEvent =
  | {
      type: "status";
      title: string;
      body: string;
    }
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      status: string;
    }
  | {
      type: "error";
      message: string;
    };

type LandingPageEditorHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

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

async function createAiRequestLog(params: {
  featureKey: string;
  requestedBy: string;
  organizationId: string | null;
  workspaceId: string;
  programId: string | null;
  requestPayload: Json;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ai_requests")
    .insert({
      feature_key: params.featureKey,
      requested_by: params.requestedBy,
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      program_id: params.programId,
      risk_level: "medium",
      status: "pending_review",
      request_payload: params.requestPayload,
    })
    .select("id")
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

async function finalizeAiRequestLog(params: {
  aiRequestId: string | null;
  outputPayload: Json;
  status: "generated" | "failed";
  workspaceId: string;
  organizationId: string | null;
  programId: string | null;
  featureKey: string;
  modelName?: string;
  tokenCount?: number | null;
}) {
  if (!params.aiRequestId) {
    return;
  }

  const supabase = await createSupabaseServerClient();

  await supabase
    .from("ai_requests")
    .update({
      status: params.status,
      output_payload: params.outputPayload,
    })
    .eq("id", params.aiRequestId);

  if (
    params.status === "generated" &&
    params.modelName &&
    typeof params.tokenCount === "number"
  ) {
    await supabase.from("ai_usage_events").insert({
      ai_request_id: params.aiRequestId,
      feature_key: params.featureKey,
      provider_name: "anthropic",
      model_name: params.modelName,
      token_count: params.tokenCount,
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      program_id: params.programId,
    });
  }
}

function isLandingPageEditorMessage(value: unknown, assetKey: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return payload.assetType === "landing_page" && payload.assetKey === assetKey;
}

function chunkAssistantText(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function buildFallbackAssistantMessage(params: {
  instruction: string;
  draftTitle: string;
  sectionCount: number;
}) {
  return `I updated ${params.draftTitle} based on your request: "${params.instruction}". The revised landing page now preserves ${params.sectionCount} structured sections and is ready for PM review before approvals.`;
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid landing page editor request.",
      },
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
      { error: "That landing page workspace could not be found." },
      { status: 404 },
    );
  }

  const [
    { data: briefRow, error: briefError },
    { data: artifactRow, error: artifactError },
    { data: messageRows, error: messageError },
  ] = await Promise.all([
    supabase
      .from("program_briefs")
      .select(
        "id, organization_id, workspace_id, program_id, title, detected_program_type, current_brief, active_plan_id",
      )
      .eq("id", session.brief_id)
      .single(),
    supabase
      .from("agent_artifacts")
      .select("id, title, summary, artifact_payload, artifact_type, status, created_at")
      .eq("session_id", parsed.data.sessionId)
      .eq("artifact_type", "landing_page")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agent_messages")
      .select("role, content_text, content_payload, created_at")
      .eq("session_id", parsed.data.sessionId)
      .order("created_at", { ascending: false })
      .limit(32),
  ]);

  if (briefError || !briefRow) {
    return NextResponse.json(
      { error: briefError?.message ?? "Program brief not found." },
      { status: 404 },
    );
  }

  if (artifactError || !artifactRow) {
    return NextResponse.json(
      { error: artifactError?.message ?? "Landing page draft not found." },
      { status: 404 },
    );
  }

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 });
  }

  const planRow = briefRow.active_plan_id
    ? (
        await supabase
          .from("program_plans")
          .select("id, title, summary")
          .eq("id", briefRow.active_plan_id)
          .maybeSingle()
      ).data
    : null;

  const editorHistory: LandingPageEditorHistoryTurn[] = (messageRows ?? [])
    .filter(
      (
        message,
      ): message is typeof message & {
        role: "user" | "assistant";
        content_text: string;
      } =>
        Boolean(message.content_text) &&
        (message.role === "user" || message.role === "assistant") &&
        isLandingPageEditorMessage(message.content_payload, parsed.data.assetKey),
    )
    .reverse()
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content_text ?? "",
    }));

  const aiRequestId = await createAiRequestLog({
    featureKey: "pm_asset_landing_page_refinement",
    requestedBy: user.id,
    organizationId: briefRow.organization_id,
    workspaceId: briefRow.workspace_id,
    programId: briefRow.program_id,
    requestPayload: toJson({
      sessionId: parsed.data.sessionId,
      assetKey: parsed.data.assetKey,
      instruction: parsed.data.message,
      artifactId: artifactRow.id,
      historyTurnCount: editorHistory.length,
    }),
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        await supabase.from("agent_messages").insert({
          session_id: parsed.data.sessionId,
          brief_id: briefRow.id,
          plan_id: briefRow.active_plan_id,
          role: "user",
          kind: "chat",
          content_text: parsed.data.message,
          content_payload: toJson({
            source: "landing_page_asset_editor",
            assetKey: parsed.data.assetKey,
            assetType: "landing_page",
            editorMode: "conversation",
          }),
          actor_user_id: user.id,
        });

        writeLine(controller, encoder, {
          type: "status",
          title: "Reviewing the current page draft",
          body: "Loading the latest landing page structure, recent editor turns, and the active program context before applying your request.",
        });

        writeLine(controller, encoder, {
          type: "status",
          title: "Refining layout, messaging, and branding",
          body: "Claude is rewriting the governed landing-page draft while preserving the approved program intent and section structure.",
        });

        const { data: refinementData, error: refinementError } =
          await supabase.functions.invoke("refine-landing-page-asset-draft", {
            body: {
              sessionId: parsed.data.sessionId,
              instruction: parsed.data.message,
              briefTitle: briefRow.title,
              detectedProgramType: briefRow.detected_program_type,
              currentBrief:
                briefRow.current_brief &&
                typeof briefRow.current_brief === "object" &&
                !Array.isArray(briefRow.current_brief)
                  ? (briefRow.current_brief as Record<string, unknown>)
                  : null,
              planTitle: planRow?.title ?? null,
              planSummary: planRow?.summary ?? null,
              currentDraft:
                artifactRow.artifact_payload &&
                typeof artifactRow.artifact_payload === "object" &&
                !Array.isArray(artifactRow.artifact_payload)
                  ? artifactRow.artifact_payload
                  : null,
              conversationTurns: editorHistory,
            },
          });

        if (refinementError || !refinementData?.draft) {
          const errorMessage =
            refinementError?.message ??
            "Landing page refinement did not return a structured draft.";

          await finalizeAiRequestLog({
            aiRequestId,
            featureKey: "pm_asset_landing_page_refinement",
            outputPayload: toJson({
              error: errorMessage,
            }),
            status: "failed",
            workspaceId: briefRow.workspace_id,
            organizationId: briefRow.organization_id,
            programId: briefRow.program_id,
          });

          writeLine(controller, encoder, {
            type: "error",
            message: errorMessage,
          });
          controller.close();
          return;
        }

        const refinedDraft = refinementData.draft as Record<string, unknown>;
        const sections = Array.isArray(refinedDraft.sections)
          ? refinedDraft.sections.length
          : 0;
        const draftTitle =
          typeof refinedDraft.title === "string" && refinedDraft.title.trim().length > 0
            ? refinedDraft.title
            : artifactRow.title ?? "Landing page draft";
        const assistantMessage =
          typeof refinementData.assistantMessage === "string" &&
          refinementData.assistantMessage.trim().length > 0
            ? refinementData.assistantMessage
            : buildFallbackAssistantMessage({
                instruction: parsed.data.message,
                draftTitle,
                sectionCount: sections,
              });

        writeLine(controller, encoder, {
          type: "status",
          title: "Saving the new revision",
          body: "Persisting the assistant turn and registering a governed landing-page draft revision for review.",
        });

        const { data: assistantMessageRow, error: assistantMessageError } =
          await supabase
            .from("agent_messages")
            .insert({
              session_id: parsed.data.sessionId,
              brief_id: briefRow.id,
              plan_id: briefRow.active_plan_id,
              role: "assistant",
              kind: "chat",
              content_text: assistantMessage,
              content_payload: toJson({
                source: "landing_page_asset_editor",
                assetKey: parsed.data.assetKey,
                assetType: "landing_page",
                editorMode: "conversation",
                primaryActionLabel: "Review landing page",
              }),
            })
            .select("id")
            .single();

        if (assistantMessageError || !assistantMessageRow) {
          throw new Error(
            assistantMessageError?.message ??
              "Unable to save the landing page editor assistant reply.",
          );
        }

        await supabase.from("agent_artifacts").insert({
          session_id: parsed.data.sessionId,
          run_id: null,
          task_id: null,
          organization_id: briefRow.organization_id,
          workspace_id: briefRow.workspace_id,
          program_id: briefRow.program_id,
          artifact_type: "landing_page",
          status: "ready_for_review",
          source_table: "agent_messages",
          source_id: assistantMessageRow.id,
          title: draftTitle,
          summary: assistantMessage,
          artifact_payload: refinedDraft as Json,
          created_by_run_id: null,
        });

        await supabase
          .from("agent_sessions")
          .update({
            last_message_at: new Date().toISOString(),
            session_metadata: toJson({
              surface: "pm_create_workspace",
              workspace_stage: "plan_in_progress",
              recommended_next_step: "Review landing page",
            }),
          })
          .eq("id", parsed.data.sessionId);

        await finalizeAiRequestLog({
          aiRequestId,
          featureKey: "pm_asset_landing_page_refinement",
          outputPayload: toJson({
            title: draftTitle,
            sectionCount: sections,
            assetType: "landing_page",
          }),
          status: "generated",
          workspaceId: briefRow.workspace_id,
          organizationId: briefRow.organization_id,
          programId: briefRow.program_id,
          modelName:
            typeof refinementData.model === "string"
              ? refinementData.model
              : undefined,
          tokenCount:
            typeof refinementData.usage?.output_tokens === "number" &&
            typeof refinementData.usage?.input_tokens === "number"
              ? refinementData.usage.output_tokens + refinementData.usage.input_tokens
              : undefined,
        });

        revalidatePath(`/app/create/${parsed.data.sessionId}/assets`);
        revalidatePath(
          `/app/create/${parsed.data.sessionId}/assets/${parsed.data.assetKey}`,
        );
        revalidatePath("/app/create");

        for (const chunk of chunkAssistantText(assistantMessage)) {
          writeLine(controller, encoder, {
            type: "delta",
            text: `${chunk} `,
          });
        }

        writeLine(controller, encoder, {
          type: "done",
          status: "landing-page-updated",
        });
        controller.close();
      } catch (error) {
        await finalizeAiRequestLog({
          aiRequestId,
          featureKey: "pm_asset_landing_page_refinement",
          outputPayload: toJson({
            error:
              error instanceof Error
                ? error.message
                : "Unknown landing page editor failure.",
          }),
          status: "failed",
          workspaceId: briefRow.workspace_id,
          organizationId: briefRow.organization_id,
          programId: briefRow.program_id,
        });

        writeLine(controller, encoder, {
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "The landing page editor could not complete that revision.",
        });
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
