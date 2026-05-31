import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkspaceStage =
  | "goal_definition"
  | "brief_clarification"
  | "brief_ready"
  | "plan_in_progress"
  | "approval_review"
  | "execution_ready"
  | "live";

type AgentAction =
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

// Note: asset and live-ops details are encoded as flat strings in the
// JSON schema output (see agentDecisionSchema below).

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

type LiveProgramContext = {
  programId: string;
  programName: string | null;
  status: string | null;
  shortDescription: string | null;
  registrationClosesAt: string | null;
  submissionClosesAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

type WorkspaceContext = {
  stage: WorkspaceStage;
  hasBrief: boolean;
  briefTitle: string | null;
  briefSummary: string | null;
  openQuestionCount: number;
  hasPlan: boolean;
  hasPendingApproval: boolean;
  isApproved: boolean;
  hasAssets: boolean;
  organizationName: string | null;
  workspaceName: string | null;
  liveProgram?: LiveProgramContext | null;
};

type AllowedWorkspaceAction = {
  action: AgentAction;
  label: string;
  reason: string;
  risk: "low" | "medium" | "high";
};

// Flat schema — all fields are plain strings matching the JSON schema above.
type AgentDecision = {
  action: AgentAction;
  message: string;
  assetTypes: string;
  liveOpsChangeType: string;
  liveOpsField: string;
  liveOpsValue: string;
  liveOpsCurrentValue: string;
  liveOpsDescription: string;
};

const allowedActions = new Set<AgentAction>([
  "respond",
  "draft_brief",
  "generate_plan",
  "generate_assets",
  "generate_landing_page",
  "generate_registration_form",
  "generate_submission_form",
  "generate_judging_setup",
  "prepare_approvals",
  "live_ops_change",
  "propose_sequence",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractOutputText(payload: Record<string, unknown>): string | null {
  const output = payload.output;
  if (!Array.isArray(output)) return null;
  for (const item of output) {
    if (
      item && typeof item === "object" && "type" in item &&
      item.type === "message" && "content" in item && Array.isArray(item.content)
    ) {
      for (const block of item.content) {
        if (
          block && typeof block === "object" && "type" in block &&
          block.type === "output_text" && "text" in block && typeof block.text === "string"
        ) {
          return block.text.trim();
        }
      }
    }
  }
  return null;
}

function extractJson(text: string): string {
  const cleaned = text
    .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("Model did not return a valid JSON object.");
  }
  return cleaned.slice(first, last + 1);
}

function formatDate(iso: string | null): string {
  if (!iso) return "not set";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function normalizeDecision(
  value: unknown,
  requestAllowedActions?: AllowedWorkspaceAction[],
): AgentDecision {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawAction = typeof record.action === "string" ? record.action : "respond";
  const schemaAllowedAction = allowedActions.has(rawAction as AgentAction)
    ? (rawAction as AgentAction)
    : "respond";
  const requestAllowedActionSet = Array.isArray(requestAllowedActions)
    ? new Set(requestAllowedActions.map((item) => item.action))
    : null;
  const requestedActionWasDisallowed =
    requestAllowedActionSet != null && !requestAllowedActionSet.has(schemaAllowedAction);
  const action =
    requestedActionWasDisallowed
      ? "respond"
      : schemaAllowedAction;
  const nextAllowedAction = requestAllowedActions?.find((item) => item.action !== "respond");
  const message =
    requestedActionWasDisallowed
      ? nextAllowedAction
        ? `I can't take "${schemaAllowedAction}" from the current workspace state yet. The safe next step is ${nextAllowedAction.label}. ${nextAllowedAction.reason}`
        : "I can't take that action from the current workspace state yet. I can explain the current status and what needs to happen next."
      : typeof record.message === "string" && record.message.trim().length > 0
        ? record.message.trim()
        : "I can help with that. Tell me what you want to adjust next.";

  return {
    action,
    message,
    assetTypes: readString(record.assetTypes),
    liveOpsChangeType: readString(record.liveOpsChangeType),
    liveOpsField: readString(record.liveOpsField),
    liveOpsValue: readString(record.liveOpsValue),
    liveOpsCurrentValue: readString(record.liveOpsCurrentValue),
    liveOpsDescription: readString(record.liveOpsDescription),
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(
  ctx: WorkspaceContext,
  requestAllowedActions: AllowedWorkspaceAction[],
): string {
  const isLive = ctx.stage === "live" && ctx.liveProgram != null;
  const lp = ctx.liveProgram;
  const allowedActionLines = requestAllowedActions.length > 0
    ? requestAllowedActions
        .map(
          (item) =>
            `- ${item.action}: ${item.label}. ${item.reason} Risk: ${item.risk}.`,
        )
        .join("\n")
    : "- respond: Respond conversationally. No state-changing action is currently available. Risk: low.";

  const stageDescriptions: Record<WorkspaceStage, string> = {
    goal_definition: "No brief exists yet. The PM is just getting started.",
    brief_clarification: `Brief exists but has ${ctx.openQuestionCount} unresolved question${ctx.openQuestionCount !== 1 ? "s" : ""} before planning can proceed.`,
    brief_ready: "Brief is complete and ready for plan generation.",
    plan_in_progress: "Plan is generated. Launch assets can be drafted and the approval packet prepared.",
    approval_review: "Approval packet is pending the PM's review and decision.",
    execution_ready: "Packet is approved. Ready for deterministic execution.",
    live: "Program is live and operational. The PM can make governed operational changes.",
  };

  const liveProgramSection = isLive && lp ? [
    "",
    "=== LIVE PROGRAM ===",
    `Program name: ${lp.programName ?? "Unknown"}`,
    `Status: ${lp.status ?? "active"}`,
    `Short description: ${lp.shortDescription ?? "Not set"}`,
    `Registration closes: ${formatDate(lp.registrationClosesAt)}`,
    `Submissions close: ${formatDate(lp.submissionClosesAt)}`,
    `Program starts: ${formatDate(lp.startsAt)}`,
    `Program ends: ${formatDate(lp.endsAt)}`,
    "",
    "The PM can make governed operational changes to this live program.",
    "For live_ops_change, always include a liveOpsChange object with the exact field and value.",
  ].join("\n") : "";

  return [
    "You are Innova, the AI operating assistant for Innovink — an enterprise platform for running hackathons, innovation challenges, accelerators, and grants.",
    "",
    "You help program managers design, configure, and operate their programs through natural conversation.",
    `Organization: ${ctx.organizationName ?? "Unknown"} | Workspace: ${ctx.workspaceName ?? "Unknown"}`,
    "",
    "=== CURRENT WORKSPACE STATE ===",
    `Stage: ${ctx.stage}`,
    `Status: ${stageDescriptions[ctx.stage]}`,
    ctx.briefTitle ? `Program: ${ctx.briefTitle}` : "No program defined yet.",
    `Has plan: ${ctx.hasPlan ? "yes" : "no"}`,
    `Has assets: ${ctx.hasAssets ? "yes" : "no"}`,
    `Pending approval: ${ctx.hasPendingApproval ? "yes" : "no"}`,
    `Approved for execution: ${ctx.isApproved ? "yes" : "no"}`,
    liveProgramSection,
    "",
    "=== YOUR PERSONALITY ===",
    "- Warm, professional, and concise. No hype, no emojis.",
    "- Respond naturally to greetings and casual messages. Keep it brief, then guide toward the program.",
    "- Be proactive: when the PM seems unsure, suggest the clear next step.",
    "- Never invent data, prize amounts, or exact dates not given by the PM.",
    "- Use 'I' as Innova, not 'As an AI'. You are the PM's operating partner.",
    "",
    "=== GOVERNANCE RULES (never violate) ===",
    "1. AI drafts and recommends. Humans approve. Deterministic services execute.",
    "2. You never trigger execution of the initial foundation — that always requires explicit human approval.",
    "3. Live operational changes (deadlines, descriptions, status) require the PM to click Apply — you propose, they approve.",
    "4. If asked to 'just do it' for critical changes, explain the governance step calmly.",
    "",
    "=== ALLOWED ACTION MENU ===",
    "You MUST choose exactly one action from this menu. If the PM asks for anything outside this menu, choose respond and explain the prerequisite.",
    allowedActionLines,
    "",
    "=== ACTION RULES ===",
    "Decide the single best action based on the PM's message and current workspace state.",
    "",
    "- respond: Casual messages, greetings (hi, thanks, ok), questions about the process, status checks,",
    "  clarifications, or anything that does not require generating or updating a governed artifact.",
    "",
    "- draft_brief: The PM is describing a new program, answering open brief questions, or refining the brief.",
    "  Only when: stage is goal_definition, brief_clarification, brief_ready, or plan_in_progress (for brief refinement).",
    "",
    "- generate_plan: The PM explicitly wants to generate the execution plan.",
    "  Only when: brief has no open questions AND no plan exists yet.",
    "",
    "- generate_assets: The PM wants to generate launch assets (landing page, forms, judging).",
    "  Only when: plan exists. Include assetTypes.",
    "",
    "- generate_landing_page: The PM specifically wants to draft or regenerate the landing page.",
    "  Only when: plan exists.",
    "",
    "- generate_registration_form: The PM specifically wants to draft or regenerate the registration form.",
    "  Only when: plan exists.",
    "",
    "- generate_submission_form: The PM specifically wants to draft or regenerate the submission form.",
    "  Only when: plan exists.",
    "",
    "- generate_judging_setup: The PM specifically wants to draft or regenerate the judging setup, rubric, criteria, or scorecard.",
    "  Only when: plan exists.",
    "",
    "- propose_sequence: The brief is complete (no open questions, no plan yet) AND the PM has given a signal",
    "  they want to proceed — such as 'yes', 'looks good', 'let's go', 'proceed', 'build it', 'okay', 'great',",
    "  'what's next?', 'what do we do now?', or any acknowledgement of the completed brief.",
    "  In the message, clearly list the staged journey: execution plan first, then landing page, registration form,",
    "  submission form, judging setup, approval packet, and deterministic execution.",
    "  Make clear that the primary action starts the first stage only: generating the execution plan.",
    "  Only when: stage is 'brief_ready' (openQuestionCount === 0, no plan).",
    "  Do NOT use this action if the PM is asking a question or wants to change something.",
    "",
    "- prepare_approvals: The PM wants to prepare the approval packet.",
    "  Only when: plan exists AND no pending approval.",
    "",
    "- live_ops_change: The PM wants to change something on the live running program (deadlines, description, status).",
    "  Only when: stage is 'live' AND a liveProgram context is provided.",
    "  You MUST include a liveOpsChange object with exact values.",
    "  Supported changeTypes and their fieldPaths:",
    "    registration_deadline → registration_closes_at (ISO 8601 date string)",
    "    submission_deadline   → submission_closes_at (ISO 8601 date string)",
    "    program_dates         → starts_at or ends_at (ISO 8601 date string)",
    "    program_description   → short_description (plain text, max 280 chars)",
    "    program_name          → name (plain text, max 120 chars)",
    "    program_status        → status ('draft'|'configured'|'published'|'completed'|'archived')",
    "  For date changes: if the PM says '+2 weeks' or 'extend by 5 days', compute the exact new ISO date",
    "  from the currentValue. proposedValue must be a valid ISO 8601 datetime string for dates.",
    "  changeDescription should be human-readable: 'Registration deadline extended from Dec 10 to Dec 24'.",
    "  currentValue must be the actual current value from the live program context.",
    "",
    "If an action is not available for the current stage, use 'respond' and explain what is needed first.",
  ].join("\n");
}

// ─── Output schema ─────────────────────────────────────────────────────────────
// Flat schema — all fields are required strings. No nullable, no arrays, no
// nested objects. OpenAI Responses API handles this reliably.

const agentDecisionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "action", "message",
    "assetTypes",
    "liveOpsChangeType", "liveOpsField", "liveOpsValue", "liveOpsCurrentValue", "liveOpsDescription",
  ],
  properties: {
    action: {
      type: "string",
      enum: [
        "respond",
        "draft_brief",
        "generate_plan",
        "generate_assets",
        "generate_landing_page",
        "generate_registration_form",
        "generate_submission_form",
        "generate_judging_setup",
        "prepare_approvals",
        "live_ops_change",
        "propose_sequence",
      ],
      description: "The single best action based on the PM's message and workspace state.",
    },
    message: {
      type: "string",
      description: [
        "Natural language response to the PM.",
        "For respond: the full conversational reply.",
        "For draft_brief / generate_plan / generate_assets / prepare_approvals: brief confirmation of what you are about to do.",
        "For propose_sequence: present the staged setup journey clearly, and ask the PM to generate the execution plan as the first stage.",
        "For live_ops_change: describe the proposed change before asking for approval.",
      ].join(" "),
    },
    assetTypes: {
      type: "string",
      description: "Comma-separated asset types ONLY when action is generate_assets. Empty string otherwise. Values: landing_page, registration_form, submission_form, judging_setup.",
    },
    liveOpsChangeType: {
      type: "string",
      description: "ONLY when action is live_ops_change. One of: registration_deadline, submission_deadline, program_dates, program_description, program_name, program_status. Empty string otherwise.",
    },
    liveOpsField: {
      type: "string",
      description: "ONLY when action is live_ops_change. Exact DB field: registration_closes_at, submission_closes_at, starts_at, ends_at, short_description, name, or status. Empty string otherwise.",
    },
    liveOpsValue: {
      type: "string",
      description: "ONLY when action is live_ops_change. The new value to set. ISO 8601 for dates. Empty string otherwise.",
    },
    liveOpsCurrentValue: {
      type: "string",
      description: "ONLY when action is live_ops_change. The current value from the live program context. Empty string if not set.",
    },
    liveOpsDescription: {
      type: "string",
      description: "ONLY when action is live_ops_change. Human-readable change summary: 'Registration deadline extended from Dec 10 to Dec 24'. Empty string otherwise.",
    },
  },
};

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      return jsonResponse({ error: "OPENAI_API_KEY is not configured." }, 500);
    }

    const body = (await request.json()) as {
      message?: string;
      workspaceContext?: WorkspaceContext;
      allowedActions?: AllowedWorkspaceAction[];
      conversationHistory?: ConversationTurn[];
    };

    if (!body.message?.trim() || !body.workspaceContext) {
      return jsonResponse({ error: "message and workspaceContext are required." }, 400);
    }

    const requestAllowedActions = Array.isArray(body.allowedActions)
      ? body.allowedActions.filter(
          (item) =>
            item &&
            allowedActions.has(item.action) &&
            typeof item.label === "string" &&
            typeof item.reason === "string",
        )
      : [
          {
            action: "respond" as const,
            label: "Respond conversationally",
            reason: "No explicit action menu was provided by the application route.",
            risk: "low" as const,
          },
        ];

    const systemPrompt = buildSystemPrompt(body.workspaceContext, requestAllowedActions);
    const conversationTurns = Array.isArray(body.conversationHistory)
      ? body.conversationHistory.filter(
          (turn) =>
            turn &&
            (turn.role === "user" || turn.role === "assistant") &&
            typeof turn.content === "string" &&
            turn.content.trim().length > 0,
        )
      : [];

    const inputMessages = [
      ...conversationTurns.map((t) => ({ role: t.role, content: t.content })),
      { role: "user" as const, content: body.message.trim() },
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
        instructions: systemPrompt,
        input: inputMessages,
        temperature: 0.4,
        text: {
          format: {
            type: "json_schema",
            name: "agent_decision",
            schema: agentDecisionSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse(
        { error: "OpenAI agent decision call failed.", details: errorText },
        502,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const outputText = extractOutputText(payload);

    if (!outputText) {
      return jsonResponse({ error: "Model returned no decision." }, 502);
    }

    const decision = normalizeDecision(
      JSON.parse(extractJson(outputText)),
      requestAllowedActions,
    );

    return jsonResponse({
      ok: true,
      action: decision.action,
      message: decision.message,
      // Return the flat fields — the Next.js route parses them
      assetTypes: decision.assetTypes ?? "",
      liveOpsChangeType: decision.liveOpsChangeType ?? "",
      liveOpsField: decision.liveOpsField ?? "",
      liveOpsValue: decision.liveOpsValue ?? "",
      liveOpsCurrentValue: decision.liveOpsCurrentValue ?? "",
      liveOpsDescription: decision.liveOpsDescription ?? "",
      model: (payload.model as string) ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
      usage: (payload.usage as Record<string, unknown>) ?? null,
    });
  } catch (error) {
    console.error("pm-workspace-agent failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      {
        ok: true,
        action: "respond",
        message: "I can help with that. Tell me what you want to adjust next.",
        assetTypes: "",
        liveOpsChangeType: "",
        liveOpsField: "",
        liveOpsValue: "",
        liveOpsCurrentValue: "",
        liveOpsDescription: "",
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1",
        usage: null,
      },
    );
  }
});
