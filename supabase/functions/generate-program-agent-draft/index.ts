import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4.1.12";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fallbackText = "To be confirmed";

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

const fallbackPlanItems = [
  {
    itemKey: "program_brief_review",
    itemType: "governance",
    title: "Confirm program brief",
    description: "Review the current program brief and resolve any remaining open questions before launch setup.",
    requiresApproval: true,
    payload: { source: "fallback_normalization" },
  },
  {
    itemKey: "landing_page_draft",
    itemType: "landing_page",
    title: "Draft landing page",
    description: "Prepare a governed landing page draft for participant-facing program information.",
    requiresApproval: true,
    payload: { source: "fallback_normalization" },
  },
  {
    itemKey: "registration_form_draft",
    itemType: "registration_form",
    title: "Draft registration form",
    description: "Prepare the registration intake fields and eligibility guidance for review.",
    requiresApproval: true,
    payload: { source: "fallback_normalization" },
  },
  {
    itemKey: "submission_flow_draft",
    itemType: "submission_form",
    title: "Draft submission flow",
    description: "Prepare the submission requirements, judging handoff, and participant instructions.",
    requiresApproval: true,
    payload: { source: "fallback_normalization" },
  },
  {
    itemKey: "judging_setup_draft",
    itemType: "judging_setup",
    title: "Draft judging setup",
    description: "Prepare judging criteria, rounds, and reviewer guidance for approval.",
    requiresApproval: true,
    payload: { source: "fallback_normalization" },
  },
];

const programBriefDraftSchema = z.object({
  sessionTitle: z.string().trim().min(3).max(120).catch("New innovation workspace"),
  assistantMessage: z.string().trim().min(1).max(4000).catch(
    "I updated the program brief. Please review the fields marked To be confirmed.",
  ),
  briefTitle: z.string().trim().min(3).max(140).catch("Innovation program"),
  detectedProgramType: z.string().trim().min(2).max(80).catch("Innovation program"),
  confidenceLevel: z.enum(["low", "medium", "high"]).catch("medium"),
  status: z.enum(["collecting_requirements", "ready_for_plan"]).catch("collecting_requirements"),
  structuredBrief: z.object({
    objective: z.string().trim().min(1).max(1000).catch(fallbackText),
    programType: z.string().trim().min(2).max(80).catch("Innovation program"),
    format: z.string().trim().min(1).max(120).catch(fallbackText),
    targetParticipants: z
      .array(z.string().trim().min(1).max(120))
      .max(8)
      .catch([fallbackText]),
    regions: z.array(z.string().trim().min(1).max(120)).max(8).catch([fallbackText]),
    teamPolicy: z.string().trim().min(1).max(280).catch(fallbackText),
    timeline: z.object({
      registrationWindow: z.string().trim().min(1).max(280).catch(fallbackText),
      submissionWindow: z.string().trim().min(1).max(280).catch(fallbackText),
      liveProgramWindow: z.string().trim().min(1).max(280).catch(fallbackText),
    }).catch({
      registrationWindow: fallbackText,
      submissionWindow: fallbackText,
      liveProgramWindow: fallbackText,
    }),
    evaluationModel: z.string().trim().min(1).max(400).catch(fallbackText),
    mentoringModel: z.string().trim().min(1).max(400).catch(fallbackText),
    sponsorVisibility: z.string().trim().min(1).max(280).catch(fallbackText),
    deliverables: z
      .array(z.string().trim().min(1).max(180))
      .max(10)
      .catch([fallbackText]),
    risks: z.array(z.string().trim().min(1).max(180)).max(8).catch([]),
    brandColors: z.object({
      primary: z.string().trim().max(40).optional(),
      accent: z.string().trim().max(40).optional(),
      surface: z.string().trim().max(40).optional(),
      paletteKey: z.string().trim().max(40).optional(),
    }).optional().catch(undefined),
  }),
  assumptions: z.array(z.string().trim().min(1).max(200)).max(8).catch([]),
  openQuestions: z.array(openQuestionSchema).max(8).catch([]),
});

const planItemSchema = z.object({
  itemKey: z.string().trim().min(1).max(80).catch("plan_item"),
  itemType: z.string().trim().min(1).max(80).catch("governance"),
  title: z.string().trim().min(1).max(160).catch("Review program setup item"),
  description: z.string().trim().min(1).max(800).catch(fallbackText),
  requiresApproval: z.boolean().catch(true),
  payload: z.record(z.string(), z.unknown()).catch({}),
});

const programPlanDraftSchema = z.object({
  assistantMessage: z.string().trim().min(1).max(4000).catch(
    "I prepared a governed setup plan. Please review the items before continuing.",
  ),
  planTitle: z.string().trim().min(3).max(160).catch("Program setup plan"),
  planSummary: z.string().trim().min(1).max(1200).catch(
    "A governed setup plan has been prepared with reviewable launch items.",
  ),
  status: z.literal("proposed").catch("proposed"),
  assumptions: z.array(z.string().trim().min(1).max(220)).max(8).catch([]),
  approvalRequirements: z.array(
    z.object({
      key: z.string().trim().min(1).max(80).catch("human_review"),
      title: z.string().trim().min(1).max(180).catch("Human review required"),
      description: z.string().trim().min(1).max(500).catch(
        "Review the generated setup before any state-changing action is executed.",
      ),
      riskLevel: z.enum(["low", "medium", "high"]).catch("medium"),
    }),
  ).max(8).catch([]),
  items: z.array(planItemSchema).max(12).catch(fallbackPlanItems).transform((items) => {
    if (items.length >= 5) return items;
    const existingKeys = new Set(items.map((item) => item.itemKey));
    return [
      ...items,
      ...fallbackPlanItems.filter((item) => !existingKeys.has(item.itemKey)),
    ].slice(0, 12);
  }),
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
  latestUserMessage: z.string().trim().min(1).max(3000),
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
        strict: false,
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
      strict: false,
    });

    return jsonResponse(generated);
  } catch (error) {
    console.error("generate-program-agent-draft failed", {
      error: error instanceof Error ? error.message : String(error),
    });
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
    "For required structured fields that are unknown, write 'To be confirmed' and add a concise open question.",
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
    "",
    "BRAND COLORS: If the PM mentions brand colors (hex codes like #1A2B3C, color names, or a palette preference like 'navy and gold' or 'dark theme'), capture them in structuredBrief.brandColors.",
    "- primary: the main brand color (hero backgrounds, CTAs)",
    "- accent: highlight color (links, buttons, badges)",
    "- surface: card/surface background color",
    "- paletteKey: a short label if they picked a preset (e.g. 'navy-gold', 'corporate-blue', 'dark-purple')",
    "If no colors were mentioned, omit brandColors entirely.",
    "Do NOT ask about brand colors as an open question unless the program clearly needs a public-facing landing page.",
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
  strict = true,
}: {
  apiKey: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  validator: z.ZodType<T>;
  prompt: string;
  strict?: boolean;
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
          strict,
          schema: jsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    console.error("OpenAI response error", {
      schemaName,
      status: response.status,
      body: truncateForLogs(message),
    });
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const payload = await response.json();
  const refusal = extractResponseRefusal(payload);
  if (refusal) {
    console.error("OpenAI structured output refusal", {
      schemaName,
      refusal: truncateForLogs(refusal),
      responseId: payload.id ?? null,
    });
    throw new Error(`OpenAI refused the request: ${refusal}`);
  }

  const outputText = extractResponseOutputText(payload);

  if (!outputText) {
    console.error("OpenAI returned no structured output text", {
      schemaName,
      responseId: payload.id ?? null,
      output: payload.output ?? null,
    });
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

function extractResponseOutputText(payload: Record<string, unknown>) {
  const direct = payload.output_text;
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct;
  }

  const output = payload.output;
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (!part || typeof part !== "object" || Array.isArray(part)) {
        continue;
      }

      const record = part as Record<string, unknown>;
      const text = record.text ?? record.output_text;
      if (typeof text === "string" && text.trim().length > 0) {
        return text;
      }
    }
  }

  return null;
}

function extractResponseRefusal(payload: Record<string, unknown>) {
  const output = payload.output;
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (!part || typeof part !== "object" || Array.isArray(part)) {
        continue;
      }

      const record = part as Record<string, unknown>;
      if (
        record.type === "refusal" &&
        typeof record.refusal === "string" &&
        record.refusal.trim().length > 0
      ) {
        return record.refusal;
      }
    }
  }

  return null;
}

function truncateForLogs(value: string, maxLength = 800) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
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
        brandColors: {
          type: "object",
          properties: {
            primary: { type: "string" },
            accent: { type: "string" },
            surface: { type: "string" },
            paletteKey: { type: "string" },
          },
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
