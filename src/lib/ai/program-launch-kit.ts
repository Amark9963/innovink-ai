export type LaunchKitAssetTarget =
  | "landing_page"
  | "registration_form"
  | "submission_form"
  | "judging_setup";

type BriefContext = {
  title: string | null;
  detectedProgramType: string | null;
  currentBrief: Record<string, unknown> | null;
};

type PlanContext = {
  title: string | null;
  summary: string | null;
};

export type GeneratedAssetDraft = {
  artifactType: LaunchKitAssetTarget;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
};

function getBriefRecord(currentBrief: Record<string, unknown> | null) {
  return currentBrief && typeof currentBrief === "object" ? currentBrief : {};
}

function getStringValue(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getStringArrayValue(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function slugifyKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function buildLandingPageDraft(
  brief: BriefContext,
  plan: PlanContext | null,
): GeneratedAssetDraft {
  const briefRecord = getBriefRecord(brief.currentBrief);
  const titleBase = brief.title?.trim() || "Innovation Program";
  const regions = getStringArrayValue(briefRecord, "regions");
  const objective =
    getStringValue(briefRecord, "objective") ??
    "a high-integrity innovation program with governed registration, submission, and judging workflows";
  const format = getStringValue(briefRecord, "format") ?? "Enterprise innovation program";
  const audience = getStringArrayValue(briefRecord, "targetParticipants").join(", ") || "Program participants";
  const evaluation = getStringValue(briefRecord, "evaluationModel") ?? "A governed evaluation model";

  return {
    artifactType: "landing_page",
    title: `${titleBase} Landing Page Draft`,
    summary:
      "Enterprise landing page copy is ready for PM review, with a hero, overview, timeline framing, eligibility guidance, and a clear registration call to action.",
    payload: {
      title: `${titleBase} Landing Page`,
      seoTitle: titleBase,
      seoDescription: objective,
      themeKey: "enterprise-navy",
      sections: [
        {
          sectionKey: "hero",
          displayOrder: 10,
          headline: titleBase,
          subheadline: objective,
          ctaLabel: "Register interest",
        },
        {
          sectionKey: "overview",
          displayOrder: 20,
          body: `${format} for ${audience}. ${plan?.summary ?? "The launch plan will guide the full participant and operator flow."}`,
        },
        {
          sectionKey: "timeline",
          displayOrder: 30,
          body:
            "Registration, submission, evaluation, and final reporting remain governed by the approved program timeline.",
        },
        {
          sectionKey: "eligibility",
          displayOrder: 40,
          body:
            regions.length > 0
              ? `The program currently targets participants across ${regions.join(", ")}.`
              : "Eligibility and geographic scope should be confirmed before publish.",
        },
        {
          sectionKey: "judging",
          displayOrder: 50,
          body: `${evaluation} is planned, with final judge instructions and rubric details reviewed in the governed judging setup.`,
        },
        {
          sectionKey: "cta",
          displayOrder: 60,
          body: "Once approved, this page can be published as the public entry point into the governed registration flow.",
        },
      ],
    },
  };
}

function buildRegistrationFormDraft(brief: BriefContext): GeneratedAssetDraft {
  const briefRecord = getBriefRecord(brief.currentBrief);
  const titleBase = brief.title?.trim() || "Innovation Program";
  const regions = getStringArrayValue(briefRecord, "regions");

  return {
    artifactType: "registration_form",
    title: `${titleBase} Registration Form Draft`,
    summary:
      "A governed registration form draft is ready, covering participant identity, team intent, region selection, and program motivation.",
    payload: {
      name: `${titleBase} Registration Form`,
      description:
        "Collect the participant details, team intent, and motivation needed to admit and route program participants.",
      fields: [
        { key: "full_name", label: "Full name", type: "short_text", required: true },
        { key: "email", label: "Work or primary email", type: "email", required: true },
        { key: "organization_name", label: "Organization or team name", type: "short_text", required: true },
        { key: "role_title", label: "Role or title", type: "short_text", required: true },
        {
          key: "region",
          label: "Primary region",
          type: regions.length > 0 ? "dropdown" : "short_text",
          required: true,
          choices: regions.map((region) => ({
            key: slugifyKey(region),
            label: region,
            value: region,
          })),
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
        },
        {
          key: "consent",
          label: "I confirm the information provided is accurate and I agree to the program terms.",
          type: "consent_checkbox",
          required: true,
        },
      ],
    },
  };
}

function buildSubmissionFormDraft(brief: BriefContext): GeneratedAssetDraft {
  const titleBase = brief.title?.trim() || "Innovation Program";

  return {
    artifactType: "submission_form",
    title: `${titleBase} Submission Form Draft`,
    summary:
      "A submission package draft is ready for PM review, including the core innovation narrative, evidence, and judging-ready materials.",
    payload: {
      name: `${titleBase} Submission Form`,
      description:
        "Collect the core submission materials required for evaluation, judging, and sponsor-safe reporting.",
      fields: [
        { key: "project_title", label: "Project title", type: "short_text", required: true },
        { key: "one_line_summary", label: "One-line summary", type: "short_text", required: true },
        { key: "problem_statement", label: "Problem statement", type: "long_text", required: true },
        { key: "solution_overview", label: "Solution overview", type: "long_text", required: true },
        { key: "innovation_difference", label: "What makes this innovative?", type: "long_text", required: true },
        { key: "impact_and_outcomes", label: "Expected impact and measurable outcomes", type: "long_text", required: true },
        { key: "demo_url", label: "Demo or prototype link", type: "url", required: false },
        { key: "pitch_deck", label: "Pitch deck", type: "pitch_deck_upload", required: true },
      ],
    },
  };
}

function buildJudgingSetupDraft(brief: BriefContext): GeneratedAssetDraft {
  const briefRecord = getBriefRecord(brief.currentBrief);
  const titleBase = brief.title?.trim() || "Innovation Program";
  const evaluationModel = getStringValue(briefRecord, "evaluationModel")?.toLowerCase() ?? "";
  const twoRounds = evaluationModel.includes("two") || evaluationModel.includes("2 round");

  const criteria = [
    {
      key: "innovation_strength",
      label: "Innovation strength",
      description: "Evaluate originality, differentiation, and strategic relevance.",
      weight: 30,
    },
    {
      key: "feasibility",
      label: "Feasibility",
      description: "Assess delivery realism, technical credibility, and execution readiness.",
      weight: 25,
    },
    {
      key: "impact",
      label: "Impact potential",
      description: "Assess expected business, societal, or operational value.",
      weight: 25,
    },
    {
      key: "presentation_quality",
      label: "Clarity and presentation",
      description: "Assess how clearly the team communicates the opportunity and solution.",
      weight: 20,
    },
  ];

  return {
    artifactType: "judging_setup",
    title: `${titleBase} Judging Setup Draft`,
    summary:
      "A governed judging draft is ready, with round structure, scorecard framing, and baseline criteria for PM review.",
    payload: {
      scorecardName: `${titleBase} Scorecard`,
      scorecardDescription:
        "Baseline judging setup generated from the current brief and execution plan. Final rubric approval remains human-governed.",
      rounds: Array.from({ length: twoRounds ? 2 : 1 }, (_, index) => ({
        name: twoRounds ? `Round ${index + 1} Review` : "Round 1 Review",
        roundOrder: index + 1,
        isBlindReview: index === 0,
        criteria,
      })),
    },
  };
}

export function detectRequestedAssetTargets(message: string): LaunchKitAssetTarget[] {
  const normalized = message.toLowerCase();
  const targets = new Set<LaunchKitAssetTarget>();

  if (normalized.includes("landing page")) {
    targets.add("landing_page");
  }
  if (normalized.includes("registration form") || normalized.includes("registration")) {
    targets.add("registration_form");
  }
  if (normalized.includes("submission form") || normalized.includes("submission package")) {
    targets.add("submission_form");
  }
  if (normalized.includes("judging") || normalized.includes("scorecard") || normalized.includes("rubric")) {
    targets.add("judging_setup");
  }

  if (normalized.includes("launch assets") || normalized.includes("launch kit") || normalized.includes("generate all")) {
    targets.add("landing_page");
    targets.add("registration_form");
    targets.add("submission_form");
    targets.add("judging_setup");
  }

  return Array.from(targets);
}

export function buildLaunchKitAssetDrafts(params: {
  message: string;
  brief: BriefContext;
  plan: PlanContext | null;
}) {
  const targets = detectRequestedAssetTargets(params.message);

  const drafts = targets.map((target) => {
    switch (target) {
      case "landing_page":
        return buildLandingPageDraft(params.brief, params.plan);
      case "registration_form":
        return buildRegistrationFormDraft(params.brief);
      case "submission_form":
        return buildSubmissionFormDraft(params.brief);
      case "judging_setup":
      default:
        return buildJudgingSetupDraft(params.brief);
    }
  });

  return {
    targets,
    drafts,
  };
}
