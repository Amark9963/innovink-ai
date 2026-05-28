create type public.automation_scope_type as enum (
  'organization',
  'workspace',
  'program'
);

create type public.automation_trigger_type as enum (
  'time_based',
  'schedule_based',
  'state_change',
  'threshold',
  'approval_completion',
  'ai_risk_signal'
);

create type public.automation_action_type as enum (
  'send_communication',
  'create_notification',
  'create_alert',
  'generate_report_draft',
  'request_approval',
  'create_follow_up',
  'propose_intervention',
  'sync_external'
);

create type public.automation_safety_mode as enum (
  'suggestion_only',
  'auto_prepare',
  'policy_auto_execute'
);

create type public.automation_rule_status as enum (
  'draft',
  'active',
  'paused',
  'archived'
);

create type public.automation_run_status as enum (
  'queued',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
  'skipped'
);

create type public.automation_step_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'skipped'
);

create type public.automation_failure_status as enum (
  'open',
  'retrying',
  'resolved',
  'ignored'
);

create type public.automation_escalation_status as enum (
  'pending',
  'sent',
  'acknowledged',
  'resolved',
  'cancelled'
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  scope_type public.automation_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  name text not null,
  rule_key text not null,
  status public.automation_rule_status not null default 'draft',
  safety_mode public.automation_safety_mode not null default 'suggestion_only',
  active_version_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint automation_rules_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.automation_rule_versions (
  id uuid primary key default gen_random_uuid(),
  automation_rule_id uuid not null references public.automation_rules(id) on delete cascade,
  version_number integer not null,
  trigger_type public.automation_trigger_type not null,
  trigger_payload jsonb not null default '{}'::jsonb,
  condition_payload jsonb not null default '{}'::jsonb,
  action_payload jsonb not null default '{}'::jsonb,
  approval_payload jsonb not null default '{}'::jsonb,
  retry_policy jsonb not null default '{}'::jsonb,
  change_summary text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (automation_rule_id, version_number)
);

alter table public.automation_rules
  add constraint automation_rules_active_version_fk
  foreign key (active_version_id)
  references public.automation_rule_versions(id)
  on delete set null;

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_rule_id uuid not null references public.automation_rules(id) on delete cascade,
  automation_rule_version_id uuid not null references public.automation_rule_versions(id) on delete cascade,
  status public.automation_run_status not null default 'queued',
  triggered_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  scope_snapshot jsonb not null default '{}'::jsonb,
  trigger_snapshot jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.automation_run_steps (
  id uuid primary key default gen_random_uuid(),
  automation_run_id uuid not null references public.automation_runs(id) on delete cascade,
  step_order integer not null,
  step_type text not null,
  status public.automation_step_status not null default 'pending',
  action_type public.automation_action_type,
  target_type text,
  target_id uuid,
  step_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (automation_run_id, step_order)
);

create table public.automation_failures (
  id uuid primary key default gen_random_uuid(),
  automation_run_id uuid not null references public.automation_runs(id) on delete cascade,
  automation_run_step_id uuid references public.automation_run_steps(id) on delete cascade,
  status public.automation_failure_status not null default 'open',
  failure_type text not null,
  failure_reason text,
  retry_count integer not null default 0,
  last_retry_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.automation_escalations (
  id uuid primary key default gen_random_uuid(),
  automation_run_id uuid not null references public.automation_runs(id) on delete cascade,
  automation_failure_id uuid references public.automation_failures(id) on delete set null,
  status public.automation_escalation_status not null default 'pending',
  escalation_type text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_role text,
  escalation_payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index automation_rules_org_key_unique
  on public.automation_rules (organization_id, rule_key)
  where scope_type = 'organization';

create unique index automation_rules_workspace_key_unique
  on public.automation_rules (workspace_id, rule_key)
  where scope_type = 'workspace';

create unique index automation_rules_program_key_unique
  on public.automation_rules (program_id, rule_key)
  where scope_type = 'program';

create index automation_rules_scope_idx
  on public.automation_rules (scope_type, status, updated_at desc);

create index automation_rules_program_idx
  on public.automation_rules (program_id, status, updated_at desc);

create index automation_rule_versions_rule_idx
  on public.automation_rule_versions (automation_rule_id, version_number desc);

create index automation_runs_rule_idx
  on public.automation_runs (automation_rule_id, status, triggered_at desc);

create index automation_runs_version_idx
  on public.automation_runs (automation_rule_version_id, status, triggered_at desc);

create index automation_run_steps_run_idx
  on public.automation_run_steps (automation_run_id, step_order, status);

create index automation_failures_run_idx
  on public.automation_failures (automation_run_id, status, created_at desc);

create index automation_failures_step_idx
  on public.automation_failures (automation_run_step_id, status, created_at desc);

create index automation_escalations_run_idx
  on public.automation_escalations (automation_run_id, status, created_at desc);

create index automation_escalations_target_user_idx
  on public.automation_escalations (target_user_id, status, created_at desc);

create trigger automation_rules_set_updated_at
before update on public.automation_rules
for each row execute function public.set_updated_at();

create trigger automation_runs_set_updated_at
before update on public.automation_runs
for each row execute function public.set_updated_at();

create trigger automation_run_steps_set_updated_at
before update on public.automation_run_steps
for each row execute function public.set_updated_at();

create trigger automation_failures_set_updated_at
before update on public.automation_failures
for each row execute function public.set_updated_at();

create trigger automation_escalations_set_updated_at
before update on public.automation_escalations
for each row execute function public.set_updated_at();
