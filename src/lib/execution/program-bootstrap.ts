import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { ensureSlugOrThrow } from "@/lib/utils/slugs";

type TypedSupabaseClient = SupabaseClient<Database>;

const fieldChoiceSchema = z.object({
  key: z.string().trim().min(1).max(60).optional(),
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120).optional(),
});

const formFieldPayloadSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  type: z.string().trim().min(1).max(60),
  required: z.boolean().optional(),
  helpText: z.string().trim().max(240).optional(),
  placeholder: z.string().trim().max(180).optional(),
  choices: z.array(fieldChoiceSchema).max(12).optional(),
});

const formPayloadSchema = z.object({
  formName: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(400).optional(),
  fields: z.array(formFieldPayloadSchema).max(20).optional(),
});

const judgingCriterionSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(260).optional(),
  weight: z.number().min(1).max(100).optional(),
  requiresComment: z.boolean().optional(),
});

const judgingPayloadSchema = z.object({
  roundName: z.string().trim().min(1).max(120).optional(),
  scorecardName: z.string().trim().min(1).max(160).optional(),
  scorecardDescription: z.string().trim().max(400).optional(),
  criteria: z.array(judgingCriterionSchema).max(10).optional(),
});

const communicationTemplateSchema = z.object({
  key: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  channel: z.enum(["email", "in_app", "internal_feed"]).optional(),
  type: z
    .enum(["lifecycle", "announcement", "reminder", "transactional", "operational"])
    .optional(),
  subject: z.string().trim().max(180).optional(),
  body: z.string().trim().min(1).max(4000),
});

const communicationsPayloadSchema = z.object({
  campaignName: z.string().trim().min(1).max(180).optional(),
  audienceSummary: z.string().trim().max(260).optional(),
  templates: z.array(communicationTemplateSchema).max(8).optional(),
});

export type DeterministicExecutionResult = {
  targetType: string;
  targetId: string | null;
  outputPayload: Json;
};

type ProgramContext = {
  organizationId: string | null;
  workspaceId: string;
  programId: string;
  programName: string;
  programType: string;
  briefTitle: string;
  objective: string | null;
  actorUserId: string;
};

type ProgramBootstrapInput = {
  supabase: TypedSupabaseClient;
  context: ProgramContext;
  planItemTitle: string;
  payload: Json;
};

const formFieldTypeMap: Record<string, Database["public"]["Enums"]["form_field_type"]> = {
  short_text: "short_text",
  long_text: "long_text",
  email: "email",
  phone: "phone",
  url: "url",
  number: "number",
  date: "date",
  single_choice: "single_choice",
  multiple_choice: "multiple_choice",
  dropdown: "dropdown",
  file_upload: "file_upload",
  image_upload: "image_upload",
  video_link: "video_link",
  pitch_deck_upload: "pitch_deck_upload",
  section_header: "section_header",
  page_break: "page_break",
  consent_checkbox: "consent_checkbox",
  ai_usage_disclosure: "ai_usage_disclosure",
};

export async function ensureRegistrationFormDraft(
  input: ProgramBootstrapInput,
) {
  return ensureFormDraft({
    ...input,
    kind: "registration",
    defaultName: "Participant registration form",
    defaultDescription:
      "Capture participant intake, eligibility, profile context, and required consent before the program opens.",
    defaultFields: buildDefaultRegistrationFields(input.context),
  });
}

export async function ensureSubmissionFormDraft(
  input: ProgramBootstrapInput,
) {
  return ensureFormDraft({
    ...input,
    kind: "submission",
    defaultName: "Project submission form",
    defaultDescription:
      "Collect the core submission package, supporting assets, and evaluation-ready project context.",
    defaultFields: buildDefaultSubmissionFields(input.context),
  });
}

export async function ensureJudgingSetup(
  input: ProgramBootstrapInput,
): Promise<DeterministicExecutionResult> {
  const parsed = judgingPayloadSchema.safeParse(asRecord(input.payload));
  const payload = parsed.success ? parsed.data : {};
  const roundName = payload.roundName ?? "Round 1";
  const scorecardName = payload.scorecardName ?? "Primary evaluation scorecard";
  const criteria =
    payload.criteria && payload.criteria.length > 0
      ? normalizeCriteria(payload.criteria)
      : buildDefaultCriteria(input.context);

  let evaluationRoundId: string | null = null;

  const { data: existingRound } = await input.supabase
    .from("evaluation_rounds")
    .select("id")
    .eq("program_id", input.context.programId)
    .eq("round_order", 1)
    .maybeSingle();

  if (existingRound) {
    evaluationRoundId = existingRound.id;
    const { error: roundUpdateError } = await input.supabase
      .from("evaluation_rounds")
      .update({
        name: roundName,
      })
      .eq("id", existingRound.id);

    if (roundUpdateError) {
      throw new Error(roundUpdateError.message);
    }
  } else {
    const { data: roundRow, error: roundInsertError } = await input.supabase
      .from("evaluation_rounds")
      .insert({
        program_id: input.context.programId,
        name: roundName,
        round_order: 1,
        is_blind_review: false,
        created_by: input.context.actorUserId,
      })
      .select("id")
      .single();

    if (roundInsertError || !roundRow) {
      throw new Error(roundInsertError?.message ?? "Unable to create the evaluation round.");
    }

    evaluationRoundId = roundRow.id;
  }

  const { data: existingScorecard } = await input.supabase
    .from("scorecards")
    .select("id")
    .eq("program_id", input.context.programId)
    .eq("evaluation_round_id", evaluationRoundId)
    .eq("name", scorecardName)
    .eq("is_active", true)
    .maybeSingle();

  let scorecardId: string;

  if (existingScorecard) {
    scorecardId = existingScorecard.id;
    const { error: scorecardUpdateError } = await input.supabase
      .from("scorecards")
      .update({
        description:
          payload.scorecardDescription ??
          `Evaluation model for ${input.context.programName}.`,
        total_weight: criteria.reduce((sum, criterion) => sum + criterion.weight, 0),
      })
      .eq("id", scorecardId);

    if (scorecardUpdateError) {
      throw new Error(scorecardUpdateError.message);
    }
  } else {
    const { data: scorecardRow, error: scorecardInsertError } = await input.supabase
      .from("scorecards")
      .insert({
        program_id: input.context.programId,
        evaluation_round_id: evaluationRoundId,
        name: scorecardName,
        description:
          payload.scorecardDescription ??
          `Evaluation model for ${input.context.programName}.`,
        total_weight: criteria.reduce((sum, criterion) => sum + criterion.weight, 0),
        is_active: true,
        created_by: input.context.actorUserId,
      })
      .select("id")
      .single();

    if (scorecardInsertError || !scorecardRow) {
      throw new Error(scorecardInsertError?.message ?? "Unable to create the scorecard.");
    }

    scorecardId = scorecardRow.id;
  }

  const { data: existingCriteriaRows, error: criteriaLoadError } = await input.supabase
    .from("scorecard_criteria")
    .select("id, criterion_key")
    .eq("scorecard_id", scorecardId);

  if (criteriaLoadError) {
    throw new Error(criteriaLoadError.message);
  }

  const criterionMap = new Map(
    (existingCriteriaRows ?? []).map((row) => [row.criterion_key, row.id]),
  );

  for (let index = 0; index < criteria.length; index += 1) {
    const criterion = criteria[index];
    const existingId = criterionMap.get(criterion.key);

    if (existingId) {
      const { error: updateError } = await input.supabase
        .from("scorecard_criteria")
        .update({
          label: criterion.label,
          description: criterion.description,
          weight: criterion.weight,
          scale_type: "numeric",
          scale_config: toJson({
            min: 1,
            max: 10,
            step: 1,
          }),
          judge_guidance: criterion.judgeGuidance,
          requires_comment: criterion.requiresComment,
          display_order: index + 1,
        })
        .eq("id", existingId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { error: insertError } = await input.supabase
        .from("scorecard_criteria")
        .insert({
          scorecard_id: scorecardId,
          criterion_key: criterion.key,
          label: criterion.label,
          description: criterion.description,
          weight: criterion.weight,
          scale_type: "numeric",
          scale_config: toJson({
            min: 1,
            max: 10,
            step: 1,
          }),
          judge_guidance: criterion.judgeGuidance,
          requires_comment: criterion.requiresComment,
          display_order: index + 1,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }

  return {
    targetType: "scorecard",
    targetId: scorecardId,
    outputPayload: toJson({
      evaluationRoundId,
      scorecardId,
      criteriaCount: criteria.length,
    }),
  };
}

export async function ensureCommunicationsPack(
  input: ProgramBootstrapInput,
): Promise<DeterministicExecutionResult> {
  const parsed = communicationsPayloadSchema.safeParse(asRecord(input.payload));
  const payload = parsed.success ? parsed.data : {};
  const templates =
    payload.templates && payload.templates.length > 0
      ? payload.templates
      : buildDefaultCommunicationTemplates(input.context);

  let firstTemplateId: string | null = null;

  for (const template of templates) {
    const templateKey = ensureSlugOrThrow(template.key, "Communication template key");
    const channel = template.channel ?? "email";
    const templateType = template.type ?? "lifecycle";

    const { data: existingTemplate } = await input.supabase
      .from("communication_templates")
      .select("id")
      .eq("scope_type", "program")
      .eq("program_id", input.context.programId)
      .eq("template_key", templateKey)
      .eq("channel", channel)
      .maybeSingle();

    if (existingTemplate) {
      const { error: updateError } = await input.supabase
        .from("communication_templates")
        .update({
          name: template.name,
          template_type: templateType,
          subject_template: template.subject ?? null,
          body_template: template.body,
          metadata: toJson({
            generated_from_plan: true,
          }),
        })
        .eq("id", existingTemplate.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      firstTemplateId ??= existingTemplate.id;
    } else {
      const { data: insertedTemplate, error: insertError } = await input.supabase
        .from("communication_templates")
        .insert({
          scope_type: "program",
          organization_id: input.context.organizationId,
          workspace_id: input.context.workspaceId,
          program_id: input.context.programId,
          name: template.name,
          template_key: templateKey,
          template_type: templateType,
          channel,
          subject_template: template.subject ?? null,
          body_template: template.body,
          metadata: toJson({
            generated_from_plan: true,
          }),
          created_by: input.context.actorUserId,
        })
        .select("id")
        .single();

      if (insertError || !insertedTemplate) {
        throw new Error(insertError?.message ?? "Unable to create communication template.");
      }

      firstTemplateId ??= insertedTemplate.id;
    }
  }

  const campaignName =
    payload.campaignName ?? `${input.context.programName} launch communications`;
  const { data: existingCampaign } = await input.supabase
    .from("communication_campaigns")
    .select("id")
    .eq("scope_type", "program")
    .eq("program_id", input.context.programId)
    .eq("campaign_name", campaignName)
    .eq("channel", "email")
    .maybeSingle();

  let campaignId: string;

  if (existingCampaign) {
    campaignId = existingCampaign.id;
    const { error: campaignUpdateError } = await input.supabase
      .from("communication_campaigns")
      .update({
        communication_template_id: firstTemplateId,
        campaign_type: "launch_pack",
        status: "draft",
        audience_summary:
          payload.audienceSummary ??
          "Participants, judges, mentors, sponsors, and internal operators based on the program launch plan.",
        segment_snapshot: toJson({
          generated_from_plan: true,
          templateCount: templates.length,
        }),
      })
      .eq("id", campaignId);

    if (campaignUpdateError) {
      throw new Error(campaignUpdateError.message);
    }
  } else {
    const { data: campaignRow, error: campaignInsertError } = await input.supabase
      .from("communication_campaigns")
      .insert({
        scope_type: "program",
        organization_id: input.context.organizationId,
        workspace_id: input.context.workspaceId,
        program_id: input.context.programId,
        communication_template_id: firstTemplateId,
        campaign_name: campaignName,
        campaign_type: "launch_pack",
        channel: "email",
        status: "draft",
        audience_summary:
          payload.audienceSummary ??
          "Participants, judges, mentors, sponsors, and internal operators based on the program launch plan.",
        segment_snapshot: toJson({
          generated_from_plan: true,
          templateCount: templates.length,
        }),
        created_by: input.context.actorUserId,
      })
      .select("id")
      .single();

    if (campaignInsertError || !campaignRow) {
      throw new Error(campaignInsertError?.message ?? "Unable to create the communications campaign.");
    }

    campaignId = campaignRow.id;
  }

  return {
    targetType: "communication_campaign",
    targetId: campaignId,
    outputPayload: toJson({
      campaignId,
      templateCount: templates.length,
    }),
  };
}

async function ensureFormDraft(
  input: ProgramBootstrapInput & {
    kind: Database["public"]["Enums"]["form_kind"];
    defaultName: string;
    defaultDescription: string;
    defaultFields: FormFieldDefinition[];
  },
): Promise<DeterministicExecutionResult> {
  const parsed = formPayloadSchema.safeParse(asRecord(input.payload));
  const payload = parsed.success ? parsed.data : {};
  const fields =
    payload.fields && payload.fields.length > 0
      ? normalizeFormFields(payload.fields)
      : input.defaultFields;
  const formName = payload.formName ?? input.defaultName;
  const formDescription = payload.description ?? input.defaultDescription;

  const { data: existingForm } = await input.supabase
    .from("forms")
    .select("id, active_version_id")
    .eq("program_id", input.context.programId)
    .eq("kind", input.kind)
    .maybeSingle();

  let formId: string;

  if (existingForm) {
    formId = existingForm.id;
    const { error: formUpdateError } = await input.supabase
      .from("forms")
      .update({
        name: formName,
        description: formDescription,
        status: "draft",
      })
      .eq("id", formId);

    if (formUpdateError) {
      throw new Error(formUpdateError.message);
    }
  } else {
    const { data: formRow, error: formInsertError } = await input.supabase
      .from("forms")
      .insert({
        program_id: input.context.programId,
        kind: input.kind,
        name: formName,
        description: formDescription,
        status: "draft",
        created_by: input.context.actorUserId,
      })
      .select("id")
      .single();

    if (formInsertError || !formRow) {
      throw new Error(formInsertError?.message ?? "Unable to create the form.");
    }

    formId = formRow.id;
  }

  const { data: latestVersion } = await input.supabase
    .from("form_versions")
    .select("version_number")
    .eq("form_id", formId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const versionNumber = (latestVersion?.version_number ?? 0) + 1;
  const { data: versionRow, error: versionInsertError } = await input.supabase
    .from("form_versions")
    .insert({
      form_id: formId,
      version_number: versionNumber,
      schema_snapshot: toJson({
        name: formName,
        description: formDescription,
        fields,
      }),
      created_by: input.context.actorUserId,
    })
    .select("id")
    .single();

  if (versionInsertError || !versionRow) {
    throw new Error(versionInsertError?.message ?? "Unable to create the form version.");
  }

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];

    const { data: fieldRow, error: fieldInsertError } = await input.supabase
      .from("form_fields")
      .insert({
        form_version_id: versionRow.id,
        field_key: field.key,
        label: field.label,
        field_type: field.type,
        display_order: index + 1,
        help_text: field.helpText ?? null,
        placeholder: field.placeholder ?? null,
        validation_rules: toJson(field.validationRules ?? {}),
        field_config: toJson(field.fieldConfig ?? {}),
        is_required: field.required,
        is_enabled: true,
      })
      .select("id")
      .single();

    if (fieldInsertError || !fieldRow) {
      throw new Error(fieldInsertError?.message ?? `Unable to create form field ${field.label}.`);
    }

    if (field.choices && field.choices.length > 0) {
      const { error: choiceInsertError } = await input.supabase
        .from("form_field_choices")
        .insert(
          field.choices.map((choice, choiceIndex) => ({
            form_field_id: fieldRow.id,
            choice_key: choice.key,
            label: choice.label,
            value: choice.value,
            display_order: choiceIndex + 1,
          })),
        );

      if (choiceInsertError) {
        throw new Error(choiceInsertError.message);
      }
    }
  }

  const { error: activateError } = await input.supabase
    .from("forms")
    .update({
      active_version_id: versionRow.id,
      status: "draft",
    })
    .eq("id", formId);

  if (activateError) {
    throw new Error(activateError.message);
  }

  return {
    targetType: "form",
    targetId: formId,
    outputPayload: toJson({
      formId,
      formVersionId: versionRow.id,
      versionNumber,
      fieldCount: fields.length,
      formKind: input.kind,
    }),
  };
}

type FormFieldDefinition = {
  key: string;
  label: string;
  type: Database["public"]["Enums"]["form_field_type"];
  required: boolean;
  helpText?: string;
  placeholder?: string;
  validationRules?: Record<string, unknown>;
  fieldConfig?: Record<string, unknown>;
  choices?: Array<{
    key: string;
    label: string;
    value: string;
  }>;
};

type CriterionDefinition = {
  key: string;
  label: string;
  description: string;
  weight: number;
  requiresComment: boolean;
  judgeGuidance: string;
};

function buildDefaultRegistrationFields(
  context: ProgramContext,
): FormFieldDefinition[] {
  return [
    {
      key: "full_name",
      label: "Full name",
      type: "short_text",
      required: true,
      placeholder: "Enter the participant's full name",
    },
    {
      key: "email_address",
      label: "Work or primary email",
      type: "email",
      required: true,
      placeholder: "name@company.com",
    },
    {
      key: "organization_name",
      label: "Organization or business unit",
      type: "short_text",
      required: true,
      placeholder: "Division, faculty, business unit, or company",
    },
    {
      key: "role_title",
      label: "Role title",
      type: "short_text",
      required: true,
    },
    {
      key: "location_region",
      label: "Primary location or region",
      type: "short_text",
      required: true,
    },
    {
      key: "interest_statement",
      label: "Why are you joining this program?",
      type: "long_text",
      required: true,
      helpText:
        context.objective ??
        `Share the participant's motivation for joining ${context.programName}.`,
    },
    {
      key: "teaming_intent",
      label: "How will you participate?",
      type: "single_choice",
      required: true,
      choices: [
        { key: "solo", label: "I will start solo", value: "solo" },
        { key: "existing_team", label: "I already have a team", value: "existing_team" },
        { key: "need_team", label: "I need team support", value: "need_team" },
      ],
    },
    {
      key: "terms_acknowledgement",
      label: "I confirm the information provided is accurate and I accept the program terms.",
      type: "consent_checkbox",
      required: true,
    },
  ];
}

function buildDefaultSubmissionFields(
  context: ProgramContext,
): FormFieldDefinition[] {
  return [
    {
      key: "project_title",
      label: "Project title",
      type: "short_text",
      required: true,
    },
    {
      key: "problem_statement",
      label: "Problem statement",
      type: "long_text",
      required: true,
      helpText:
        context.objective ??
        "Describe the problem, customer, or operational challenge this solution addresses.",
    },
    {
      key: "solution_summary",
      label: "Solution summary",
      type: "long_text",
      required: true,
    },
    {
      key: "impact_case",
      label: "Expected impact",
      type: "long_text",
      required: true,
      helpText: "Describe expected business, customer, or ecosystem impact.",
    },
    {
      key: "maturity_stage",
      label: "Current maturity stage",
      type: "dropdown",
      required: true,
      choices: [
        { key: "concept", label: "Concept", value: "concept" },
        { key: "prototype", label: "Prototype", value: "prototype" },
        { key: "pilot_ready", label: "Pilot ready", value: "pilot_ready" },
        { key: "live_validation", label: "Live validation", value: "live_validation" },
      ],
    },
    {
      key: "demo_link",
      label: "Demo or video link",
      type: "video_link",
      required: false,
    },
    {
      key: "pitch_deck",
      label: "Pitch deck",
      type: "pitch_deck_upload",
      required: true,
    },
    {
      key: "supporting_materials",
      label: "Supporting files",
      type: "file_upload",
      required: false,
    },
  ];
}

function buildDefaultCriteria(context: ProgramContext): CriterionDefinition[] {
  return [
    {
      key: "problem_value",
      label: "Problem relevance",
      description: "How clearly the team identifies a meaningful problem or opportunity.",
      weight: 25,
      requiresComment: true,
      judgeGuidance: `Evaluate whether the problem is strategically relevant for ${context.programName}.`,
    },
    {
      key: "solution_quality",
      label: "Solution quality",
      description: "How strong, coherent, and well-articulated the proposed solution is.",
      weight: 30,
      requiresComment: true,
      judgeGuidance: "Assess solution clarity, novelty, and practicality.",
    },
    {
      key: "impact_potential",
      label: "Impact potential",
      description: "The likely business, customer, social, or ecosystem impact if adopted.",
      weight: 25,
      requiresComment: true,
      judgeGuidance: "Focus on measurable impact and relevance to the program objectives.",
    },
    {
      key: "execution_readiness",
      label: "Execution readiness",
      description: "How feasible the team appears to be in moving the concept toward execution.",
      weight: 20,
      requiresComment: false,
      judgeGuidance: "Review evidence of progress, team capability, and next-step realism.",
    },
  ];
}

function buildDefaultCommunicationTemplates(context: ProgramContext) {
  return [
    {
      key: "registration_confirmation",
      name: "Registration confirmation",
      channel: "email" as const,
      type: "transactional" as const,
      subject: `You're registered for ${context.programName}`,
      body: `Hello {{participant_name}},\n\nYour registration for ${context.programName} is confirmed.\n\nWe will keep you updated on next steps, key deadlines, and launch guidance.\n\nRegards,\nInnovink Program Operations`,
    },
    {
      key: "submission_deadline_reminder",
      name: "Submission deadline reminder",
      channel: "email" as const,
      type: "reminder" as const,
      subject: `${context.programName}: submission deadline reminder`,
      body: `Hello {{participant_name}},\n\nThis is a reminder that the submission window for ${context.programName} is approaching its close.\n\nPlease review the submission requirements, upload the required materials, and confirm your final submission before the deadline.\n\nRegards,\nInnovink Program Operations`,
    },
    {
      key: "judge_invitation",
      name: "Judge invitation",
      channel: "email" as const,
      type: "lifecycle" as const,
      subject: `Invitation to evaluate ${context.programName}`,
      body: `Hello {{judge_name}},\n\nYou are invited to serve as an evaluator for ${context.programName}.\n\nThe judging workspace will provide the scorecard, submission context, and evaluation timeline after you accept the assignment.\n\nRegards,\nInnovink Program Operations`,
    },
    {
      key: "sponsor_update",
      name: "Sponsor update",
      channel: "email" as const,
      type: "operational" as const,
      subject: `${context.programName}: sponsor-ready progress update`,
      body: `Hello {{sponsor_name}},\n\nThis message shares the latest approved sponsor-safe update for ${context.programName}.\n\nFurther outcome reporting will follow once internal review is complete.\n\nRegards,\nInnovink Program Operations`,
    },
  ];
}

function normalizeFormFields(
  rawFields: Array<z.infer<typeof formFieldPayloadSchema>>,
): FormFieldDefinition[] {
  return rawFields.map((field) => ({
    key: ensureSlugOrThrow(field.key, "Form field key"),
    label: field.label,
    type: normalizeFormFieldType(field.type),
    required: field.required ?? false,
    helpText: field.helpText,
    placeholder: field.placeholder,
    choices: field.choices?.map((choice) => ({
      key: ensureSlugOrThrow(choice.key ?? choice.label, "Field choice key"),
      label: choice.label,
      value: choice.value ?? choice.label,
    })),
  }));
}

function normalizeCriteria(
  rawCriteria: Array<z.infer<typeof judgingCriterionSchema>>,
): CriterionDefinition[] {
  const fallbackWeight = rawCriteria.length > 0 ? Number((100 / rawCriteria.length).toFixed(2)) : 25;
  return rawCriteria.map((criterion) => ({
    key: ensureSlugOrThrow(criterion.key, "Scorecard criterion key"),
    label: criterion.label,
    description:
      criterion.description ?? `${criterion.label} assessment for the judging workflow.`,
    weight: criterion.weight ?? fallbackWeight,
    requiresComment: criterion.requiresComment ?? false,
    judgeGuidance:
      criterion.description ?? `Assess ${criterion.label.toLowerCase()} in a consistent, evidence-based way.`,
  }));
}

function normalizeFormFieldType(
  value: string,
): Database["public"]["Enums"]["form_field_type"] {
  const normalized = ensureSlugOrThrow(value, "Form field type");
  return formFieldTypeMap[normalized] ?? "short_text";
}

function asRecord(value: Json) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
