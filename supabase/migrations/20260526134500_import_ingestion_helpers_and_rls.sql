create or replace function public.can_view_import_scope(
  check_scope_type public.import_scope_type,
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

create or replace function public.can_manage_import_scope(
  check_scope_type public.import_scope_type,
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

create or replace function public.can_approve_import_apply(
  check_scope_type public.import_scope_type,
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

create or replace function public.log_import_apply_action(
  check_import_run_id uuid,
  check_action_type text,
  check_target_type text,
  check_target_id uuid default null,
  check_status public.import_apply_status default 'pending',
  check_payload jsonb default '{}'::jsonb,
  check_approved_by uuid default null,
  check_executed_by uuid default null,
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
  insert into public.import_apply_actions (
    import_run_id,
    action_type,
    target_type,
    target_id,
    status,
    payload,
    approved_by,
    executed_by,
    error_summary,
    approved_at,
    executed_at
  )
  values (
    check_import_run_id,
    check_action_type,
    check_target_type,
    check_target_id,
    check_status,
    coalesce(check_payload, '{}'::jsonb),
    check_approved_by,
    check_executed_by,
    check_error_summary,
    case when check_status in ('approved', 'executed') and check_approved_by is not null then timezone('utc', now()) else null end,
    case when check_status = 'executed' and check_executed_by is not null then timezone('utc', now()) else null end
  )
  returning id into new_id;

  return new_id;
end;
$$;

alter table public.imported_sources enable row level security;
alter table public.imported_source_versions enable row level security;
alter table public.import_runs enable row level security;
alter table public.import_extractions enable row level security;
alter table public.import_mappings enable row level security;
alter table public.import_review_items enable row level security;
alter table public.import_apply_actions enable row level security;
alter table public.import_trace_links enable row level security;
alter table public.import_confidence_scores enable row level security;

create policy "imported_sources_select"
on public.imported_sources
for select
using (
  public.can_view_import_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "imported_sources_insert"
on public.imported_sources
for insert
with check (
  public.can_manage_import_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "imported_sources_update"
on public.imported_sources
for update
using (
  public.can_manage_import_scope(scope_type, organization_id, workspace_id, program_id)
)
with check (
  public.can_manage_import_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "imported_sources_delete"
on public.imported_sources
for delete
using (
  public.can_manage_import_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "imported_source_versions_select"
on public.imported_source_versions
for select
using (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "imported_source_versions_insert"
on public.imported_source_versions
for insert
with check (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "imported_source_versions_update"
on public.imported_source_versions
for update
using (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
)
with check (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_runs_select"
on public.import_runs
for select
using (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_runs_insert"
on public.import_runs
for insert
with check (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_runs_update"
on public.import_runs
for update
using (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
)
with check (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_extractions_select"
on public.import_extractions
for select
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_extractions_insert"
on public.import_extractions
for insert
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_extractions_update"
on public.import_extractions
for update
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
)
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_mappings_select"
on public.import_mappings
for select
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_mappings_insert"
on public.import_mappings
for insert
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_mappings_update"
on public.import_mappings
for update
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
)
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_review_items_select"
on public.import_review_items
for select
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_review_items_insert"
on public.import_review_items
for insert
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_review_items_update"
on public.import_review_items
for update
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
)
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_apply_actions_select"
on public.import_apply_actions
for select
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_apply_actions_insert"
on public.import_apply_actions
for insert
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_apply_actions_update"
on public.import_apply_actions
for update
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
)
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and (
        public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
        or public.can_approve_import_apply(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
      )
  )
);

create policy "import_trace_links_select"
on public.import_trace_links
for select
using (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_trace_links_insert"
on public.import_trace_links
for insert
with check (
  exists (
    select 1
    from public.imported_sources s
    where s.id = imported_source_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_confidence_scores_select"
on public.import_confidence_scores
for select
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_view_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_confidence_scores_insert"
on public.import_confidence_scores
for insert
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);

create policy "import_confidence_scores_update"
on public.import_confidence_scores
for update
using (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
)
with check (
  exists (
    select 1
    from public.import_runs r
    join public.imported_sources s on s.id = r.imported_source_id
    where r.id = import_run_id
      and public.can_manage_import_scope(s.scope_type, s.organization_id, s.workspace_id, s.program_id)
  )
);
