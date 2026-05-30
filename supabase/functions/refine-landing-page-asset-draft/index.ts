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
  theme?: {
    pageBackground?: string;
    surfaceBackground?: string;
    heroBackground?: string;
    heroForeground?: string;
    headingColor?: string;
    bodyColor?: string;
    mutedTextColor?: string;
    accentColor?: string;
    borderColor?: string;
    ctaTextColor?: string;
    secondaryButtonBackground?: string;
    secondaryButtonTextColor?: string;
    secondaryButtonBorderColor?: string;
  };
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
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const authHeader = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase Edge Function secrets are not configured.");
    }

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    if (!anthropicApiKey) {
      return jsonResponse(
        {
          error:
            "ANTHROPIC_API_KEY is not configured for landing page asset refinement.",
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
      conversationTurns?: Array<{
        role: "user" | "assistant";
        content: string;
      }>;
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
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-20250514",
        system:
          "You are Claude, acting as a premium enterprise landing-page editor inside Innovink. Always return a valid JSON object matching the requested schema exactly, with no markdown fences or extra commentary.",
        temperature: 0.35,
        max_tokens: 2400,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      return jsonResponse(
        {
          error: "Claude landing page refinement failed.",
          details: errorText,
        },
        502,
      );
    }

    const anthropicPayload = await anthropicResponse.json();
    const outputText = extractTextContent(anthropicPayload.content);

    if (!outputText) {
      return jsonResponse(
        { error: "Claude returned no structured landing page output." },
        502,
      );
    }

    const parsedOutput = JSON.parse(outputText) as {
      assistantMessage: string;
      draft: LandingPageAssetDraft;
    };
    const draft = parsedOutput.draft;
    validateLandingPageAssetDraft(draft);

    return jsonResponse({
      ok: true,
      draft,
      assistantMessage: parsedOutput.assistantMessage,
      model:
        anthropicPayload.model ??
        Deno.env.get("ANTHROPIC_MODEL") ??
        "claude-sonnet-4-20250514",
      usage: anthropicPayload.usage ?? null,
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
    "The PM may ask for branding colors, hierarchy changes, stronger executive tone, section additions, or CTA refinements. Honor those requests while staying enterprise-grade.",
    "Use the draft.theme object to express visual changes like hero background, accent color, text contrast, and surface colors when the PM asks for branding or page styling updates.",
    "Do not invent prize amounts, legal claims, or exact dates if they are not present in the input context.",
    "Preserve the same overall structured landing-page object shape even when reorganizing copy.",
    "Return JSON only. The top-level object must contain assistantMessage and draft.",
    "",
    `Instruction: ${input.instruction ?? ""}`,
    `Brief title: ${input.briefTitle ?? ""}`,
    `Detected program type: ${input.detectedProgramType ?? ""}`,
    `Current brief JSON: ${JSON.stringify(input.currentBrief ?? {})}`,
    `Plan title: ${input.planTitle ?? ""}`,
    `Plan summary: ${input.planSummary ?? ""}`,
    `Recent landing-page editor turns: ${JSON.stringify(input.conversationTurns ?? [])}`,
    `Current landing page draft: ${JSON.stringify(input.currentDraft ?? {})}`,
    "",
    "Required JSON schema:",
    JSON.stringify(landingPageEditorResponseSchema),
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

function extractTextContent(content: unknown) {
  if (!Array.isArray(content)) {
    return null;
  }

  return content
    .map((block) =>
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      "text" in block &&
      (block as { type?: unknown }).type === "text" &&
      typeof (block as { text?: unknown }).text === "string"
        ? (block as { text: string }).text
        : "",
    )
    .join("")
    .trim();
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
    theme: {
      type: "object",
      additionalProperties: false,
      properties: {
        pageBackground: { type: "string" },
        surfaceBackground: { type: "string" },
        heroBackground: { type: "string" },
        heroForeground: { type: "string" },
        headingColor: { type: "string" },
        bodyColor: { type: "string" },
        mutedTextColor: { type: "string" },
        accentColor: { type: "string" },
        borderColor: { type: "string" },
        ctaTextColor: { type: "string" },
        secondaryButtonBackground: { type: "string" },
        secondaryButtonTextColor: { type: "string" },
        secondaryButtonBorderColor: { type: "string" },
      },
    },
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

const landingPageEditorResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["assistantMessage", "draft"],
  properties: {
    assistantMessage: { type: "string" },
    draft: landingPageAssetDraftSchema,
  },
};
