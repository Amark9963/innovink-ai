do $$
begin
  alter type public.organization_membership_role add value if not exists 'organization_admin';
  alter type public.organization_membership_role add value if not exists 'security_compliance_admin';
  alter type public.organization_membership_role add value if not exists 'ai_governance_admin';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.workspace_membership_role add value if not exists 'workspace_operator';
  alter type public.workspace_membership_role add value if not exists 'communications_manager';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type public.program_membership_role add value if not exists 'program_editor';
  alter type public.program_membership_role add value if not exists 'mentor_manager';
  alter type public.program_membership_role add value if not exists 'mentor';
  alter type public.program_membership_role add value if not exists 'judge_manager';
exception
  when duplicate_object then null;
end $$;

create type public.governance_policy_type as enum (
  'approval_policy',
  'ai_policy',
  'export_policy',
  'retention_policy',
  'template_governance_policy',
  'automation_governance_policy',
  'communication_governance_policy',
  'integration_policy'
);

create type public.governance_scope_type as enum (
  'organization',
  'workspace',
  'program'
);

create type public.governance_record_status as enum (
  'draft',
  'active',
  'deprecated',
  'archived'
);

create type public.access_review_status as enum (
  'draft',
  'in_progress',
  'completed',
  'cancelled'
);

create type public.access_review_item_state as enum (
  'pending',
  'approved',
  'revoked',
  'flagged'
);

create type public.export_request_status as enum (
  'pending',
  'approved',
  'rejected',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create type public.integration_config_status as enum (
  'not_configured',
  'configured',
  'disabled',
  'error'
);

create type public.ai_approval_mode as enum (
  'always_require',
  'policy_based',
  'not_required'
);

create table public.governance_policies (
  id uuid primary key default gen_random_uuid(),
  policy_type public.governance_policy_type not null,
  scope_type public.governance_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  status public.governance_record_status not null default 'draft',
  active_version_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint governance_policies_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.governance_policy_versions (
  id uuid primary key default gen_random_uuid(),
  governance_policy_id uuid not null references public.governance_policies(id) on delete cascade,
  version_number integer not null,
  policy_payload jsonb not null default '{}'::jsonb,
  change_summary text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (governance_policy_id, version_number)
);

alter table public.governance_policies
  add constraint governance_policies_active_version_fk
  foreign key (active_version_id)
  references public.governance_policy_versions(id)
  on delete set null;

create table public.ai_feature_policies (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  scope_type public.governance_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  enabled boolean not null default true,
  risk_level public.ai_risk_level not null default 'medium',
  approval_mode public.ai_approval_mode not null default 'always_require',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ai_feature_policies_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  ),
  unique (feature_key, scope_type, organization_id, workspace_id, program_id)
);

create table public.ai_provider_policies (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null,
  scope_type public.governance_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  enabled boolean not null default true,
  allowed_models jsonb not null default '[]'::jsonb,
  usage_limits jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ai_provider_policies_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  ),
  unique (provider_key, scope_type, organization_id, workspace_id, program_id)
);

create table public.access_review_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  status public.access_review_status not null default 'draft',
  started_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.access_review_items (
  id uuid primary key default gen_random_uuid(),
  access_review_cycle_id uuid not null references public.access_review_cycles(id) on delete cascade,
  membership_table text not null,
  membership_id uuid not null,
  review_state public.access_review_item_state not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint access_review_items_membership_table_check check (
    membership_table in ('organization_memberships', 'workspace_memberships', 'program_memberships')
  )
);

create table public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  scope_type public.governance_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  policy_payload jsonb not null default '{}'::jsonb,
  status public.governance_record_status not null default 'draft',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint retention_policies_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  scope_type public.governance_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  status public.export_request_status not null default 'pending',
  export_type text not null,
  request_payload jsonb not null default '{}'::jsonb,
  decision_notes text,
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint data_export_requests_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.integration_configurations (
  id uuid primary key default gen_random_uuid(),
  integration_key text not null,
  scope_type public.governance_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  enabled boolean not null default false,
  config_status public.integration_config_status not null default 'not_configured',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integration_configurations_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  ),
  unique (integration_key, scope_type, organization_id, workspace_id, program_id)
);

create index governance_policies_org_idx on public.governance_policies (organization_id, policy_type, updated_at desc);
create index governance_policies_workspace_idx on public.governance_policies (workspace_id, policy_type, updated_at desc);
create index governance_policies_program_idx on public.governance_policies (program_id, policy_type, updated_at desc);
create index governance_policy_versions_policy_idx on public.governance_policy_versions (governance_policy_id, version_number desc);
create index ai_feature_policies_org_idx on public.ai_feature_policies (organization_id, feature_key);
create index ai_feature_policies_workspace_idx on public.ai_feature_policies (workspace_id, feature_key);
create index ai_feature_policies_program_idx on public.ai_feature_policies (program_id, feature_key);
create index ai_provider_policies_org_idx on public.ai_provider_policies (organization_id, provider_key);
create index ai_provider_policies_workspace_idx on public.ai_provider_policies (workspace_id, provider_key);
create index ai_provider_policies_program_idx on public.ai_provider_policies (program_id, provider_key);
create index access_review_cycles_org_idx on public.access_review_cycles (organization_id, status, created_at desc);
create index access_review_cycles_workspace_idx on public.access_review_cycles (workspace_id, status, created_at desc);
create index access_review_items_cycle_idx on public.access_review_items (access_review_cycle_id, review_state);
create index retention_policies_org_idx on public.retention_policies (organization_id, status, updated_at desc);
create index retention_policies_workspace_idx on public.retention_policies (workspace_id, status, updated_at desc);
create index retention_policies_program_idx on public.retention_policies (program_id, status, updated_at desc);
create index data_export_requests_org_idx on public.data_export_requests (organization_id, status, requested_at desc);
create index data_export_requests_workspace_idx on public.data_export_requests (workspace_id, status, requested_at desc);
create index data_export_requests_program_idx on public.data_export_requests (program_id, status, requested_at desc);
create index integration_configurations_org_idx on public.integration_configurations (organization_id, integration_key, updated_at desc);
create index integration_configurations_workspace_idx on public.integration_configurations (workspace_id, integration_key, updated_at desc);
create index integration_configurations_program_idx on public.integration_configurations (program_id, integration_key, updated_at desc);

create trigger governance_policies_set_updated_at
before update on public.governance_policies
for each row execute function public.set_updated_at();

create trigger access_review_cycles_set_updated_at
before update on public.access_review_cycles
for each row execute function public.set_updated_at();

create trigger access_review_items_set_updated_at
before update on public.access_review_items
for each row execute function public.set_updated_at();

create trigger ai_feature_policies_set_updated_at
before update on public.ai_feature_policies
for each row execute function public.set_updated_at();

create trigger ai_provider_policies_set_updated_at
before update on public.ai_provider_policies
for each row execute function public.set_updated_at();

create trigger retention_policies_set_updated_at
before update on public.retention_policies
for each row execute function public.set_updated_at();

create trigger data_export_requests_set_updated_at
before update on public.data_export_requests
for each row execute function public.set_updated_at();

create trigger integration_configurations_set_updated_at
before update on public.integration_configurations
for each row execute function public.set_updated_at();
