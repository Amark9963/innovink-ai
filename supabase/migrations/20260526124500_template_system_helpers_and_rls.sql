create or replace function public.can_view_template_scope(
  check_scope_type public.template_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
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
      check_scope_type = 'platform'
      and check_user_id is not null
    )
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
      and exists (
        select 1
        from public.workspace_memberships wm
        where wm.workspace_id = check_workspace_id
          and wm.user_id = check_user_id
          and wm.status = 'active'
      )
    );
$$;

create or replace function public.can_manage_template_scope(
  check_scope_type public.template_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
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
        or public.is_ai_governance_admin(check_organization_id, check_user_id)
      )
    )
    or (
      check_scope_type = 'workspace'
      and check_workspace_id is not null
      and (
        public.is_workspace_admin(check_workspace_id, check_user_id)
        or public.is_workspace_operator(check_workspace_id, check_user_id)
      )
    );
$$;

create or replace function public.can_set_official_template_default(
  check_scope_type public.template_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
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
    );
$$;

create or replace function public.can_review_template(
  check_scope_type public.template_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
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
        or public.is_ai_governance_admin(check_organization_id, check_user_id)
      )
    )
    or (
      check_scope_type = 'workspace'
      and check_workspace_id is not null
      and public.is_workspace_admin(check_workspace_id, check_user_id)
    );
$$;

create or replace function public.log_template_usage_event(
  check_program_template_id uuid default null,
  check_template_component_id uuid default null,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
  check_program_id uuid default null,
  check_actor_user_id uuid default auth.uid(),
  check_apply_mode public.template_apply_mode default null,
  check_event_name text default null,
  check_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.template_usage_events (
    program_template_id,
    template_component_id,
    organization_id,
    workspace_id,
    program_id,
    actor_user_id,
    apply_mode,
    event_name,
    metadata
  )
  values (
    check_program_template_id,
    check_template_component_id,
    check_organization_id,
    check_workspace_id,
    check_program_id,
    check_actor_user_id,
    check_apply_mode,
    coalesce(check_event_name, 'unspecified'),
    coalesce(check_metadata, '{}'::jsonb)
  )
  returning id into new_id;

  return new_id;
end;
$$;

alter table public.program_templates enable row level security;
alter table public.program_template_versions enable row level security;
alter table public.template_components enable row level security;
alter table public.template_component_versions enable row level security;
alter table public.template_libraries enable row level security;
alter table public.template_library_items enable row level security;
alter table public.template_usage_events enable row level security;
alter table public.template_governance_records enable row level security;
alter table public.template_approvals enable row level security;
alter table public.template_clones enable row level security;

create policy "program_templates_select"
on public.program_templates
for select
using (
  public.can_view_template_scope(scope_type, organization_id, workspace_id)
);

create policy "program_templates_insert"
on public.program_templates
for insert
with check (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
  and (
    not is_official_default
    or public.can_set_official_template_default(scope_type, organization_id, workspace_id)
  )
);

create policy "program_templates_update"
on public.program_templates
for update
using (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
)
with check (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
  and (
    not is_official_default
    or public.can_set_official_template_default(scope_type, organization_id, workspace_id)
  )
);

create policy "program_templates_delete"
on public.program_templates
for delete
using (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
);

create policy "program_template_versions_select"
on public.program_template_versions
for select
using (
  exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_view_template_scope(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
);

create policy "program_template_versions_insert"
on public.program_template_versions
for insert
with check (
  exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_manage_template_scope(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
);

create policy "program_template_versions_update"
on public.program_template_versions
for update
using (
  exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_manage_template_scope(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_manage_template_scope(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
);

create policy "template_components_select"
on public.template_components
for select
using (
  public.can_view_template_scope(scope_type, organization_id, workspace_id)
);

create policy "template_components_insert"
on public.template_components
for insert
with check (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
);

create policy "template_components_update"
on public.template_components
for update
using (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
)
with check (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
);

create policy "template_components_delete"
on public.template_components
for delete
using (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
);

create policy "template_component_versions_select"
on public.template_component_versions
for select
using (
  exists (
    select 1
    from public.template_components tc
    where tc.id = template_component_id
      and public.can_view_template_scope(tc.scope_type, tc.organization_id, tc.workspace_id)
  )
);

create policy "template_component_versions_insert"
on public.template_component_versions
for insert
with check (
  exists (
    select 1
    from public.template_components tc
    where tc.id = template_component_id
      and public.can_manage_template_scope(tc.scope_type, tc.organization_id, tc.workspace_id)
  )
);

create policy "template_component_versions_update"
on public.template_component_versions
for update
using (
  exists (
    select 1
    from public.template_components tc
    where tc.id = template_component_id
      and public.can_manage_template_scope(tc.scope_type, tc.organization_id, tc.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.template_components tc
    where tc.id = template_component_id
      and public.can_manage_template_scope(tc.scope_type, tc.organization_id, tc.workspace_id)
  )
);

create policy "template_libraries_select"
on public.template_libraries
for select
using (
  public.can_view_template_scope(scope_type, organization_id, workspace_id)
);

create policy "template_libraries_insert"
on public.template_libraries
for insert
with check (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
);

create policy "template_libraries_update"
on public.template_libraries
for update
using (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
)
with check (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
);

create policy "template_libraries_delete"
on public.template_libraries
for delete
using (
  public.can_manage_template_scope(scope_type, organization_id, workspace_id)
);

create policy "template_library_items_select"
on public.template_library_items
for select
using (
  exists (
    select 1
    from public.template_libraries tl
    where tl.id = template_library_id
      and public.can_view_template_scope(tl.scope_type, tl.organization_id, tl.workspace_id)
  )
);

create policy "template_library_items_insert"
on public.template_library_items
for insert
with check (
  exists (
    select 1
    from public.template_libraries tl
    where tl.id = template_library_id
      and public.can_manage_template_scope(tl.scope_type, tl.organization_id, tl.workspace_id)
  )
);

create policy "template_library_items_update"
on public.template_library_items
for update
using (
  exists (
    select 1
    from public.template_libraries tl
    where tl.id = template_library_id
      and public.can_manage_template_scope(tl.scope_type, tl.organization_id, tl.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.template_libraries tl
    where tl.id = template_library_id
      and public.can_manage_template_scope(tl.scope_type, tl.organization_id, tl.workspace_id)
  )
);

create policy "template_library_items_delete"
on public.template_library_items
for delete
using (
  exists (
    select 1
    from public.template_libraries tl
    where tl.id = template_library_id
      and public.can_manage_template_scope(tl.scope_type, tl.organization_id, tl.workspace_id)
  )
);

create policy "template_usage_events_select"
on public.template_usage_events
for select
using (
  public.can_view_program(program_id)
  or public.can_view_template_scope(
    case
      when workspace_id is not null then 'workspace'::public.template_scope_type
      when organization_id is not null then 'organization'::public.template_scope_type
      else 'platform'::public.template_scope_type
    end,
    organization_id,
    workspace_id
  )
);

create policy "template_usage_events_insert"
on public.template_usage_events
for insert
with check (
  public.can_manage_template_scope(
    case
      when workspace_id is not null then 'workspace'::public.template_scope_type
      when organization_id is not null then 'organization'::public.template_scope_type
      else 'platform'::public.template_scope_type
    end,
    organization_id,
    workspace_id
  )
  or public.can_manage_control_scope(null, null, program_id)
);

create policy "template_governance_records_select"
on public.template_governance_records
for select
using (
  public.can_view_template_scope(
    case
      when workspace_id is not null then 'workspace'::public.template_scope_type
      when organization_id is not null then 'organization'::public.template_scope_type
      else 'platform'::public.template_scope_type
    end,
    organization_id,
    workspace_id
  )
);

create policy "template_governance_records_insert"
on public.template_governance_records
for insert
with check (
  public.can_manage_template_scope(
    case
      when workspace_id is not null then 'workspace'::public.template_scope_type
      when organization_id is not null then 'organization'::public.template_scope_type
      else 'platform'::public.template_scope_type
    end,
    organization_id,
    workspace_id
  )
);

create policy "template_governance_records_update"
on public.template_governance_records
for update
using (
  public.can_manage_template_scope(
    case
      when workspace_id is not null then 'workspace'::public.template_scope_type
      when organization_id is not null then 'organization'::public.template_scope_type
      else 'platform'::public.template_scope_type
    end,
    organization_id,
    workspace_id
  )
)
with check (
  public.can_manage_template_scope(
    case
      when workspace_id is not null then 'workspace'::public.template_scope_type
      when organization_id is not null then 'organization'::public.template_scope_type
      else 'platform'::public.template_scope_type
    end,
    organization_id,
    workspace_id
  )
);

create policy "template_approvals_select"
on public.template_approvals
for select
using (
  exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_view_template_scope(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
  or exists (
    select 1
    from public.template_components tc
    where tc.id = template_component_id
      and public.can_view_template_scope(tc.scope_type, tc.organization_id, tc.workspace_id)
  )
);

create policy "template_approvals_insert"
on public.template_approvals
for insert
with check (
  exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_review_template(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
  or exists (
    select 1
    from public.template_components tc
    where tc.id = template_component_id
      and public.can_review_template(tc.scope_type, tc.organization_id, tc.workspace_id)
  )
);

create policy "template_approvals_update"
on public.template_approvals
for update
using (
  exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_review_template(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
  or exists (
    select 1
    from public.template_components tc
    where tc.id = template_component_id
      and public.can_review_template(tc.scope_type, tc.organization_id, tc.workspace_id)
  )
)
with check (
  exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_review_template(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
  or exists (
    select 1
    from public.template_components tc
    where tc.id = template_component_id
      and public.can_review_template(tc.scope_type, tc.organization_id, tc.workspace_id)
  )
);

create policy "template_clones_select"
on public.template_clones
for select
using (
  public.can_view_program(source_program_id)
  or exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_view_template_scope(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
);

create policy "template_clones_insert"
on public.template_clones
for insert
with check (
  public.can_manage_control_scope(null, null, source_program_id)
  and exists (
    select 1
    from public.program_templates pt
    where pt.id = program_template_id
      and public.can_manage_template_scope(pt.scope_type, pt.organization_id, pt.workspace_id)
  )
);
