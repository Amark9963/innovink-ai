import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const openQuestionSchema = z.object({
  key: z.string().trim().min(1).max(60),
  question: z.string().trim().min(1).max(280),
  whyItMatters: z.string().trim().min(1).max(200),
  priority: z.enum(["high", "medium", "low"]),
});

export const programBriefDraftSchema = z.object({
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

export const programPlanDraftSchema = z.object({
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

export type ProgramBriefDraft = z.infer<typeof programBriefDraftSchema>;
export type ProgramPlanDraft = z.infer<typeof programPlanDraftSchema>;

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
    throw new Error(error.message);
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
    throw new Error(error.message);
  }

  return planFunctionResponseSchema.parse(data) satisfies GeneratedResult<ProgramPlanDraft>;
}
