import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type AssetType = "registration_form" | "submission_form" | "judging_setup";

type RefineConfig = {
  assetType: AssetType;
  assetLabel: string;
  schemaName: string;
};

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  instruction?: string;
  currentPayload?: Record<string, unknown> | null;
  briefTitle?: string | null;
  detectedProgramType?: string | null;
  conversationTurns?: ConversationTurn[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function serveStructuredAssetRefine(config: RefineConfig) {
  serve(async (request) => {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAiApiKey) {
        return jsonResponse({ error: "OPENAI_API_KEY is not configured." }, 500);
      }

      const body = (await request.json()) as RequestBody;
      const prompt = buildPrompt(config, body);
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
          input: prompt,
          temperature: 0.2,
          text: {
            format: {
              type: "json_schema",
              name: config.schemaName,
              strict: false,
              schema: refineSchema(config.assetType),
            },
          },
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        console.error(`${config.schemaName} OpenAI failure`, {
          status: response.status,
          body: truncate(message),
        });
        return jsonResponse({ error: "Structured asset refinement failed." }, 502);
      }

      const payload = await response.json();
      const outputText = extractOutputText(payload);
      if (!outputText) {
        return jsonResponse({ error: "Model returned no structured output." }, 502);
      }

      const parsed = JSON.parse(outputText) as Record<string, unknown>;
      const normalized = normalize(config, parsed, body.currentPayload ?? {});

      return jsonResponse({
        ok: true,
        assistantMessage: normalized.assistantMessage,
        payload: normalized.payload,
        model: typeof payload.model === "string"
          ? payload.model
          : Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
        usage: payload.usage ?? null,
      });
    } catch (error) {
      console.error(`${config.schemaName} failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return jsonResponse(
        { error: error instanceof Error ? error.message : "Unknown function error." },
        500,
      );
    }
  });
}

function buildPrompt(config: RefineConfig, body: RequestBody) {
  return [
    `You are Innova, refining the ${config.assetLabel} stage for an enterprise innovation program.`,
    "Apply the PM instruction to the current draft. Preserve useful existing structure unless the PM asks to change it.",
    "Return JSON only. The AI drafts; humans approve; deterministic services execute later.",
    "",
    `Instruction: ${body.instruction ?? ""}`,
    `Brief title: ${body.briefTitle ?? "Innovation program"}`,
    `Program type: ${body.detectedProgramType ?? "Innovation program"}`,
    `Recent conversation: ${JSON.stringify(body.conversationTurns ?? [])}`,
    `Current payload JSON: ${JSON.stringify(body.currentPayload ?? {}, null, 2)}`,
    "",
    config.assetType === "judging_setup"
      ? "For judging, criteria weights in each round must sum to exactly 100."
      : "For forms, keep field keys snake_case and keep required consent where appropriate.",
  ].join("\n");
}

function refineSchema(assetType: AssetType) {
  if (assetType === "judging_setup") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["assistantMessage", "payload"],
      properties: {
        assistantMessage: { type: "string" },
        payload: {
          type: "object",
          additionalProperties: false,
          required: ["scorecardName", "scorecardDescription", "rounds"],
          properties: {
            scorecardName: { type: "string" },
            scorecardDescription: { type: "string" },
            rounds: { type: "array", items: { type: "object", additionalProperties: true } },
          },
        },
      },
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["assistantMessage", "payload"],
    properties: {
      assistantMessage: { type: "string" },
      payload: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "fields"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          fields: { type: "array", items: { type: "object", additionalProperties: true } },
        },
      },
    },
  };
}

function normalize(config: RefineConfig, value: Record<string, unknown>, fallback: Record<string, unknown>) {
  const payload = isRecord(value.payload) ? value.payload : fallback;
  return {
    assistantMessage:
      readString(value.assistantMessage) ||
      `I updated the ${config.assetLabel.toLowerCase()} based on your request.`,
    payload: config.assetType === "judging_setup"
      ? normalizeJudging(payload)
      : normalizeForm(payload, config.assetType),
  };
}

function normalizeForm(payload: Record<string, unknown>, assetType: AssetType) {
  const fields = Array.isArray(payload.fields)
    ? payload.fields.map(normalizeField).filter(Boolean)
    : [];
  const safeFields = fields.length > 0 ? fields : fallbackFormFields(assetType);
  if (assetType === "registration_form" && !safeFields.some((field) => field.type === "consent_checkbox")) {
    safeFields.push({
      key: "terms_consent",
      label: "I agree to the program terms.",
      type: "consent_checkbox",
      required: true,
    });
  }

  return {
    name: readString(payload.name) || "Program Form",
    description: readString(payload.description) || "Governed form draft for PM review.",
    fields: safeFields,
  };
}

function normalizeField(value: unknown) {
  if (!isRecord(value)) return null;
  const label = readString(value.label) || "Field";
  return {
    ...value,
    key: slug(readString(value.key) || label),
    label,
    type: readString(value.type) || "short_text",
    required: typeof value.required === "boolean" ? value.required : true,
  };
}

function fallbackFormFields(assetType: AssetType) {
  return assetType === "submission_form"
    ? [
        { key: "project_title", label: "Project title", type: "short_text", required: true },
        { key: "solution_overview", label: "Solution overview", type: "long_text", required: true },
      ]
    : [
        { key: "full_name", label: "Full name", type: "short_text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "terms_consent", label: "I agree to the program terms.", type: "consent_checkbox", required: true },
      ];
}

function normalizeJudging(payload: Record<string, unknown>) {
  const rounds = Array.isArray(payload.rounds)
    ? payload.rounds.map(normalizeRound).filter(Boolean)
    : [];
  return {
    scorecardName: readString(payload.scorecardName) || "Program Scorecard",
    scorecardDescription: readString(payload.scorecardDescription) || "Governed judging setup for PM review.",
    rounds: rounds.length > 0 ? rounds : [fallbackRound()],
  };
}

function normalizeRound(value: unknown, index: number) {
  if (!isRecord(value)) return null;
  const criteria = Array.isArray(value.criteria)
    ? value.criteria.map(normalizeCriterion).filter(Boolean)
    : [];
  return {
    ...value,
    name: readString(value.name) || `Round ${index + 1}`,
    roundOrder: typeof value.roundOrder === "number" ? value.roundOrder : index + 1,
    isBlindReview: typeof value.isBlindReview === "boolean" ? value.isBlindReview : index === 0,
    criteria: normalizeWeights(criteria.length > 0 ? criteria : fallbackRound().criteria),
  };
}

function normalizeCriterion(value: unknown) {
  if (!isRecord(value)) return null;
  const label = readString(value.label) || "Criterion";
  return {
    ...value,
    key: slug(readString(value.key) || label),
    label,
    description: readString(value.description) || "Evaluate this criterion consistently.",
    weight: typeof value.weight === "number" ? Math.max(0, Math.round(value.weight)) : 25,
  };
}

function normalizeWeights<T extends { weight: number }>(criteria: T[]) {
  if (criteria.length === 0) return criteria;
  const base = Math.floor(100 / criteria.length);
  return criteria.map((criterion, index) => ({
    ...criterion,
    weight: index === criteria.length - 1 ? 100 - base * (criteria.length - 1) : base,
  }));
}

function fallbackRound() {
  return {
    name: "Round 1 Review",
    roundOrder: 1,
    isBlindReview: true,
    criteria: normalizeWeights([
      { key: "innovation", label: "Innovation", description: "Originality and differentiation.", weight: 25 },
      { key: "feasibility", label: "Feasibility", description: "Realistic execution path.", weight: 25 },
      { key: "impact", label: "Impact", description: "Expected program value.", weight: 25 },
      { key: "clarity", label: "Clarity", description: "Communication quality.", weight: 25 },
    ]),
  };
}

function extractOutputText(payload: Record<string, unknown>) {
  const direct = payload.output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const output = payload.output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (!isRecord(part)) continue;
      const text = part.text ?? part.output_text;
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "field";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function truncate(value: string, maxLength = 800) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
