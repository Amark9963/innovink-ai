create type public.import_source_type as enum (
  'pdf',
  'docx',
  'pptx',
  'spreadsheet',
  'csv',
  'markdown',
  'plain_text',
  'url',
  'program_export',
  'manual_paste'
);

create type public.import_goal_type as enum (
  'brief_intake',
  'asset_extraction',
  'form_extraction',
  'scorecard_extraction',
  'template_creation',
  'general_context'
);

create type public.import_scope_type as enum (
  'organization',
  'workspace',
  'program'
);

create type public.import_run_status as enum (
  'queued',
  'running',
  'awaiting_review',
  'approved',
  'applied',
  'failed',
  'cancelled'
);

create type public.import_extraction_type as enum (
  'document_structure',
  'brief_field',
  'timeline_block',
  'landing_content',
  'faq_block',
  'form_question',
  'scorecard_criterion',
  'sponsor_content',
  'policy_content',
  'other'
);

create type public.import_mapping_status as enum (
  'suggested',
  'confirmed',
  'rejected',
  'superseded'
);

create type public.import_review_item_status as enum (
  'pending',
  'resolved',
  'skipped'
);

create type public.import_apply_status as enum (
  'pending',
  'approved',
  'executed',
  'failed',
  'cancelled'
);

create type public.import_confidence_level as enum (
  'low',
  'medium',
  'high'
);

create table public.imported_sources (
  id uuid primary key default gen_random_uuid(),
  source_type public.import_source_type not null,
  scope_type public.import_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  title text,
  original_filename text,
  storage_path text,
  source_url text,
  owner_user_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint imported_sources_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  ),
  constraint imported_sources_location_check check (
    source_type in ('manual_paste', 'plain_text')
    or storage_path is not null
    or source_url is not null
  )
);

create table public.imported_source_versions (
  id uuid primary key default gen_random_uuid(),
  imported_source_id uuid not null references public.imported_sources(id) on delete cascade,
  version_number integer not null,
  raw_text text,
  structured_payload jsonb not null default '{}'::jsonb,
  file_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (imported_source_id, version_number)
);

create table public.import_runs (
  id uuid primary key default gen_random_uuid(),
  imported_source_id uuid not null references public.imported_sources(id) on delete cascade,
  source_version_id uuid not null references public.imported_source_versions(id) on delete cascade,
  goal_type public.import_goal_type not null,
  status public.import_run_status not null default 'queued',
  program_brief_id uuid references public.program_briefs(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  program_template_id uuid references public.program_templates(id) on delete set null,
  requested_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  approved_at timestamptz,
  applied_at timestamptz,
  error_summary text,
  run_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.import_extractions (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  extraction_type public.import_extraction_type not null,
  source_locator text,
  label text,
  extracted_text text,
  structured_value jsonb not null default '{}'::jsonb,
  confidence_level public.import_confidence_level,
  confidence_score numeric(5,4),
  created_at timestamptz not null default timezone('utc', now()),
  constraint import_extractions_confidence_score_check check (
    confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)
  )
);

create table public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  import_extraction_id uuid references public.import_extractions(id) on delete cascade,
  mapping_target_type text not null,
  mapping_target_key text not null,
  mapping_payload jsonb not null default '{}'::jsonb,
  status public.import_mapping_status not null default 'suggested',
  reasoning_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.import_review_items (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  import_mapping_id uuid references public.import_mappings(id) on delete cascade,
  item_type text not null,
  prompt text not null,
  status public.import_review_item_status not null default 'pending',
  resolution_payload jsonb not null default '{}'::jsonb,
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.import_apply_actions (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  action_type text not null,
  target_type text not null,
  target_id uuid,
  status public.import_apply_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id),
  executed_by uuid references public.profiles(id),
  approved_at timestamptz,
  executed_at timestamptz,
  error_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.import_trace_links (
  id uuid primary key default gen_random_uuid(),
  imported_source_id uuid not null references public.imported_sources(id) on delete cascade,
  source_version_id uuid not null references public.imported_source_versions(id) on delete cascade,
  import_extraction_id uuid references public.import_extractions(id) on delete set null,
  import_mapping_id uuid references public.import_mappings(id) on delete set null,
  target_type text not null,
  target_id uuid,
  target_field text,
  trace_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.import_confidence_scores (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.import_runs(id) on delete cascade,
  subject_type text not null,
  subject_key text not null,
  confidence_level public.import_confidence_level not null,
  confidence_score numeric(5,4),
  created_at timestamptz not null default timezone('utc', now()),
  constraint import_confidence_scores_confidence_score_check check (
    confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)
  )
);

create index imported_sources_org_idx
  on public.imported_sources (organization_id, source_type, created_at desc);

create index imported_sources_workspace_idx
  on public.imported_sources (workspace_id, source_type, created_at desc);

create index imported_sources_program_idx
  on public.imported_sources (program_id, source_type, created_at desc);

create index imported_source_versions_source_idx
  on public.imported_source_versions (imported_source_id, version_number desc);

create index import_runs_source_idx
  on public.import_runs (imported_source_id, goal_type, created_at desc);

create index import_runs_program_brief_idx
  on public.import_runs (program_brief_id, created_at desc);

create index import_runs_program_idx
  on public.import_runs (program_id, goal_type, created_at desc);

create index import_runs_template_idx
  on public.import_runs (program_template_id, goal_type, created_at desc);

create index import_extractions_run_idx
  on public.import_extractions (import_run_id, extraction_type);

create index import_mappings_run_idx
  on public.import_mappings (import_run_id, status, updated_at desc);

create index import_mappings_extraction_idx
  on public.import_mappings (import_extraction_id, status, updated_at desc);

create index import_review_items_run_idx
  on public.import_review_items (import_run_id, status, updated_at desc);

create index import_apply_actions_run_idx
  on public.import_apply_actions (import_run_id, status, updated_at desc);

create index import_trace_links_source_idx
  on public.import_trace_links (imported_source_id, source_version_id, created_at desc);

create index import_trace_links_target_idx
  on public.import_trace_links (target_type, target_id, created_at desc);

create index import_confidence_scores_run_idx
  on public.import_confidence_scores (import_run_id, subject_type, created_at desc);

create trigger imported_sources_set_updated_at
before update on public.imported_sources
for each row execute function public.set_updated_at();

create trigger import_runs_set_updated_at
before update on public.import_runs
for each row execute function public.set_updated_at();

create trigger import_mappings_set_updated_at
before update on public.import_mappings
for each row execute function public.set_updated_at();

create trigger import_review_items_set_updated_at
before update on public.import_review_items
for each row execute function public.set_updated_at();

create trigger import_apply_actions_set_updated_at
before update on public.import_apply_actions
for each row execute function public.set_updated_at();
