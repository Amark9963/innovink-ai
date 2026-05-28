create type public.template_scope_type as enum (
  'platform',
  'organization',
  'workspace'
);

create type public.template_kind as enum (
  'program',
  'component',
  'policy'
);

create type public.template_component_type as enum (
  'landing_page',
  'registration_form',
  'submission_form',
  'scorecard',
  'communications_pack',
  'mentoring_pack',
  'sponsor_package',
  'report_pack',
  'approval_policy',
  'automation_pack',
  'ai_policy'
);

create type public.template_status as enum (
  'draft',
  'internal_review',
  'approved',
  'deprecated',
  'archived'
);

create type public.template_apply_mode as enum (
  'full_start',
  'component_attach',
  'hybrid_with_brief',
  'clone_from_program'
);

create type public.template_approval_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

create table public.program_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  template_kind public.template_kind not null default 'program',
  scope_type public.template_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_type text,
  status public.template_status not null default 'draft',
  is_official_default boolean not null default false,
  active_version_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint program_templates_scope_check check (
    (scope_type = 'platform' and organization_id is null and workspace_id is null) or
    (scope_type = 'organization' and organization_id is not null and workspace_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null)
  )
);

create table public.program_template_versions (
  id uuid primary key default gen_random_uuid(),
  program_template_id uuid not null references public.program_templates(id) on delete cascade,
  version_number integer not null,
  brief_defaults jsonb not null default '{}'::jsonb,
  timeline_defaults jsonb not null default '{}'::jsonb,
  launch_readiness_defaults jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  change_summary text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (program_template_id, version_number)
);

alter table public.program_templates
  add constraint program_templates_active_version_fk
  foreign key (active_version_id)
  references public.program_template_versions(id)
  on delete set null;

create table public.template_components (
  id uuid primary key default gen_random_uuid(),
  program_template_id uuid references public.program_templates(id) on delete cascade,
  name text not null,
  component_type public.template_component_type not null,
  scope_type public.template_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  status public.template_status not null default 'draft',
  active_version_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint template_components_scope_check check (
    (scope_type = 'platform' and organization_id is null and workspace_id is null) or
    (scope_type = 'organization' and organization_id is not null and workspace_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null)
  )
);

create table public.template_component_versions (
  id uuid primary key default gen_random_uuid(),
  template_component_id uuid not null references public.template_components(id) on delete cascade,
  version_number integer not null,
  component_payload jsonb not null default '{}'::jsonb,
  change_summary text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (template_component_id, version_number)
);

alter table public.template_components
  add constraint template_components_active_version_fk
  foreign key (active_version_id)
  references public.template_component_versions(id)
  on delete set null;

create table public.template_libraries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope_type public.template_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint template_libraries_scope_check check (
    (scope_type = 'platform' and organization_id is null and workspace_id is null) or
    (scope_type = 'organization' and organization_id is not null and workspace_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null)
  )
);

create table public.template_library_items (
  id uuid primary key default gen_random_uuid(),
  template_library_id uuid not null references public.template_libraries(id) on delete cascade,
  program_template_id uuid references public.program_templates(id) on delete cascade,
  template_component_id uuid references public.template_components(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint template_library_items_target_check check (
    (program_template_id is not null and template_component_id is null) or
    (program_template_id is null and template_component_id is not null)
  )
);

create table public.template_usage_events (
  id uuid primary key default gen_random_uuid(),
  program_template_id uuid references public.program_templates(id) on delete set null,
  template_component_id uuid references public.template_components(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete set null,
  actor_user_id uuid references public.profiles(id),
  apply_mode public.template_apply_mode,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint template_usage_events_target_check check (
    (program_template_id is not null and template_component_id is null) or
    (program_template_id is null and template_component_id is not null)
  )
);

create table public.template_governance_records (
  id uuid primary key default gen_random_uuid(),
  program_template_id uuid references public.program_templates(id) on delete cascade,
  template_component_id uuid references public.template_components(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  owner_user_id uuid references public.profiles(id),
  review_required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint template_governance_records_target_check check (
    (program_template_id is not null and template_component_id is null) or
    (program_template_id is null and template_component_id is not null)
  )
);

create table public.template_approvals (
  id uuid primary key default gen_random_uuid(),
  program_template_id uuid references public.program_templates(id) on delete cascade,
  template_component_id uuid references public.template_components(id) on delete cascade,
  program_template_version_id uuid references public.program_template_versions(id) on delete cascade,
  template_component_version_id uuid references public.template_component_versions(id) on delete cascade,
  status public.template_approval_status not null default 'pending',
  requested_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  decision_notes text,
  requested_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  constraint template_approvals_target_check check (
    (program_template_id is not null and template_component_id is null) or
    (program_template_id is null and template_component_id is not null)
  ),
  constraint template_approvals_version_target_check check (
    (program_template_version_id is not null and template_component_version_id is null) or
    (program_template_version_id is null and template_component_version_id is not null)
  )
);

create table public.template_clones (
  id uuid primary key default gen_random_uuid(),
  source_program_id uuid not null references public.programs(id) on delete cascade,
  program_template_id uuid not null references public.program_templates(id) on delete cascade,
  created_by uuid references public.profiles(id),
  clone_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index program_templates_platform_slug_key
  on public.program_templates (slug)
  where scope_type = 'platform';

create unique index program_templates_organization_slug_key
  on public.program_templates (organization_id, slug)
  where scope_type = 'organization';

create unique index program_templates_workspace_slug_key
  on public.program_templates (workspace_id, slug)
  where scope_type = 'workspace';

create unique index template_library_items_program_template_unique
  on public.template_library_items (template_library_id, program_template_id)
  where program_template_id is not null;

create unique index template_library_items_component_unique
  on public.template_library_items (template_library_id, template_component_id)
  where template_component_id is not null;

create index program_templates_scope_status_idx
  on public.program_templates (scope_type, status, updated_at desc);

create index program_templates_org_idx
  on public.program_templates (organization_id, status, updated_at desc);

create index program_templates_workspace_idx
  on public.program_templates (workspace_id, status, updated_at desc);

create index program_template_versions_template_idx
  on public.program_template_versions (program_template_id, version_number desc);

create index template_components_template_idx
  on public.template_components (program_template_id, component_type, updated_at desc);

create index template_components_scope_status_idx
  on public.template_components (scope_type, status, updated_at desc);

create index template_component_versions_component_idx
  on public.template_component_versions (template_component_id, version_number desc);

create index template_libraries_scope_idx
  on public.template_libraries (scope_type, updated_at desc);

create index template_libraries_org_idx
  on public.template_libraries (organization_id, updated_at desc);

create index template_libraries_workspace_idx
  on public.template_libraries (workspace_id, updated_at desc);

create index template_usage_events_template_idx
  on public.template_usage_events (program_template_id, created_at desc);

create index template_usage_events_component_idx
  on public.template_usage_events (template_component_id, created_at desc);

create index template_usage_events_workspace_idx
  on public.template_usage_events (workspace_id, created_at desc);

create index template_usage_events_program_idx
  on public.template_usage_events (program_id, created_at desc);

create index template_governance_records_template_idx
  on public.template_governance_records (program_template_id, updated_at desc);

create index template_governance_records_component_idx
  on public.template_governance_records (template_component_id, updated_at desc);

create index template_approvals_template_idx
  on public.template_approvals (program_template_id, requested_at desc);

create index template_approvals_component_idx
  on public.template_approvals (template_component_id, requested_at desc);

create index template_clones_program_idx
  on public.template_clones (source_program_id, created_at desc);

create trigger program_templates_set_updated_at
before update on public.program_templates
for each row execute function public.set_updated_at();

create trigger template_components_set_updated_at
before update on public.template_components
for each row execute function public.set_updated_at();

create trigger template_libraries_set_updated_at
before update on public.template_libraries
for each row execute function public.set_updated_at();

create trigger template_governance_records_set_updated_at
before update on public.template_governance_records
for each row execute function public.set_updated_at();
