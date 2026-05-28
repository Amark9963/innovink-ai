create type public.brief_status as enum (
  'collecting_requirements',
  'ready_for_plan',
  'plan_generated',
  'ready_for_draft_generation',
  'drafts_generated',
  'ready_for_execution',
  'executing',
  'live',
  'archived'
);

create type public.brief_source as enum (
  'chat',
  'template',
  'imported_doc',
  'mixed'
);

create type public.plan_status as enum (
  'draft',
  'proposed',
  'approved',
  'superseded',
  'rejected',
  'archived'
);

create type public.approval_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired'
);

create type public.execution_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
  'partial'
);

create type public.agent_session_status as enum (
  'active',
  'paused',
  'completed',
  'archived'
);

create type public.agent_message_role as enum (
  'user',
  'assistant',
  'system',
  'tool'
);

create type public.agent_message_kind as enum (
  'chat',
  'brief_update',
  'plan_summary',
  'approval_summary',
  'execution_update',
  'question',
  'answer',
  'tool_trace'
);

create table public.program_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  source public.brief_source not null default 'chat',
  status public.brief_status not null default 'collecting_requirements',
  title text,
  detected_program_type text,
  confidence_level text not null default 'medium',
  current_brief jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  active_version_id uuid,
  active_plan_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.program_brief_versions (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.program_briefs(id) on delete cascade,
  version_number integer not null,
  created_by uuid references public.profiles(id),
  source public.brief_source not null default 'chat',
  structured_brief jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  open_questions jsonb not null default '[]'::jsonb,
  confidence_level text not null default 'medium',
  created_at timestamptz not null default timezone('utc', now()),
  unique (brief_id, version_number)
);

alter table public.program_briefs
  add constraint program_briefs_active_version_fk
  foreign key (active_version_id)
  references public.program_brief_versions(id)
  on delete set null;

create table public.program_plans (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.program_briefs(id) on delete cascade,
  brief_version_id uuid references public.program_brief_versions(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  created_by uuid references public.profiles(id),
  status public.plan_status not null default 'draft',
  title text,
  summary text,
  plan_payload jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  approval_requirements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.program_briefs
  add constraint program_briefs_active_plan_fk
  foreign key (active_plan_id)
  references public.program_plans(id)
  on delete set null;

create table public.program_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.program_plans(id) on delete cascade,
  item_key text not null,
  item_type text not null,
  title text not null,
  description text,
  display_order integer not null,
  requires_approval boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, item_key),
  unique (plan_id, display_order)
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.program_briefs(id) on delete set null,
  plan_id uuid references public.program_plans(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id) on delete set null,
  status public.approval_status not null default 'pending',
  title text not null,
  summary text,
  risk_level public.ai_risk_level not null default 'medium',
  request_payload jsonb not null default '{}'::jsonb,
  decision_notes text,
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  expires_at timestamptz
);

create table public.approval_request_items (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete cascade,
  item_key text not null,
  item_type text not null,
  title text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  status public.approval_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  unique (approval_request_id, item_key)
);

create table public.execution_runs (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.program_briefs(id) on delete set null,
  plan_id uuid references public.program_plans(id) on delete set null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  triggered_by uuid not null references public.profiles(id),
  status public.execution_status not null default 'queued',
  execution_kind text not null,
  summary text,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_payload jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.execution_run_steps (
  id uuid primary key default gen_random_uuid(),
  execution_run_id uuid not null references public.execution_runs(id) on delete cascade,
  step_key text not null,
  step_type text not null,
  title text not null,
  display_order integer not null,
  status public.execution_status not null default 'queued',
  target_type text,
  target_id uuid,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_payload jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (execution_run_id, step_key),
  unique (execution_run_id, display_order)
);

create table public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.program_briefs(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text,
  status public.agent_session_status not null default 'active',
  session_metadata jsonb not null default '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  brief_id uuid references public.program_briefs(id) on delete set null,
  plan_id uuid references public.program_plans(id) on delete set null,
  approval_request_id uuid references public.approval_requests(id) on delete set null,
  execution_run_id uuid references public.execution_runs(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  role public.agent_message_role not null,
  kind public.agent_message_kind not null default 'chat',
  content_text text,
  content_payload jsonb not null default '{}'::jsonb,
  model_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create index program_briefs_workspace_idx on public.program_briefs (workspace_id, updated_at desc);
create index program_briefs_program_idx on public.program_briefs (program_id, updated_at desc);
create index program_brief_versions_brief_idx on public.program_brief_versions (brief_id, version_number desc);
create index program_plans_brief_idx on public.program_plans (brief_id, created_at desc);
create index approval_requests_scope_idx on public.approval_requests (workspace_id, status, requested_at desc);
create index approval_requests_program_idx on public.approval_requests (program_id, status, requested_at desc);
create index execution_runs_scope_idx on public.execution_runs (workspace_id, status, created_at desc);
create index execution_runs_program_idx on public.execution_runs (program_id, status, created_at desc);
create index agent_sessions_scope_idx on public.agent_sessions (workspace_id, status, updated_at desc);
create index agent_messages_session_idx on public.agent_messages (session_id, created_at asc);

create trigger program_briefs_set_updated_at
before update on public.program_briefs
for each row execute function public.set_updated_at();

create trigger program_plans_set_updated_at
before update on public.program_plans
for each row execute function public.set_updated_at();

create trigger execution_runs_set_updated_at
before update on public.execution_runs
for each row execute function public.set_updated_at();

create trigger execution_run_steps_set_updated_at
before update on public.execution_run_steps
for each row execute function public.set_updated_at();

create trigger agent_sessions_set_updated_at
before update on public.agent_sessions
for each row execute function public.set_updated_at();

create or replace function public.can_manage_control_scope(
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
  check_program_id uuid default null,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_super_admin(check_user_id)
    or (
      check_program_id is not null
      and public.is_program_manager(check_program_id, check_user_id)
    )
    or (
      check_workspace_id is not null
      and public.is_workspace_admin(check_workspace_id, check_user_id)
    )
    or (
      check_organization_id is not null
      and public.is_organization_owner(check_organization_id, check_user_id)
    );
$$;

create or replace function public.can_view_control_scope(
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
  check_program_id uuid default null,
  check_created_by uuid default null,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_control_scope(
      check_organization_id,
      check_workspace_id,
      check_program_id,
      check_user_id
    )
    or (
      check_created_by is not null
      and check_created_by = check_user_id
    )
    or (
      check_program_id is not null
      and public.can_view_program(check_program_id, check_user_id)
    )
    or (
      check_workspace_id is not null
      and public.is_workspace_member(check_workspace_id, check_user_id)
    );
$$;

alter table public.program_briefs enable row level security;
alter table public.program_brief_versions enable row level security;
alter table public.program_plans enable row level security;
alter table public.program_plan_items enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_request_items enable row level security;
alter table public.execution_runs enable row level security;
alter table public.execution_run_steps enable row level security;
alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;

create policy "program_briefs_select_scope"
on public.program_briefs
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    created_by
  )
);

create policy "program_briefs_manage_scope"
on public.program_briefs
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or created_by = auth.uid()
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or created_by = auth.uid()
);

create policy "program_brief_versions_select_scope"
on public.program_brief_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.program_briefs pb
    where pb.id = program_brief_versions.brief_id
      and public.can_view_control_scope(
        pb.organization_id,
        pb.workspace_id,
        pb.program_id,
        pb.created_by
      )
  )
);

create policy "program_brief_versions_manage_scope"
on public.program_brief_versions
for all
to authenticated
using (
  exists (
    select 1
    from public.program_briefs pb
    where pb.id = program_brief_versions.brief_id
      and (
        public.can_manage_control_scope(
          pb.organization_id,
          pb.workspace_id,
          pb.program_id
        )
        or pb.created_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.program_briefs pb
    where pb.id = program_brief_versions.brief_id
      and (
        public.can_manage_control_scope(
          pb.organization_id,
          pb.workspace_id,
          pb.program_id
        )
        or pb.created_by = auth.uid()
      )
  )
);

create policy "program_plans_select_scope"
on public.program_plans
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    created_by
  )
);

create policy "program_plans_manage_scope"
on public.program_plans
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or created_by = auth.uid()
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or created_by = auth.uid()
);

create policy "program_plan_items_select_scope"
on public.program_plan_items
for select
to authenticated
using (
  exists (
    select 1
    from public.program_plans pp
    where pp.id = program_plan_items.plan_id
      and public.can_view_control_scope(
        pp.organization_id,
        pp.workspace_id,
        pp.program_id,
        pp.created_by
      )
  )
);

create policy "program_plan_items_manage_scope"
on public.program_plan_items
for all
to authenticated
using (
  exists (
    select 1
    from public.program_plans pp
    where pp.id = program_plan_items.plan_id
      and (
        public.can_manage_control_scope(
          pp.organization_id,
          pp.workspace_id,
          pp.program_id
        )
        or pp.created_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.program_plans pp
    where pp.id = program_plan_items.plan_id
      and (
        public.can_manage_control_scope(
          pp.organization_id,
          pp.workspace_id,
          pp.program_id
        )
        or pp.created_by = auth.uid()
      )
  )
);

create policy "approval_requests_select_scope"
on public.approval_requests
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    requested_by
  )
);

create policy "approval_requests_manage_scope"
on public.approval_requests
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or requested_by = auth.uid()
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or requested_by = auth.uid()
);

create policy "approval_request_items_select_scope"
on public.approval_request_items
for select
to authenticated
using (
  exists (
    select 1
    from public.approval_requests ar
    where ar.id = approval_request_items.approval_request_id
      and public.can_view_control_scope(
        ar.organization_id,
        ar.workspace_id,
        ar.program_id,
        ar.requested_by
      )
  )
);

create policy "approval_request_items_manage_scope"
on public.approval_request_items
for all
to authenticated
using (
  exists (
    select 1
    from public.approval_requests ar
    where ar.id = approval_request_items.approval_request_id
      and (
        public.can_manage_control_scope(
          ar.organization_id,
          ar.workspace_id,
          ar.program_id
        )
        or ar.requested_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.approval_requests ar
    where ar.id = approval_request_items.approval_request_id
      and (
        public.can_manage_control_scope(
          ar.organization_id,
          ar.workspace_id,
          ar.program_id
        )
        or ar.requested_by = auth.uid()
      )
  )
);

create policy "execution_runs_select_scope"
on public.execution_runs
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    triggered_by
  )
);

create policy "execution_runs_manage_scope"
on public.execution_runs
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or triggered_by = auth.uid()
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or triggered_by = auth.uid()
);

create policy "execution_run_steps_select_scope"
on public.execution_run_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.execution_runs er
    where er.id = execution_run_steps.execution_run_id
      and public.can_view_control_scope(
        er.organization_id,
        er.workspace_id,
        er.program_id,
        er.triggered_by
      )
  )
);

create policy "execution_run_steps_manage_scope"
on public.execution_run_steps
for all
to authenticated
using (
  exists (
    select 1
    from public.execution_runs er
    where er.id = execution_run_steps.execution_run_id
      and (
        public.can_manage_control_scope(
          er.organization_id,
          er.workspace_id,
          er.program_id
        )
        or er.triggered_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.execution_runs er
    where er.id = execution_run_steps.execution_run_id
      and (
        public.can_manage_control_scope(
          er.organization_id,
          er.workspace_id,
          er.program_id
        )
        or er.triggered_by = auth.uid()
      )
  )
);

create policy "agent_sessions_select_scope"
on public.agent_sessions
for select
to authenticated
using (
  public.can_view_control_scope(
    organization_id,
    workspace_id,
    program_id,
    created_by
  )
);

create policy "agent_sessions_manage_scope"
on public.agent_sessions
for all
to authenticated
using (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or created_by = auth.uid()
)
with check (
  public.can_manage_control_scope(
    organization_id,
    workspace_id,
    program_id
  )
  or created_by = auth.uid()
);

create policy "agent_messages_select_scope"
on public.agent_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.agent_sessions s
    where s.id = agent_messages.session_id
      and public.can_view_control_scope(
        s.organization_id,
        s.workspace_id,
        s.program_id,
        s.created_by
      )
  )
);

create policy "agent_messages_manage_scope"
on public.agent_messages
for all
to authenticated
using (
  exists (
    select 1
    from public.agent_sessions s
    where s.id = agent_messages.session_id
      and (
        public.can_manage_control_scope(
          s.organization_id,
          s.workspace_id,
          s.program_id
        )
        or s.created_by = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.agent_sessions s
    where s.id = agent_messages.session_id
      and (
        public.can_manage_control_scope(
          s.organization_id,
          s.workspace_id,
          s.program_id
        )
        or s.created_by = auth.uid()
      )
  )
);
