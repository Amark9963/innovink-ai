import type { Database, Json } from "@/lib/supabase/database.types";

type AgentRunType = Database["public"]["Enums"]["agent_run_type"];
type AgentTaskType = Database["public"]["Enums"]["agent_task_type"];

export type PmPlannerIntent =
  | "define_program_goal"
  | "refine_brief"
  | "answer_open_questions"
  | "recommend_next_step";

export type PmWorkspaceStage =
  | "goal_definition"
  | "brief_clarification"
  | "brief_ready"
  | "plan_in_progress"
  | "approval_review"
  | "execution_ready";

export type PmPlannerTaskBlueprint = {
  taskType: AgentTaskType;
  title: string;
  description: string;
  displayOrder: number;
};

export type PmPlannerRecommendation = {
  title: string;
  body: string;
  primaryActionLabel: string;
  stageLabel: string;
  stageTone: "gold" | "amber" | "green";
  blockingOpenInputCount: number;
};

export type PmPlannerDecision = {
  intent: PmPlannerIntent;
  stage: PmWorkspaceStage;
  runType: AgentRunType;
  taskPlan: PmPlannerTaskBlueprint[];
  recommendation: PmPlannerRecommendation;
  shouldGenerateBrief: boolean;
  planningSummary: string;
  runningSummary: string;
  completionSummary: string;
  waitingSummary: string;
};

type PmPlannerStateInput = {
  currentBrief: Json | null;
  openQuestionCount: number;
  hasPlan: boolean;
  hasPendingApproval: boolean;
  isApproved: boolean;
};

type PmPlannerInput = PmPlannerStateInput & {
  message: string;
};

const NEXT_STEP_PATTERNS = [
  "what should we do next",
  "what is the next step",
  "what's the next step",
  "what should i do next",
  "what should we do now",
  "what is blocking us",
  "what's blocking us",
  "what is blocking this",
  "what next",
  "recommend the next step",
  "recommend next step",
];

const GOAL_DEFINITION_PATTERNS = [
  "create ",
  "set up ",
  "launch ",
  "help me design",
  "i want ",
  "run a ",
  "run an ",
  "new program",
  "switch to ",
  "instead,",
];

const OPEN_QUESTION_SIGNAL_PATTERNS = [
  "should be",
  "use ",
  "add ",
  "include ",
  "regions",
  "region",
  "team",
  "teams",
  "judging",
  "criteria",
  "mentor",
  "sponsor",
  "eligibility",
  "timeline",
  "registration",
  "submission",
  "employee-only",
  "cross-functional",
];

export function hasStructuredBrief(currentBrief: Json | null) {
  return (
    !!currentBrief &&
    typeof currentBrief === "object" &&
    !Array.isArray(currentBrief) &&
    Object.keys(currentBrief as Record<string, unknown>).length > 0
  );
}

export function getPmWorkspaceStage(input: PmPlannerStateInput): PmWorkspaceStage {
  const hasBrief = hasStructuredBrief(input.currentBrief);

  if (!hasBrief) {
    return "goal_definition";
  }

  if (input.openQuestionCount > 0) {
    return "brief_clarification";
  }

  if (!input.hasPlan) {
    return "brief_ready";
  }

  if (input.hasPendingApproval) {
    return "approval_review";
  }

  if (input.isApproved) {
    return "execution_ready";
  }

  return "plan_in_progress";
}

export function classifyPmPlannerIntent(input: PmPlannerInput): PmPlannerIntent {
  const normalized = normalizeMessage(input.message);
  const hasBrief = hasStructuredBrief(input.currentBrief);

  if (matchesAny(normalized, NEXT_STEP_PATTERNS)) {
    return "recommend_next_step";
  }

  if (!hasBrief) {
    return "define_program_goal";
  }

  if (
    input.openQuestionCount > 0 &&
    (looksLikeAnswerToOpenQuestion(normalized) || normalized.length <= 220)
  ) {
    return "answer_open_questions";
  }

  if (matchesAny(normalized, GOAL_DEFINITION_PATTERNS) && normalized.length > 40) {
    return "define_program_goal";
  }

  return "refine_brief";
}

export function planPmWorkspaceRun(input: PmPlannerInput): PmPlannerDecision {
  const stage = getPmWorkspaceStage(input);
  const intent = classifyPmPlannerIntent(input);
  const recommendation = buildPmStageRecommendation({
    stage,
    openQuestionCount: input.openQuestionCount,
  });

  switch (intent) {
    case "define_program_goal":
      return {
        intent,
        stage,
        runType: "program_bootstrap",
        taskPlan: [
          {
            taskType: "inspect_context",
            title: "Inspect workspace and session context",
            description:
              "Load the current workspace context and PM goal before drafting the first structured brief.",
            displayOrder: 10,
          },
          {
            taskType: "draft_brief",
            title: "Draft the initial structured brief",
            description:
              "Generate the first structured program brief from the PM instruction and available workspace context.",
            displayOrder: 20,
          },
          {
            taskType: "validate_output",
            title: "Validate the brief output",
            description:
              "Validate the generated brief shape, confidence, and open-input readiness state.",
            displayOrder: 30,
          },
          {
            taskType: "update_memory",
            title: "Persist the brief memory state",
            description:
              "Store the brief summary, open questions, workspace stage, and recommended next step.",
            displayOrder: 40,
          },
          {
            taskType: "emit_recommendation",
            title: "Recommend the next PM action",
            description:
              "Translate the current brief state into the clearest next operator action for the PM.",
            displayOrder: 50,
          },
        ],
        recommendation,
        shouldGenerateBrief: true,
        planningSummary:
          "Inspecting the PM workspace goal and planning the initial brief drafting sequence.",
        runningSummary:
          "Drafting the initial structured brief from the PM program goal.",
        completionSummary:
          "The initial program brief is drafted and ready for the next PM step.",
        waitingSummary:
          "The initial brief is drafted, and Innova is waiting for PM clarification on the remaining inputs.",
      };
    case "answer_open_questions":
      return {
        intent,
        stage,
        runType: "brief_revision",
        taskPlan: [
          {
            taskType: "inspect_context",
            title: "Inspect unresolved brief inputs",
            description:
              "Load the current brief and unresolved questions before applying the PM answers.",
            displayOrder: 10,
          },
          {
            taskType: "draft_brief",
            title: "Apply the PM answers to the brief",
            description:
              "Update the structured brief with the newly answered program inputs.",
            displayOrder: 20,
          },
          {
            taskType: "validate_output",
            title: "Re-evaluate brief readiness",
            description:
              "Validate the updated brief and confirm whether planning can proceed cleanly.",
            displayOrder: 30,
          },
          {
            taskType: "update_memory",
            title: "Refresh workspace memory",
            description:
              "Update the stored brief summary, open questions, workspace stage, and next-step guidance.",
            displayOrder: 40,
          },
          {
            taskType: "emit_recommendation",
            title: "Recommend the next PM action",
            description:
              "Recommend the highest-value follow-up after resolving the latest brief inputs.",
            displayOrder: 50,
          },
        ],
        recommendation,
        shouldGenerateBrief: true,
        planningSummary:
          "Inspecting the unresolved brief inputs and planning the clarification update.",
        runningSummary:
          "Resolving the PM answers into the structured brief and reassessing readiness.",
        completionSummary:
          "The brief has been updated with the PM answers and the next step is ready.",
        waitingSummary:
          "The brief has been updated, and Innova still needs more PM clarification before planning.",
      };
    case "recommend_next_step":
      return {
        intent,
        stage,
        runType: "conversation_followup",
        taskPlan: [
          {
            taskType: "inspect_context",
            title: "Inspect current workspace state",
            description:
              "Review the active brief, plan, approvals, and blockers before recommending the next PM step.",
            displayOrder: 10,
          },
          {
            taskType: "emit_recommendation",
            title: "Recommend the next PM action",
            description:
              "Summarize the highest-value next operator action based on the current workspace state.",
            displayOrder: 20,
          },
          {
            taskType: "update_memory",
            title: "Persist stage and recommendation memory",
            description:
              "Store the current workspace stage and the latest next-step recommendation for follow-up runs.",
            displayOrder: 30,
          },
        ],
        recommendation,
        shouldGenerateBrief: false,
        planningSummary:
          "Inspecting the PM workspace state and planning the next-step recommendation.",
        runningSummary:
          "Reviewing the current brief state, blockers, and readiness before recommending the next move.",
        completionSummary:
          "The PM workspace recommendation is ready and the next governed action is clear.",
        waitingSummary:
          "The PM workspace recommendation is ready and waiting for the next operator decision.",
      };
    case "refine_brief":
    default:
      return {
        intent,
        stage,
        runType: "brief_revision",
        taskPlan: [
          {
            taskType: "inspect_context",
            title: "Inspect the current brief context",
            description:
              "Load the current brief, conversation, and latest PM instruction before revising the draft.",
            displayOrder: 10,
          },
          {
            taskType: "draft_brief",
            title: "Revise the structured brief",
            description:
              "Apply the latest PM refinement to the structured brief and preserve the governed workspace state.",
            displayOrder: 20,
          },
          {
            taskType: "validate_output",
            title: "Validate the revised brief",
            description:
              "Validate the revised brief shape, confidence, and readiness for the next stage.",
            displayOrder: 30,
          },
          {
            taskType: "update_memory",
            title: "Refresh workspace memory",
            description:
              "Persist the revised brief summary, open questions, workspace stage, and recommended next step.",
            displayOrder: 40,
          },
          {
            taskType: "emit_recommendation",
            title: "Recommend the next PM action",
            description:
              "Translate the revised brief state into the clearest next action for the PM.",
            displayOrder: 50,
          },
        ],
        recommendation,
        shouldGenerateBrief: true,
        planningSummary:
          "Inspecting the current brief and planning the latest PM refinement.",
        runningSummary:
          "Applying the latest PM refinement to the structured brief.",
        completionSummary:
          "The brief refinement is complete and the next PM step is ready.",
        waitingSummary:
          "The brief refinement is complete, and Innova still needs clarification before planning.",
      };
  }
}

export function buildPmStageRecommendation(input: {
  stage: PmWorkspaceStage;
  openQuestionCount: number;
}): PmPlannerRecommendation {
  switch (input.stage) {
    case "goal_definition":
      return {
        title: "Define the initial program brief",
        body:
          "The best next step is to define the core program goal, target audience, timeline, and judging model so Innova can draft the first structured brief.",
        primaryActionLabel: "Define the brief",
        stageLabel: "Drafting brief",
        stageTone: "gold",
        blockingOpenInputCount: 0,
      };
    case "brief_clarification":
      return {
        title: "Resolve the remaining brief inputs",
        body: `The next best step is to answer the remaining ${input.openQuestionCount} open ${input.openQuestionCount === 1 ? "input" : "inputs"} so Innova can finalize the brief and unlock planning.`,
        primaryActionLabel: "Answer open inputs",
        stageLabel: `${input.openQuestionCount} ${input.openQuestionCount === 1 ? "input" : "inputs"} needed`,
        stageTone: "amber",
        blockingOpenInputCount: input.openQuestionCount,
      };
    case "brief_ready":
      return {
        title: "Generate the execution plan",
        body:
          "The brief is structurally ready. The next best step is to generate the execution plan so Innova can turn the program into launch steps, assets, and approvals.",
        primaryActionLabel: "Generate plan",
        stageLabel: "Ready for plan",
        stageTone: "green",
        blockingOpenInputCount: 0,
      };
    case "approval_review":
      return {
        title: "Review the approval packet",
        body:
          "The next best step is to review the pending approval packet. Approval is the main blocker before deterministic execution can proceed.",
        primaryActionLabel: "Review approvals",
        stageLabel: "Approval review",
        stageTone: "gold",
        blockingOpenInputCount: 0,
      };
    case "execution_ready":
      return {
        title: "Execute the approved foundation",
        body:
          "The workspace is approved and ready. The next best step is deterministic execution into the live program setup.",
        primaryActionLabel: "Execute foundation",
        stageLabel: "Ready to execute",
        stageTone: "green",
        blockingOpenInputCount: 0,
      };
    case "plan_in_progress":
    default:
      return {
        title: "Advance the plan toward approvals",
        body:
          "The next best step is to refine the current execution plan or prepare the approval packet so the program can move toward governed execution.",
        primaryActionLabel: "Prepare approvals",
        stageLabel: "Plan in progress",
        stageTone: "gold",
        blockingOpenInputCount: 0,
      };
  }
}

function normalizeMessage(message: string) {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesAny(message: string, patterns: string[]) {
  return patterns.some((pattern) => message.includes(pattern));
}

function looksLikeAnswerToOpenQuestion(message: string) {
  return (
    message.startsWith("yes") ||
    message.startsWith("no") ||
    matchesAny(message, OPEN_QUESTION_SIGNAL_PATTERNS)
  );
}
