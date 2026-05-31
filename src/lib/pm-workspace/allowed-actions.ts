export type WorkspaceAgentAction =
  | "respond"
  | "draft_brief"
  | "generate_plan"
  | "generate_assets"
  | "generate_landing_page"
  | "generate_registration_form"
  | "generate_submission_form"
  | "generate_judging_setup"
  | "prepare_approvals"
  | "live_ops_change"
  | "propose_sequence";

export type AllowedWorkspaceAction = {
  action: WorkspaceAgentAction;
  label: string;
  reason: string;
  risk: "low" | "medium" | "high";
};

type DeriveAllowedWorkspaceActionsInput = {
  stage: string;
  hasBrief: boolean;
  openQuestionCount: number;
  hasPlan: boolean;
  hasPendingApproval: boolean;
  isApproved: boolean;
  isLiveProgram: boolean;
};

export function deriveAllowedWorkspaceActions({
  stage,
  hasBrief,
  openQuestionCount,
  hasPlan,
  hasPendingApproval,
  isApproved,
  isLiveProgram,
}: DeriveAllowedWorkspaceActionsInput): AllowedWorkspaceAction[] {
  const actions: AllowedWorkspaceAction[] = [
    {
      action: "respond",
      label: "Respond conversationally",
      reason:
        "Safe for greetings, questions, status checks, clarifications, and explaining what is possible next.",
      risk: "low",
    },
  ];

  if (isLiveProgram || stage === "live") {
    actions.push({
      action: "live_ops_change",
      label: "Propose a live program change",
      reason:
        "A live program exists. Innova may propose operational changes, but the PM must explicitly apply them.",
      risk: "high",
    });
    return actions;
  }

  if (!hasBrief || openQuestionCount > 0) {
    actions.push({
      action: "draft_brief",
      label: "Draft or update the program brief",
      reason:
        "The workspace still needs a structured brief or unresolved brief answers before downstream setup.",
      risk: "medium",
    });
    return actions;
  }

  if (!hasPlan) {
    actions.push(
      {
        action: "draft_brief",
        label: "Refine the completed brief",
        reason:
          "The PM may still request brief changes before committing to launch-kit setup.",
        risk: "medium",
      },
      {
        action: "generate_plan",
        label: "Generate the execution plan",
        reason:
          "The brief is complete and no execution plan exists yet.",
        risk: "medium",
      },
      {
        action: "propose_sequence",
        label: "Propose the launch-kit build sequence",
        reason:
          "The brief is complete. Innova can ask for PM acceptance before building the governed launch kit.",
        risk: "medium",
      },
    );
    return actions;
  }

  if (hasPendingApproval) {
    return actions;
  }

  if (isApproved) {
    return actions;
  }

  actions.push(
    {
      action: "draft_brief",
      label: "Refine brief context",
      reason:
        "The PM can still ask for non-executing brief refinements before approval.",
      risk: "medium",
    },
    {
      action: "generate_assets",
      label: "Generate launch-kit assets",
      reason:
        "A plan exists, so Innova may draft PM-reviewed launch assets.",
      risk: "medium",
    },
    {
      action: "generate_landing_page",
      label: "Draft landing page",
      reason:
        "A plan exists, so the landing page can be drafted or regenerated.",
      risk: "medium",
    },
    {
      action: "generate_registration_form",
      label: "Draft registration form",
      reason:
        "A plan exists, so participant intake can be drafted or regenerated.",
      risk: "medium",
    },
    {
      action: "generate_submission_form",
      label: "Draft submission form",
      reason:
        "A plan exists, so submission intake can be drafted or regenerated.",
      risk: "medium",
    },
    {
      action: "generate_judging_setup",
      label: "Draft judging setup",
      reason:
        "A plan exists, so judging criteria and scoring guidance can be drafted.",
      risk: "medium",
    },
    {
      action: "prepare_approvals",
      label: "Prepare approval packet",
      reason:
        "A plan exists and no approval packet is pending. Human approval is required before execution.",
      risk: "high",
    },
  );

  return actions;
}

export function isWorkspaceActionAllowed(
  actions: AllowedWorkspaceAction[],
  action: WorkspaceAgentAction,
) {
  return actions.some((candidate) => candidate.action === action);
}

export function describeAllowedActions(actions: AllowedWorkspaceAction[]) {
  return actions.map((action) => ({
    action: action.action,
    label: action.label,
    reason: action.reason,
    risk: action.risk,
  }));
}
