create type public.program_health_status as enum (
  'on_track',
  'at_risk',
  'blocked',
  'overdue'
);

create type public.program_health_dimension as enum (
  'registration',
  'submission',
  'judging',
  'mentoring',
  'communications',
  'automation',
  'sponsor_deliverables',
  'overall'
);

create type public.program_alert_status as enum (
  'open',
  'acknowledged',
  'resolved',
  'ignored'
);

create type public.program_alert_severity as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type public.pending_action_status as enum (
  'open',
  'in_progress',
  'completed',
  'dismissed'
);

create type public.operational_recommendation_status as enum (
  'suggested',
  'approved',
  'rejected',
  'executed',
  'expired'
);

create type public.intervention_request_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'executed',
  'failed',
  'cancelled'
);

create type public.intervention_execution_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create type public.operational_activity_type as enum (
  'health_snapshot_recorded',
  'alert_created',
  'alert_resolved',
  'pending_action_created',
  'milestone_updated',
  'recommendation_created',
  'recommendation_actioned',
  'intervention_requested',
  'intervention_executed',
  'communication_outcome',
  'automation_outcome'
);

create table public.program_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  health_dimension public.program_health_dimension not null,
  status public.program_health_status not null,
  score numeric(5,4),
  summary text,
  signal_payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint program_health_snapshots_score_check check (
    score is null or (score >= 0 and score <= 1)
  )
);

create table public.program_alerts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  alert_type text not null,
  severity public.program_alert_severity not null default 'medium',
  status public.program_alert_status not null default 'open',
  health_dimension public.program_health_dimension,
  title text not null,
  description text,
  source_type text,
  source_id uuid,
  recommended_action text,
  alert_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.program_alert_resolutions (
  id uuid primary key default gen_random_uuid(),
  program_alert_id uuid not null references public.program_alerts(id) on delete cascade,
  resolution_type text not null,
  notes text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  action_type text not null,
  status public.pending_action_status not null default 'open',
  priority text,
  title text not null,
  description text,
  source_type text,
  source_id uuid,
  due_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.milestone_statuses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  milestone_type text not null,
  milestone_key text not null,
  status public.program_health_status not null default 'on_track',
  starts_at timestamptz,
  ends_at timestamptz,
  actual_completed_at timestamptz,
  milestone_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, milestone_key)
);

create table public.operational_recommendations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  status public.operational_recommendation_status not null default 'suggested',
  recommendation_type text not null,
  title text not null,
  summary text,
  reasoning text,
  risk_level public.ai_risk_level not null default 'medium',
  expected_benefit text,
  approval_required boolean not null default true,
  source_type text,
  source_id uuid,
  recommendation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.intervention_requests (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  operational_recommendation_id uuid references public.operational_recommendations(id) on delete set null,
  status public.intervention_request_status not null default 'draft',
  intervention_type text not null,
  title text not null,
  reason text,
  requested_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  request_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.intervention_executions (
  id uuid primary key default gen_random_uuid(),
  intervention_request_id uuid not null references public.intervention_requests(id) on delete cascade,
  status public.intervention_execution_status not null default 'pending',
  executed_by uuid references public.profiles(id) on delete set null,
  execution_summary text,
  result_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.operational_activity_events (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  activity_type public.operational_activity_type not null,
  title text not null,
  summary text,
  source_type text,
  source_id uuid,
  actor_user_id uuid references public.profiles(id) on delete set null,
  activity_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.operational_health_rules (
  id uuid primary key default gen_random_uuid(),
  scope_type public.governance_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  health_dimension public.program_health_dimension not null,
  rule_key text not null,
  rule_payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint operational_health_rules_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create index program_health_snapshots_program_idx
  on public.program_health_snapshots (program_id, health_dimension, recorded_at desc);

create index program_alerts_program_idx
  on public.program_alerts (program_id, status, severity, updated_at desc);

create index program_alerts_source_idx
  on public.program_alerts (source_type, source_id, created_at desc);

create index program_alert_resolutions_alert_idx
  on public.program_alert_resolutions (program_alert_id, resolved_at desc);

create index pending_actions_program_idx
  on public.pending_actions (program_id, status, due_at, updated_at desc);

create index pending_actions_assigned_idx
  on public.pending_actions (assigned_to, status, due_at, updated_at desc);

create index milestone_statuses_program_idx
  on public.milestone_statuses (program_id, status, ends_at, updated_at desc);

create index operational_recommendations_program_idx
  on public.operational_recommendations (program_id, status, updated_at desc);

create index intervention_requests_program_idx
  on public.intervention_requests (program_id, status, updated_at desc);

create index intervention_executions_request_idx
  on public.intervention_executions (intervention_request_id, status, updated_at desc);

create index operational_activity_events_program_idx
  on public.operational_activity_events (program_id, created_at desc);

create index operational_activity_events_source_idx
  on public.operational_activity_events (source_type, source_id, created_at desc);

create index operational_health_rules_scope_idx
  on public.operational_health_rules (scope_type, health_dimension, updated_at desc);

create index operational_health_rules_program_idx
  on public.operational_health_rules (program_id, health_dimension, updated_at desc);

create trigger program_alerts_set_updated_at
before update on public.program_alerts
for each row execute function public.set_updated_at();

create trigger pending_actions_set_updated_at
before update on public.pending_actions
for each row execute function public.set_updated_at();

create trigger milestone_statuses_set_updated_at
before update on public.milestone_statuses
for each row execute function public.set_updated_at();

create trigger operational_recommendations_set_updated_at
before update on public.operational_recommendations
for each row execute function public.set_updated_at();

create trigger intervention_requests_set_updated_at
before update on public.intervention_requests
for each row execute function public.set_updated_at();

create trigger intervention_executions_set_updated_at
before update on public.intervention_executions
for each row execute function public.set_updated_at();

create trigger operational_health_rules_set_updated_at
before update on public.operational_health_rules
for each row execute function public.set_updated_at();
