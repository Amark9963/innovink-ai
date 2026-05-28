create type public.assignment_status as enum (
  'assigned',
  'accepted',
  'declined',
  'completed',
  'reassigned'
);

create type public.assignment_mode as enum (
  'manual',
  'random',
  'round_robin',
  'category_based',
  'track_based'
);

create type public.score_scale_type as enum (
  'numeric',
  'boolean',
  'choice'
);

create type public.score_entry_status as enum (
  'draft',
  'submitted'
);

create type public.report_visibility as enum (
  'internal',
  'sponsor'
);

create type public.report_status as enum (
  'draft',
  'generated',
  'approved',
  'published',
  'archived'
);

create type public.certificate_type as enum (
  'participation',
  'finalist',
  'winner',
  'special_award',
  'judge_appreciation',
  'mentor_appreciation',
  'sponsor_recognition'
);

create type public.ai_risk_level as enum (
  'low',
  'medium',
  'high'
);

create type public.ai_review_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  judge_user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  assignment_mode public.assignment_mode not null default 'manual',
  status public.assignment_status not null default 'assigned',
  due_at timestamptz,
  assigned_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  notes text,
  unique (submission_id, judge_user_id)
);

create table public.judge_conflicts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  judge_user_id uuid not null references public.profiles(id) on delete cascade,
  reported_by uuid not null references public.profiles(id),
  reason text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.judge_progress (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  judge_user_id uuid not null references public.profiles(id) on delete cascade,
  assignments_total integer not null default 0,
  assignments_completed integer not null default 0,
  last_activity_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, judge_user_id)
);

create table public.evaluation_rounds (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  round_order integer not null,
  is_blind_review boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, round_order)
);

create table public.scorecards (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  evaluation_round_id uuid references public.evaluation_rounds(id) on delete set null,
  name text not null,
  description text,
  total_weight numeric(8,2),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.scorecard_criteria (
  id uuid primary key default gen_random_uuid(),
  scorecard_id uuid not null references public.scorecards(id) on delete cascade,
  criterion_key text not null,
  label text not null,
  description text,
  weight numeric(8,2) not null,
  scale_type public.score_scale_type not null default 'numeric',
  scale_config jsonb not null default '{}'::jsonb,
  judge_guidance text,
  requires_comment boolean not null default false,
  display_order integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (scorecard_id, criterion_key),
  unique (scorecard_id, display_order)
);

create table public.score_submissions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  scorecard_id uuid not null references public.scorecards(id) on delete cascade,
  evaluation_round_id uuid references public.evaluation_rounds(id) on delete set null,
  judge_assignment_id uuid not null references public.judge_assignments(id) on delete cascade,
  judge_user_id uuid not null references public.profiles(id) on delete cascade,
  status public.score_entry_status not null default 'draft',
  total_score numeric(10,2),
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (judge_assignment_id)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  score_submission_id uuid not null references public.score_submissions(id) on delete cascade,
  scorecard_criterion_id uuid not null references public.scorecard_criteria(id) on delete cascade,
  numeric_score numeric(10,2),
  boolean_score boolean,
  choice_value text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (score_submission_id, scorecard_criterion_id)
);

create table public.score_comments (
  id uuid primary key default gen_random_uuid(),
  score_submission_id uuid not null references public.score_submissions(id) on delete cascade,
  scorecard_criterion_id uuid references public.scorecard_criteria(id) on delete cascade,
  comment_text text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  sponsor_user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  tier text,
  website_url text,
  logo_path text,
  profile jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.sponsor_reports (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  generated_report_id uuid,
  title text not null,
  summary text,
  report_payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  visibility public.report_visibility not null default 'internal',
  name text not null,
  template_key text not null,
  template_schema jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, template_key, visibility)
);

create table public.generated_reports (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  report_template_id uuid references public.report_templates(id) on delete set null,
  visibility public.report_visibility not null default 'internal',
  status public.report_status not null default 'draft',
  title text not null,
  summary text,
  content jsonb not null default '{}'::jsonb,
  generated_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.sponsor_reports
  add constraint sponsor_reports_generated_report_fk
  foreign key (generated_report_id)
  references public.generated_reports(id)
  on delete set null;

create table public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  certificate_type public.certificate_type not null,
  name text not null,
  template_payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, certificate_type, name)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  certificate_template_id uuid references public.certificate_templates(id) on delete set null,
  certificate_type public.certificate_type not null,
  title text not null,
  file_path text,
  issued_by uuid not null references public.profiles(id),
  issued_at timestamptz not null default timezone('utc', now()),
  verification_code text unique
);

create table public.certificate_recipients (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  sponsor_id uuid references public.sponsors(id) on delete set null,
  recipient_name text not null,
  recipient_email citext,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  event_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now())
);

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  published_page_id uuid references public.published_pages(id) on delete cascade,
  viewed_at timestamptz not null default timezone('utc', now()),
  referrer text,
  user_agent text,
  ip_hash text
);

create table public.ai_feature_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  feature_key text not null,
  risk_level public.ai_risk_level not null,
  feature_config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (organization_id, workspace_id, program_id, feature_key)
);

create table public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  version_label text not null,
  prompt_template text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique (feature_key, version_label)
);

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  feature_key text not null,
  risk_level public.ai_risk_level not null,
  prompt_version_id uuid references public.ai_prompt_versions(id) on delete set null,
  request_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  output_hash text,
  status text not null default 'completed',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  ai_request_id uuid references public.ai_requests(id) on delete cascade,
  feature_key text not null,
  provider_name text,
  model_name text,
  token_count integer,
  credit_units numeric(12,2),
  estimated_cost numeric(12,4),
  cache_hit boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.ai_output_reviews (
  id uuid primary key default gen_random_uuid(),
  ai_request_id uuid not null references public.ai_requests(id) on delete cascade,
  reviewer_user_id uuid not null references public.profiles(id),
  review_status public.ai_review_status not null,
  feedback text,
  reviewed_at timestamptz not null default timezone('utc', now())
);

create index judge_assignments_program_idx on public.judge_assignments (program_id, judge_user_id);
create index judge_assignments_submission_idx on public.judge_assignments (submission_id);
create index judge_conflicts_program_idx on public.judge_conflicts (program_id, judge_user_id);
create index judge_progress_program_idx on public.judge_progress (program_id, judge_user_id);
create index scorecards_program_idx on public.scorecards (program_id);
create index scorecard_criteria_scorecard_idx on public.scorecard_criteria (scorecard_id, display_order);
create index score_submissions_program_idx on public.score_submissions (program_id, judge_user_id);
create index scores_score_submission_idx on public.scores (score_submission_id);
create index sponsors_program_idx on public.sponsors (program_id);
create index sponsor_reports_program_idx on public.sponsor_reports (program_id);
create index generated_reports_program_idx on public.generated_reports (program_id, visibility);
create index certificates_program_idx on public.certificates (program_id);
create index certificate_recipients_certificate_idx on public.certificate_recipients (certificate_id);
create index analytics_events_program_idx on public.analytics_events (program_id, occurred_at desc);
create index page_views_program_idx on public.page_views (program_id, viewed_at desc);
create index ai_requests_program_idx on public.ai_requests (program_id, created_at desc);
create index ai_usage_events_program_idx on public.ai_usage_events (program_id, created_at desc);

create trigger judge_progress_set_updated_at
before update on public.judge_progress
for each row execute function public.set_updated_at();

create trigger evaluation_rounds_set_updated_at
before update on public.evaluation_rounds
for each row execute function public.set_updated_at();

create trigger scorecards_set_updated_at
before update on public.scorecards
for each row execute function public.set_updated_at();

create trigger scorecard_criteria_set_updated_at
before update on public.scorecard_criteria
for each row execute function public.set_updated_at();

create trigger score_submissions_set_updated_at
before update on public.score_submissions
for each row execute function public.set_updated_at();

create trigger scores_set_updated_at
before update on public.scores
for each row execute function public.set_updated_at();

create trigger score_comments_set_updated_at
before update on public.score_comments
for each row execute function public.set_updated_at();

create trigger sponsors_set_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

create trigger sponsor_reports_set_updated_at
before update on public.sponsor_reports
for each row execute function public.set_updated_at();

create trigger report_templates_set_updated_at
before update on public.report_templates
for each row execute function public.set_updated_at();

create trigger generated_reports_set_updated_at
before update on public.generated_reports
for each row execute function public.set_updated_at();

create trigger certificate_templates_set_updated_at
before update on public.certificate_templates
for each row execute function public.set_updated_at();

create trigger ai_feature_configs_set_updated_at
before update on public.ai_feature_configs
for each row execute function public.set_updated_at();

create or replace function public.is_assigned_judge(check_program_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_memberships pm
    where pm.program_id = check_program_id
      and pm.user_id = check_user_id
      and pm.role = 'judge'
      and pm.status = 'active'
  );
$$;

create or replace function public.is_sponsor_user(check_program_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.program_memberships pm
    where pm.program_id = check_program_id
      and pm.user_id = check_user_id
      and pm.role = 'sponsor'
      and pm.status = 'active'
  );
$$;

create or replace function public.can_judge_submission(check_submission_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.judge_assignments ja
    where ja.submission_id = check_submission_id
      and ja.judge_user_id = check_user_id
      and ja.status in ('assigned', 'accepted', 'completed')
  );
$$;

alter table public.judge_assignments enable row level security;
alter table public.judge_conflicts enable row level security;
alter table public.judge_progress enable row level security;
alter table public.evaluation_rounds enable row level security;
alter table public.scorecards enable row level security;
alter table public.scorecard_criteria enable row level security;
alter table public.score_submissions enable row level security;
alter table public.scores enable row level security;
alter table public.score_comments enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_reports enable row level security;
alter table public.report_templates enable row level security;
alter table public.generated_reports enable row level security;
alter table public.certificate_templates enable row level security;
alter table public.certificates enable row level security;
alter table public.certificate_recipients enable row level security;
alter table public.analytics_events enable row level security;
alter table public.page_views enable row level security;
alter table public.ai_feature_configs enable row level security;
alter table public.ai_prompt_versions enable row level security;
alter table public.ai_requests enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_output_reviews enable row level security;

create policy "judge_assignments_select_scope"
on public.judge_assignments
for select
to authenticated
using (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "judge_assignments_manage_program_manager"
on public.judge_assignments
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "judge_conflicts_select_scope"
on public.judge_conflicts
for select
to authenticated
using (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "judge_conflicts_insert_scope"
on public.judge_conflicts
for insert
to authenticated
with check (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "judge_progress_select_scope"
on public.judge_progress
for select
to authenticated
using (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "judge_progress_manage_program_manager"
on public.judge_progress
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "evaluation_rounds_select_scope"
on public.evaluation_rounds
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.can_view_program(program_id)
);

create policy "evaluation_rounds_manage_program_manager"
on public.evaluation_rounds
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "scorecards_select_scope"
on public.scorecards
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.can_view_program(program_id)
);

create policy "scorecards_manage_program_manager"
on public.scorecards
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "scorecard_criteria_select_scope"
on public.scorecard_criteria
for select
to authenticated
using (
  exists (
    select 1
    from public.scorecards sc
    where sc.id = scorecard_criteria.scorecard_id
      and public.can_view_program(sc.program_id)
  )
);

create policy "scorecard_criteria_manage_program_manager"
on public.scorecard_criteria
for all
to authenticated
using (
  exists (
    select 1
    from public.scorecards sc
    where sc.id = scorecard_criteria.scorecard_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(sc.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.scorecards sc
    where sc.id = scorecard_criteria.scorecard_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(sc.program_id)
      )
  )
);

create policy "score_submissions_select_scope"
on public.score_submissions
for select
to authenticated
using (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "score_submissions_insert_assigned_judge_or_manager"
on public.score_submissions
for insert
to authenticated
with check (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "score_submissions_update_assigned_judge_or_manager"
on public.score_submissions
for update
to authenticated
using (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "scores_select_scope"
on public.scores
for select
to authenticated
using (
  exists (
    select 1
    from public.score_submissions ss
    where ss.id = scores.score_submission_id
      and (
        public.is_platform_super_admin()
        or ss.judge_user_id = auth.uid()
        or public.is_program_manager(ss.program_id)
      )
  )
);

create policy "scores_manage_scope"
on public.scores
for all
to authenticated
using (
  exists (
    select 1
    from public.score_submissions ss
    where ss.id = scores.score_submission_id
      and (
        public.is_platform_super_admin()
        or ss.judge_user_id = auth.uid()
        or public.is_program_manager(ss.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.score_submissions ss
    where ss.id = scores.score_submission_id
      and (
        public.is_platform_super_admin()
        or ss.judge_user_id = auth.uid()
        or public.is_program_manager(ss.program_id)
      )
  )
);

create policy "score_comments_select_scope"
on public.score_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.score_submissions ss
    where ss.id = score_comments.score_submission_id
      and (
        public.is_platform_super_admin()
        or ss.judge_user_id = auth.uid()
        or public.is_program_manager(ss.program_id)
      )
  )
);

create policy "score_comments_manage_scope"
on public.score_comments
for all
to authenticated
using (
  exists (
    select 1
    from public.score_submissions ss
    where ss.id = score_comments.score_submission_id
      and (
        public.is_platform_super_admin()
        or ss.judge_user_id = auth.uid()
        or public.is_program_manager(ss.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.score_submissions ss
    where ss.id = score_comments.score_submission_id
      and (
        public.is_platform_super_admin()
        or ss.judge_user_id = auth.uid()
        or public.is_program_manager(ss.program_id)
      )
  )
);

create policy "sponsors_select_scope"
on public.sponsors
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
  or sponsor_user_id = auth.uid()
);

create policy "sponsors_manage_program_manager"
on public.sponsors
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "sponsor_reports_select_scope"
on public.sponsor_reports
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
  or exists (
    select 1
    from public.sponsors s
    where s.id = sponsor_reports.sponsor_id
      and s.sponsor_user_id = auth.uid()
  )
);

create policy "sponsor_reports_manage_program_manager"
on public.sponsor_reports
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "report_templates_select_scope"
on public.report_templates
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
  or (
    visibility = 'sponsor'
    and public.is_sponsor_user(program_id)
  )
);

create policy "report_templates_manage_program_manager"
on public.report_templates
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "generated_reports_select_scope"
on public.generated_reports
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
  or (
    visibility = 'sponsor'
    and public.is_sponsor_user(program_id)
  )
);

create policy "generated_reports_manage_program_manager"
on public.generated_reports
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "certificate_templates_select_scope"
on public.certificate_templates
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "certificate_templates_manage_program_manager"
on public.certificate_templates
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "certificates_select_scope"
on public.certificates
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
  or exists (
    select 1
    from public.certificate_recipients cr
    where cr.certificate_id = certificates.id
      and cr.user_id = auth.uid()
  )
);

create policy "certificates_manage_program_manager"
on public.certificates
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
);

create policy "certificate_recipients_select_scope"
on public.certificate_recipients
for select
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or exists (
    select 1
    from public.certificates c
    where c.id = certificate_recipients.certificate_id
      and public.is_program_manager(c.program_id)
  )
);

create policy "certificate_recipients_manage_program_manager"
on public.certificate_recipients
for all
to authenticated
using (
  public.is_platform_super_admin()
  or exists (
    select 1
    from public.certificates c
    where c.id = certificate_recipients.certificate_id
      and public.is_program_manager(c.program_id)
  )
)
with check (
  public.is_platform_super_admin()
  or exists (
    select 1
    from public.certificates c
    where c.id = certificate_recipients.certificate_id
      and public.is_program_manager(c.program_id)
  )
);

create policy "analytics_events_select_scope"
on public.analytics_events
for select
to authenticated
using (
  public.is_platform_super_admin()
  or (
    organization_id is not null
    and public.is_organization_owner(organization_id)
  )
  or (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  )
  or (
    program_id is not null
    and public.is_program_manager(program_id)
  )
);

create policy "analytics_events_insert_authenticated_actor"
on public.analytics_events
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  or public.is_platform_super_admin()
);

create policy "page_views_insert_open"
on public.page_views
for insert
to authenticated, anon
with check (true);

create policy "page_views_select_admin_scope"
on public.page_views
for select
to authenticated
using (
  public.is_platform_super_admin()
  or (
    program_id is not null
    and public.is_program_manager(program_id)
  )
);

create policy "ai_feature_configs_select_scope"
on public.ai_feature_configs
for select
to authenticated
using (
  public.is_platform_super_admin()
  or (
    organization_id is not null
    and public.is_organization_owner(organization_id)
  )
  or (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  )
  or (
    program_id is not null
    and public.is_program_manager(program_id)
  )
);

create policy "ai_feature_configs_manage_admin_scope"
on public.ai_feature_configs
for all
to authenticated
using (
  public.is_platform_super_admin()
  or (
    organization_id is not null
    and public.is_organization_owner(organization_id)
  )
  or (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  )
)
with check (
  public.is_platform_super_admin()
  or (
    organization_id is not null
    and public.is_organization_owner(organization_id)
  )
  or (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  )
);

create policy "ai_prompt_versions_select_authenticated"
on public.ai_prompt_versions
for select
to authenticated
using (true);

create policy "ai_prompt_versions_manage_platform_admin"
on public.ai_prompt_versions
for all
to authenticated
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());

create policy "ai_requests_select_scope"
on public.ai_requests
for select
to authenticated
using (
  public.is_platform_super_admin()
  or requested_by = auth.uid()
  or (
    organization_id is not null
    and public.is_organization_owner(organization_id)
  )
  or (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  )
  or (
    program_id is not null
    and public.is_program_manager(program_id)
  )
);

create policy "ai_requests_insert_authenticated"
on public.ai_requests
for insert
to authenticated
with check (
  requested_by = auth.uid()
  or public.is_platform_super_admin()
);

create policy "ai_usage_events_select_scope"
on public.ai_usage_events
for select
to authenticated
using (
  public.is_platform_super_admin()
  or (
    organization_id is not null
    and public.is_organization_owner(organization_id)
  )
  or (
    workspace_id is not null
    and public.is_workspace_admin(workspace_id)
  )
  or (
    program_id is not null
    and public.is_program_manager(program_id)
  )
);

create policy "ai_usage_events_insert_authenticated"
on public.ai_usage_events
for insert
to authenticated
with check (public.is_platform_super_admin() or true);

create policy "ai_output_reviews_select_scope"
on public.ai_output_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.ai_requests ar
    where ar.id = ai_output_reviews.ai_request_id
      and (
        public.is_platform_super_admin()
        or ar.requested_by = auth.uid()
        or (
          ar.organization_id is not null
          and public.is_organization_owner(ar.organization_id)
        )
        or (
          ar.workspace_id is not null
          and public.is_workspace_admin(ar.workspace_id)
        )
        or (
          ar.program_id is not null
          and public.is_program_manager(ar.program_id)
        )
      )
  )
);

create policy "ai_output_reviews_insert_scope"
on public.ai_output_reviews
for insert
to authenticated
with check (
  reviewer_user_id = auth.uid()
  or public.is_platform_super_admin()
);
