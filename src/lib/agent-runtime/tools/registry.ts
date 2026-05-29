import { z } from "zod";

const emptyRecordSchema = z.record(z.string(), z.unknown()).default({});

export const agentToolNameSchema = z.enum([
  "get_workspace_context",
  "get_current_brief_state",
  "get_current_plan_state",
  "get_pending_approval_summary",
  "draft_program_brief",
  "draft_program_plan",
  "validate_brief_output",
  "validate_plan_output",
  "identify_approval_requirements",
  "prepare_approval_checkpoint",
  "execute_program_foundation",
]);

export type AgentToolName = z.infer<typeof agentToolNameSchema>;

export const agentToolCategorySchema = z.enum([
  "retrieval",
  "drafting",
  "validation",
  "governance",
  "execution",
  "memory",
  "summary",
]);

export const agentToolExecutorTypeSchema = z.enum([
  "db_query",
  "edge_function",
  "deterministic_service",
  "planner_internal",
]);

export const agentToolRiskLevelSchema = z.enum(["low", "medium", "high"]);

export type AgentToolDefinition = {
  toolName: AgentToolName;
  category: z.infer<typeof agentToolCategorySchema>;
  description: string;
  executorType: z.infer<typeof agentToolExecutorTypeSchema>;
  riskLevel: z.infer<typeof agentToolRiskLevelSchema>;
  approvalRequired: boolean;
  idempotent: boolean;
  inputSchema: typeof emptyRecordSchema;
  outputSchema: typeof emptyRecordSchema;
};

const toolRegistry = {
  get_workspace_context: {
    toolName: "get_workspace_context",
    category: "retrieval",
    description: "Load workspace and organization context for the active PM session.",
    executorType: "db_query",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  get_current_brief_state: {
    toolName: "get_current_brief_state",
    category: "retrieval",
    description: "Load the current brief state for reasoning and revision.",
    executorType: "db_query",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  get_current_plan_state: {
    toolName: "get_current_plan_state",
    category: "retrieval",
    description: "Load the current plan state for approval and execution reasoning.",
    executorType: "db_query",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  get_pending_approval_summary: {
    toolName: "get_pending_approval_summary",
    category: "retrieval",
    description: "Summarize pending approvals and checkpoints relevant to the session.",
    executorType: "db_query",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  draft_program_brief: {
    toolName: "draft_program_brief",
    category: "drafting",
    description: "Generate or revise a structured program brief through the AI drafting boundary.",
    executorType: "edge_function",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  draft_program_plan: {
    toolName: "draft_program_plan",
    category: "drafting",
    description: "Generate a proposed execution plan from the structured program brief.",
    executorType: "edge_function",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  validate_brief_output: {
    toolName: "validate_brief_output",
    category: "validation",
    description: "Validate the generated brief structure and readiness.",
    executorType: "deterministic_service",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  validate_plan_output: {
    toolName: "validate_plan_output",
    category: "validation",
    description: "Validate the generated plan structure and execution readiness.",
    executorType: "deterministic_service",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  identify_approval_requirements: {
    toolName: "identify_approval_requirements",
    category: "governance",
    description: "Determine which checkpoints or approvals are required for the next action.",
    executorType: "planner_internal",
    riskLevel: "low",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  prepare_approval_checkpoint: {
    toolName: "prepare_approval_checkpoint",
    category: "governance",
    description: "Create a governed approval checkpoint record for a pending action.",
    executorType: "deterministic_service",
    riskLevel: "medium",
    approvalRequired: false,
    idempotent: true,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
  execute_program_foundation: {
    toolName: "execute_program_foundation",
    category: "execution",
    description: "Execute an approved foundation package through deterministic services.",
    executorType: "deterministic_service",
    riskLevel: "high",
    approvalRequired: true,
    idempotent: false,
    inputSchema: emptyRecordSchema,
    outputSchema: emptyRecordSchema,
  },
} satisfies Record<AgentToolName, AgentToolDefinition>;

export function getAgentToolDefinition(toolName: AgentToolName) {
  return toolRegistry[toolName];
}

export function listAgentToolDefinitions() {
  return Object.values(toolRegistry);
}
