import {
  programBriefDraftSchema,
  type ProgramBriefDelta,
  type ProgramBriefDraft,
} from "@/lib/ai/program-agent";

type ApplyBriefDeltaInput = {
  currentBrief: Record<string, unknown>;
  currentAssumptions: string[];
  currentOpenQuestions: Array<Record<string, unknown>>;
  currentTitle: string | null;
  currentDetectedProgramType: string | null;
  delta: ProgramBriefDelta;
};

const stringArrayFields = new Set(["targetParticipants", "regions", "deliverables", "risks"]);

export function applyProgramBriefDelta(input: ApplyBriefDeltaInput): ProgramBriefDraft {
  const nextBrief = structuredClone(input.currentBrief);

  for (const update of input.delta.fieldUpdates) {
    applyFieldUpdate(nextBrief, update.field, update.value);
  }

  const nextOpenQuestions = mergeOpenQuestions({
    currentOpenQuestions: input.currentOpenQuestions,
    resolvedQuestionKeys: input.delta.resolvedQuestionKeys,
    newQuestions: input.delta.newQuestions,
  });

  const structuredBrief = programBriefDraftSchema.shape.structuredBrief.parse(nextBrief);
  const detectedProgramType =
    input.delta.detectedProgramType ??
    pickString(structuredBrief.programType, input.currentDetectedProgramType ?? "Innovation Program");
  const briefTitle =
    input.delta.briefTitle ??
    buildBriefTitle(input.currentTitle, structuredBrief.programType, structuredBrief.regions);
  const status =
    input.delta.briefIsComplete && nextOpenQuestions.length === 0
      ? "ready_for_plan"
      : "collecting_requirements";

  return programBriefDraftSchema.parse({
    sessionTitle: input.delta.sessionTitle ?? briefTitle,
    assistantMessage: input.delta.assistantMessage,
    briefTitle,
    detectedProgramType,
    confidenceLevel: input.delta.confidenceLevel ?? "medium",
    status,
    structuredBrief,
    assumptions: input.delta.assumptions ?? input.currentAssumptions,
    openQuestions: nextOpenQuestions,
  });
}

function applyFieldUpdate(
  target: Record<string, unknown>,
  field: ProgramBriefDelta["fieldUpdates"][number]["field"],
  value: unknown,
) {
  if (field.startsWith("timeline.")) {
    const timeline =
      typeof target.timeline === "object" && target.timeline !== null && !Array.isArray(target.timeline)
        ? { ...(target.timeline as Record<string, unknown>) }
        : {};
    timeline[field.split(".")[1] ?? ""] = requireString(value, field);
    target.timeline = timeline;
    return;
  }

  if (field.startsWith("brandColors.")) {
    const brandColors =
      typeof target.brandColors === "object" &&
      target.brandColors !== null &&
      !Array.isArray(target.brandColors)
        ? { ...(target.brandColors as Record<string, unknown>) }
        : {};
    brandColors[field.split(".")[1] ?? ""] = requireOptionalString(value, field);
    target.brandColors = Object.fromEntries(
      Object.entries(brandColors).filter(([, entry]) => typeof entry === "string" && entry.trim()),
    );
    return;
  }

  if (stringArrayFields.has(field)) {
    target[field] = requireStringArray(value, field);
    return;
  }

  target[field] = requireString(value, field);
}

function mergeOpenQuestions(params: {
  currentOpenQuestions: Array<Record<string, unknown>>;
  resolvedQuestionKeys: string[];
  newQuestions: ProgramBriefDelta["newQuestions"];
}) {
  const resolved = new Set(params.resolvedQuestionKeys);
  const questionsByKey = new Map<string, Record<string, unknown>>();

  for (const question of params.currentOpenQuestions) {
    const key = typeof question.key === "string" ? question.key : null;
    if (!key || resolved.has(key)) {
      continue;
    }
    questionsByKey.set(key, question);
  }

  for (const question of params.newQuestions) {
    if (!resolved.has(question.key)) {
      questionsByKey.set(question.key, question);
    }
  }

  return Array.from(questionsByKey.values()).slice(0, 8);
}

function buildBriefTitle(
  currentTitle: string | null,
  programType: string,
  regions: string[],
) {
  if (currentTitle?.trim()) {
    return currentTitle.trim();
  }

  const regionLabel = regions.length > 0 ? ` (${regions.slice(0, 2).join(" & ")})` : "";
  return `${programType}${regionLabel}`;
}

function pickString(value: string, fallback: string) {
  return value.trim().length > 0 ? value.trim() : fallback;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid brief delta value for ${field}. Expected a non-empty string.`);
  }
  return value.trim();
}

function requireOptionalString(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new Error(`Invalid brief delta value for ${field}. Expected a string.`);
  }
  return value.trim();
}

function requireStringArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid brief delta value for ${field}. Expected a string array.`);
  }

  const values = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());

  if (values.length === 0) {
    throw new Error(`Invalid brief delta value for ${field}. Expected at least one string.`);
  }

  return Array.from(new Set(values)).slice(0, field === "deliverables" ? 10 : 8);
}
