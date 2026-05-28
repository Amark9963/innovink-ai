import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Json } from "@/lib/supabase/database.types";

type TypedSupabaseClient = SupabaseClient<Database>;

type FormFieldType = Database["public"]["Enums"]["form_field_type"];
type FormKind = Database["public"]["Enums"]["form_kind"];
type ScoreScaleType = Database["public"]["Enums"]["score_scale_type"];
type CommunicationChannel = Database["public"]["Enums"]["communication_channel"];
type CommunicationTemplateType =
  Database["public"]["Enums"]["communication_template_type"];
type ReportVisibility = Database["public"]["Enums"]["report_visibility"];
type ReportStatus = Database["public"]["Enums"]["report_status"];
type ProgramHealthDimension =
  Database["public"]["Enums"]["program_health_dimension"];
type ProgramHealthStatus =
  Database["public"]["Enums"]["program_health_status"];
type OperationalRecommendationStatus =
  Database["public"]["Enums"]["operational_recommendation_status"];
type OperationalActivityType =
  Database["public"]["Enums"]["operational_activity_type"];
type MentorSessionType = Database["public"]["Enums"]["mentor_session_type"];

type ExecutionBrief = {
  title: string | null;
  detectedProgramType: string | null;
  currentBrief: Record<string, unknown> | null;
};

type ExecutionStep = {
  id: string;
  stepKey: string;
  stepType: string;
  title: string;
  inputPayload: Json | null;
};

type ExecutionContext = {
  supabase: TypedSupabaseClient;
  userId: string;
  organizationId: string | null;
  workspaceId: string;
  programId: string;
  brief: ExecutionBrief;
};

export type DeterministicExecutionResult = {
  status: "completed" | "partial";
  targetType: string | null;
  targetId: string | null;
  outputPayload: Json;
  reason?: string;
};

const formChoiceSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  value: z.string().trim().min(1).max(160),
});

const formFieldSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  type: z
    .enum([
      "short_text",
      "long_text",
      "email",
      "phone",
      "url",
      "number",
      "date",
      "single_choice",
      "multiple_choice",
      "dropdown",
      "file_upload",
      "image_upload",
      "video_link",
      "pitch_deck_upload",
      "section_header",
      "page_break",
      "consent_checkbox",
      "ai_usage_disclosure",
    ] satisfies FormFieldType[])
    .optional(),
  helpText: z.string().trim().max(300).optional(),
  placeholder: z.string().trim().max(180).optional(),
  required: z.boolean().optional(),
  choices: z.array(formChoiceSchema).max(12).optional(),
  validation: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const formPayloadSchema = z.object({
  name: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(600).optional(),
  fields: z.array(formFieldSchema).min(1).max(20).optional(),
});

const scoreCriterionSchema = z.object({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().max(400).optional(),
  weight: z.number().positive().max(100).optional(),
  scaleType: z
    .enum(["numeric", "boolean", "choice"] satisfies ScoreScaleType[])
    .optional(),
  judgeGuidance: z.string().trim().max(600).optional(),
  requiresComment: z.boolean().optional(),
});

const evaluationRoundSchema = z.object({
  name: z.string().trim().min(2).max(160),
  roundOrder: z.number().int().min(1).max(6).optional(),
  isBlindReview: z.boolean().optional(),
  criteria: z.array(scoreCriterionSchema).min(2).max(10).optional(),
});

const judgingPayloadSchema = z.object({
  rounds: z.array(evaluationRoundSchema).min(1).max(4).optional(),
  scorecardName: z.string().trim().min(3).max(160).optional(),
  scorecardDescription: z.string().trim().max(600).optional(),
});

const communicationTemplateSchema = z.object({
  key: z.string().trim().min(1).max(80),
  name: z.string().trim().min(2).max(160),
  templateType: z
    .enum([
      "lifecycle",
      "announcement",
      "reminder",
      "transactional",
      "operational",
    ] satisfies CommunicationTemplateType[])
    .optional(),
  channel: z
    .enum(["email", "in_app", "internal_feed"] satisfies CommunicationChannel[])
    .optional(),
  subject: z.string().trim().max(240).optional(),
  body: z.string().trim().min(1).max(4000),
});

const communicationsPayloadSchema = z.object({
  campaignName: z.string().trim().min(3).max(180).optional(),
  campaignType: z.string().trim().min(2).max(80).optional(),
  audienceSummary: z.string().trim().max(280).optional(),
  templates: z.array(communicationTemplateSchema).min(1).max(12).optional(),
  kickoffSubject: z.string().trim().max(240).optional(),
  kickoffBody: z.string().trim().max(4000).optional(),
});

const mentoringPayloadSchema = z.object({
  model: z.string().trim().min(2).max(120).optional(),
  maxMentors: z.number().int().positive().max(250).optional(),
  sessionType: z
    .enum(
      [
        "one_to_one",
        "team_office_hour",
        "expert_review",
        "pitch_coaching",
        "group_clinic",
        "panel_session",
      ] satisfies MentorSessionType[],
    )
    .optional(),
  timezone: z.string().trim().min(2).max(80).optional(),
  slotDurationMinutes: z.number().int().positive().max(240).optional(),
  recommendationScope: z.string().trim().min(2).max(120).optional(),
});

const launchReadinessPayloadSchema = z.object({
  checklistName: z.string().trim().min(3).max(160).optional(),
  milestones: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        title: z.string().trim().min(2).max(160),
        status: z
          .enum(["on_track", "at_risk", "blocked", "overdue"] satisfies ProgramHealthStatus[])
          .optional(),
        windowLabel: z.string().trim().max(220).optional(),
      }),
    )
    .min(1)
    .max(12)
    .optional(),
});

const operationsPayloadSchema = z.object({
  healthRules: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        dimension: z.enum(
          [
            "registration",
            "submission",
            "judging",
            "mentoring",
            "communications",
            "automation",
            "sponsor_deliverables",
            "overall",
          ] satisfies ProgramHealthDimension[],
        ),
        thresholdDescription: z.string().trim().min(1).max(240),
      }),
    )
    .min(1)
    .max(12)
    .optional(),
});

const sponsorReportingPayloadSchema = z.object({
  templateName: z.string().trim().min(3).max(180).optional(),
  title: z.string().trim().min(3).max(200).optional(),
  summary: z.string().trim().max(600).optional(),
  sections: z.array(z.string().trim().min(2).max(160)).min(1).max(12).optional(),
});

type NormalizedField = {
  key: string;
  label: string;
  type: FormFieldType;
  helpText?: string;
  placeholder?: string;
  required: boolean;
  choices?: Array<{ key: string; label: string; value: string }>;
  validation?: Record<string, unknown>;
  config?: Record<string, unknown>;
};

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function getBriefRecord(
  brief: ExecutionBrief["currentBrief"],
): Record<string, unknown> {
  return brief && typeof brief === "object" && !Array.isArray(brief) ? brief : {};
}

function getStringArrayValue(
  source: Record<string, unknown>,
  key: string,
): string[] {
  const value = source[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getStringValue(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function buildRegistrationFields(brief: ExecutionBrief): NormalizedField[] {
  const currentBrief = getBriefRecord(brief.currentBrief);
  const regions = getStringArrayValue(currentBrief, "regions");

  return [
    {
      key: "full_name",
      label: "Full name",
      type: "short_text",
      placeholder: "Enter your full name",
      required: true,
      validation: { minLength: 2, maxLength: 120 },
    },
    {
      key: "email",
      label: "Work or primary email",
      type: "email",
      placeholder: "name@company.com",
      required: true,
    },
    {
      key: "organization_name",
      label: "Organization or team name",
      type: "short_text",
      placeholder: "Business unit, school, startup, or company",
      required: true,
    },
    {
      key: "role_title",
      label: "Role or title",
      type: "short_text",
      placeholder: "Your role in the organization",
      required: true,
    },
    {
      key: "region",
      label: "Primary region",
      type: regions.length > 0 ? "dropdown" : "short_text",
      placeholder: regions.length > 0 ? undefined : "Region or country",
      required: true,
      choices:
        regions.length > 0
          ? regions.map((region) => ({
              key: slugifyKey(region),
              label: region,
              value: region,
            }))
          : undefined,
    },
    {
      key: "team_intent",
      label: "Participation format",
      type: "dropdown",
      required: true,
      choices: [
        { key: "solo", label: "Solo participant", value: "solo" },
        { key: "team", label: "Joining or forming a team", value: "team" },
      ],
    },
    {
      key: "motivation",
      label: "Why do you want to participate?",
      type: "long_text",
      required: true,
      helpText: "Share the problem space, interest area, or outcome you hope to pursue.",
      validation: { minLength: 40, maxLength: 1200 },
    },
    {
      key: "consent",
      label: "I confirm that the information provided is accurate and I agree to the program terms.",
      type: "consent_checkbox",
      required: true,
    },
  ];
}

function buildSubmissionFields(): NormalizedField[] {
  return [
    {
      key: "project_title",
      label: "Project title",
      type: "short_text",
      required: true,
      validation: { minLength: 3, maxLength: 160 },
    },
    {
      key: "one_line_summary",
      label: "One-line summary",
      type: "short_text",
      required: true,
      validation: { minLength: 10, maxLength: 220 },
    },
    {
      key: "problem_statement",
      label: "Problem statement",
      type: "long_text",
      required: true,
      validation: { minLength: 80, maxLength: 2000 },
    },
    {
      key: "solution_overview",
      label: "Solution overview",
      type: "long_text",
      required: true,
      validation: { minLength: 120, maxLength: 2400 },
    },
    {
      key: "innovation_difference",
      label: "What makes this innovative?",
      type: "long_text",
      required: true,
      validation: { minLength: 80, maxLength: 1600 },
    },
    {
      key: "impact_and_outcomes",
      label: "Expected impact and measurable outcomes",
      type: "long_text",
      required: true,
      validation: { minLength: 80, maxLength: 1600 },
    },
    {
      key: "demo_url",
      label: "Demo or prototype link",
      type: "url",
      required: false,
    },
    {
      key: "pitch_deck",
      label: "Pitch deck",
      type: "pitch_deck_upload",
      required: true,
      helpText: "Upload the latest presentation used for evaluation and sponsor review.",
    },
    {
      key: "supporting_materials",
      label: "Supporting materials",
      type: "file_upload",
      required: false,
      helpText: "Optional supporting files such as technical specs, research, or visual references.",
    },
  ];
}

function defaultFormDefinition(kind: FormKind, brief: ExecutionBrief) {
  const titleBase = brief.title?.trim() || "Innovation Program";
  if (kind === "registration") {
    return {
      name: `${titleBase} Registration Form`,
      description:
        "Collect the participant details, team intent, and motivation needed to review and admit applicants.",
      fields: buildRegistrationFields(brief),
    };
  }

  return {
    name: `${titleBase} Submission Form`,
    description:
      "Collect the core submission materials required for evaluation, judging, and sponsor-safe reporting.",
    fields: buildSubmissionFields(),
  };
}

function normalizeFormFields(fields: z.infer<typeof formFieldSchema>[]): NormalizedField[] {
  return fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type ?? "short_text",
    helpText: field.helpText,
    placeholder: field.placeholder,
    required: field.required ?? false,
    choices: field.choices,
    validation: field.validation,
    config: field.config,
  }));
}

function buildJudgingRounds(brief: ExecutionBrief) {
  const currentBrief = getBriefRecord(brief.currentBrief);
  const evaluationModel = getStringValue(currentBrief, "evaluationModel")?.toLowerCase() ?? "";
  const roundCount =
    evaluationModel.includes("two") || evaluationModel.includes("2 round")
      ? 2
      : 1;

  const baseCriteria = [
    {
      key: "innovation_strength",
      label: "Innovation strength",
      description: "Evaluate originality, differentiation, and strategic relevance.",
      weight: 30,
      scaleType: "numeric" as ScoreScaleType,
      judgeGuidance: "Reward clear novelty and relevance to the stated challenge.",
      requiresComment: true,
    },
    {
      key: "feasibility",
      label: "Feasibility",
      description: "Assess delivery realism, technical credibility, and execution readiness.",
      weight: 25,
      scaleType: "numeric" as ScoreScaleType,
      judgeGuidance: "Consider whether the team can deliver this with practical constraints.",
      requiresComment: false,
    },
    {
      key: "impact",
      label: "Impact potential",
      description: "Assess expected business, societal, or operational value.",
      weight: 25,
      scaleType: "numeric" as ScoreScaleType,
      judgeGuidance: "Focus on measurable value, reach, and relevance to target users.",
      requiresComment: true,
    },
    {
      key: "presentation_quality",
      label: "Clarity and presentation",
      description: "Assess how clearly the team communicates the opportunity and solution.",
      weight: 20,
      scaleType: "numeric" as ScoreScaleType,
      judgeGuidance: "Look for crisp storytelling, evidence, and coherent positioning.",
      requiresComment: false,
    },
  ];

  return Array.from({ length: roundCount }, (_, index) => ({
    name: roundCount === 1 ? "Round 1 Review" : `Round ${index + 1} Review`,
    roundOrder: index + 1,
    isBlindReview: index === 0,
    criteria: baseCriteria,
  }));
}

function buildCommunicationTemplates(brief: ExecutionBrief) {
  const titleBase = brief.title?.trim() || "Innovation Program";
  const objective =
    getStringValue(getBriefRecord(brief.currentBrief), "objective") ??
    "participation in the program";

  return [
    {
      key: "program_launch",
      name: "Program launch announcement",
      templateType: "announcement" as CommunicationTemplateType,
      channel: "email" as CommunicationChannel,
      subject: `${titleBase} is now live`,
      body: `We are pleased to announce that ${titleBase} is now open. This program is focused on ${objective}. Review the program materials, register your participation, and prepare for the next milestone in the launch plan.`,
    },
    {
      key: "registration_reminder",
      name: "Registration reminder",
      templateType: "reminder" as CommunicationTemplateType,
      channel: "email" as CommunicationChannel,
      subject: `Reminder: register for ${titleBase}`,
      body: `Registration for ${titleBase} remains open. Please complete your registration and confirm your participation format so the program team can finalize cohort planning and communications.`,
    },
    {
      key: "submission_deadline",
      name: "Submission deadline reminder",
      templateType: "reminder" as CommunicationTemplateType,
      channel: "email" as CommunicationChannel,
      subject: `${titleBase} submission deadline reminder`,
      body: `This is a reminder to complete your submission for ${titleBase}. Please review the submission checklist, confirm your materials are complete, and submit before the deadline closes.`,
    },
    {
      key: "judge_onboarding",
      name: "Judge onboarding briefing",
      templateType: "operational" as CommunicationTemplateType,
      channel: "email" as CommunicationChannel,
      subject: `${titleBase} judging onboarding`,
      body: `Thank you for supporting ${titleBase} as a judge. This briefing covers your evaluation responsibilities, timeline, and the standards expected for fair and consistent scoring.`,
    },
  ];
}

function slugifyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

async function logOperationalActivity(
  context: ExecutionContext,
  params: {
    activityType: OperationalActivityType;
    title: string;
    summary: string;
    sourceType: string;
    sourceId: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { data, error } = await context.supabase
    .from("operational_activity_events")
    .insert({
      program_id: context.programId,
      activity_type: params.activityType,
      title: params.title,
      summary: params.summary,
      source_type: params.sourceType,
      source_id: params.sourceId,
      actor_user_id: context.userId,
      activity_payload: toJson(params.metadata ?? {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to log operational activity.");
  }

  return data.id;
}

async function upsertProgramHealthSnapshot(
  context: ExecutionContext,
  params: {
    dimension: ProgramHealthDimension;
    status: ProgramHealthStatus;
    score: number | null;
    summary: string;
    signalPayload?: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await context.supabase
    .from("program_health_snapshots")
    .select("id")
    .eq("program_id", context.programId)
    .eq("health_dimension", params.dimension)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { error } = await context.supabase
      .from("program_health_snapshots")
      .update({
        status: params.status,
        score: params.score,
        summary: params.summary,
        signal_payload: toJson(params.signalPayload ?? {}),
        recorded_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return existing.id;
  }

  const { data, error } = await context.supabase
    .from("program_health_snapshots")
    .insert({
      program_id: context.programId,
      health_dimension: params.dimension,
      status: params.status,
      score: params.score,
      summary: params.summary,
      signal_payload: toJson(params.signalPayload ?? {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create program health snapshot.");
  }

  return data.id;
}

async function upsertPendingAction(
  context: ExecutionContext,
  params: {
    actionType: string;
    priority: string;
    title: string;
    description: string;
    sourceType: string;
  },
) {
  const { data: existing, error: existingError } = await context.supabase
    .from("pending_actions")
    .select("id")
    .eq("program_id", context.programId)
    .eq("action_type", params.actionType)
    .eq("title", params.title)
    .in("status", ["open", "in_progress"])
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { error } = await context.supabase
      .from("pending_actions")
      .update({
        priority: params.priority,
        description: params.description,
        source_type: params.sourceType,
        assigned_to: context.userId,
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return existing.id;
  }

  const { data, error } = await context.supabase
    .from("pending_actions")
    .insert({
      program_id: context.programId,
      action_type: params.actionType,
      status: "open",
      priority: params.priority,
      title: params.title,
      description: params.description,
      source_type: params.sourceType,
      assigned_to: context.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create pending action.");
  }

  return data.id;
}

async function upsertOperationalRecommendation(
  context: ExecutionContext,
  params: {
    recommendationType: string;
    title: string;
    summary: string;
    reasoning: string;
    riskLevel: Database["public"]["Enums"]["ai_risk_level"];
    expectedBenefit: string;
    approvalRequired: boolean;
    sourceType: string;
    sourceId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await context.supabase
    .from("operational_recommendations")
    .select("id")
    .eq("program_id", context.programId)
    .eq("recommendation_type", params.recommendationType)
    .eq("title", params.title)
    .in("status", ["suggested", "approved"])
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const status: OperationalRecommendationStatus = "suggested";

  if (existing?.id) {
    const { error } = await context.supabase
      .from("operational_recommendations")
      .update({
        status,
        summary: params.summary,
        reasoning: params.reasoning,
        risk_level: params.riskLevel,
        expected_benefit: params.expectedBenefit,
        approval_required: params.approvalRequired,
        source_type: params.sourceType,
        source_id: params.sourceId ?? null,
        recommendation_metadata: toJson(params.metadata ?? {}),
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return existing.id;
  }

  const { data, error } = await context.supabase
    .from("operational_recommendations")
    .insert({
      program_id: context.programId,
      status,
      recommendation_type: params.recommendationType,
      title: params.title,
      summary: params.summary,
      reasoning: params.reasoning,
      risk_level: params.riskLevel,
      expected_benefit: params.expectedBenefit,
      approval_required: params.approvalRequired,
      source_type: params.sourceType,
      source_id: params.sourceId ?? null,
      recommendation_metadata: toJson(params.metadata ?? {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create operational recommendation.");
  }

  return data.id;
}

async function upsertMilestoneStatus(
  context: ExecutionContext,
  params: {
    milestoneType: string;
    milestoneKey: string;
    status: ProgramHealthStatus;
    metadata?: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await context.supabase
    .from("milestone_statuses")
    .select("id")
    .eq("program_id", context.programId)
    .eq("milestone_key", params.milestoneKey)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { error } = await context.supabase
      .from("milestone_statuses")
      .update({
        milestone_type: params.milestoneType,
        status: params.status,
        milestone_metadata: toJson(params.metadata ?? {}),
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return existing.id;
  }

  const { data, error } = await context.supabase
    .from("milestone_statuses")
    .insert({
      program_id: context.programId,
      milestone_type: params.milestoneType,
      milestone_key: params.milestoneKey,
      status: params.status,
      milestone_metadata: toJson(params.metadata ?? {}),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create milestone status.");
  }

  return data.id;
}

async function upsertOperationalHealthRule(
  context: ExecutionContext,
  params: {
    dimension: ProgramHealthDimension;
    ruleKey: string;
    rulePayload: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await context.supabase
    .from("operational_health_rules")
    .select("id")
    .eq("scope_type", "program")
    .eq("program_id", context.programId)
    .eq("rule_key", params.ruleKey)
    .eq("health_dimension", params.dimension)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { error } = await context.supabase
      .from("operational_health_rules")
      .update({
        rule_payload: toJson(params.rulePayload),
        active: true,
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return existing.id;
  }

  const { data, error } = await context.supabase
    .from("operational_health_rules")
    .insert({
      scope_type: "program",
      organization_id: context.organizationId,
      workspace_id: context.workspaceId,
      program_id: context.programId,
      health_dimension: params.dimension,
      rule_key: params.ruleKey,
      rule_payload: toJson(params.rulePayload),
      active: true,
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create operational health rule.");
  }

  return data.id;
}

async function executeLandingPageStep(
  context: ExecutionContext,
): Promise<DeterministicExecutionResult> {
  const { data, error } = await context.supabase.rpc("bootstrap_landing_page_draft", {
    program_id_input: context.programId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const landingPageResult = (
    data as Array<{
      landing_page_id: string;
      landing_page_version_id: string;
      version_number: number;
    }> | null
  )?.[0];

  return {
    status: "completed",
    targetType: "landing_page",
    targetId: landingPageResult?.landing_page_id ?? null,
    outputPayload: toJson({
      landingPageId: landingPageResult?.landing_page_id ?? null,
      landingPageVersionId: landingPageResult?.landing_page_version_id ?? null,
      versionNumber: landingPageResult?.version_number ?? null,
    }),
  };
}

async function executeFormStep(
  context: ExecutionContext,
  kind: FormKind,
  payload: Json | null,
): Promise<DeterministicExecutionResult> {
  const parsed = formPayloadSchema.safeParse(payload ?? {});
  const fallback = defaultFormDefinition(kind, context.brief);
  const fields = parsed.success && parsed.data.fields
    ? normalizeFormFields(parsed.data.fields)
    : fallback.fields;
  const name = parsed.success && parsed.data.name ? parsed.data.name : fallback.name;
  const description =
    parsed.success && parsed.data.description
      ? parsed.data.description
      : fallback.description;

  const { data: existingForm, error: formLookupError } = await context.supabase
    .from("forms")
    .select("id")
    .eq("program_id", context.programId)
    .eq("kind", kind)
    .maybeSingle();

  if (formLookupError) {
    throw new Error(formLookupError.message);
  }

  let formId = existingForm?.id ?? null;

  if (formId) {
    const { error: updateError } = await context.supabase
      .from("forms")
      .update({
        name,
        description,
        status: "draft",
      })
      .eq("id", formId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: insertedForm, error: insertError } = await context.supabase
      .from("forms")
      .insert({
        program_id: context.programId,
        kind,
        name,
        description,
        status: "draft",
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (insertError || !insertedForm) {
      throw new Error(insertError?.message ?? "Unable to create the form.");
    }

    formId = insertedForm.id;
  }

  const { data: latestVersion, error: versionLookupError } = await context.supabase
    .from("form_versions")
    .select("version_number")
    .eq("form_id", formId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionLookupError) {
    throw new Error(versionLookupError.message);
  }

  const versionNumber = (latestVersion?.version_number ?? 0) + 1;
  const schemaSnapshot = {
    kind,
    name,
    description,
    fields,
  };

  const { data: versionRow, error: versionInsertError } = await context.supabase
    .from("form_versions")
    .insert({
      form_id: formId,
      version_number: versionNumber,
      schema_snapshot: toJson(schemaSnapshot),
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (versionInsertError || !versionRow) {
    throw new Error(versionInsertError?.message ?? "Unable to create the form version.");
  }

  const { data: fieldRows, error: fieldInsertError } = await context.supabase
    .from("form_fields")
    .insert(
      fields.map((field, index) => ({
        form_version_id: versionRow.id,
        field_key: field.key,
        label: field.label,
        field_type: field.type,
        display_order: index + 1,
        help_text: field.helpText ?? null,
        placeholder: field.placeholder ?? null,
        validation_rules: toJson(field.validation ?? {}),
        field_config: toJson(field.config ?? {}),
        is_required: field.required,
        is_enabled: true,
      })),
    )
    .select("id, field_key");

  if (fieldInsertError) {
    throw new Error(fieldInsertError.message);
  }

  const fieldIdByKey = new Map(
    (fieldRows ?? []).map((row) => [row.field_key, row.id]),
  );

  const choiceRows = fields.flatMap((field) =>
    (field.choices ?? []).map((choice, index) => ({
      form_field_id: fieldIdByKey.get(field.key) ?? "",
      choice_key: choice.key,
      label: choice.label,
      value: choice.value,
      display_order: index + 1,
    })),
  );

  if (choiceRows.length > 0) {
    const { error: choiceInsertError } = await context.supabase
      .from("form_field_choices")
      .insert(choiceRows.filter((row) => row.form_field_id.length > 0));

    if (choiceInsertError) {
      throw new Error(choiceInsertError.message);
    }
  }

  const { error: activateError } = await context.supabase
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
    status: "completed",
    targetType: "form",
    targetId: formId,
    outputPayload: toJson({
      formId,
      formVersionId: versionRow.id,
      kind,
      versionNumber,
      fieldCount: fields.length,
    }),
  };
}

async function executeJudgingStep(
  context: ExecutionContext,
  payload: Json | null,
): Promise<DeterministicExecutionResult> {
  const parsed = judgingPayloadSchema.safeParse(payload ?? {});
  const rounds = parsed.success && parsed.data.rounds?.length
    ? parsed.data.rounds
    : buildJudgingRounds(context.brief);
  const scorecardName =
    parsed.success && parsed.data.scorecardName
      ? parsed.data.scorecardName
      : `${context.brief.title?.trim() || "Program"} Evaluation Scorecard`;
  const scorecardDescription =
    parsed.success && parsed.data.scorecardDescription
      ? parsed.data.scorecardDescription
      : "Primary scorecard for evaluating submissions against the approved program criteria.";

  const createdRoundIds: string[] = [];
  const createdScorecardIds: string[] = [];

  for (const [index, round] of rounds.entries()) {
    const roundOrder = round.roundOrder ?? index + 1;

    const { data: existingRound, error: roundLookupError } = await context.supabase
      .from("evaluation_rounds")
      .select("id")
      .eq("program_id", context.programId)
      .eq("round_order", roundOrder)
      .maybeSingle();

    if (roundLookupError) {
      throw new Error(roundLookupError.message);
    }

    let roundId = existingRound?.id ?? null;

    if (roundId) {
      const { error: roundUpdateError } = await context.supabase
        .from("evaluation_rounds")
        .update({
          name: round.name,
          is_blind_review: round.isBlindReview ?? false,
        })
        .eq("id", roundId);

      if (roundUpdateError) {
        throw new Error(roundUpdateError.message);
      }
    } else {
      const { data: insertedRound, error: roundInsertError } = await context.supabase
        .from("evaluation_rounds")
        .insert({
          program_id: context.programId,
          name: round.name,
          round_order: roundOrder,
          is_blind_review: round.isBlindReview ?? false,
          created_by: context.userId,
        })
        .select("id")
        .single();

      if (roundInsertError || !insertedRound) {
        throw new Error(roundInsertError?.message ?? "Unable to create evaluation round.");
      }

      roundId = insertedRound.id;
    }

    createdRoundIds.push(roundId);

    const { data: existingScorecard, error: scorecardLookupError } = await context.supabase
      .from("scorecards")
      .select("id")
      .eq("program_id", context.programId)
      .eq("evaluation_round_id", roundId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (scorecardLookupError) {
      throw new Error(scorecardLookupError.message);
    }

    const criteria = round.criteria?.length
      ? round.criteria
      : buildJudgingRounds(context.brief)[0].criteria;
    const totalWeight = criteria.reduce((sum, criterion) => sum + (criterion.weight ?? 0), 0);
    let scorecardId = existingScorecard?.id ?? null;

    if (scorecardId) {
      const { error: scorecardUpdateError } = await context.supabase
        .from("scorecards")
        .update({
          name: rounds.length > 1 ? `${scorecardName} - ${round.name}` : scorecardName,
          description: scorecardDescription,
          total_weight: totalWeight,
          is_active: true,
        })
        .eq("id", scorecardId);

      if (scorecardUpdateError) {
        throw new Error(scorecardUpdateError.message);
      }
    } else {
      const { data: insertedScorecard, error: scorecardInsertError } = await context.supabase
        .from("scorecards")
        .insert({
          program_id: context.programId,
          evaluation_round_id: roundId,
          name: rounds.length > 1 ? `${scorecardName} - ${round.name}` : scorecardName,
          description: scorecardDescription,
          total_weight: totalWeight,
          is_active: true,
          created_by: context.userId,
        })
        .select("id")
        .single();

      if (scorecardInsertError || !insertedScorecard) {
        throw new Error(scorecardInsertError?.message ?? "Unable to create scorecard.");
      }

      scorecardId = insertedScorecard.id;
    }

    createdScorecardIds.push(scorecardId);

    const { error: criteriaDeleteError } = await context.supabase
      .from("scorecard_criteria")
      .delete()
      .eq("scorecard_id", scorecardId);

    if (criteriaDeleteError) {
      throw new Error(criteriaDeleteError.message);
    }

    const { error: criteriaInsertError } = await context.supabase
      .from("scorecard_criteria")
      .insert(
        criteria.map((criterion, criterionIndex) => ({
          scorecard_id: scorecardId,
          criterion_key: criterion.key,
          label: criterion.label,
          description: criterion.description ?? null,
          weight: criterion.weight ?? 0,
          scale_type: criterion.scaleType ?? "numeric",
          scale_config: toJson({}),
          judge_guidance: criterion.judgeGuidance ?? null,
          requires_comment: criterion.requiresComment ?? false,
          display_order: criterionIndex + 1,
        })),
      );

    if (criteriaInsertError) {
      throw new Error(criteriaInsertError.message);
    }
  }

  return {
    status: "completed",
    targetType: "scorecard",
    targetId: createdScorecardIds[0] ?? null,
    outputPayload: toJson({
      evaluationRoundIds: createdRoundIds,
      scorecardIds: createdScorecardIds,
      roundCount: createdRoundIds.length,
    }),
  };
}

async function upsertCommunicationTemplate(
  context: ExecutionContext,
  template: {
    key: string;
    name: string;
    templateType: CommunicationTemplateType;
    channel: CommunicationChannel;
    subject?: string;
    body: string;
  },
) {
  const { data: existingTemplate, error: templateLookupError } = await context.supabase
    .from("communication_templates")
    .select("id")
    .eq("scope_type", "program")
    .eq("program_id", context.programId)
    .eq("template_key", template.key)
    .eq("channel", template.channel)
    .limit(1)
    .maybeSingle();

  if (templateLookupError) {
    throw new Error(templateLookupError.message);
  }

  if (existingTemplate?.id) {
    const { error: updateError } = await context.supabase
      .from("communication_templates")
      .update({
        name: template.name,
        template_type: template.templateType,
        subject_template: template.subject ?? null,
        body_template: template.body,
        metadata: toJson({
          generatedBy: "pm_workspace_executor",
        }),
      })
      .eq("id", existingTemplate.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return existingTemplate.id;
  }

  const { data: insertedTemplate, error: insertError } = await context.supabase
    .from("communication_templates")
    .insert({
      scope_type: "program",
      organization_id: context.organizationId,
      workspace_id: context.workspaceId,
      program_id: context.programId,
      name: template.name,
      template_key: template.key,
      template_type: template.templateType,
      channel: template.channel,
      subject_template: template.subject ?? null,
      body_template: template.body,
      metadata: toJson({
        generatedBy: "pm_workspace_executor",
      }),
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (insertError || !insertedTemplate) {
    throw new Error(insertError?.message ?? "Unable to create communication template.");
  }

  return insertedTemplate.id;
}

async function executeCommunicationsStep(
  context: ExecutionContext,
  payload: Json | null,
): Promise<DeterministicExecutionResult> {
  const parsed = communicationsPayloadSchema.safeParse(payload ?? {});
  const templates = parsed.success && parsed.data.templates?.length
    ? parsed.data.templates.map((template) => ({
        key: template.key,
        name: template.name,
        templateType: template.templateType ?? "operational",
        channel: template.channel ?? "email",
        subject: template.subject,
        body: template.body,
      }))
    : buildCommunicationTemplates(context.brief);
  const campaignName =
    parsed.success && parsed.data.campaignName
      ? parsed.data.campaignName
      : `${context.brief.title?.trim() || "Program"} Launch Communications`;
  const campaignType =
    parsed.success && parsed.data.campaignType
      ? parsed.data.campaignType
      : "launch_pack";
  const audienceSummary =
    parsed.success && parsed.data.audienceSummary
      ? parsed.data.audienceSummary
      : "Participants, judges, mentors, and internal operators for the active program launch.";

  const templateIds: string[] = [];
  for (const template of templates) {
    const templateId = await upsertCommunicationTemplate(context, template);
    templateIds.push(templateId);
  }

  const { data: existingCampaign, error: campaignLookupError } = await context.supabase
    .from("communication_campaigns")
    .select("id")
    .eq("scope_type", "program")
    .eq("program_id", context.programId)
    .eq("campaign_name", campaignName)
    .eq("channel", "email")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (campaignLookupError) {
    throw new Error(campaignLookupError.message);
  }

  let campaignId = existingCampaign?.id ?? null;

  if (campaignId) {
    const { error: updateError } = await context.supabase
      .from("communication_campaigns")
      .update({
        campaign_type: campaignType,
        audience_summary: audienceSummary,
        segment_snapshot: toJson({
          generatedBy: "pm_workspace_executor",
          templateIds,
        }),
        status: "draft",
      })
      .eq("id", campaignId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  } else {
    const { data: insertedCampaign, error: insertError } = await context.supabase
      .from("communication_campaigns")
      .insert({
        scope_type: "program",
        organization_id: context.organizationId,
        workspace_id: context.workspaceId,
        program_id: context.programId,
        communication_template_id: templateIds[0] ?? null,
        campaign_name: campaignName,
        campaign_type: campaignType,
        channel: "email",
        status: "draft",
        audience_summary: audienceSummary,
        segment_snapshot: toJson({
          generatedBy: "pm_workspace_executor",
          templateIds,
        }),
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (insertError || !insertedCampaign) {
      throw new Error(insertError?.message ?? "Unable to create communication campaign.");
    }

    campaignId = insertedCampaign.id;
  }

  const kickoffSubject =
    parsed.success && parsed.data.kickoffSubject
      ? parsed.data.kickoffSubject
      : `${context.brief.title?.trim() || "Program"} communications kickoff`;
  const kickoffBody =
    parsed.success && parsed.data.kickoffBody
      ? parsed.data.kickoffBody
      : "This launch communications pack is prepared for review. Final scheduling, segmentation, and sending remain approval-gated.";

  const { data: existingMessage, error: messageLookupError } = await context.supabase
    .from("communication_messages")
    .select("id")
    .eq("communication_campaign_id", campaignId)
    .eq("channel", "email")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (messageLookupError) {
    throw new Error(messageLookupError.message);
  }

  let messageId = existingMessage?.id ?? null;

  if (messageId) {
    const { error: messageUpdateError } = await context.supabase
      .from("communication_messages")
      .update({
        status: "draft",
        subject: kickoffSubject,
        body: kickoffBody,
        rendered_payload: toJson({
          templateIds,
          generatedBy: "pm_workspace_executor",
        }),
      })
      .eq("id", messageId);

    if (messageUpdateError) {
      throw new Error(messageUpdateError.message);
    }
  } else {
    const { data: insertedMessage, error: messageInsertError } = await context.supabase
      .from("communication_messages")
      .insert({
        communication_campaign_id: campaignId,
        scope_type: "program",
        organization_id: context.organizationId,
        workspace_id: context.workspaceId,
        program_id: context.programId,
        channel: "email",
        status: "draft",
        subject: kickoffSubject,
        body: kickoffBody,
        rendered_payload: toJson({
          templateIds,
          generatedBy: "pm_workspace_executor",
        }),
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (messageInsertError || !insertedMessage) {
      throw new Error(messageInsertError?.message ?? "Unable to create kickoff message.");
    }

    messageId = insertedMessage.id;
  }

  return {
    status: "completed",
    targetType: "communication_campaign",
    targetId: campaignId,
    outputPayload: toJson({
      campaignId,
      kickoffMessageId: messageId,
      templateIds,
    }),
  };
}

async function executeMentoringStep(
  context: ExecutionContext,
  payload: Json | null,
): Promise<DeterministicExecutionResult> {
  const parsed = mentoringPayloadSchema.safeParse(payload ?? {});
  const currentBrief = getBriefRecord(context.brief.currentBrief);
  const mentoringModel =
    parsed.success && parsed.data.model
      ? parsed.data.model
      : getStringValue(currentBrief, "mentoringModel") ??
        "Structured mentor support for teams and participants.";
  const sessionType =
    parsed.success && parsed.data.sessionType ? parsed.data.sessionType : "team_office_hour";
  const timezone =
    parsed.success && parsed.data.timezone ? parsed.data.timezone : "UTC";
  const slotDurationMinutes =
    parsed.success && parsed.data.slotDurationMinutes
      ? parsed.data.slotDurationMinutes
      : 30;
  const recommendationScope =
    parsed.success && parsed.data.recommendationScope
      ? parsed.data.recommendationScope
      : "Prioritize teams and participants requesting expert support after registration approval.";
  const maxMentors =
    parsed.success && parsed.data.maxMentors ? parsed.data.maxMentors : 12;

  const mentoringRuleId = await upsertOperationalHealthRule(context, {
    dimension: "mentoring",
    ruleKey: "mentor_cohort_activation",
    rulePayload: {
      model: mentoringModel,
      minimumActiveMentors: Math.max(3, Math.min(maxMentors, 6)),
      recommendationScope,
      sessionType,
      timezone,
      slotDurationMinutes,
    },
  });

  const healthSnapshotId = await upsertProgramHealthSnapshot(context, {
    dimension: "mentoring",
    status: "at_risk",
    score: 0.45,
    summary:
      "Mentoring setup is drafted, but mentor sourcing and activation still need operator action before matchmaking can begin.",
    signalPayload: {
      model: mentoringModel,
      recommendationScope,
      targetMentorCapacity: maxMentors,
    },
  });

  const pendingActionId = await upsertPendingAction(context, {
    actionType: "mentor_cohort_setup",
    priority: "high",
    title: "Source and activate the mentor cohort",
    description:
      "Confirm the mentor operating model, identify the initial mentor list, and prepare invite workflows before mentoring goes live.",
    sourceType: "mentoring_setup",
  });

  const recommendationId = await upsertOperationalRecommendation(context, {
    recommendationType: "mentor_matchmaking_bootstrap",
    title: "Prepare the first mentor matchmaking run",
    summary:
      "Queue a matchmaking run after the first mentor cohort and participant demand signals are confirmed.",
    reasoning:
      "The platform now has the mentoring policy baseline, but matching should begin only after active mentors and participant needs are visible.",
    riskLevel: "medium",
    expectedBenefit:
      "This keeps mentoring rollout structured and avoids low-quality or misaligned mentor assignments.",
    approvalRequired: true,
    sourceType: "mentoring_setup",
    sourceId: healthSnapshotId,
    metadata: {
      sessionType,
      timezone,
      slotDurationMinutes,
      recommendationScope,
    },
  });

  const { data: matchRun, error: matchRunError } = await context.supabase
    .from("mentor_match_runs")
    .insert({
      program_id: context.programId,
      status: "queued",
      run_scope: "initial_program_bootstrap",
      input_snapshot: toJson({
        recommendationScope,
        sessionType,
        timezone,
        slotDurationMinutes,
      }),
      result_summary: toJson({
        state: "awaiting_mentor_and_participant_signals",
      }),
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (matchRunError || !matchRun) {
    throw new Error(
      matchRunError?.message ?? "Unable to create mentoring matchmaking baseline.",
    );
  }

  const activityEventId = await logOperationalActivity(context, {
    activityType: "health_snapshot_recorded",
    title: "Mentoring readiness initialized",
    summary:
      "Mentoring baseline, operator actions, and matchmaking preparation have been created for the program.",
    sourceType: "mentoring_setup",
    sourceId: healthSnapshotId,
    metadata: {
      pendingActionId,
      recommendationId,
      matchRunId: matchRun.id,
      mentoringRuleId,
    },
  });

  return {
    status: "completed",
    targetType: "mentor_match_run",
    targetId: matchRun.id,
    outputPayload: toJson({
      mentorMatchRunId: matchRun.id,
      mentoringRuleId,
      healthSnapshotId,
      pendingActionId,
      recommendationId,
      activityEventId,
    }),
  };
}

function buildDefaultMilestones(brief: ExecutionBrief) {
  const currentBrief = getBriefRecord(brief.currentBrief);
  const timeline = currentBrief.timeline;
  const timelineRecord =
    timeline && typeof timeline === "object" && !Array.isArray(timeline)
      ? (timeline as Record<string, unknown>)
      : {};

  return [
    {
      key: "registration_window",
      title: "Registration window",
      status: "on_track" as ProgramHealthStatus,
      windowLabel:
        getStringValue(timelineRecord, "registrationWindow") ??
        "Registration timing pending publication review",
    },
    {
      key: "submission_window",
      title: "Submission window",
      status: "on_track" as ProgramHealthStatus,
      windowLabel:
        getStringValue(timelineRecord, "submissionWindow") ??
        "Submission timing pending publication review",
    },
    {
      key: "live_program_window",
      title: "Live program window",
      status: "on_track" as ProgramHealthStatus,
      windowLabel:
        getStringValue(timelineRecord, "liveProgramWindow") ??
        "Live program timing pending final operator review",
    },
    {
      key: "judging_readiness",
      title: "Judging readiness",
      status: "at_risk" as ProgramHealthStatus,
      windowLabel:
        "Judges, scorecards, and evaluation workflows need final validation",
    },
  ];
}

async function executeLaunchReadinessStep(
  context: ExecutionContext,
  payload: Json | null,
): Promise<DeterministicExecutionResult> {
  const parsed = launchReadinessPayloadSchema.safeParse(payload ?? {});
  const checklistName =
    parsed.success && parsed.data.checklistName
      ? parsed.data.checklistName
      : `${context.brief.title?.trim() || "Program"} launch readiness`;
  const milestones =
    parsed.success && parsed.data.milestones?.length
      ? parsed.data.milestones
      : buildDefaultMilestones(context.brief);

  const milestoneIds: string[] = [];
  for (const milestone of milestones) {
    const milestoneId = await upsertMilestoneStatus(context, {
      milestoneType: "launch_readiness",
      milestoneKey: milestone.key,
      status: milestone.status ?? "on_track",
      metadata: {
        title: milestone.title,
        checklistName,
        windowLabel: milestone.windowLabel ?? null,
      },
    });
    milestoneIds.push(milestoneId);
  }

  const pendingActionId = await upsertPendingAction(context, {
    actionType: "launch_readiness_review",
    priority: "high",
    title: "Run launch readiness review",
    description:
      "Review the generated assets, confirm approvals are complete, and validate that registration, submission, judging, and communications are ready to go live.",
    sourceType: "launch_readiness",
  });

  const recommendationId = await upsertOperationalRecommendation(context, {
    recommendationType: "launch_readiness_gate",
    title: "Use a formal launch gate before publishing",
    summary:
      "Complete a launch-readiness review before publishing the public program experience and opening participant workflows.",
    reasoning:
      "A formal launch gate helps catch unresolved operational issues across forms, judging, mentoring, and communications before the program is exposed to participants.",
    riskLevel: "high",
    expectedBenefit:
      "This reduces launch-time friction and improves trust in the PM agent’s generated setup.",
    approvalRequired: true,
    sourceType: "launch_readiness",
    metadata: {
      checklistName,
      milestoneCount: milestones.length,
    },
  });

  const healthSnapshotId = await upsertProgramHealthSnapshot(context, {
    dimension: "overall",
    status: "at_risk",
    score: 0.58,
    summary:
      "Launch readiness scaffolding is now active, but final operator validation is still required before a confident go-live decision.",
    signalPayload: {
      checklistName,
      milestoneCount: milestones.length,
    },
  });

  const activityEventId = await logOperationalActivity(context, {
    activityType: "milestone_updated",
    title: "Launch readiness checklist created",
    summary:
      "The PM workspace created launch readiness milestones and a formal review task for operator follow-through.",
    sourceType: "launch_readiness",
    sourceId: pendingActionId,
    metadata: {
      milestoneIds,
      recommendationId,
      healthSnapshotId,
    },
  });

  return {
    status: "completed",
    targetType: "pending_action",
    targetId: pendingActionId,
    outputPayload: toJson({
      checklistName,
      milestoneIds,
      pendingActionId,
      recommendationId,
      healthSnapshotId,
      activityEventId,
    }),
  };
}

function buildDefaultHealthRules() {
  return [
    {
      key: "registration_signal_watch",
      dimension: "registration" as ProgramHealthDimension,
      thresholdDescription:
        "Flag when registration traction is below target or materially lags plan assumptions.",
    },
    {
      key: "submission_signal_watch",
      dimension: "submission" as ProgramHealthDimension,
      thresholdDescription:
        "Flag when draft or final submission activity falls behind the program timeline.",
    },
    {
      key: "judging_completion_watch",
      dimension: "judging" as ProgramHealthDimension,
      thresholdDescription:
        "Flag when judging assignments or evaluation completion risk the decision timeline.",
    },
    {
      key: "communications_delivery_watch",
      dimension: "communications" as ProgramHealthDimension,
      thresholdDescription:
        "Flag when communication deliverability or engagement degrades launch effectiveness.",
    },
    {
      key: "automation_failure_watch",
      dimension: "automation" as ProgramHealthDimension,
      thresholdDescription:
        "Flag repeated automation failures or escalations that require PM intervention.",
    },
    {
      key: "overall_program_watch",
      dimension: "overall" as ProgramHealthDimension,
      thresholdDescription:
        "Flag when multiple dimensions degrade at once and the PM needs a coordinated intervention plan.",
    },
  ];
}

async function executeOperationsControlStep(
  context: ExecutionContext,
  payload: Json | null,
): Promise<DeterministicExecutionResult> {
  const parsed = operationsPayloadSchema.safeParse(payload ?? {});
  const rules =
    parsed.success && parsed.data.healthRules?.length
      ? parsed.data.healthRules
      : buildDefaultHealthRules();

  const ruleIds: string[] = [];
  for (const rule of rules) {
    const ruleId = await upsertOperationalHealthRule(context, {
      dimension: rule.dimension,
      ruleKey: rule.key,
      rulePayload: {
        thresholdDescription: rule.thresholdDescription,
        createdFrom: "pm_workspace_executor",
      },
    });
    ruleIds.push(ruleId);
  }

  const recommendationId = await upsertOperationalRecommendation(context, {
    recommendationType: "operations_command_center_activation",
    title: "Activate weekly PM operational review cadence",
    summary:
      "Use the live operations command center to review health dimensions, pending actions, and recommendations on a recurring cadence.",
    reasoning:
      "The platform now has enough execution scaffolding that the PM should shift from setup into active operational monitoring and intervention.",
    riskLevel: "medium",
    expectedBenefit:
      "This creates a repeatable operating rhythm and helps prevent missed milestones across communications, submissions, judging, and mentoring.",
    approvalRequired: false,
    sourceType: "operations_control",
    metadata: {
      ruleCount: rules.length,
    },
  });

  const pendingActionId = await upsertPendingAction(context, {
    actionType: "operations_command_center_review",
    priority: "medium",
    title: "Review the live operations command center",
    description:
      "Review current health signals, pending actions, and recommendations to confirm the program is operationally ready for active management.",
    sourceType: "operations_control",
  });

  const overallSnapshotId = await upsertProgramHealthSnapshot(context, {
    dimension: "overall",
    status: "on_track",
    score: 0.72,
    summary:
      "The live operations command center is initialized and ready for PM monitoring, with health rules and operational follow-up in place.",
    signalPayload: {
      ruleCount: rules.length,
      pendingActionId,
    },
  });

  const activityEventId = await logOperationalActivity(context, {
    activityType: "recommendation_created",
    title: "Operations command center initialized",
    summary:
      "Operational health rules, a PM review action, and a cadence recommendation were created for the active program.",
    sourceType: "operations_control",
    sourceId: recommendationId,
    metadata: {
      ruleIds,
      pendingActionId,
      overallSnapshotId,
    },
  });

  return {
    status: "completed",
    targetType: "operational_recommendation",
    targetId: recommendationId,
    outputPayload: toJson({
      ruleIds,
      recommendationId,
      pendingActionId,
      overallSnapshotId,
      activityEventId,
    }),
  };
}

async function upsertReportTemplate(
  context: ExecutionContext,
  params: {
    templateKey: string;
    visibility: ReportVisibility;
    name: string;
    templateSchema: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await context.supabase
    .from("report_templates")
    .select("id")
    .eq("program_id", context.programId)
    .eq("template_key", params.templateKey)
    .eq("visibility", params.visibility)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { error } = await context.supabase
      .from("report_templates")
      .update({
        name: params.name,
        template_schema: toJson(params.templateSchema),
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return existing.id;
  }

  const { data, error } = await context.supabase
    .from("report_templates")
    .insert({
      program_id: context.programId,
      visibility: params.visibility,
      name: params.name,
      template_key: params.templateKey,
      template_schema: toJson(params.templateSchema),
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create report template.");
  }

  return data.id;
}

async function upsertGeneratedReport(
  context: ExecutionContext,
  params: {
    reportTemplateId: string;
    visibility: ReportVisibility;
    status: ReportStatus;
    title: string;
    summary: string;
    content: Record<string, unknown>;
  },
) {
  const { data: existing, error: existingError } = await context.supabase
    .from("generated_reports")
    .select("id")
    .eq("program_id", context.programId)
    .eq("report_template_id", params.reportTemplateId)
    .eq("visibility", params.visibility)
    .eq("title", params.title)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { error } = await context.supabase
      .from("generated_reports")
      .update({
        status: params.status,
        summary: params.summary,
        content: toJson(params.content),
      })
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }

    return existing.id;
  }

  const { data, error } = await context.supabase
    .from("generated_reports")
    .insert({
      program_id: context.programId,
      report_template_id: params.reportTemplateId,
      visibility: params.visibility,
      status: params.status,
      title: params.title,
      summary: params.summary,
      content: toJson(params.content),
      generated_by: context.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create generated report.");
  }

  return data.id;
}

async function executeSponsorReportingStep(
  context: ExecutionContext,
  payload: Json | null,
): Promise<DeterministicExecutionResult> {
  const parsed = sponsorReportingPayloadSchema.safeParse(payload ?? {});
  const titleBase = context.brief.title?.trim() || "Program";
  const templateName =
    parsed.success && parsed.data.templateName
      ? parsed.data.templateName
      : `${titleBase} Sponsor Summary Template`;
  const reportTitle =
    parsed.success && parsed.data.title
      ? parsed.data.title
      : `${titleBase} Sponsor-Safe Program Report`;
  const reportSummary =
    parsed.success && parsed.data.summary
      ? parsed.data.summary
      : "Sponsor-safe reporting scaffold prepared for approved visibility, milestone progress, and high-level outcomes.";
  const sections =
    parsed.success && parsed.data.sections?.length
      ? parsed.data.sections
      : [
          "Program overview",
          "Participation and pipeline summary",
          "Shortlisted or highlighted innovations",
          "Mentoring and engagement highlights",
          "Next milestones and sponsor-visible outcomes",
        ];

  const reportTemplateId = await upsertReportTemplate(context, {
    templateKey: "sponsor_safe_default",
    visibility: "sponsor",
    name: templateName,
    templateSchema: {
      generatedBy: "pm_workspace_executor",
      sections,
      audience: "sponsor_safe",
      excludes: ["private judging notes", "internal-only operational commentary"],
    },
  });

  const generatedReportId = await upsertGeneratedReport(context, {
    reportTemplateId,
    visibility: "sponsor",
    status: "draft",
    title: reportTitle,
    summary: reportSummary,
    content: {
      generatedBy: "pm_workspace_executor",
      sections,
      state: "awaiting_program_activity",
      notes: [
        "This draft is sponsor-safe by design and should be enriched as the program progresses.",
        "Final approval and sponsor release remain human-governed.",
      ],
    },
  });

  const { data: sponsors, error: sponsorsError } = await context.supabase
    .from("sponsors")
    .select("id, name")
    .eq("program_id", context.programId)
    .order("created_at", { ascending: true });

  if (sponsorsError) {
    throw new Error(sponsorsError.message);
  }

  const sponsorReportIds: string[] = [];
  for (const sponsor of sponsors ?? []) {
    const { data: existingReport, error: existingReportError } = await context.supabase
      .from("sponsor_reports")
      .select("id")
      .eq("program_id", context.programId)
      .eq("sponsor_id", sponsor.id)
      .eq("title", reportTitle)
      .maybeSingle();

    if (existingReportError) {
      throw new Error(existingReportError.message);
    }

    if (existingReport?.id) {
      const { error } = await context.supabase
        .from("sponsor_reports")
        .update({
          generated_report_id: generatedReportId,
          summary: reportSummary,
          report_payload: toJson({
            generatedReportId,
            sections,
            sponsorName: sponsor.name,
          }),
        })
        .eq("id", existingReport.id);

      if (error) {
        throw new Error(error.message);
      }

      sponsorReportIds.push(existingReport.id);
      continue;
    }

    const { data, error } = await context.supabase
      .from("sponsor_reports")
      .insert({
        program_id: context.programId,
        sponsor_id: sponsor.id,
        generated_report_id: generatedReportId,
        title: reportTitle,
        summary: reportSummary,
        report_payload: toJson({
          generatedReportId,
          sections,
          sponsorName: sponsor.name,
        }),
        created_by: context.userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Unable to create sponsor report.");
    }

    sponsorReportIds.push(data.id);
  }

  const pendingActionId = await upsertPendingAction(context, {
    actionType: "sponsor_reporting_review",
    priority: "medium",
    title:
      sponsors && sponsors.length > 0
        ? "Review sponsor-safe report package"
        : "Attach sponsor contacts to the sponsor-safe report package",
    description:
      sponsors && sponsors.length > 0
        ? "Review the draft sponsor-safe report scaffold and confirm sponsor visibility boundaries before release."
        : "No sponsor records are attached yet. Add sponsor contacts or accounts so the sponsor-safe report package can be assigned and governed correctly.",
    sourceType: "sponsor_reporting",
  });

  const recommendationId = await upsertOperationalRecommendation(context, {
    recommendationType: "sponsor_reporting_governance",
    title: "Use sponsor-safe reporting as the default external reporting boundary",
    summary:
      "The platform generated a sponsor-safe report scaffold that should remain the default external reporting baseline.",
    reasoning:
      "This keeps sponsor visibility intentionally bounded while still giving the PM a reusable reporting foundation for program updates.",
    riskLevel: "medium",
    expectedBenefit:
      "External reporting becomes faster and more consistent without exposing internal judging or operational material.",
    approvalRequired: true,
    sourceType: "sponsor_reporting",
    sourceId: generatedReportId,
    metadata: {
      sponsorCount: sponsors?.length ?? 0,
      sections,
    },
  });

  const healthSnapshotId = await upsertProgramHealthSnapshot(context, {
    dimension: "sponsor_deliverables",
    status: sponsors && sponsors.length > 0 ? "on_track" : "at_risk",
    score: sponsors && sponsors.length > 0 ? 0.76 : 0.49,
    summary:
      sponsors && sponsors.length > 0
        ? "Sponsor-safe reporting scaffolding is in place and assigned to current sponsor records."
        : "Sponsor-safe reporting scaffolding exists, but sponsor contacts still need to be attached before distribution workflows can proceed.",
    signalPayload: {
      generatedReportId,
      sponsorCount: sponsors?.length ?? 0,
      sponsorReportCount: sponsorReportIds.length,
    },
  });

  const activityEventId = await logOperationalActivity(context, {
    activityType: "recommendation_created",
    title: "Sponsor-safe reporting scaffold created",
    summary:
      "A sponsor-safe report template, draft generated report, and sponsor follow-up controls were created for the program.",
    sourceType: "sponsor_reporting",
    sourceId: generatedReportId,
    metadata: {
      reportTemplateId,
      sponsorReportIds,
      pendingActionId,
      recommendationId,
      healthSnapshotId,
    },
  });

  return {
    status: "completed",
    targetType: "generated_report",
    targetId: generatedReportId,
    outputPayload: toJson({
      reportTemplateId,
      generatedReportId,
      sponsorReportIds,
      pendingActionId,
      recommendationId,
      healthSnapshotId,
      activityEventId,
    }),
  };
}

function buildPartialResult(message: string): DeterministicExecutionResult {
  return {
    status: "partial",
    targetType: null,
    targetId: null,
    outputPayload: toJson({
      message,
    }),
    reason: message,
  };
}

export async function executePmWorkspacePlanStep(
  context: ExecutionContext,
  step: ExecutionStep,
): Promise<DeterministicExecutionResult> {
  switch (step.stepType) {
    case "landing_page":
      return executeLandingPageStep(context);
    case "registration_form":
      return executeFormStep(context, "registration", step.inputPayload);
    case "submission_form":
      return executeFormStep(context, "submission", step.inputPayload);
    case "judging_setup":
      return executeJudgingStep(context, step.inputPayload);
    case "communications_pack":
      return executeCommunicationsStep(context, step.inputPayload);
    case "mentoring_setup":
      return executeMentoringStep(context, step.inputPayload);
    case "launch_readiness":
      return executeLaunchReadinessStep(context, step.inputPayload);
    case "operations_control":
      return executeOperationsControlStep(context, step.inputPayload);
    case "sponsor_reporting":
      return executeSponsorReportingStep(context, step.inputPayload);
    default:
      return buildPartialResult(
        "No deterministic executor is registered for this plan item type yet.",
      );
  }
}
