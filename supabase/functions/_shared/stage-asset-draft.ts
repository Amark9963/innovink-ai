import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type AssetType = "registration_form" | "submission_form" | "judging_setup";

type StageDraftConfig = {
  assetType: AssetType;
  assetLabel: string;
  schemaName: string;
};

type RequestBody = {
  workspaceName?: string | null;
  organizationName?: string | null;
  briefTitle?: string | null;
  detectedProgramType?: string | null;
  structuredBrief?: Record<string, unknown> | null;
  planTitle?: string | null;
  planSummary?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function serveStageAssetDraft(config: StageDraftConfig) {
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
          temperature: 0.25,
          text: {
            format: {
              type: "json_schema",
              name: config.schemaName,
              strict: false,
              schema: stageDraftJsonSchema(config.assetType),
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
        return jsonResponse({ error: "Stage draft generation failed." }, 502);
      }

      const payload = await response.json();
      const outputText = extractOutputText(payload);
      if (!outputText) {
        return jsonResponse({ error: "Model returned no structured output." }, 502);
      }

      const parsed = JSON.parse(outputText) as Record<string, unknown>;
      const result = normalizeStageDraft(config, parsed, body);

      return jsonResponse({
        result,
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

function buildPrompt(config: StageDraftConfig, body: RequestBody) {
  return [
    `You are Innova, creating the ${config.assetLabel} stage for an enterprise Innovink program.`,
    "Generate a governed draft artifact for PM review. The AI drafts; humans approve; deterministic services execute later.",
    "Be corporate, operationally precise, and avoid fake legal language or invented hard constraints.",
    "Return JSON only. Follow the schema exactly.",
    "",
    `Workspace: ${body.workspaceName ?? "Unknown workspace"}`,
    `Organization: ${body.organizationName ?? "Unknown organization"}`,
    `Brief title: ${body.briefTitle ?? "Innovation program"}`,
    `Program type: ${body.detectedProgramType ?? "Innovation program"}`,
    `Plan title: ${body.planTitle ?? "Program setup plan"}`,
    `Plan summary: ${body.planSummary ?? ""}`,
    `Structured brief JSON: ${JSON.stringify(body.structuredBrief ?? {}, null, 2)}`,
    "",
    stageInstructions(config.assetType),
  ].join("\n");
}

function stageInstructions(assetType: AssetType) {
  if (assetType === "registration_form") {
    return [
      "Registration form requirements:",
      "- Include identity, email, organization/team, region or eligibility, motivation, and consent.",
      "- Respect team policy and participant eligibility from the brief.",
      "- Include at least one consent_checkbox field.",
      "- Use snake_case field keys.",
    ].join("\n");
  }

  if (assetType === "submission_form") {
    return [
      "Submission form requirements:",
      "- Include project title, summary, problem, solution, innovation, impact, evidence, and optional demo URL.",
      "- Include one upload-style field when appropriate.",
      "- Make fields judging-ready and sponsor-safe.",
      "- Use snake_case field keys.",
    ].join("\n");
  }

  return [
    "Judging setup requirements:",
    "- Include one or two rounds based on the brief.",
    "- Each round needs at least three criteria.",
    "- Weights for each round must sum to exactly 100.",
    "- Criteria should be specific, fair, and usable by judges.",
    "- Use snake_case criterion keys.",
  ].join("\n");
}

function stageDraftJsonSchema(assetType: AssetType) {
  if (assetType === "judging_setup") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["assistantMessage", "title", "summary", "payload"],
      properties: {
        assistantMessage: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        payload: {
          type: "object",
          additionalProperties: false,
          required: ["scorecardName", "scorecardDescription", "rounds"],
          properties: {
            scorecardName: { type: "string" },
            scorecardDescription: { type: "string" },
            rounds: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "roundOrder", "isBlindReview", "criteria"],
                properties: {
                  name: { type: "string" },
                  roundOrder: { type: "integer" },
                  isBlindReview: { type: "boolean" },
                  criteria: {
                    type: "array",
                    minItems: 3,
                    maxItems: 8,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["key", "label", "description", "weight"],
                      properties: {
                        key: { type: "string" },
                        label: { type: "string" },
                        description: { type: "string" },
                        weight: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["assistantMessage", "title", "summary", "payload"],
    properties: {
      assistantMessage: { type: "string" },
      title: { type: "string" },
      summary: { type: "string" },
      payload: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "fields"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          fields: {
            type: "array",
            minItems: 4,
            maxItems: 16,
            items: {
              type: "object",
              additionalProperties: true,
              required: ["key", "label", "type", "required"],
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                type: { type: "string" },
                required: { type: "boolean" },
                placeholder: { type: "string" },
                helpText: { type: "string" },
                choices: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
      },
    },
  };
}

function normalizeStageDraft(
  config: StageDraftConfig,
  value: Record<string, unknown>,
  body: RequestBody,
) {
  const titleBase = readString(body.briefTitle) || "Innovation Program";
  const payload = isRecord(value.payload) ? value.payload : {};

  return {
    assistantMessage:
      readString(value.assistantMessage) ||
      `${config.assetLabel} draft is ready for PM review.`,
    title:
      readString(value.title) ||
      `${titleBase} ${config.assetLabel} Draft`,
    summary:
      readString(value.summary) ||
      `A governed ${config.assetLabel.toLowerCase()} draft is ready for review.`,
    payload:
      config.assetType === "judging_setup"
        ? normalizeJudgingPayload(payload, titleBase)
        : normalizeFormPayload(payload, titleBase, config.assetLabel, config.assetType),
  };
}

function normalizeFormPayload(
  payload: Record<string, unknown>,
  titleBase: string,
  assetLabel: string,
  assetType: AssetType,
) {
  const fields = Array.isArray(payload.fields)
    ? payload.fields.map(normalizeField).filter(Boolean)
    : [];
  const safeFields = fields.length > 0 ? fields : fallbackFields(assetType);

  if (assetType === "registration_form" && !safeFields.some((field) => field.type === "consent_checkbox")) {
    safeFields.push({
      key: "terms_consent",
      label: "I confirm the information is accurate and agree to the program terms.",
      type: "consent_checkbox",
      required: true,
    });
  }

  return {
    name: readString(payload.name) || `${titleBase} ${assetLabel}`,
    description:
      readString(payload.description) ||
      `Review and refine the generated ${assetLabel.toLowerCase()} before approval.`,
    fields: safeFields,
  };
}

function normalizeField(value: unknown) {
  if (!isRecord(value)) return null;
  const key = slug(readString(value.key) || readString(value.label) || "field");
  const label = readString(value.label) || key.replaceAll("_", " ");
  const type = readString(value.type) || "short_text";
  return {
    key,
    label,
    type,
    required: typeof value.required === "boolean" ? value.required : true,
    ...(readString(value.placeholder) ? { placeholder: readString(value.placeholder) } : {}),
    ...(readString(value.helpText) ? { helpText: readString(value.helpText) } : {}),
    ...(Array.isArray(value.choices) ? { choices: value.choices } : {}),
  };
}

function fallbackFields(assetType: AssetType) {
  if (assetType === "submission_form") {
    return [
      { key: "project_title", label: "Project title", type: "short_text", required: true },
      { key: "summary", label: "One-line summary", type: "short_text", required: true },
      { key: "problem", label: "Problem statement", type: "long_text", required: true },
      { key: "solution", label: "Solution overview", type: "long_text", required: true },
      { key: "evidence", label: "Evidence or prototype link", type: "url", required: false },
    ];
  }

  return [
    { key: "full_name", label: "Full name", type: "short_text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "organization", label: "Organization or team", type: "short_text", required: true },
    { key: "motivation", label: "Motivation", type: "long_text", required: true },
    { key: "terms_consent", label: "I agree to the program terms.", type: "consent_checkbox", required: true },
  ];
}

function normalizeJudgingPayload(payload: Record<string, unknown>, titleBase: string) {
  const rounds = Array.isArray(payload.rounds)
    ? payload.rounds.map(normalizeRound).filter(Boolean)
    : [];

  return {
    scorecardName: readString(payload.scorecardName) || `${titleBase} Scorecard`,
    scorecardDescription:
      readString(payload.scorecardDescription) ||
      "Governed judging setup generated from the current brief and plan.",
    rounds: rounds.length > 0 ? rounds : [fallbackRound()],
  };
}

function normalizeRound(value: unknown, index: number) {
  if (!isRecord(value)) return null;
  const criteria = Array.isArray(value.criteria)
    ? value.criteria.map(normalizeCriterion).filter(Boolean)
    : [];
  return {
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
      { key: "innovation_strength", label: "Innovation strength", description: "Originality and differentiation.", weight: 25 },
      { key: "feasibility", label: "Feasibility", description: "Realistic execution path.", weight: 25 },
      { key: "impact", label: "Impact potential", description: "Expected program value.", weight: 25 },
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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "field";
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
