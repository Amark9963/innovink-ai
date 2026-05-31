import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4.1.12";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openQuestionSchema = z.object({
  key: z.string().trim().min(1).max(60).catch("needs_confirmation"),
  question: z
    .string()
    .trim()
    .min(1)
    .max(280)
    .catch("What information should Innova confirm before continuing?"),
  whyItMatters: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .catch("This keeps the governed program setup accurate."),
  priority: z.enum(["high", "medium", "low"]).catch("medium"),
});

const fieldSchema = z.enum([
  "objective",
  "programType",
  "format",
  "targetParticipants",
  "regions",
  "teamPolicy",
  "timeline.registrationWindow",
  "timeline.submissionWindow",
  "timeline.liveProgramWindow",
  "evaluationModel",
  "mentoringModel",
  "sponsorVisibility",
  "deliverables",
  "risks",
  "brandColors.primary",
  "brandColors.accent",
  "brandColors.surface",
  "brandColors.paletteKey",
]);

const briefDeltaSchema = z.object({
  sessionTitle: z.string().trim().min(3).max(120).nullish(),
  assistantMessage: z.string().trim().min(1).max(2000).catch(
    "I captured the update. Please review the brief fields marked To be confirmed.",
  ),
  briefTitle: z.string().trim().min(3).max(140).nullish(),
  detectedProgramType: z.string().trim().min(2).max(80).nullish(),
  confidenceLevel: z.enum(["low", "medium", "high"]).nullish().catch("medium"),
  fieldUpdates: z
    .array(
      z.object({
        field: fieldSchema.catch("objective"),
        value: z.unknown(),
      }),
    )
    .max(16)
    .catch([]),
  assumptions: z.array(z.string().trim().min(1).max(200)).max(8).catch([]),
  resolvedQuestionKeys: z.array(z.string().trim().min(1).max(60)).max(8).catch([]),
  newQuestions: z.array(openQuestionSchema).max(8).catch([]),
  briefIsComplete: z.boolean().catch(false),
});

const requestSchema = z.object({
  input: z.object({
    workspaceName: z.string().trim().min(1).max(160),
    organizationName: z.string().trim().max(160).nullable().optional(),
    currentBrief: z.record(z.string(), z.unknown()),
    assumptions: z.array(z.string()).max(8),
    openQuestions: z.array(z.record(z.string(), z.unknown())).max(8),
    conversationContext: z
      .array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string().trim().min(1).max(3000),
        }),
      )
      .max(6),
    latestUserMessage: z.string().trim().min(1).max(3000),
    briefTitle: z.string().trim().max(140).nullable().optional(),
    detectedProgramType: z.string().trim().max(80).nullable().optional(),
  }),
});

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const authHeader = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase Edge Function secrets are not configured.");
    }

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    if (!openAiApiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY is not configured." }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Invalid user session." }, 401);
    }

    const parsed = requestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonResponse(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        400,
      );
    }

    const generated = await callOpenAiJson({
      apiKey: openAiApiKey,
      prompt: buildPrompt(parsed.data.input),
    });

    return jsonResponse(generated);
  } catch (error) {
    console.error("extract-brief-delta failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown function error." },
      500,
    );
  }
});

function buildPrompt(input: z.infer<typeof requestSchema>["input"]) {
  return [
    "You are Innova, an enterprise AI operating assistant for Innovink.",
    "Extract only the brief changes implied by the latest PM message.",
    "Do not regenerate the whole brief. Do not repeat unchanged fields.",
    "Return JSON only. The server will apply your delta deterministically.",
    "",
    "Allowed fieldUpdates:",
    "- String fields: objective, programType, format, teamPolicy, evaluationModel, mentoringModel, sponsorVisibility",
    "- String array fields: targetParticipants, regions, deliverables, risks",
    "- Timeline string fields: timeline.registrationWindow, timeline.submissionWindow, timeline.liveProgramWindow",
    "- Brand string fields: brandColors.primary, brandColors.accent, brandColors.surface, brandColors.paletteKey",
    "",
    "When updating an array field, return the complete desired array for that field after the change.",
    "If the PM answers an open question, include its key in resolvedQuestionKeys.",
    "If new critical information is missing, add at most 3 high-value newQuestions.",
    "briefIsComplete should be true only if there are no material blockers left for building the program setup.",
    "Never invent exact dates, prize amounts, legal rules, domain names, or judging criteria that the PM did not provide.",
    "Use locked PM-facing language: Accept, Make changes, Confirm & Apply. Avoid launch, deploy, approval packet, and execution plan in assistantMessage.",
    "",
    `Workspace: ${input.workspaceName}`,
    `Organization: ${input.organizationName ?? "Unknown organization"}`,
    `Current title: ${input.briefTitle ?? "Not set"}`,
    `Detected program type: ${input.detectedProgramType ?? "Not set"}`,
    `Current brief JSON: ${JSON.stringify(input.currentBrief, null, 2)}`,
    `Current assumptions JSON: ${JSON.stringify(input.assumptions, null, 2)}`,
    `Current open questions JSON: ${JSON.stringify(input.openQuestions, null, 2)}`,
    "",
    "Recent conversation context:",
    ...input.conversationContext.map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`),
    "",
    `Latest PM message: ${input.latestUserMessage}`,
  ].join("\n");
}

async function callOpenAiJson(params: { apiKey: string; prompt: string }) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
      input: [
        {
          role: "user",
          content: params.prompt,
        },
      ],
      temperature: 0.2,
      text: {
        format: {
          type: "json_schema",
          name: "brief_delta",
          schema: briefDeltaJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI brief delta call failed: ${errorText}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new Error("Model returned no brief delta output.");
  }

  const result = briefDeltaSchema.parse(safeJsonParse(extractJson(outputText)));

  return {
    result,
    model: (payload.model as string) ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
    usage: (payload.usage as Record<string, unknown>) ?? null,
  };
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return {
      assistantMessage: "I captured the update, but need one more detail before changing the governed brief.",
      fieldUpdates: [],
      resolvedQuestionKeys: [],
      newQuestions: [],
      briefIsComplete: false,
    };
  }
}

function extractOutputText(payload: Record<string, unknown>): string | null {
  const output = payload.output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (
      item &&
      typeof item === "object" &&
      "type" in item &&
      item.type === "message" &&
      "content" in item &&
      Array.isArray(item.content)
    ) {
      for (const block of item.content) {
        if (
          block &&
          typeof block === "object" &&
          "type" in block &&
          block.type === "output_text" &&
          "text" in block &&
          typeof block.text === "string"
        ) {
          return block.text.trim();
        }
      }
    }
  }
  return null;
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

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

const briefDeltaJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sessionTitle",
    "assistantMessage",
    "briefTitle",
    "detectedProgramType",
    "confidenceLevel",
    "fieldUpdates",
    "assumptions",
    "resolvedQuestionKeys",
    "newQuestions",
    "briefIsComplete",
  ],
  properties: {
    sessionTitle: { anyOf: [{ type: "string" }, { type: "null" }] },
    assistantMessage: { type: "string" },
    briefTitle: { anyOf: [{ type: "string" }, { type: "null" }] },
    detectedProgramType: { anyOf: [{ type: "string" }, { type: "null" }] },
    confidenceLevel: {
      anyOf: [
        { type: "string", enum: ["low", "medium", "high"] },
        { type: "null" },
      ],
    },
    fieldUpdates: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "value"],
        properties: {
          field: {
            type: "string",
            enum: fieldSchema.options,
          },
          value: {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
        },
      },
    },
    assumptions: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    resolvedQuestionKeys: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    newQuestions: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "question", "whyItMatters", "priority"],
        properties: {
          key: { type: "string" },
          question: { type: "string" },
          whyItMatters: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    briefIsComplete: { type: "boolean" },
  },
};
