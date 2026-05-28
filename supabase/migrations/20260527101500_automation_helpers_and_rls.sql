create or replace function public.can_view_automation_scope(
  check_scope_type public.automation_scope_type,
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
      check_scope_type = 'organization'
      and check_organization_id is not null
      and exists (
        select 1
        from public.organization_memberships om
        where om.organization_id = check_organization_id
          and om.user_id = check_user_id
          and om.status = 'active'
      )
    )
    or (
      check_scope_type = 'workspace'
      and check_workspace_id is not null
      and public.is_workspace_member(check_workspace_id, check_user_id)
    )
    or (
      check_scope_type = 'program'
      and check_program_id is not null
      and public.can_view_program(check_program_id, check_user_id)
    );
$$;

create or replace function public.can_manage_automation_scope(
  check_scope_type public.automation_scope_type,
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
      check_scope_type = 'organization'
      and check_organization_id is not null
      and (
        public.is_organization_owner(check_organization_id, check_user_id)
        or public.is_organization_admin(check_organization_id, check_user_id)
      )
    )
    or (
      check_scope_type = 'workspace'
      and check_workspace_id is not null
      and (
        public.is_workspace_admin(check_workspace_id, check_user_id)
        or public.is_workspace_operator(check_workspace_id, check_user_id)
      )
    )
    or (
      check_scope_type = 'program'
      and check_program_id is not null
      and public.can_manage_control_scope(
        check_organization_id,
        check_workspace_id,
        check_program_id,
        check_user_id
      )
    );
$$;

create or replace function public.can_approve_automation_execution(
  check_scope_type public.automation_scope_type,
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
      check_scope_type = 'organization'
      and check_organization_id is not null
      and (
        public.is_organization_owner(check_organization_id, check_user_id)
        or public.is_organization_admin(check_organization_id, check_user_id)
      )
    )
    or (
      check_scope_type = 'workspace'
      and check_workspace_id is not null
      and public.is_workspace_admin(check_workspace_id, check_user_id)
    )
    or (
      check_scope_type = 'program'
      and check_program_id is not null
      and public.is_program_manager(check_program_id, check_user_id)
    );
$$;

create or replace function public.can_view_automation_escalation(
  check_target_user_id uuid default null,
  check_scope_type public.automation_scope_type default null,
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
    (check_target_user_id is not null and check_target_user_id = check_user_id)
    or public.is_platform_super_admin(check_user_id)
    or public.can_manage_automation_scope(
      check_scope_type,
      check_organization_id,
      check_workspace_id,
      check_program_id,
      check_user_id
    );
$$;

create or replace function public.log_automation_run_step(
  check_automation_run_id uuid,
  check_step_order integer,
  check_step_type text,
  check_status public.automation_step_status default 'pending',
  check_action_type public.automation_action_type default null,
  check_target_type text default null,
  check_target_id uuid default null,
  check_step_payload jsonb default '{}'::jsonb,
  check_error_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.automation_run_steps (
    automation_run_id,
    step_order,
    step_type,
    status,
    action_type,
    target_type,
    target_id,
    step_payload,
    error_summary,
    started_at,
    completed_at
  )
  values (
    check_automation_run_id,
    check_step_order,
    check_step_type,
    check_status,
    check_action_type,
    check_target_type,
    check_target_id,
    coalesce(check_step_payload, '{}'::jsonb),
    check_error_summary,
    case when check_status in ('running', 'completed', 'failed') then timezone('utc', now()) else null end,
    case when check_status in ('completed', 'failed', 'cancelled', 'skipped') then timezone('utc', now()) else null end
  )
  returning id into new_id;

  return new_id;
end;
$$;

alter table public.automation_rules enable row level security;
alter table public.automation_rule_versions enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_run_steps enable row level security;
alter table public.automation_failures enable row level security;
alter table public.automation_escalations enable row level security;

create policy "automation_rules_select"
on public.automation_rules
for select
using (
  public.can_view_automation_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "automation_rules_insert"
on public.automation_rules
for insert
with check (
  public.can_manage_automation_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "automation_rules_update"
on public.automation_rules
for update
using (
  public.can_manage_automation_scope(scope_type, organization_id, workspace_id, program_id)
)
with check (
  public.can_manage_automation_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "automation_rules_delete"
on public.automation_rules
for delete
using (
  public.can_manage_automation_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "automation_rule_versions_select"
on public.automation_rule_versions
for select
using (
  exists (
    select 1
    from public.automation_rules r
    where r.id = automation_rule_id
      and public.can_view_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_rule_versions_insert"
on public.automation_rule_versions
for insert
with check (
  exists (
    select 1
    from public.automation_rules r
    where r.id = automation_rule_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_rule_versions_update"
on public.automation_rule_versions
for update
using (
  exists (
    select 1
    from public.automation_rules r
    where r.id = automation_rule_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
)
with check (
  exists (
    select 1
    from public.automation_rules r
    where r.id = automation_rule_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_runs_select"
on public.automation_runs
for select
using (
  exists (
    select 1
    from public.automation_rules r
    where r.id = automation_rule_id
      and public.can_view_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_runs_insert"
on public.automation_runs
for insert
with check (
  exists (
    select 1
    from public.automation_rules r
    where r.id = automation_rule_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_runs_update"
on public.automation_runs
for update
using (
  exists (
    select 1
    from public.automation_rules r
    where r.id = automation_rule_id
      and public.can_view_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
)
with check (
  exists (
    select 1
    from public.automation_rules r
    where r.id = automation_rule_id
      and (
        public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
        or public.can_approve_automation_execution(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
      )
  )
);

create policy "automation_run_steps_select"
on public.automation_run_steps
for select
using (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_view_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_run_steps_insert"
on public.automation_run_steps
for insert
with check (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_run_steps_update"
on public.automation_run_steps
for update
using (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_view_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
)
with check (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and (
        public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
        or public.can_approve_automation_execution(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
      )
  )
);

create policy "automation_failures_select"
on public.automation_failures
for select
using (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_view_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_failures_insert"
on public.automation_failures
for insert
with check (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_failures_update"
on public.automation_failures
for update
using (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
)
with check (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_escalations_select"
on public.automation_escalations
for select
using (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_view_automation_escalation(
        target_user_id,
        r.scope_type,
        r.organization_id,
        r.workspace_id,
        r.program_id
      )
  )
);

create policy "automation_escalations_insert"
on public.automation_escalations
for insert
with check (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
  )
);

create policy "automation_escalations_update"
on public.automation_escalations
for update
using (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and public.can_view_automation_escalation(
        target_user_id,
        r.scope_type,
        r.organization_id,
        r.workspace_id,
        r.program_id
      )
  )
)
with check (
  exists (
    select 1
    from public.automation_runs ar
    join public.automation_rules r on r.id = ar.automation_rule_id
    where ar.id = automation_run_id
      and (
        public.can_manage_automation_scope(r.scope_type, r.organization_id, r.workspace_id, r.program_id)
        or public.can_view_automation_escalation(
          target_user_id,
          r.scope_type,
          r.organization_id,
          r.workspace_id,
          r.program_id
        )
      )
  )
);
