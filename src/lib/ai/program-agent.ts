import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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

export const programBriefDraftSchema = z.object({
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

export const programPlanDraftSchema = z.object({
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

export type ProgramBriefDraft = z.infer<typeof programBriefDraftSchema>;
export type ProgramPlanDraft = z.infer<typeof programPlanDraftSchema>;

const briefDeltaFieldSchema = z.enum([
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

export const programBriefDeltaSchema = z.object({
  sessionTitle: z.string().trim().min(3).max(120).nullish(),
  assistantMessage: z.string().trim().min(1).max(2000),
  briefTitle: z.string().trim().min(3).max(140).nullish(),
  detectedProgramType: z.string().trim().min(2).max(80).nullish(),
  confidenceLevel: z.enum(["low", "medium", "high"]).nullish(),
  fieldUpdates: z
    .array(
      z.object({
        field: briefDeltaFieldSchema,
        value: z.unknown(),
      }),
    )
    .max(16),
  assumptions: z.array(z.string().trim().min(1).max(200)).max(8).catch([]),
  resolvedQuestionKeys: z.array(z.string().trim().min(1).max(60)).max(8),
  newQuestions: z.array(openQuestionSchema).max(8),
  briefIsComplete: z.boolean(),
});

export type ProgramBriefDelta = z.infer<typeof programBriefDeltaSchema>;

type TypedSupabaseClient = SupabaseClient<Database>;

type ConversationTurn = {
  role: "user" | "assistant" | "system";
  content: string;
};

type BriefGenerationInput = {
  workspaceName: string;
  organizationName?: string | null;
  currentBrief: Record<string, unknown> | null;
  assumptions: string[];
  openQuestions: Array<Record<string, unknown>>;
  conversation: ConversationTurn[];
  latestUserMessage: string;
};

type PlanGenerationInput = {
  workspaceName: string;
  organizationName?: string | null;
  briefTitle: string;
  detectedProgramType?: string | null;
  structuredBrief: Record<string, unknown>;
  assumptions: string[];
  openQuestions: Array<Record<string, unknown>>;
};

type BriefDeltaInput = {
  workspaceName: string;
  organizationName?: string | null;
  currentBrief: Record<string, unknown>;
  assumptions: string[];
  openQuestions: Array<Record<string, unknown>>;
  conversationContext: ConversationTurn[];
  latestUserMessage: string;
  briefTitle?: string | null;
  detectedProgramType?: string | null;
};

type GenerationUsage = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
} | null;

type GeneratedResult<T> = {
  result: T;
  model: string;
  usage: GenerationUsage;
};

const briefFunctionResponseSchema = z.object({
  result: programBriefDraftSchema,
  model: z.string().min(1),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .nullable(),
});

const planFunctionResponseSchema = z.object({
  result: programPlanDraftSchema,
  model: z.string().min(1),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .nullable(),
});

const briefDeltaFunctionResponseSchema = z.object({
  result: programBriefDeltaSchema,
  model: z.string().min(1),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .nullable(),
});

export async function generateProgramBriefDraft(
  supabase: TypedSupabaseClient,
  input: BriefGenerationInput,
) {
  const { data, error } = await supabase.functions.invoke("generate-program-agent-draft", {
    body: {
      kind: "brief",
      input,
    },
  });

  if (error) {
    throw new Error(await formatFunctionError("generate-program-agent-draft", error));
  }

  return briefFunctionResponseSchema.parse(data) satisfies GeneratedResult<ProgramBriefDraft>;
}

export async function generateProgramPlanDraft(
  supabase: TypedSupabaseClient,
  input: PlanGenerationInput,
) {
  const { data, error } = await supabase.functions.invoke("generate-program-agent-draft", {
    body: {
      kind: "plan",
      input,
    },
  });

  if (error) {
    throw new Error(await formatFunctionError("generate-program-agent-draft", error));
  }

  return planFunctionResponseSchema.parse(data) satisfies GeneratedResult<ProgramPlanDraft>;
}

export async function extractProgramBriefDelta(
  supabase: TypedSupabaseClient,
  input: BriefDeltaInput,
) {
  const { data, error } = await supabase.functions.invoke("extract-brief-delta", {
    body: {
      input,
    },
  });

  if (error) {
    throw new Error(await formatFunctionError("extract-brief-delta", error));
  }

  return briefDeltaFunctionResponseSchema.parse(data) satisfies GeneratedResult<ProgramBriefDelta>;
}

async function formatFunctionError(functionName: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const context = getFunctionErrorContext(error);

  if (!context) {
    return `${functionName} failed: ${message}`;
  }

  const status = typeof context.status === "number" ? `HTTP ${context.status}` : "HTTP error";
  const body = await readFunctionErrorBody(context);

  return body
    ? `${functionName} failed (${status}): ${body}`
    : `${functionName} failed (${status}): ${message}`;
}

function getFunctionErrorContext(error: unknown): Response | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const context = (error as { context?: unknown }).context;
  return context instanceof Response ? context : null;
}

async function readFunctionErrorBody(response: Response) {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.clone().text();
    if (!text) {
      return null;
    }

    if (contentType.includes("application/json")) {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === "object" && "error" in parsed) {
        const errorValue = (parsed as { error?: unknown }).error;
        return typeof errorValue === "string" ? errorValue : JSON.stringify(errorValue);
      }
    }

    return text.length > 800 ? `${text.slice(0, 800)}...` : text;
  } catch {
    return null;
  }
}
