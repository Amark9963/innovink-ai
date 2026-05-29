create type public.agent_run_type as enum (
  'program_bootstrap',
  'brief_revision',
  'plan_generation',
  'launch_kit_generation',
  'approval_preparation',
  'execution_readiness_review',
  'operational_analysis',
  'live_ops_intervention',
  'artifact_regeneration',
  'conversation_followup'
);

create type public.agent_run_status as enum (
  'queued',
  'planning',
  'running',
  'waiting_for_input',
  'waiting_for_approval',
  'blocked',
  'completed',
  'failed',
  'cancelled'
);

create type public.agent_task_type as enum (
  'inspect_context',
  'retrieve_domain_state',
  'update_memory',
  'draft_brief',
  'draft_plan',
  'draft_asset',
  'validate_output',
  'identify_open_questions',
  'summarize_risks',
  'prepare_approval_checkpoint',
  'prepare_execution_package',
  'emit_recommendation',
  'analyze_operational_health',
  'human_followup'
);

create type public.agent_task_status as enum (
  'pending',
  'running',
  'waiting_for_input',
  'waiting_for_approval',
  'blocked',
  'completed',
  'failed',
  'cancelled'
);

create type public.agent_tool_risk_level as enum (
  'low',
  'medium',
  'high'
);

create type public.agent_tool_call_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'skipped',
  'cancelled'
);

create type public.agent_event_type as enum (
  'run_started',
  'run_planned',
  'run_status_changed',
  'task_started',
  'task_completed',
  'task_failed',
  'tool_call_started',
  'tool_call_completed',
  'tool_call_failed',
  'artifact_updated',
  'memory_updated',
  'needs_input',
  'needs_approval',
  'approval_resolved',
  'execution_started',
  'execution_completed',
  'execution_failed',
  'recommendation_created',
  'run_completed',
  'run_failed'
);

create type public.agent_event_severity as enum (
  'info',
  'warning',
  'critical'
);

create type public.agent_memory_scope as enum (
  'session',
  'program',
  'workspace',
  'organization',
  'artifact',
  'decision'
);

create type public.agent_memory_confidence as enum (
  'low',
  'medium',
  'high'
);

create type public.agent_memory_source_type as enum (
  'human_input',
  'agent_inference',
  'tool_output',
  'approved_decision',
  'derived_summary',
  'system_sync'
);

create type public.agent_artifact_type as enum (
  'brief',
  'plan',
  'landing_page',
  'registration_form',
  'submission_form',
  'judging_setup',
  'communications_pack',
  'mentor_setup',
  'sponsor_report',
  'launch_readiness',
  'operations_summary',
  'approval_packet',
  'execution_package'
);

create type public.agent_artifact_status as enum (
  'draft',
  'ready_for_review',
  'approved',
  'rejected',
  'executed',
  'superseded',
  'archived'
);

create type public.agent_checkpoint_type as enum (
  'approval_request',
  'clarification_request',
  'publish_gate',
  'execution_gate',
  'policy_gate'
);

create type public.agent_checkpoint_status as enum (
  'open',
  'resolved',
  'rejected',
  'cancelled'
);

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  brief_id uuid references public.program_briefs(id) on delete set null,
  plan_id uuid references public.program_plans(id) on delete set null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  execution_run_id uuid references public.execution_runs(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  run_type public.agent_run_type not null,
  status public.agent_run_status not null default 'queued',
  goal_text text,
  user_instruction text,
  planner_model text,
  executor_model text,
  current_task_id uuid,
  started_by uuid not null references public.profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  run_input jsonb not null default '{}'::jsonb,
  run_output jsonb not null default '{}'::jsonb,
  summary text,
  error_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.agent_run_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  parent_task_id uuid references public.agent_run_tasks(id) on delete set null,
  task_type public.agent_task_type not null,
  status public.agent_task_status not null default 'pending',
  title text not null,
  description text,
  display_order integer not null default 0,
  priority smallint not null default 100,
  blocking boolean not null default true,
  approval_required boolean not null default false,
  waiting_reason text,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.agent_runs
  add constraint agent_runs_current_task_fk
  foreign key (current_task_id)
  references public.agent_run_tasks(id)
  on delete set null;

create table public.agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_run_tasks(id) on delete set null,
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  tool_name text not null,
  tool_version text,
  risk_level public.agent_tool_risk_level not null default 'low',
  approval_required boolean not null default false,
  status public.agent_tool_call_status not null default 'queued',
  executor_type text not null,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_payload jsonb not null default '{}'::jsonb,
  latency_ms integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_run_tasks(id) on delete set null,
  tool_call_id uuid references public.agent_tool_calls(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  event_type public.agent_event_type not null,
  severity public.agent_event_severity not null default 'info',
  title text not null,
  body text,
  event_payload jsonb not null default '{}'::jsonb,
  visible_to_user boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.agent_sessions(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  artifact_type public.agent_artifact_type,
  artifact_source_table text,
  artifact_source_id uuid,
  memory_scope public.agent_memory_scope not null,
  memory_key text not null,
  summary text not null,
  memory_payload jsonb not null default '{}'::jsonb,
  confidence public.agent_memory_confidence not null default 'medium',
  source_type public.agent_memory_source_type not null,
  source_run_id uuid references public.agent_runs(id) on delete set null,
  source_event_id uuid references public.agent_events(id) on delete set null,
  superseded_by uuid references public.agent_memories(id) on delete set null,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  task_id uuid references public.agent_run_tasks(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  artifact_type public.agent_artifact_type not null,
  status public.agent_artifact_status not null default 'draft',
  source_table text not null,
  source_id uuid not null,
  version_label text,
  title text,
  summary text,
  artifact_payload jsonb not null default '{}'::jsonb,
  created_by_run_id uuid references public.agent_runs(id) on delete set null,
  approved_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.agent_approval_checkpoints (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  task_id uuid references public.agent_run_tasks(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  checkpoint_type public.agent_checkpoint_type not null,
  status public.agent_checkpoint_status not null default 'open',
  risk_level public.agent_tool_risk_level not null,
  title text not null,
  description text,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  checkpoint_payload jsonb not null default '{}'::jsonb,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index agent_runs_session_idx on public.agent_runs (session_id, created_at desc);
create index agent_runs_workspace_idx on public.agent_runs (workspace_id, created_at desc);
create index agent_runs_program_idx on public.agent_runs (program_id, created_at desc);
create index agent_runs_status_idx on public.agent_runs (status, created_at desc);
create unique index agent_runs_one_active_per_session_idx
  on public.agent_runs (session_id)
  where status in ('queued', 'planning', 'running', 'waiting_for_input', 'waiting_for_approval', 'blocked');

create index agent_run_tasks_run_idx on public.agent_run_tasks (run_id, display_order asc);
create index agent_run_tasks_status_idx on public.agent_run_tasks (run_id, status, created_at asc);
create index agent_run_tasks_parent_idx on public.agent_run_tasks (parent_task_id);

create index agent_tool_calls_run_idx on public.agent_tool_calls (run_id, created_at asc);
create index agent_tool_calls_task_idx on public.agent_tool_calls (task_id, created_at asc);
create index agent_tool_calls_tool_name_idx on public.agent_tool_calls (tool_name, created_at desc);
create index agent_tool_calls_workspace_idx on public.agent_tool_calls (workspace_id, created_at desc);

create index agent_events_session_idx on public.agent_events (session_id, created_at asc);
create index agent_events_run_idx on public.agent_events (run_id, created_at asc);
create index agent_events_workspace_idx on public.agent_events (workspace_id, created_at desc);
create index agent_events_program_idx on public.agent_events (program_id, created_at desc);

create index agent_memories_session_idx on public.agent_memories (session_id, memory_scope, is_active);
create index agent_memories_program_idx on public.agent_memories (program_id, memory_scope, is_active);
create index agent_memories_workspace_idx on public.agent_memories (workspace_id, memory_scope, is_active);
create index agent_memories_key_idx on public.agent_memories (memory_key, is_active);

create index agent_artifacts_session_idx on public.agent_artifacts (session_id, artifact_type, created_at desc);
create index agent_artifacts_program_idx on public.agent_artifacts (program_id, artifact_type, created_at desc);
create index agent_artifacts_source_idx on public.agent_artifacts (source_table, source_id);

create index agent_approval_checkpoints_run_idx on public.agent_approval_checkpoints (run_id, created_at desc);
create index agent_approval_checkpoints_session_idx on public.agent_approval_checkpoints (session_id, status, created_at desc);
create index agent_approval_checkpoints_request_idx on public.agent_approval_checkpoints (approval_request_id);

create trigger agent_runs_set_updated_at
before update on public.agent_runs
for each row execute function public.set_updated_at();

create trigger agent_run_tasks_set_updated_at
before update on public.agent_run_tasks
for each row execute function public.set_updated_at();

create trigger agent_memories_set_updated_at
before update on public.agent_memories
for each row execute function public.set_updated_at();

create trigger agent_artifacts_set_updated_at
before update on public.agent_artifacts
for each row execute function public.set_updated_at();

create trigger agent_approval_checkpoints_set_updated_at
before update on public.agent_approval_checkpoints
for each row execute function public.set_updated_at();

alter table public.agent_runs enable row level security;
alter table public.agent_run_tasks enable row level security;
alter table public.agent_tool_calls enable row level security;
alter table public.agent_events enable row level security;
alter table public.agent_memories enable row level security;
alter table public.agent_artifacts enable row level security;
alter table public.agent_approval_checkpoints enable row level security;

create policy "agent_runs_select_scope"
on public.agent_runs
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    started_by
  )
);

create policy "agent_runs_manage_scope"
on public.agent_runs
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or started_by = auth.uid()
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or started_by = auth.uid()
);

create policy "agent_run_tasks_select_scope"
on public.agent_run_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.agent_runs ar
    where ar.id = agent_run_tasks.run_id
      and public.can_view_control_scope(
        ar.organization_id,
        ar.workspace_id,
        ar.program_id,
        ar.started_by
      )
  )
);

create policy "agent_run_tasks_manage_scope"
on public.agent_run_tasks
for all
to authenticated
using (
  exists (
    select 1
    from public.agent_runs ar
    where ar.id = agent_run_tasks.run_id
      and (
        public.can_manage_control_scope(
          ar.organization_id,
          ar.workspace_id,
          ar.program_id
        )
        or ar.started_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.agent_runs ar
    where ar.id = agent_run_tasks.run_id
      and (
        public.can_manage_control_scope(
          ar.organization_id,
          ar.workspace_id,
          ar.program_id
        )
        or ar.started_by = auth.uid()
      )
  )
);

create policy "agent_tool_calls_select_scope"
on public.agent_tool_calls
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    null
  )
);

create policy "agent_tool_calls_manage_scope"
on public.agent_tool_calls
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "agent_events_select_scope"
on public.agent_events
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    null
  )
);

create policy "agent_events_manage_scope"
on public.agent_events
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "agent_memories_select_scope"
on public.agent_memories
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    null
  )
);

create policy "agent_memories_manage_scope"
on public.agent_memories
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "agent_artifacts_select_scope"
on public.agent_artifacts
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    null
  )
);

create policy "agent_artifacts_manage_scope"
on public.agent_artifacts
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "agent_approval_checkpoints_select_scope"
on public.agent_approval_checkpoints
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    null
  )
);

create policy "agent_approval_checkpoints_manage_scope"
on public.agent_approval_checkpoints
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
);
