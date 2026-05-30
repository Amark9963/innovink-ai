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

    const parsedOutput = parseClaudeEditorOutput(outputText);
    const draft = normalizeLandingPageAssetDraft(
      parsedOutput.draft,
      body.currentDraft,
    );
    validateLandingPageAssetDraft(draft);

    return jsonResponse({
      ok: true,
      draft,
      assistantMessage:
        parsedOutput.assistantMessage?.trim() ||
        buildFallbackAssistantMessage(body.instruction, draft.title),
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
  conversationTurns?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
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

function buildFallbackAssistantMessage(instruction: string, title: string) {
  return `I revised ${title} based on your request: "${instruction}". Review the updated landing page draft and continue refining it before approvals.`;
}

function parseClaudeEditorOutput(outputText: string) {
  const cleaned = outputText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const candidate = extractJsonObject(cleaned);
  return JSON.parse(candidate) as {
    assistantMessage?: string;
    draft?: unknown;
  };
}

function extractJsonObject(value: string) {
  const firstBrace = value.indexOf("{");
  const lastBrace = value.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Claude did not return a valid JSON object.");
  }

  return value.slice(firstBrace, lastBrace + 1);
}

function normalizeLandingPageAssetDraft(
  value: unknown,
  fallbackDraft: LandingPageAssetDraft,
): LandingPageAssetDraft {
  const source = isRecord(value) ? value : {};
  const fallback = fallbackDraft ?? {
    title: "Landing Page Draft",
    seoTitle: "Landing Page Draft",
    seoDescription: "Landing page draft",
    themeKey: "enterprise-navy",
    sections: [],
  };

  const sections = normalizeSections(source.sections, fallback.sections);

  return {
    title: pickString(source.title, fallback.title),
    seoTitle: pickString(source.seoTitle, fallback.seoTitle),
    seoDescription: pickString(source.seoDescription, fallback.seoDescription),
    themeKey: pickString(source.themeKey, fallback.themeKey),
    theme: normalizeTheme(source.theme, fallback.theme),
    sections,
  };
}

function normalizeSections(
  value: unknown,
  fallbackSections: LandingPageAssetSection[],
) {
  const source = Array.isArray(value) ? value : [];
  const sectionsByKey = new Map<string, LandingPageAssetSection>();

  for (const fallbackSection of fallbackSections) {
    if (typeof fallbackSection.sectionKey === "string") {
      sectionsByKey.set(fallbackSection.sectionKey, { ...fallbackSection });
    }
  }

  for (const section of source) {
    if (!isRecord(section)) {
      continue;
    }

    const sectionKey = pickEnumString(section.sectionKey, [
      "hero",
      "overview",
      "timeline",
      "eligibility",
      "judging",
      "faq",
      "cta",
    ]);

    if (!sectionKey) {
      continue;
    }

    const fallback = sectionsByKey.get(sectionKey);
    sectionsByKey.set(sectionKey, {
      sectionKey,
      displayOrder: pickInteger(
        section.displayOrder,
        fallback?.displayOrder ?? (sectionsByKey.size + 1) * 10,
      ),
      headline: pickOptionalString(section.headline, fallback?.headline),
      subheadline: pickOptionalString(section.subheadline, fallback?.subheadline),
      body: pickOptionalString(section.body, fallback?.body),
      ctaLabel: pickOptionalString(section.ctaLabel, fallback?.ctaLabel),
    });
  }

  return Array.from(sectionsByKey.values()).sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
}

function normalizeTheme(
  value: unknown,
  fallbackTheme: LandingPageAssetDraft["theme"],
) {
  const source = isRecord(value) ? value : {};
  const fallback = fallbackTheme ?? {};
  const theme = {
    pageBackground: pickOptionalString(source.pageBackground, fallback.pageBackground),
    surfaceBackground: pickOptionalString(
      source.surfaceBackground,
      fallback.surfaceBackground,
    ),
    heroBackground: pickOptionalString(source.heroBackground, fallback.heroBackground),
    heroForeground: pickOptionalString(source.heroForeground, fallback.heroForeground),
    headingColor: pickOptionalString(source.headingColor, fallback.headingColor),
    bodyColor: pickOptionalString(source.bodyColor, fallback.bodyColor),
    mutedTextColor: pickOptionalString(source.mutedTextColor, fallback.mutedTextColor),
    accentColor: pickOptionalString(source.accentColor, fallback.accentColor),
    borderColor: pickOptionalString(source.borderColor, fallback.borderColor),
    ctaTextColor: pickOptionalString(source.ctaTextColor, fallback.ctaTextColor),
    secondaryButtonBackground: pickOptionalString(
      source.secondaryButtonBackground,
      fallback.secondaryButtonBackground,
    ),
    secondaryButtonTextColor: pickOptionalString(
      source.secondaryButtonTextColor,
      fallback.secondaryButtonTextColor,
    ),
    secondaryButtonBorderColor: pickOptionalString(
      source.secondaryButtonBorderColor,
      fallback.secondaryButtonBorderColor,
    ),
  };

  return Object.values(theme).some((entry) => typeof entry === "string")
    ? theme
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function pickOptionalString(value: unknown, fallback?: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function pickInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function pickEnumString<T extends string>(value: unknown, allowed: T[]) {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : null;
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
