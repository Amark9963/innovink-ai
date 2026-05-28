import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type SectionDraft = {
  sectionKey: string;
  displayOrder: number;
  isEnabled: boolean;
  content: Record<string, unknown>;
};

type LandingPageDraft = {
  title: string;
  seoTitle: string;
  seoDescription: string;
  themeKey: string;
  sections: SectionDraft[];
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const authHeader = request.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error("Supabase Edge Function secrets are not configured.");
    }

    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header." }, 401);
    }

    if (!openAiApiKey) {
      return jsonResponse(
        { error: "OPENAI_API_KEY is not configured for landing page generation." },
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
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Invalid user session." }, 401);
    }

    const body = (await request.json()) as {
      programId?: string;
      landingPageId?: string;
      landingPageVersionId?: string;
      versionNumber?: number;
    };

    if (!body.programId || !body.landingPageId || !body.landingPageVersionId) {
      return jsonResponse({ error: "Program and landing page draft identifiers are required." }, 400);
    }

    const { data: isManager, error: permissionError } = await userClient.rpc(
      "is_program_manager",
      {
        check_program_id: body.programId,
      },
    );

    if (permissionError || !isManager) {
      return jsonResponse({ error: "You do not have permission to generate landing page drafts." }, 403);
    }

    const { data: program, error: programError } = await adminClient
      .from("programs")
      .select(
        "id, name, slug, program_type, short_description, long_description, visibility, status, registration_opens_at, registration_closes_at, starts_at, submission_closes_at, ends_at, workspaces!inner(id, name, slug, organization_id, organizations!inner(id, name, primary_color))",
      )
      .eq("id", body.programId)
      .single();

    if (programError || !program) {
      return jsonResponse({ error: "Program context could not be loaded." }, 404);
    }

    const prompt = buildLandingPagePrompt(program);
    const aiRequestInsert = {
      feature_key: "landing_page_generation",
      requested_by: user.id,
      risk_level: "medium" as const,
      status: "generated",
      organization_id: program.workspaces.organizations.id,
      workspace_id: program.workspaces.id,
      program_id: program.id,
      request_payload: {
        prompt,
        landing_page_id: body.landingPageId,
        landing_page_version_id: body.landingPageVersionId,
        version_number: body.versionNumber ?? null,
      },
    };

    const { data: aiRequest, error: aiRequestError } = await adminClient
      .from("ai_requests")
      .insert(aiRequestInsert)
      .select("id")
      .single();

    if (aiRequestError || !aiRequest) {
      return jsonResponse({ error: "Failed to record AI request." }, 500);
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
        input: prompt,
        temperature: 0.4,
        text: {
          format: {
            type: "json_schema",
            name: "landing_page_draft",
            strict: true,
            schema: landingPageDraftSchema,
          },
        },
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      await adminClient
        .from("ai_requests")
        .update({
          status: "failed",
          output_payload: { error: errorText },
        })
        .eq("id", aiRequest.id);

      return jsonResponse({ error: "OpenAI draft generation failed." }, 502);
    }

    const openAiPayload = await openAiResponse.json();
    const outputText = openAiPayload.output_text;

    if (!outputText) {
      await adminClient
        .from("ai_requests")
        .update({
          status: "failed",
          output_payload: openAiPayload,
        })
        .eq("id", aiRequest.id);

      return jsonResponse({ error: "OpenAI returned no structured output." }, 502);
    }

    const draft = JSON.parse(outputText) as LandingPageDraft;
    validateLandingPageDraft(draft);

    const sectionRows = draft.sections.map((section) => ({
      landing_page_version_id: body.landingPageVersionId!,
      section_key: section.sectionKey,
      display_order: section.displayOrder,
      content: section.content,
      is_enabled: section.isEnabled,
    }));

    const { error: landingPageError } = await adminClient
      .from("landing_pages")
      .update({
        title: draft.title,
        seo_title: draft.seoTitle,
        seo_description: draft.seoDescription,
        theme_key: draft.themeKey,
      })
      .eq("id", body.landingPageId);

    if (landingPageError) {
      return jsonResponse({ error: landingPageError.message }, 500);
    }

    await adminClient
      .from("landing_page_sections")
      .delete()
      .eq("landing_page_version_id", body.landingPageVersionId);

    const { error: sectionInsertError } = await adminClient
      .from("landing_page_sections")
      .insert(sectionRows);

    if (sectionInsertError) {
      return jsonResponse({ error: sectionInsertError.message }, 500);
    }

    const { error: versionUpdateError } = await adminClient
      .from("landing_page_versions")
      .update({
        status: "preview",
        content: {
          title: draft.title,
          seoTitle: draft.seoTitle,
          seoDescription: draft.seoDescription,
          themeKey: draft.themeKey,
          sections: draft.sections,
        },
      })
      .eq("id", body.landingPageVersionId);

    if (versionUpdateError) {
      return jsonResponse({ error: versionUpdateError.message }, 500);
    }

    await adminClient.from("ai_requests").update({
      output_payload: draft,
      status: "generated",
    }).eq("id", aiRequest.id);

    await adminClient.from("ai_usage_events").insert({
      ai_request_id: aiRequest.id,
      feature_key: "landing_page_generation",
      provider_name: "openai",
      model_name: openAiPayload.model ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
      token_count:
        openAiPayload.usage?.total_tokens ??
        ((openAiPayload.usage?.input_tokens ?? 0) + (openAiPayload.usage?.output_tokens ?? 0)),
      organization_id: program.workspaces.organizations.id,
      workspace_id: program.workspaces.id,
      program_id: program.id,
    });

    return jsonResponse({
      ok: true,
      aiRequestId: aiRequest.id,
      landingPageVersionId: body.landingPageVersionId,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown function error." },
      500,
    );
  }
});

function buildLandingPagePrompt(program: Record<string, unknown>) {
  return [
    "You are generating an enterprise innovation program landing page draft.",
    "Return structured JSON only.",
    "Keep the tone corporate, credible, and operationally clear.",
    "Do not invent prize amounts, legal terms, or schedules that are not present in the input.",
    "If a detail is missing, phrase the section so it is still useful without fabricating facts.",
    "",
    `Program JSON: ${JSON.stringify(program)}`,
  ].join("\n");
}

function validateLandingPageDraft(draft: LandingPageDraft) {
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

const landingPageDraftSchema = {
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
        required: ["sectionKey", "displayOrder", "isEnabled", "content"],
        properties: {
          sectionKey: {
            type: "string",
            enum: ["hero", "overview", "timeline", "eligibility", "judging", "faq", "cta"],
          },
          displayOrder: { type: "integer" },
          isEnabled: { type: "boolean" },
          content: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    },
  },
};
