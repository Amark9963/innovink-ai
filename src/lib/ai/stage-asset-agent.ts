import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { GeneratedAssetDraft, LaunchKitAssetTarget } from "@/lib/ai/program-launch-kit";

type TypedSupabaseClient = SupabaseClient<Database>;

type StageAssetTarget = Extract<
  LaunchKitAssetTarget,
  "registration_form" | "submission_form" | "judging_setup"
>;

type StageAssetInput = {
  workspaceName: string;
  organizationName?: string | null;
  briefTitle: string | null;
  detectedProgramType?: string | null;
  structuredBrief: Record<string, unknown>;
  planTitle?: string | null;
  planSummary?: string | null;
};

type StageAssetResult = {
  draft: GeneratedAssetDraft;
  assistantMessage: string;
  model: string;
  usage: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  } | null;
};

const formFieldSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  type: z.string().trim().min(1).max(80),
  required: z.boolean(),
  placeholder: z.string().trim().max(240).optional(),
  helpText: z.string().trim().max(500).optional(),
  choices: z.array(z.record(z.string(), z.unknown())).optional(),
});

const formPayloadSchema = z.object({
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(800),
  fields: z.array(formFieldSchema).min(1).max(24),
});

const judgingCriterionSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(500),
  weight: z.number().int().min(0).max(100),
});

const judgingPayloadSchema = z.object({
  scorecardName: z.string().trim().min(1).max(180),
  scorecardDescription: z.string().trim().min(1).max(1000),
  rounds: z.array(
    z.object({
      name: z.string().trim().min(1).max(160),
      roundOrder: z.number().int().min(1).max(10),
      isBlindReview: z.boolean(),
      criteria: z.array(judgingCriterionSchema).min(1).max(12),
    }),
  ).min(1).max(5),
});

const stageResponseSchema = z.object({
  result: z.object({
    assistantMessage: z.string().trim().min(1).max(2000),
    title: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(1200),
    payload: z.union([formPayloadSchema, judgingPayloadSchema]),
  }),
  model: z.string().trim().min(1),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .nullable(),
});

const functionByTarget: Record<StageAssetTarget, string> = {
  registration_form: "generate-registration-form-draft",
  submission_form: "generate-submission-form-draft",
  judging_setup: "generate-judging-setup-draft",
};

export async function generateStageAssetDraft(
  supabase: TypedSupabaseClient,
  target: StageAssetTarget,
  input: StageAssetInput,
): Promise<StageAssetResult> {
  const functionName = functionByTarget[target];
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: input,
  });

  if (error) {
    throw new Error(await formatFunctionError(functionName, error));
  }

  const parsed = stageResponseSchema.parse(data);
  return {
    assistantMessage: parsed.result.assistantMessage,
    model: parsed.model,
    usage: parsed.usage,
    draft: {
      artifactType: target,
      title: parsed.result.title,
      summary: parsed.result.summary,
      payload: parsed.result.payload,
    },
  };
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
