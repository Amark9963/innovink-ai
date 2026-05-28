create or replace function public.can_manage_live_ops_program(
  check_program_id uuid,
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
    or public.is_program_manager(check_program_id, check_user_id)
    or public.is_program_editor(check_program_id, check_user_id)
    or exists (
      select 1
      from public.programs p
      where p.id = check_program_id
        and (
          public.is_communications_manager(p.workspace_id, check_user_id)
          or
          public.is_workspace_admin(p.workspace_id, check_user_id)
          or public.is_workspace_operator(p.workspace_id, check_user_id)
        )
    );
$$;

create or replace function public.can_view_live_ops_program(
  check_program_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_live_ops_program(check_program_id, check_user_id)
    or public.can_view_program(check_program_id, check_user_id);
$$;

create or replace function public.can_approve_intervention(
  check_program_id uuid,
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
    or public.is_program_manager(check_program_id, check_user_id)
    or exists (
      select 1
      from public.programs p
      where p.id = check_program_id
        and public.is_workspace_admin(p.workspace_id, check_user_id)
    );
$$;

create or replace function public.can_manage_operational_health_rule(
  check_scope_type public.governance_scope_type,
  check_organization_id uuid,
  check_workspace_id uuid,
  check_program_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when check_scope_type = 'organization' then
      public.is_platform_super_admin(check_user_id)
      or public.is_organization_owner(check_organization_id, check_user_id)
      or public.is_organization_admin(check_organization_id, check_user_id)
      or public.is_ai_governance_admin(check_organization_id, check_user_id)
    when check_scope_type = 'workspace' then
      public.is_platform_super_admin(check_user_id)
      or public.is_workspace_admin(check_workspace_id, check_user_id)
      or public.is_workspace_operator(check_workspace_id, check_user_id)
      or public.is_ai_governance_admin(check_organization_id, check_user_id)
    when check_scope_type = 'program' then
      public.can_manage_live_ops_program(check_program_id, check_user_id)
    else false
  end;
$$;

create or replace function public.log_operational_activity_event(
  p_program_id uuid,
  p_activity_type public.operational_activity_type,
  p_title text,
  p_summary text default null,
  p_source_type text default null,
  p_source_id uuid default null,
  p_actor_user_id uuid default auth.uid(),
  p_activity_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  insert into public.operational_activity_events (
    program_id,
    activity_type,
    title,
    summary,
    source_type,
    source_id,
    actor_user_id,
    activity_payload
  )
  values (
    p_program_id,
    p_activity_type,
    p_title,
    p_summary,
    p_source_type,
    p_source_id,
    p_actor_user_id,
    coalesce(p_activity_payload, '{}'::jsonb)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

alter table public.program_health_snapshots enable row level security;
alter table public.program_alerts enable row level security;
alter table public.program_alert_resolutions enable row level security;
alter table public.pending_actions enable row level security;
alter table public.milestone_statuses enable row level security;
alter table public.operational_recommendations enable row level security;
alter table public.intervention_requests enable row level security;
alter table public.intervention_executions enable row level security;
alter table public.operational_activity_events enable row level security;
alter table public.operational_health_rules enable row level security;

create policy "program_health_snapshots_select"
on public.program_health_snapshots
for select
using (
  public.can_view_live_ops_program(program_id)
);

create policy "program_health_snapshots_insert"
on public.program_health_snapshots
for insert
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "program_health_snapshots_update"
on public.program_health_snapshots
for update
using (
  public.can_manage_live_ops_program(program_id)
)
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "program_alerts_select"
on public.program_alerts
for select
using (
  public.can_view_live_ops_program(program_id)
);

create policy "program_alerts_insert"
on public.program_alerts
for insert
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "program_alerts_update"
on public.program_alerts
for update
using (
  public.can_manage_live_ops_program(program_id)
)
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "program_alert_resolutions_select"
on public.program_alert_resolutions
for select
using (
  exists (
    select 1
    from public.program_alerts pa
    where pa.id = program_alert_id
      and public.can_view_live_ops_program(pa.program_id)
  )
);

create policy "program_alert_resolutions_insert"
on public.program_alert_resolutions
for insert
with check (
  exists (
    select 1
    from public.program_alerts pa
    where pa.id = program_alert_id
      and public.can_manage_live_ops_program(pa.program_id)
  )
);

create policy "program_alert_resolutions_update"
on public.program_alert_resolutions
for update
using (
  exists (
    select 1
    from public.program_alerts pa
    where pa.id = program_alert_id
      and public.can_manage_live_ops_program(pa.program_id)
  )
)
with check (
  exists (
    select 1
    from public.program_alerts pa
    where pa.id = program_alert_id
      and public.can_manage_live_ops_program(pa.program_id)
  )
);

create policy "pending_actions_select"
on public.pending_actions
for select
using (
  public.can_view_live_ops_program(program_id)
  or assigned_to = auth.uid()
);

create policy "pending_actions_insert"
on public.pending_actions
for insert
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "pending_actions_update"
on public.pending_actions
for update
using (
  public.can_manage_live_ops_program(program_id)
  or assigned_to = auth.uid()
)
with check (
  public.can_manage_live_ops_program(program_id)
  or assigned_to = auth.uid()
);

create policy "milestone_statuses_select"
on public.milestone_statuses
for select
using (
  public.can_view_live_ops_program(program_id)
);

create policy "milestone_statuses_insert"
on public.milestone_statuses
for insert
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "milestone_statuses_update"
on public.milestone_statuses
for update
using (
  public.can_manage_live_ops_program(program_id)
)
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "operational_recommendations_select"
on public.operational_recommendations
for select
using (
  public.can_view_live_ops_program(program_id)
);

create policy "operational_recommendations_insert"
on public.operational_recommendations
for insert
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "operational_recommendations_update"
on public.operational_recommendations
for update
using (
  public.can_manage_live_ops_program(program_id)
)
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "intervention_requests_select"
on public.intervention_requests
for select
using (
  public.can_view_live_ops_program(program_id)
);

create policy "intervention_requests_insert"
on public.intervention_requests
for insert
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "intervention_requests_update"
on public.intervention_requests
for update
using (
  public.can_view_live_ops_program(program_id)
)
with check (
  public.can_manage_live_ops_program(program_id)
  or (
    public.can_approve_intervention(program_id)
    and status in ('approved', 'rejected', 'cancelled', 'executed', 'failed')
  )
);

create policy "intervention_executions_select"
on public.intervention_executions
for select
using (
  exists (
    select 1
    from public.intervention_requests ir
    where ir.id = intervention_request_id
      and public.can_view_live_ops_program(ir.program_id)
  )
);

create policy "intervention_executions_insert"
on public.intervention_executions
for insert
with check (
  exists (
    select 1
    from public.intervention_requests ir
    where ir.id = intervention_request_id
      and (
        public.can_manage_live_ops_program(ir.program_id)
        or public.can_approve_intervention(ir.program_id)
      )
  )
);

create policy "intervention_executions_update"
on public.intervention_executions
for update
using (
  exists (
    select 1
    from public.intervention_requests ir
    where ir.id = intervention_request_id
      and public.can_view_live_ops_program(ir.program_id)
  )
)
with check (
  exists (
    select 1
    from public.intervention_requests ir
    where ir.id = intervention_request_id
      and (
        public.can_manage_live_ops_program(ir.program_id)
        or public.can_approve_intervention(ir.program_id)
      )
  )
);

create policy "operational_activity_events_select"
on public.operational_activity_events
for select
using (
  public.can_view_live_ops_program(program_id)
);

create policy "operational_activity_events_insert"
on public.operational_activity_events
for insert
with check (
  public.can_manage_live_ops_program(program_id)
);

create policy "operational_health_rules_select"
on public.operational_health_rules
for select
using (
  public.can_view_governance_scope(null, organization_id, workspace_id, program_id)
);

create policy "operational_health_rules_insert"
on public.operational_health_rules
for insert
with check (
  public.can_manage_operational_health_rule(scope_type, organization_id, workspace_id, program_id)
);

create policy "operational_health_rules_update"
on public.operational_health_rules
for update
using (
  public.can_manage_operational_health_rule(scope_type, organization_id, workspace_id, program_id)
)
with check (
  public.can_manage_operational_health_rule(scope_type, organization_id, workspace_id, program_id)
);
