import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { GeneratedAssetDraft } from "@/lib/ai/program-launch-kit";

type TypedSupabaseClient = SupabaseClient<Database>;

type LandingPageAssetInput = {
  workspaceName: string;
  organizationName?: string | null;
  briefTitle: string | null;
  detectedProgramType?: string | null;
  structuredBrief: Record<string, unknown>;
  planTitle?: string | null;
  planSummary?: string | null;
};

const sectionSchema = z.object({
  sectionKey: z.string().trim().min(1).max(80),
  displayOrder: z.number().int(),
}).passthrough();

const landingPagePayloadSchema = z.object({
  title: z.string().trim().min(1).max(180),
  seoTitle: z.string().trim().min(1).max(180),
  seoDescription: z.string().trim().min(1).max(500),
  themeKey: z.string().trim().min(1).max(80),
  theme: z.record(z.string(), z.unknown()),
  sections: z.array(sectionSchema).min(1).max(12),
});

const landingPageResponseSchema = z.object({
  result: z.object({
    assistantMessage: z.string().trim().min(1).max(2000),
    title: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(1200),
    payload: landingPagePayloadSchema,
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

export async function generateLandingPageAssetDraft(
  supabase: TypedSupabaseClient,
  input: LandingPageAssetInput,
) {
  const { data, error } = await supabase.functions.invoke("generate-landing-page-asset-draft", {
    body: input,
  });

  if (error) {
    throw new Error(await formatFunctionError("generate-landing-page-asset-draft", error));
  }

  const parsed = landingPageResponseSchema.parse(data);
  return {
    assistantMessage: parsed.result.assistantMessage,
    model: parsed.model,
    usage: parsed.usage,
    draft: {
      artifactType: "landing_page",
      title: parsed.result.title,
      summary: parsed.result.summary,
      payload: parsed.result.payload,
    } satisfies GeneratedAssetDraft,
  };
}

async function formatFunctionError(functionName: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const context = getFunctionErrorContext(error);

  if (!context) return `${functionName} failed: ${message}`;

  const status = typeof context.status === "number" ? `HTTP ${context.status}` : "HTTP error";
  const body = await readFunctionErrorBody(context);
  return body
    ? `${functionName} failed (${status}): ${body}`
    : `${functionName} failed (${status}): ${message}`;
}

function getFunctionErrorContext(error: unknown): Response | null {
  if (!error || typeof error !== "object") return null;
  const context = (error as { context?: unknown }).context;
  return context instanceof Response ? context : null;
}

async function readFunctionErrorBody(response: Response) {
  try {
    const text = await response.clone().text();
    if (!text) return null;
    return text.length > 800 ? `${text.slice(0, 800)}...` : text;
  } catch {
    return null;
  }
}
