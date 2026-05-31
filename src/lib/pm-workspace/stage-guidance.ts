export type WorkspaceStageKey =
  | "brief"
  | "plan"
  | "landing_page"
  | "registration_form"
  | "submission_form"
  | "judging_setup"
  | "approval"
  | "execution"
  | "workspace";

export type WorkspaceStageStatus =
  | "needs_input"
  | "draft_ready"
  | "ready_for_review"
  | "approved"
  | "ready_to_execute"
  | "complete";

export type WorkspaceGuidanceAction =
  | {
      type: "send_message";
      label: string;
      message: string;
    }
  | {
      type: "link";
      label: string;
      href: string;
    };

export type WorkspaceStageGuidance = {
  stageKey: WorkspaceStageKey;
  stageStatus: WorkspaceStageStatus;
  title: string;
  summary: string;
  nextStep: {
    label: string;
    description: string;
    action: WorkspaceGuidanceAction;
    secondaryAction?: WorkspaceGuidanceAction;
  };
  followingStep?: {
    label: string;
    description: string;
  };
  guardrail: string;
};

type BuildStageGuidanceInput = {
  sessionId: string;
  stageKey: WorkspaceStageKey;
  stageStatus?: WorkspaceStageStatus;
  openQuestionCount?: number;
  assetKey?: string | null;
  approvalRequestId?: string | null;
};

export function buildWorkspaceStageGuidance({
  sessionId,
  stageKey,
  stageStatus,
  openQuestionCount = 0,
  assetKey,
}: BuildStageGuidanceInput): WorkspaceStageGuidance {
  if (stageKey === "brief" && openQuestionCount > 0) {
    return {
      stageKey: "brief",
      stageStatus: "needs_input",
      title: "Brief needs a few answers",
      summary: `${openQuestionCount} ${openQuestionCount === 1 ? "answer is" : "answers are"} still needed before Innova can build the launch kit.`,
      nextStep: {
        label: "Answer remaining questions",
        description:
          "Reply in the chat with the missing details, or ask Innova to make a reasonable recommendation.",
        action: {
          type: "send_message",
          label: "Suggest answers",
          message:
            "Suggest practical answers for the remaining brief questions, and tell me which ones need my confirmation.",
        },
      },
      followingStep: {
        label: "Accept launch-kit build",
        description:
          "Once the brief is complete, the PM can approve the next governed setup stage.",
      },
      guardrail: "AI drafts the brief. You confirm before the launch kit is built.",
    };
  }

  if (stageKey === "brief") {
    return {
      stageKey: "brief",
      stageStatus: stageStatus ?? "draft_ready",
      title: "Brief is ready",
      summary:
        "The program brief has enough structure to move into governed setup.",
      nextStep: {
        label: "Generate execution plan",
        description:
          "Start the governed setup journey with the execution plan. Innova will guide the next stage after that.",
        action: {
          type: "send_message",
          label: "Generate plan",
          message: "Generate the execution plan for this program.",
        },
      },
      followingStep: {
        label: "Draft landing page",
        description:
          "After the plan is ready, Innova will recommend the landing page stage.",
      },
      guardrail: "Each setup stage is drafted only after the PM confirms the next step.",
    };
  }

  if (stageKey === "plan") {
    return {
      stageKey: "plan",
      stageStatus: stageStatus ?? "draft_ready",
      title: "Execution plan is ready",
      summary:
        "The governed setup plan is saved. The next practical step is to generate the PM-facing launch assets stage by stage.",
      nextStep: {
        label: "Draft landing page",
        description:
          "Start with the public landing page because it anchors the registration and submission flow.",
        action: {
          type: "send_message",
          label: "Draft landing page",
          message: "Draft the landing page for this program.",
        },
      },
      followingStep: {
        label: "Draft registration form",
        description:
          "After the page direction is clear, Innova can draft participant intake.",
      },
      guardrail:
        "Plan changes remain draft work until the PM prepares an approval packet.",
    };
  }

  if (stageKey === "landing_page") {
    return {
      stageKey: "landing_page",
      stageStatus: stageStatus ?? "draft_ready",
      title: "Landing page draft is ready",
      summary:
        "The landing page can now be refined conversationally before the program is approved or published.",
      nextStep: {
        label: "Continue to registration form",
        description:
          "Draft participant intake after the landing page direction is established.",
        action: {
          type: "send_message",
          label: "Draft registration",
          message: "Draft the registration form for this program.",
        },
        secondaryAction: {
          type: "link",
          label: "Open page editor",
          href: `/app/create?session=${sessionId}&panel=assets${assetKey ? `&asset=${assetKey}` : ""}`,
        },
      },
      followingStep: {
        label: "Draft registration form",
        description:
          "Once the page direction is acceptable, move to participant intake.",
      },
      guardrail:
        "Preview drafts are safe. Publishing to a domain requires approval.",
    };
  }

  if (stageKey === "registration_form") {
    return {
      stageKey: "registration_form",
      stageStatus: stageStatus ?? "draft_ready",
      title: "Registration form draft is ready",
      summary:
        "Participant intake is drafted and ready for review against eligibility, consent, team policy, and required fields.",
      nextStep: {
        label: "Continue to submission form",
        description:
          "Draft the project submission requirements after participant intake.",
        action: {
          type: "send_message",
          label: "Draft submission",
          message: "Draft the submission form for this program.",
        },
        secondaryAction: {
          type: "link",
          label: "Open registration form",
          href: `/app/create?session=${sessionId}&panel=assets${assetKey ? `&asset=${assetKey}` : ""}`,
        },
      },
      followingStep: {
        label: "Draft submission form",
        description:
          "Next, define what participants must submit for judging.",
      },
      guardrail:
        "Registration changes stay in draft until included in the approval packet.",
    };
  }

  if (stageKey === "submission_form") {
    return {
      stageKey: "submission_form",
      stageStatus: stageStatus ?? "draft_ready",
      title: "Submission form draft is ready",
      summary:
        "Project submission requirements are drafted and ready for PM review.",
      nextStep: {
        label: "Continue to judging setup",
        description:
          "Draft judging rounds, criteria, scoring, and judge guidance.",
        action: {
          type: "send_message",
          label: "Draft judging",
          message: "Draft the judging setup for this program.",
        },
        secondaryAction: {
          type: "link",
          label: "Open submission form",
          href: `/app/create?session=${sessionId}&panel=assets${assetKey ? `&asset=${assetKey}` : ""}`,
        },
      },
      followingStep: {
        label: "Draft judging setup",
        description:
          "Next, configure rounds, criteria, scoring, and judge guidance.",
      },
      guardrail:
        "Submission requirements are draft until explicitly approved.",
    };
  }

  if (stageKey === "judging_setup") {
    return {
      stageKey: "judging_setup",
      stageStatus: stageStatus ?? "draft_ready",
      title: "Judging setup draft is ready",
      summary:
        "Judging rounds, criteria, and scoring guidance are drafted for review.",
      nextStep: {
        label: "Prepare approval packet",
        description:
          "Package the governed setup for PM approval before deterministic execution.",
        action: {
          type: "send_message",
          label: "Prepare approvals",
          message: "Prepare the approval packet for this program.",
        },
        secondaryAction: {
          type: "link",
          label: "Open judging setup",
          href: `/app/create?session=${sessionId}&panel=assets${assetKey ? `&asset=${assetKey}` : ""}`,
        },
      },
      followingStep: {
        label: "Prepare approval packet",
        description:
          "Once draft workstreams look right, package the governed setup for PM approval.",
      },
      guardrail:
        "Judging configuration is not executable until the approval packet is accepted.",
    };
  }

  if (stageKey === "approval") {
    return {
      stageKey: "approval",
      stageStatus: stageStatus ?? "ready_for_review",
      title: "Approval packet is ready",
      summary:
        "The governed setup is packaged for a PM decision before deterministic execution.",
      nextStep: {
        label: "Approve or request changes",
        description:
          "Review the packet in the thread and decide whether it can move to execution.",
        action: {
          type: "link",
          label: "Review approvals",
          href: `/app/create?session=${sessionId}&panel=approvals`,
        },
      },
      followingStep: {
        label: "Execute approved foundation",
        description:
          "Execution only unlocks after the approval packet is approved.",
      },
      guardrail:
        "AI cannot execute this stage. A human approval decision is required.",
    };
  }

  if (stageKey === "execution") {
    return {
      stageKey: "execution",
      stageStatus: stageStatus ?? "ready_to_execute",
      title: "Ready for deterministic execution",
      summary:
        "The approval packet is accepted. The next step provisions the governed program foundation.",
      nextStep: {
        label: "Execute approved foundation",
        description:
          "Run the deterministic backend workflow and watch progress in the workspace.",
        action: {
          type: "link",
          label: "Open execution",
          href: `/app/create?session=${sessionId}&panel=approvals`,
        },
      },
      followingStep: {
        label: "Operate live program",
        description:
          "After execution, Innova can help manage live program changes through chat.",
      },
      guardrail:
        "Execution is deterministic and audited. It is not an AI free-form mutation.",
    };
  }

  return {
    stageKey: "workspace",
    stageStatus: stageStatus ?? "ready_for_review",
    title: "Workspace guidance ready",
    summary:
      "Innova reviewed the current workspace and identified the safest next operator step.",
    nextStep: {
      label: "Continue in workspace",
      description: "Use the latest message or panel state to continue.",
      action: {
        type: "link",
        label: "Open workspace",
        href: `/app/create?session=${sessionId}`,
      },
    },
    guardrail: "AI recommends. You approve. Deterministic services execute.",
  };
}
