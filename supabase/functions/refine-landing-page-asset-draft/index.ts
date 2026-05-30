import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type LandingPageAssetSection = {
  sectionKey: string;
  displayOrder: number;
  headline?: string;
  subheadline?: string;
  body?: string;
  ctaLabel?: string;
};

type LandingPageAssetDraft = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  themeKey: string;
  sections: LandingPageAssetSection[];
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
        {
          error:
            "OPENAI_API_KEY is not configured for landing page asset refinement.",
        },
        500,
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Invalid user session." }, 401);
    }

    const body = (await request.json()) as {
      sessionId?: string;
      instruction?: string;
      briefTitle?: string | null;
      detectedProgramType?: string | null;
      currentBrief?: Record<string, unknown> | null;
      planTitle?: string | null;
      planSummary?: string | null;
      currentDraft?: LandingPageAssetDraft | null;
    };

    if (!body.sessionId || !body.instruction || !body.currentDraft) {
      return jsonResponse(
        {
          error:
            "sessionId, instruction, and currentDraft are required for landing page refinement.",
        },
        400,
      );
    }

    const prompt = buildRefinementPrompt(body);
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
        input: prompt,
        temperature: 0.35,
        text: {
          format: {
            type: "json_schema",
            name: "landing_page_asset_draft",
            strict: true,
            schema: landingPageAssetDraftSchema,
          },
        },
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return jsonResponse(
        {
          error: "OpenAI landing page refinement failed.",
          details: errorText,
        },
        502,
      );
    }

    const openAiPayload = await openAiResponse.json();
    const outputText = openAiPayload.output_text;

    if (!outputText) {
      return jsonResponse(
        { error: "OpenAI returned no structured landing page output." },
        502,
      );
    }

    const draft = JSON.parse(outputText) as LandingPageAssetDraft;
    validateLandingPageAssetDraft(draft);

    return jsonResponse({
      ok: true,
      draft,
      model: openAiPayload.model ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
      usage: openAiPayload.usage ?? null,
    });
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Unknown function error.",
      },
      500,
    );
  }
});

function buildRefinementPrompt(input: {
  instruction?: string;
  briefTitle?: string | null;
  detectedProgramType?: string | null;
  currentBrief?: Record<string, unknown> | null;
  planTitle?: string | null;
  planSummary?: string | null;
  currentDraft?: LandingPageAssetDraft | null;
}) {
  return [
    "You are refining a pre-execution landing page draft for an enterprise innovation platform.",
    "You are editing a governed PM workspace asset, not publishing a final page.",
    "Apply the user's instruction to the current draft while preserving the underlying program intent.",
    "Keep the tone premium, corporate, and operationally clear.",
    "Do not invent prize amounts, legal claims, or exact dates if they are not present in the input context.",
    "Preserve the same overall structured draft shape.",
    "Return structured JSON only.",
    "",
    `Instruction: ${input.instruction ?? ""}`,
    `Brief title: ${input.briefTitle ?? ""}`,
    `Detected program type: ${input.detectedProgramType ?? ""}`,
    `Current brief JSON: ${JSON.stringify(input.currentBrief ?? {})}`,
    `Plan title: ${input.planTitle ?? ""}`,
    `Plan summary: ${input.planSummary ?? ""}`,
    `Current landing page draft: ${JSON.stringify(input.currentDraft ?? {})}`,
  ].join("\n");
}

function validateLandingPageAssetDraft(draft: LandingPageAssetDraft) {
  if (!draft.title || !draft.seoTitle || !draft.seoDescription) {
    throw new Error("Landing page draft is missing required metadata.");
  }

  if (!Array.isArray(draft.sections) || draft.sections.length === 0) {
    throw new Error("Landing page draft did not include any sections.");
  }
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

const landingPageAssetDraftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "seoTitle", "seoDescription", "themeKey", "sections"],
  properties: {
    title: { type: "string" },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    themeKey: { type: "string" },
    sections: {
      type: "array",
      minItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sectionKey", "displayOrder"],
        properties: {
          sectionKey: {
            type: "string",
            enum: [
              "hero",
              "overview",
              "timeline",
              "eligibility",
              "judging",
              "faq",
              "cta",
            ],
          },
          displayOrder: { type: "integer" },
          headline: { type: "string" },
          subheadline: { type: "string" },
          body: { type: "string" },
          ctaLabel: { type: "string" },
        },
      },
    },
  },
};
