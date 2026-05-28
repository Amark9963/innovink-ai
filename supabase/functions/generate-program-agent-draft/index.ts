import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4.1.12";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const openQuestionSchema = z.object({
  key: z.string().trim().min(1).max(60),
  question: z.string().trim().min(1).max(280),
  whyItMatters: z.string().trim().min(1).max(200),
  priority: z.enum(["high", "medium", "low"]),
});

const programBriefDraftSchema = z.object({
  sessionTitle: z.string().trim().min(3).max(120),
  assistantMessage: z.string().trim().min(1).max(4000),
  briefTitle: z.string().trim().min(3).max(140),
  detectedProgramType: z.string().trim().min(2).max(80),
  confidenceLevel: z.enum(["low", "medium", "high"]),
  status: z.enum(["collecting_requirements", "ready_for_plan"]),
  structuredBrief: z.object({
    objective: z.string().trim().min(1).max(1000),
    programType: z.string().trim().min(2).max(80),
    format: z.string().trim().min(1).max(120),
    targetParticipants: z.array(z.string().trim().min(1).max(120)).max(8),
    regions: z.array(z.string().trim().min(1).max(120)).max(8),
    teamPolicy: z.string().trim().min(1).max(280),
    timeline: z.object({
      registrationWindow: z.string().trim().min(1).max(280),
      submissionWindow: z.string().trim().min(1).max(280),
      liveProgramWindow: z.string().trim().min(1).max(280),
    }),
    evaluationModel: z.string().trim().min(1).max(400),
    mentoringModel: z.string().trim().min(1).max(400),
    sponsorVisibility: z.string().trim().min(1).max(280),
    deliverables: z.array(z.string().trim().min(1).max(180)).min(3).max(10),
    risks: z.array(z.string().trim().min(1).max(180)).max(8),
  }),
  assumptions: z.array(z.string().trim().min(1).max(200)).max(8),
  openQuestions: z.array(openQuestionSchema).max(8),
});

const planItemSchema = z.object({
  itemKey: z.string().trim().min(1).max(80),
  itemType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(800),
  requiresApproval: z.boolean(),
  payload: z.record(z.string(), z.unknown()),
});

const programPlanDraftSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(4000),
  planTitle: z.string().trim().min(3).max(160),
  planSummary: z.string().trim().min(1).max(1200),
  status: z.literal("proposed"),
  assumptions: z.array(z.string().trim().min(1).max(220)).max(8),
  approvalRequirements: z.array(
    z.object({
      key: z.string().trim().min(1).max(80),
      title: z.string().trim().min(1).max(180),
      description: z.string().trim().min(1).max(500),
      riskLevel: z.enum(["low", "medium", "high"]),
    }),
  ).max(8),
  items: z.array(planItemSchema).min(5).max(12),
});

const briefInputSchema = z.object({
  workspaceName: z.string().trim().min(1).max(160),
  organizationName: z.string().trim().max(160).nullable().optional(),
  currentBrief: z.record(z.string(), z.unknown()).nullable(),
  assumptions: z.array(z.string()).max(8),
  openQuestions: z.array(z.record(z.string(), z.unknown())).max(8),
  conversation: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .max(20),
  latestUserMessage: z.string().trim().min(8).max(3000),
});

const planInputSchema = z.object({
  workspaceName: z.string().trim().min(1).max(160),
  organizationName: z.string().trim().max(160).nullable().optional(),
  briefTitle: z.string().trim().min(1).max(160),
  detectedProgramType: z.string().trim().max(80).nullable().optional(),
  structuredBrief: z.record(z.string(), z.unknown()),
  assumptions: z.array(z.string()).max(8),
  openQuestions: z.array(z.record(z.string(), z.unknown())).max(8),
});

const requestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("brief"),
    input: briefInputSchema,
  }),
  z.object({
    kind: z.literal("plan"),
    input: planInputSchema,
  }),
]);

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
      return jsonResponse(
        { error: "OPENAI_API_KEY is not configured for PM agent generation." },
        500,
      );
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

    const rawBody = await request.json();
    const parsed = requestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return jsonResponse(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        400,
      );
    }

    if (parsed.data.kind === "brief") {
      const prompt = buildBriefPrompt(parsed.data.input);
      const generated = await callOpenAiJson({
        apiKey: openAiApiKey,
        schemaName: "program_brief_draft",
        jsonSchema: programBriefDraftJsonSchema,
        validator: programBriefDraftSchema,
        prompt,
      });

      return jsonResponse(generated);
    }

    const prompt = buildPlanPrompt(parsed.data.input);
    const generated = await callOpenAiJson({
      apiKey: openAiApiKey,
      schemaName: "program_plan_draft",
      jsonSchema: programPlanDraftJsonSchema,
      validator: programPlanDraftSchema,
      prompt,
    });

    return jsonResponse(generated);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown function error." },
      500,
    );
  }
});

function buildBriefPrompt(input: z.infer<typeof briefInputSchema>) {
  return [
    "You are Innovink, an enterprise AI operating agent for innovation programs.",
    "Your job is to turn a program manager's conversation into a structured brief.",
    "Be precise, operational, and corporate in tone.",
    "Do not invent dates, prize amounts, legal terms, or participant rules that were not implied.",
    "If information is missing, keep it as an open question instead of fabricating it.",
    "Return valid JSON only and follow the schema exactly.",
    "",
    `Workspace: ${input.workspaceName}`,
    `Organization: ${input.organizationName ?? "Unknown organization"}`,
    `Current brief JSON: ${JSON.stringify(input.currentBrief ?? {}, null, 2)}`,
    `Current assumptions JSON: ${JSON.stringify(input.assumptions, null, 2)}`,
    `Current open questions JSON: ${JSON.stringify(input.openQuestions, null, 2)}`,
    "",
    "Recent conversation:",
    ...input.conversation.map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`),
    "",
    `Latest user message: ${input.latestUserMessage}`,
    "",
    "Interpret the latest user message in context.",
    "Update the structured brief, list the important assumptions, and identify only the most valuable unresolved questions.",
    "Mark status as ready_for_plan only when there is enough clarity to draft a serious launch plan.",
  ].join("\n");
}

function buildPlanPrompt(input: z.infer<typeof planInputSchema>) {
  return [
    "You are Innovink, an enterprise AI operating agent for innovation programs.",
    "Your job is to convert an approved or near-approved program brief into an execution plan.",
    "Be structured, enterprise-grade, and operationally realistic.",
    "Return valid JSON only and follow the schema exactly.",
    "Every plan item should be concrete and ready for human approval before execution.",
    "Include the core assets and operating checkpoints needed for a serious launch.",
    "",
    `Workspace: ${input.workspaceName}`,
    `Organization: ${input.organizationName ?? "Unknown organization"}`,
    `Brief title: ${input.briefTitle}`,
    `Detected program type: ${input.detectedProgramType ?? "Not set"}`,
    `Structured brief JSON: ${JSON.stringify(input.structuredBrief, null, 2)}`,
    `Assumptions JSON: ${JSON.stringify(input.assumptions, null, 2)}`,
    `Open questions JSON: ${JSON.stringify(input.openQuestions, null, 2)}`,
    "",
    "Create a plan that covers setup, generated assets, approvals, and operational readiness.",
    "Use item types such as landing_page, registration_form, submission_form, judging_setup, communications_pack, launch_readiness, mentoring_setup, sponsor_reporting, and operations_control where relevant.",
  ].join("\n");
}

async function callOpenAiJson<T>({
  apiKey,
  schemaName,
  jsonSchema,
  validator,
  prompt,
}: {
  apiKey: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  validator: z.ZodType<T>;
  prompt: string;
}) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
      input: prompt,
      temperature: 0.3,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const payload = await response.json();
  const outputText = payload.output_text;

  if (!outputText) {
    throw new Error("OpenAI returned no structured output.");
  }

  const parsed = JSON.parse(outputText);
  return {
    result: validator.parse(parsed),
    model: payload.model ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
    usage: payload.usage ?? null,
  };
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

const openQuestionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["key", "question", "whyItMatters", "priority"],
  properties: {
    key: { type: "string" },
    question: { type: "string" },
    whyItMatters: { type: "string" },
    priority: { type: "string", enum: ["high", "medium", "low"] },
  },
} as const;

const programBriefDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sessionTitle",
    "assistantMessage",
    "briefTitle",
    "detectedProgramType",
    "confidenceLevel",
    "status",
    "structuredBrief",
    "assumptions",
    "openQuestions",
  ],
  properties: {
    sessionTitle: { type: "string" },
    assistantMessage: { type: "string" },
    briefTitle: { type: "string" },
    detectedProgramType: { type: "string" },
    confidenceLevel: { type: "string", enum: ["low", "medium", "high"] },
    status: {
      type: "string",
      enum: ["collecting_requirements", "ready_for_plan"],
    },
    structuredBrief: {
      type: "object",
      additionalProperties: false,
      required: [
        "objective",
        "programType",
        "format",
        "targetParticipants",
        "regions",
        "teamPolicy",
        "timeline",
        "evaluationModel",
        "mentoringModel",
        "sponsorVisibility",
        "deliverables",
        "risks",
      ],
      properties: {
        objective: { type: "string" },
        programType: { type: "string" },
        format: { type: "string" },
        targetParticipants: {
          type: "array",
          items: { type: "string" },
          maxItems: 8,
        },
        regions: {
          type: "array",
          items: { type: "string" },
          maxItems: 8,
        },
        teamPolicy: { type: "string" },
        timeline: {
          type: "object",
          additionalProperties: false,
          required: [
            "registrationWindow",
            "submissionWindow",
            "liveProgramWindow",
          ],
          properties: {
            registrationWindow: { type: "string" },
            submissionWindow: { type: "string" },
            liveProgramWindow: { type: "string" },
          },
        },
        evaluationModel: { type: "string" },
        mentoringModel: { type: "string" },
        sponsorVisibility: { type: "string" },
        deliverables: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 10,
        },
        risks: {
          type: "array",
          items: { type: "string" },
          maxItems: 8,
        },
      },
    },
    assumptions: {
      type: "array",
      items: { type: "string" },
      maxItems: 8,
    },
    openQuestions: {
      type: "array",
      items: openQuestionJsonSchema,
      maxItems: 8,
    },
  },
} as const;

const programPlanDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "assistantMessage",
    "planTitle",
    "planSummary",
    "status",
    "assumptions",
    "approvalRequirements",
    "items",
  ],
  properties: {
    assistantMessage: { type: "string" },
    planTitle: { type: "string" },
    planSummary: { type: "string" },
    status: { type: "string", enum: ["proposed"] },
    assumptions: {
      type: "array",
      items: { type: "string" },
      maxItems: 8,
    },
    approvalRequirements: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "description", "riskLevel"],
        properties: {
          key: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          riskLevel: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    items: {
      type: "array",
      minItems: 5,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "itemKey",
          "itemType",
          "title",
          "description",
          "requiresApproval",
          "payload",
        ],
        properties: {
          itemKey: { type: "string" },
          itemType: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          requiresApproval: { type: "boolean" },
          payload: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    },
  },
} as const;
