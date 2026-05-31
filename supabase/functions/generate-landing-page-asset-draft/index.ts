import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type RequestBody = {
  workspaceName?: string | null;
  organizationName?: string | null;
  briefTitle?: string | null;
  detectedProgramType?: string | null;
  structuredBrief?: Record<string, unknown> | null;
  planTitle?: string | null;
  planSummary?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY is not configured." }, 500);
    }

    const body = (await request.json()) as RequestBody;
    const prompt = buildPrompt(body);
    const response = await fetch("https://api.openai.com/v1/responses", {
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
            strict: false,
            schema: landingPageAssetSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error("generate-landing-page-asset-draft OpenAI failure", {
        status: response.status,
        body: truncate(message),
      });
      return jsonResponse({ error: "Landing page asset generation failed." }, 502);
    }

    const payload = await response.json();
    const outputText = extractOutputText(payload);
    if (!outputText) {
      return jsonResponse({ error: "Model returned no structured landing-page output." }, 502);
    }

    const parsed = JSON.parse(outputText) as Record<string, unknown>;
    const result = normalizeLandingPageDraft(parsed, body);

    return jsonResponse({
      result,
      model: typeof payload.model === "string"
        ? payload.model
        : Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
      usage: payload.usage ?? null,
    });
  } catch (error) {
    console.error("generate-landing-page-asset-draft failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown function error." },
      500,
    );
  }
});

function buildPrompt(body: RequestBody) {
  return [
    "You are Innova, creating a workspace landing-page draft for an enterprise innovation program.",
    "This is a governed draft artifact for PM review, not a live published page.",
    "Create polished landing-page content with strong hierarchy, clear eligibility, timeline, judging, FAQ, and registration CTA.",
    "Respect any brand colors in the structured brief. Do not invent prize amounts, legal terms, or dates.",
    "Return JSON only. Follow the schema exactly.",
    "",
    `Workspace: ${body.workspaceName ?? "Unknown workspace"}`,
    `Organization: ${body.organizationName ?? "Unknown organization"}`,
    `Brief title: ${body.briefTitle ?? "Innovation program"}`,
    `Program type: ${body.detectedProgramType ?? "Innovation program"}`,
    `Plan title: ${body.planTitle ?? "Program setup plan"}`,
    `Plan summary: ${body.planSummary ?? ""}`,
    `Structured brief JSON: ${JSON.stringify(body.structuredBrief ?? {}, null, 2)}`,
  ].join("\n");
}

const landingPageAssetSchema = {
  type: "object",
  additionalProperties: false,
  required: ["assistantMessage", "title", "summary", "payload"],
  properties: {
    assistantMessage: { type: "string" },
    title: { type: "string" },
    summary: { type: "string" },
    payload: {
      type: "object",
      additionalProperties: false,
      required: ["title", "seoTitle", "seoDescription", "themeKey", "theme", "sections"],
      properties: {
        title: { type: "string" },
        seoTitle: { type: "string" },
        seoDescription: { type: "string" },
        themeKey: { type: "string" },
        theme: { type: "object", additionalProperties: true },
        sections: {
          type: "array",
          minItems: 5,
          maxItems: 10,
          items: {
            type: "object",
            additionalProperties: true,
            required: ["sectionKey", "displayOrder"],
            properties: {
              sectionKey: { type: "string" },
              displayOrder: { type: "integer" },
            },
          },
        },
      },
    },
  },
} as const;

function normalizeLandingPageDraft(value: Record<string, unknown>, body: RequestBody) {
  const titleBase = readString(body.briefTitle) || "Innovation Program";
  const payload = isRecord(value.payload) ? value.payload : {};
  const sections = Array.isArray(payload.sections)
    ? payload.sections.map(normalizeSection).filter(Boolean)
    : [];

  return {
    assistantMessage:
      readString(value.assistantMessage) ||
      "Landing page draft is ready for PM review.",
    title: readString(value.title) || `${titleBase} Landing Page Draft`,
    summary:
      readString(value.summary) ||
      "A governed landing-page draft is ready for PM review and conversational refinement.",
    payload: {
      title: readString(payload.title) || `${titleBase} Landing Page`,
      seoTitle: readString(payload.seoTitle) || titleBase,
      seoDescription:
        readString(payload.seoDescription) ||
        "Program landing page draft generated from the current brief and plan.",
      themeKey: readString(payload.themeKey) || "navy-gold",
      theme: normalizeTheme(payload.theme, body.structuredBrief ?? null),
      sections: sections.length > 0 ? sections : fallbackSections(titleBase, body),
    },
  };
}

function normalizeSection(value: unknown, index: number) {
  if (!isRecord(value)) return null;
  return {
    ...value,
    sectionKey: slug(readString(value.sectionKey) || `section_${index + 1}`),
    displayOrder: typeof value.displayOrder === "number" ? value.displayOrder : (index + 1) * 10,
  };
}

function normalizeTheme(value: unknown, brief: Record<string, unknown> | null) {
  const brandColors =
    brief && isRecord(brief.brandColors)
      ? brief.brandColors
      : {};
  const theme = isRecord(value) ? value : {};
  return {
    pageBackground: readString(theme.pageBackground) || readString(brandColors.surface) || "#f3f1ea",
    surfaceBackground: readString(theme.surfaceBackground) || "#ffffff",
    heroBackground:
      readString(theme.heroBackground) ||
      `linear-gradient(135deg, ${readString(brandColors.primary) || "#07101f"} 0%, #111e30 100%)`,
    heroForeground: readString(theme.heroForeground) || "#f4ede2",
    headingColor: readString(theme.headingColor) || "#101a2a",
    bodyColor: readString(theme.bodyColor) || "#38485d",
    mutedTextColor: readString(theme.mutedTextColor) || "#70839d",
    accentColor: readString(theme.accentColor) || readString(brandColors.accent) || "#b08a28",
    borderColor: readString(theme.borderColor) || "rgba(16, 26, 42, 0.1)",
    ctaTextColor: readString(theme.ctaTextColor) || "#07101f",
    secondaryButtonBackground: readString(theme.secondaryButtonBackground) || "rgba(255,255,255,0.04)",
    secondaryButtonTextColor: readString(theme.secondaryButtonTextColor) || "#d4bf86",
    secondaryButtonBorderColor: readString(theme.secondaryButtonBorderColor) || "rgba(212, 191, 134, 0.45)",
  };
}

function fallbackSections(titleBase: string, body: RequestBody) {
  const brief = body.structuredBrief ?? {};
  const objective = readString(brief.objective) || "A governed innovation program for qualified participants.";
  return [
    { sectionKey: "hero", displayOrder: 10, headline: titleBase, subheadline: objective, ctaLabel: "Register interest" },
    { sectionKey: "overview", displayOrder: 20, body: body.planSummary || objective },
    { sectionKey: "timeline", displayOrder: 30, body: "Registration, submission, judging, and reporting follow the approved program timeline." },
    { sectionKey: "eligibility", displayOrder: 40, body: "Eligibility follows the approved program brief and PM guidance." },
    { sectionKey: "judging", displayOrder: 50, body: "Submissions will be reviewed against approved judging criteria." },
    { sectionKey: "cta", displayOrder: 60, body: "Once approved, this page can become the public entry point for registration." },
  ];
}

function extractOutputText(payload: Record<string, unknown>) {
  const direct = payload.output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const output = payload.output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (!isRecord(part)) continue;
      const text = part.text ?? part.output_text;
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "section";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function truncate(value: string, maxLength = 800) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}
