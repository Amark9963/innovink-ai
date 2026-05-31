export type SetupStageKey =
  | "brief"
  | "plan"
  | "landing_page"
  | "registration_form"
  | "submission_form"
  | "judging_setup"
  | "approval"
  | "execution";

export type SetupStageStatus =
  | "not_started"
  | "active"
  | "complete"
  | "blocked";

export type SetupProgressStage = {
  key: SetupStageKey;
  label: string;
  status: SetupStageStatus;
  artifactId?: string | null;
  completedAt?: string | null;
};

export type SetupProgress = {
  version: 1;
  activeStage: SetupStageKey;
  recommendedStage: SetupStageKey | null;
  stages: SetupProgressStage[];
  updatedAt: string;
};

const STAGE_LABELS: Record<SetupStageKey, string> = {
  brief: "Brief",
  plan: "Plan",
  landing_page: "Landing page",
  registration_form: "Registration",
  submission_form: "Submission",
  judging_setup: "Judging",
  approval: "Approval",
  execution: "Execution",
};

const STAGE_ORDER = Object.keys(STAGE_LABELS) as SetupStageKey[];

const NEXT_STAGE: Partial<Record<SetupStageKey, SetupStageKey>> = {
  brief: "plan",
  plan: "landing_page",
  landing_page: "registration_form",
  registration_form: "submission_form",
  submission_form: "judging_setup",
  judging_setup: "approval",
  approval: "execution",
};

export function createInitialSetupProgress(now = new Date().toISOString()): SetupProgress {
  return {
    version: 1,
    activeStage: "brief",
    recommendedStage: "brief",
    updatedAt: now,
    stages: STAGE_ORDER.map((key) => ({
      key,
      label: STAGE_LABELS[key],
      status: key === "brief" ? "active" : "not_started",
    })),
  };
}

export function readSetupProgress(value: unknown): SetupProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createInitialSetupProgress();
  }

  const record = value as Record<string, unknown>;
  const progressCandidate =
    record.setupProgress &&
    typeof record.setupProgress === "object" &&
    !Array.isArray(record.setupProgress)
      ? (record.setupProgress as Record<string, unknown>)
      : record;
  const rawStages = Array.isArray(progressCandidate.stages)
    ? progressCandidate.stages
    : [];
  const fallback = createInitialSetupProgress(
    typeof progressCandidate.updatedAt === "string"
      ? progressCandidate.updatedAt
      : undefined,
  );

  const stages = fallback.stages.map((fallbackStage) => {
    const rawStage = rawStages.find(
      (stage) =>
        stage &&
        typeof stage === "object" &&
        !Array.isArray(stage) &&
        (stage as Record<string, unknown>).key === fallbackStage.key,
    ) as Record<string, unknown> | undefined;

    if (!rawStage) return fallbackStage;

    return {
      ...fallbackStage,
      status: isSetupStageStatus(rawStage.status)
        ? rawStage.status
        : fallbackStage.status,
      artifactId:
        typeof rawStage.artifactId === "string" ? rawStage.artifactId : null,
      completedAt:
        typeof rawStage.completedAt === "string" ? rawStage.completedAt : null,
    };
  });

  const activeStage = isSetupStageKey(progressCandidate.activeStage)
    ? progressCandidate.activeStage
    : fallback.activeStage;
  const recommendedStage = isSetupStageKey(progressCandidate.recommendedStage)
    ? progressCandidate.recommendedStage
    : null;

  return {
    version: 1,
    activeStage,
    recommendedStage,
    stages,
    updatedAt:
      typeof progressCandidate.updatedAt === "string"
        ? progressCandidate.updatedAt
        : fallback.updatedAt,
  };
}

export function advanceSetupProgress(
  current: unknown,
  completedStage: SetupStageKey,
  options: {
    artifactId?: string | null;
    now?: string;
  } = {},
): SetupProgress {
  const now = options.now ?? new Date().toISOString();
  const progress = readSetupProgress(current);
  const recommendedStage = NEXT_STAGE[completedStage] ?? null;

  return {
    version: 1,
    activeStage: recommendedStage ?? completedStage,
    recommendedStage,
    updatedAt: now,
    stages: progress.stages.map((stage) => {
      if (stage.key === completedStage) {
        return {
          ...stage,
          status: "complete",
          artifactId: options.artifactId ?? stage.artifactId ?? null,
          completedAt: now,
        };
      }

      if (stage.key === recommendedStage) {
        return {
          ...stage,
          status: stage.status === "complete" ? "complete" : "active",
        };
      }

      return stage;
    }),
  };
}

export function mergeSetupProgressIntoMetadata(
  metadata: unknown,
  progress: SetupProgress,
) {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};

  return {
    ...base,
    setupProgress: progress,
  };
}

export function getSetupStage(progress: SetupProgress, key: SetupStageKey) {
  return progress.stages.find((stage) => stage.key === key) ?? null;
}

export function isSetupStageComplete(progress: SetupProgress, key: SetupStageKey) {
  return getSetupStage(progress, key)?.status === "complete";
}

export function getSetupStageLabel(key: SetupStageKey) {
  return STAGE_LABELS[key];
}

export function getNextSetupStage(key: SetupStageKey) {
  return NEXT_STAGE[key] ?? null;
}

export function getSetupStageForAgentAction(action: string): SetupStageKey | null {
  if (action === "generate_plan") return "plan";
  if (action === "generate_landing_page") return "landing_page";
  if (action === "generate_registration_form") return "registration_form";
  if (action === "generate_submission_form") return "submission_form";
  if (action === "generate_judging_setup") return "judging_setup";
  if (action === "prepare_approvals") return "approval";
  return null;
}

function isSetupStageKey(value: unknown): value is SetupStageKey {
  return typeof value === "string" && value in STAGE_LABELS;
}

function isSetupStageStatus(value: unknown): value is SetupStageStatus {
  return (
    value === "not_started" ||
    value === "active" ||
    value === "complete" ||
    value === "blocked"
  );
}
