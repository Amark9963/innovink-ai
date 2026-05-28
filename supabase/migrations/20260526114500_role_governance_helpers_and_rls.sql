create or replace function public.has_organization_role(
  check_organization_id uuid,
  expected_role public.organization_membership_role,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = check_organization_id
      and om.user_id = check_user_id
      and om.role = expected_role
      and om.status = 'active'
  );
$$;

create or replace function public.has_workspace_role(
  check_workspace_id uuid,
  expected_role public.workspace_membership_role,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships wm
    where wm.workspace_id = check_workspace_id
      and wm.user_id = check_user_id
      and wm.role = expected_role
      and wm.status = 'active'
  );
$$;

create or replace function public.is_organization_admin(
  check_organization_id uuid,
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
    or public.has_organization_role(check_organization_id, 'organization_admin', check_user_id);
$$;

create or replace function public.is_security_compliance_admin(
  check_organization_id uuid,
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
    or public.has_organization_role(check_organization_id, 'security_compliance_admin', check_user_id);
$$;

create or replace function public.is_ai_governance_admin(
  check_organization_id uuid,
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
    or public.has_organization_role(check_organization_id, 'ai_governance_admin', check_user_id);
$$;

create or replace function public.is_workspace_operator(
  check_workspace_id uuid,
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
    or public.has_workspace_role(check_workspace_id, 'workspace_operator', check_user_id)
    or exists (
      select 1
      from public.workspaces w
      where w.id = check_workspace_id
        and (
          public.is_organization_owner(w.organization_id, check_user_id)
          or public.is_organization_admin(w.organization_id, check_user_id)
        )
    );
$$;

create or replace function public.is_communications_manager(
  check_workspace_id uuid,
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
    or public.has_workspace_role(check_workspace_id, 'communications_manager', check_user_id)
    or exists (
      select 1
      from public.workspaces w
      where w.id = check_workspace_id
        and (
          public.is_organization_owner(w.organization_id, check_user_id)
          or public.is_organization_admin(w.organization_id, check_user_id)
        )
    );
$$;

create or replace function public.is_program_editor(
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
    or public.is_program_role(check_program_id, 'program_editor', check_user_id)
    or exists (
      select 1
      from public.programs p
      where p.id = check_program_id
        and (
          public.is_workspace_admin(p.workspace_id, check_user_id)
          or public.is_workspace_operator(p.workspace_id, check_user_id)
          or public.is_organization_owner(
            (select w.organization_id from public.workspaces w where w.id = p.workspace_id),
            check_user_id
          )
          or public.is_organization_admin(
            (select w.organization_id from public.workspaces w where w.id = p.workspace_id),
            check_user_id
          )
        )
    );
$$;

create or replace function public.is_mentor_manager(
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
    or public.is_program_role(check_program_id, 'mentor_manager', check_user_id)
    or public.is_program_manager(check_program_id, check_user_id);
$$;

create or replace function public.is_judge_manager(
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
    or public.is_program_role(check_program_id, 'judge_manager', check_user_id)
    or public.is_program_manager(check_program_id, check_user_id);
$$;

create or replace function public.can_manage_governance_scope(
  check_policy_type public.governance_policy_type default null,
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
      check_organization_id is not null
      and (
        public.is_organization_owner(check_organization_id, check_user_id)
        or public.is_organization_admin(check_organization_id, check_user_id)
        or public.is_security_compliance_admin(check_organization_id, check_user_id)
        or (
          check_policy_type = 'ai_policy'
          and public.is_ai_governance_admin(check_organization_id, check_user_id)
        )
      )
    )
    or (
      check_workspace_id is not null
      and public.is_workspace_admin(check_workspace_id, check_user_id)
    )
    or (
      check_program_id is not null
      and public.is_program_manager(check_program_id, check_user_id)
    );
$$;

create or replace function public.can_view_governance_scope(
  check_policy_type public.governance_policy_type default null,
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
    public.can_manage_governance_scope(
      check_policy_type,
      check_organization_id,
      check_workspace_id,
      check_program_id,
      check_user_id
    )
    or (
      check_workspace_id is not null
      and (
        public.is_workspace_operator(check_workspace_id, check_user_id)
        or public.is_communications_manager(check_workspace_id, check_user_id)
      )
    )
    or (
      check_program_id is not null
      and (
        public.is_program_editor(check_program_id, check_user_id)
        or public.is_mentor_manager(check_program_id, check_user_id)
        or public.is_judge_manager(check_program_id, check_user_id)
      )
    );
$$;

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
      and (
        public.is_workspace_admin(check_workspace_id, check_user_id)
        or public.is_workspace_operator(check_workspace_id, check_user_id)
      )
    )
    or (
      check_organization_id is not null
      and (
        public.is_organization_owner(check_organization_id, check_user_id)
        or public.is_organization_admin(check_organization_id, check_user_id)
      )
    );
$$;

alter table public.governance_policies enable row level security;
alter table public.governance_policy_versions enable row level security;
alter table public.ai_feature_policies enable row level security;
alter table public.ai_provider_policies enable row level security;
alter table public.access_review_cycles enable row level security;
alter table public.access_review_items enable row level security;
alter table public.retention_policies enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.integration_configurations enable row level security;

create policy "governance_policies_select_scope"
on public.governance_policies
for select
to authenticated
using (
  public.can_view_governance_scope(
    policy_type,
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "governance_policies_manage_scope"
on public.governance_policies
for all
to authenticated
using (
  public.can_manage_governance_scope(
    policy_type,
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_governance_scope(
    policy_type,
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "governance_policy_versions_select_scope"
on public.governance_policy_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.governance_policies gp
    where gp.id = governance_policy_versions.governance_policy_id
      and public.can_view_governance_scope(
        gp.policy_type,
        gp.organization_id,
        gp.workspace_id,
        gp.program_id
      )
  )
);

create policy "governance_policy_versions_manage_scope"
on public.governance_policy_versions
for all
to authenticated
using (
  exists (
    select 1
    from public.governance_policies gp
    where gp.id = governance_policy_versions.governance_policy_id
      and public.can_manage_governance_scope(
        gp.policy_type,
        gp.organization_id,
        gp.workspace_id,
        gp.program_id
      )
  )
)
with check (
  exists (
    select 1
    from public.governance_policies gp
    where gp.id = governance_policy_versions.governance_policy_id
      and public.can_manage_governance_scope(
        gp.policy_type,
        gp.organization_id,
        gp.workspace_id,
        gp.program_id
      )
  )
);

create policy "ai_feature_policies_select_scope"
on public.ai_feature_policies
for select
to authenticated
using (
  public.can_view_governance_scope(
    'ai_policy',
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "ai_feature_policies_manage_scope"
on public.ai_feature_policies
for all
to authenticated
using (
  public.can_manage_governance_scope(
    'ai_policy',
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_governance_scope(
    'ai_policy',
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "ai_provider_policies_select_scope"
on public.ai_provider_policies
for select
to authenticated
using (
  public.can_view_governance_scope(
    'ai_policy',
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "ai_provider_policies_manage_scope"
on public.ai_provider_policies
for all
to authenticated
using (
  public.can_manage_governance_scope(
    'ai_policy',
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_governance_scope(
    'ai_policy',
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "access_review_cycles_select_scope"
on public.access_review_cycles
for select
to authenticated
using (
  public.can_view_governance_scope(
    null,
    organization_id,
    workspace_id,
    null
  )
);

create policy "access_review_cycles_manage_scope"
on public.access_review_cycles
for all
to authenticated
using (
  public.can_manage_governance_scope(
    null,
    organization_id,
    workspace_id,
    null
  )
)
with check (
  public.can_manage_governance_scope(
    null,
    organization_id,
    workspace_id,
    null
  )
);

create policy "access_review_items_select_scope"
on public.access_review_items
for select
to authenticated
using (
  exists (
    select 1
    from public.access_review_cycles arc
    where arc.id = access_review_items.access_review_cycle_id
      and public.can_view_governance_scope(
        null,
        arc.organization_id,
        arc.workspace_id,
        null
      )
  )
);

create policy "access_review_items_manage_scope"
on public.access_review_items
for all
to authenticated
using (
  exists (
    select 1
    from public.access_review_cycles arc
    where arc.id = access_review_items.access_review_cycle_id
      and public.can_manage_governance_scope(
        null,
        arc.organization_id,
        arc.workspace_id,
        null
      )
  )
)
with check (
  exists (
    select 1
    from public.access_review_cycles arc
    where arc.id = access_review_items.access_review_cycle_id
      and public.can_manage_governance_scope(
        null,
        arc.organization_id,
        arc.workspace_id,
        null
      )
  )
);

create policy "retention_policies_select_scope"
on public.retention_policies
for select
to authenticated
using (
  public.can_view_governance_scope(
    'retention_policy',
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "retention_policies_manage_scope"
on public.retention_policies
for all
to authenticated
using (
  public.can_manage_governance_scope(
    'retention_policy',
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_governance_scope(
    'retention_policy',
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "data_export_requests_select_scope"
on public.data_export_requests
for select
to authenticated
using (
  public.can_view_governance_scope(
    'export_policy',
    organization_id,
    workspace_id,
    program_id
  )
  or requested_by = auth.uid()
);

create policy "data_export_requests_manage_scope"
on public.data_export_requests
for all
to authenticated
using (
  public.can_manage_governance_scope(
    'export_policy',
    organization_id,
    workspace_id,
    program_id
  )
  or requested_by = auth.uid()
)
with check (
  public.can_manage_governance_scope(
    'export_policy',
    organization_id,
    workspace_id,
    program_id
  )
  or requested_by = auth.uid()
);

create policy "integration_configurations_select_scope"
on public.integration_configurations
for select
to authenticated
using (
  public.can_view_governance_scope(
    'integration_policy',
    organization_id,
    workspace_id,
    program_id
  )
);

create policy "integration_configurations_manage_scope"
on public.integration_configurations
for all
to authenticated
using (
  public.can_manage_governance_scope(
    'integration_policy',
    organization_id,
    workspace_id,
    program_id
  )
)
with check (
  public.can_manage_governance_scope(
    'integration_policy',
    organization_id,
    workspace_id,
    program_id
  )
);
