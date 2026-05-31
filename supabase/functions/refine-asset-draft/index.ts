import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type SupportedAssetType = "registration_form" | "submission_form" | "judging_setup";

type FormField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  choices?: Array<{ key: string; label: string; value: string }>;
};

type FormPayload = {
  name: string;
  description: string;
  fields: FormField[];
};

type JudgingCriterion = {
  key: string;
  label: string;
  description: string;
  weight: number;
};

type JudgingRound = {
  name: string;
  roundOrder: number;
  isBlindReview: boolean;
  criteria: JudgingCriterion[];
};

type JudgingPayload = {
  scorecardName: string;
  scorecardDescription: string;
  rounds: JudgingRound[];
};

type StructuredAssetPayload = FormPayload | JudgingPayload;

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  sessionId?: string;
  instruction?: string;
  assetType?: SupportedAssetType;
  currentPayload?: StructuredAssetPayload | null;
  briefTitle?: string | null;
  detectedProgramType?: string | null;
  conversationTurns?: ConversationTurn[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractTextContent(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  return content
    .map((block) =>
      isRecord(block) && block.type === "text" && typeof block.text === "string"
        ? block.text
        : "",
    )
    .join("")
    .trim() || null;
}

function extractJson(text: string): string {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model did not return a valid JSON object.");
  }
  return cleaned.slice(first, last + 1);
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildFormPrompt(body: RequestBody, assetLabel: string): string {
  return [
    `You are refining a pre-execution ${assetLabel} draft for an enterprise innovation program inside Innovink.`,
    "Apply the PM's instruction to the current form fields. Preserve existing fields unless the instruction asks to remove or replace them.",
    "You may: add new fields, remove fields, rename labels, change field types (short_text, long_text, email, url, dropdown, consent_checkbox, pitch_deck_upload), reorder fields, update placeholder or helpText.",
    "Always keep at least one consent or terms field in registration forms.",
    "Use snake_case for all field keys.",
    "Return JSON only. The top-level object must contain assistantMessage (string) and payload (FormPayload object).",
    "",
    `Instruction: ${body.instruction ?? ""}`,
    `Brief title: ${body.briefTitle ?? "Unknown program"}`,
    `Program type: ${body.detectedProgramType ?? ""}`,
    `Recent conversation: ${JSON.stringify(body.conversationTurns ?? [])}`,
    `Current form payload: ${JSON.stringify(body.currentPayload ?? {})}`,
    "",
    "Required JSON schema:",
    JSON.stringify({
      type: "object",
      required: ["assistantMessage", "payload"],
      properties: {
        assistantMessage: { type: "string" },
        payload: {
          type: "object",
          required: ["name", "description", "fields"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            fields: {
              type: "array",
              items: {
                type: "object",
                required: ["key", "label", "type", "required"],
                properties: {
                  key: { type: "string" },
                  label: { type: "string" },
                  type: {
                    type: "string",
                    enum: [
                      "short_text", "long_text", "email", "url",
                      "dropdown", "consent_checkbox", "pitch_deck_upload",
                    ],
                  },
                  required: { type: "boolean" },
                  placeholder: { type: "string" },
                  helpText: { type: "string" },
                  choices: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["key", "label", "value"],
                      properties: {
                        key: { type: "string" },
                        label: { type: "string" },
                        value: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ].join("\n");
}

function buildJudgingPrompt(body: RequestBody): string {
  return [
    "You are refining a pre-execution judging setup for an enterprise innovation program inside Innovink.",
    "Apply the PM's instruction to the current rounds and criteria. Preserve existing structure unless explicitly changed.",
    "You may: rename criteria, change descriptions, adjust weights (must sum to exactly 100 per round), add/remove criteria, add/remove rounds, rename rounds, change isBlindReview.",
    "IMPORTANT: criteria weights within each round must sum to exactly 100.",
    "Return JSON only. The top-level object must contain assistantMessage (string) and payload (JudgingPayload object).",
    "",
    `Instruction: ${body.instruction ?? ""}`,
    `Brief title: ${body.briefTitle ?? "Unknown program"}`,
    `Program type: ${body.detectedProgramType ?? ""}`,
    `Recent conversation: ${JSON.stringify(body.conversationTurns ?? [])}`,
    `Current judging payload: ${JSON.stringify(body.currentPayload ?? {})}`,
    "",
    "Required JSON schema:",
    JSON.stringify({
      type: "object",
      required: ["assistantMessage", "payload"],
      properties: {
        assistantMessage: { type: "string" },
        payload: {
          type: "object",
          required: ["scorecardName", "scorecardDescription", "rounds"],
          properties: {
            scorecardName: { type: "string" },
            scorecardDescription: { type: "string" },
            rounds: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                required: ["name", "roundOrder", "isBlindReview", "criteria"],
                properties: {
                  name: { type: "string" },
                  roundOrder: { type: "integer" },
                  isBlindReview: { type: "boolean" },
                  criteria: {
                    type: "array",
                    minItems: 2,
                    items: {
                      type: "object",
                      required: ["key", "label", "description", "weight"],
                      properties: {
                        key: { type: "string" },
                        label: { type: "string" },
                        description: { type: "string" },
                        weight: { type: "integer", minimum: 1, maximum: 100 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ].join("\n");
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const authHeader = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase Edge Function secrets are not configured.");
    }
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }
    if (!anthropicApiKey) {
      return jsonResponse({ error: "ANTHROPIC_API_KEY is not configured." }, 500);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Invalid user session." }, 401);
    }

    const body = (await request.json()) as RequestBody;

    if (!body.sessionId || !body.instruction || !body.assetType || !body.currentPayload) {
      return jsonResponse(
        { error: "sessionId, instruction, assetType, and currentPayload are required." },
        400,
      );
    }

    const supportedTypes: SupportedAssetType[] = [
      "registration_form",
      "submission_form",
      "judging_setup",
    ];

    if (!supportedTypes.includes(body.assetType)) {
      return jsonResponse(
        { error: `Unsupported asset type: ${body.assetType}. Use registration_form, submission_form, or judging_setup.` },
        400,
      );
    }

    // Build the refinement prompt
    let prompt: string;
    if (body.assetType === "judging_setup") {
      prompt = buildJudgingPrompt(body);
    } else {
      const label =
        body.assetType === "registration_form" ? "registration form" : "submission form";
      prompt = buildFormPrompt(body, label);
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514",
        system:
          "You are an enterprise program configuration assistant inside Innovink. Always return valid JSON matching the requested schema exactly. No markdown fences, no commentary outside the JSON object.",
        temperature: 0.2,
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      return jsonResponse(
        { error: "Asset refinement model call failed.", details: errorText },
        502,
      );
    }

    const anthropicPayload = await anthropicResponse.json();
    const outputText = extractTextContent(anthropicPayload.content);

    if (!outputText) {
      return jsonResponse({ error: "Model returned no structured output." }, 502);
    }

    const fallbackMessage =
      body.assetType === "judging_setup"
        ? `I updated the judging setup based on your request: "${body.instruction}". Review the revised rounds and criteria.`
        : `I updated the form based on your request: "${body.instruction}". Review the revised fields.`;
    const parsed = safeParseRefinementOutput(outputText);
    const payload = isRecord(parsed.payload) ? parsed.payload : body.currentPayload;

    return jsonResponse({
      ok: true,
      payload,
      assistantMessage: (parsed.assistantMessage ?? fallbackMessage).trim(),
      model:
        anthropicPayload.model ??
        Deno.env.get("ANTHROPIC_MODEL") ??
        "claude-sonnet-4-20250514",
      usage: anthropicPayload.usage ?? null,
    });
  } catch (error) {
    console.error("refine-asset-draft failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      {
        error: "Asset refinement could not be completed.",
      },
      500,
    );
  }
});

function safeParseRefinementOutput(outputText: string): {
  assistantMessage?: string;
  payload?: unknown;
} {
  try {
    return JSON.parse(extractJson(outputText)) as {
      assistantMessage?: string;
      payload?: unknown;
    };
  } catch {
    return {};
  }
}
