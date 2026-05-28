create type public.landing_page_status as enum (
  'draft',
  'preview',
  'published',
  'archived'
);

create type public.form_kind as enum (
  'registration',
  'submission'
);

create type public.form_status as enum (
  'draft',
  'active',
  'archived'
);

create type public.form_field_type as enum (
  'short_text',
  'long_text',
  'email',
  'phone',
  'url',
  'number',
  'date',
  'single_choice',
  'multiple_choice',
  'dropdown',
  'file_upload',
  'image_upload',
  'video_link',
  'pitch_deck_upload',
  'section_header',
  'page_break',
  'consent_checkbox',
  'ai_usage_disclosure'
);

create type public.registration_mode as enum (
  'open',
  'invite_only',
  'domain_restricted',
  'approval_based',
  'waitlist'
);

create type public.participant_status as enum (
  'registered',
  'profile_incomplete',
  'waitlisted',
  'approved',
  'rejected',
  'withdrawn',
  'submitted',
  'finalist',
  'winner'
);

create type public.team_invite_status as enum (
  'pending',
  'accepted',
  'declined',
  'revoked',
  'expired'
);

create type public.submission_status as enum (
  'draft',
  'submitted',
  'under_review',
  'needs_revision',
  'shortlisted',
  'finalist',
  'winner',
  'rejected',
  'withdrawn'
);

create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null unique references public.programs(id) on delete cascade,
  title text,
  seo_title text,
  seo_description text,
  social_image_path text,
  theme_key text,
  brand_config jsonb not null default '{}'::jsonb,
  published_slug citext unique,
  published_version_id uuid,
  published_at timestamptz,
  published_by uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.landing_page_versions (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  version_number integer not null,
  status public.landing_page_status not null default 'draft',
  content jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (landing_page_id, version_number)
);

create table public.landing_page_sections (
  id uuid primary key default gen_random_uuid(),
  landing_page_version_id uuid not null references public.landing_page_versions(id) on delete cascade,
  section_key text not null,
  display_order integer not null,
  content jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (landing_page_version_id, section_key),
  unique (landing_page_version_id, display_order)
);

create table public.published_pages (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  landing_page_version_id uuid not null references public.landing_page_versions(id) on delete cascade,
  slug citext not null unique,
  published_at timestamptz not null default timezone('utc', now()),
  published_by uuid not null references public.profiles(id),
  is_active boolean not null default true
);

alter table public.landing_pages
  add constraint landing_pages_published_version_fk
  foreign key (published_version_id)
  references public.landing_page_versions(id)
  on delete set null;

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  kind public.form_kind not null,
  name text not null,
  description text,
  status public.form_status not null default 'draft',
  active_version_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, kind)
);

create table public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  version_number integer not null,
  schema_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (form_id, version_number)
);

create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_version_id uuid not null references public.form_versions(id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type public.form_field_type not null,
  display_order integer not null,
  help_text text,
  placeholder text,
  validation_rules jsonb not null default '{}'::jsonb,
  field_config jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (form_version_id, field_key),
  unique (form_version_id, display_order)
);

create table public.form_field_choices (
  id uuid primary key default gen_random_uuid(),
  form_field_id uuid not null references public.form_fields(id) on delete cascade,
  choice_key text not null,
  label text not null,
  value text not null,
  display_order integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (form_field_id, choice_key),
  unique (form_field_id, display_order)
);

create table public.form_field_conditions (
  id uuid primary key default gen_random_uuid(),
  form_field_id uuid not null references public.form_fields(id) on delete cascade,
  depends_on_field_key text not null,
  operator text not null,
  comparison_value jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.forms
  add constraint forms_active_version_fk
  foreign key (active_version_id)
  references public.form_versions(id)
  on delete set null;

create table public.participant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  location text,
  organization_name text,
  role_title text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  skills text[] not null default '{}',
  profile_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.program_registrations (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participant_profile_id uuid references public.participant_profiles(id) on delete set null,
  registration_mode public.registration_mode not null default 'open',
  status public.participant_status not null default 'registered',
  accepted_terms_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  invited_by uuid references public.profiles(id),
  registration_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, user_id)
);

create table public.registration_answers (
  id uuid primary key default gen_random_uuid(),
  program_registration_id uuid not null references public.program_registrations(id) on delete cascade,
  form_field_key text not null,
  answer jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_registration_id, form_field_key)
);

create table public.participant_status_history (
  id uuid primary key default gen_random_uuid(),
  program_registration_id uuid not null references public.program_registrations(id) on delete cascade,
  previous_status public.participant_status,
  new_status public.participant_status not null,
  changed_by uuid references public.profiles(id),
  change_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  slug citext not null,
  team_bio text,
  project_idea text,
  skills_needed text[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  team_lock_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, slug),
  constraint teams_name_not_blank check (char_length(trim(name)) > 0),
  constraint teams_slug_not_blank check (char_length(trim(slug::text)) > 0)
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_registration_id uuid references public.program_registrations(id) on delete set null,
  is_lead boolean not null default false,
  joined_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (team_id, user_id)
);

create unique index team_members_one_lead_per_team_idx
on public.team_members (team_id)
where is_lead = true;

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email citext not null,
  invited_user_id uuid references public.profiles(id) on delete set null,
  invited_by uuid not null references public.profiles(id),
  status public.team_invite_status not null default 'pending',
  expires_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (team_id, email)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  program_registration_id uuid references public.program_registrations(id) on delete set null,
  title text not null,
  problem_statement text,
  solution_description text,
  tech_stack text[] not null default '{}',
  demo_url text,
  github_url text,
  ai_usage_disclosure text,
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  submitted_by uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint submissions_owner_presence check (
    team_id is not null or program_registration_id is not null
  )
);

create table public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  form_field_key text not null,
  answer jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (submission_id, form_field_key)
);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  file_kind text not null,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  file_size_bytes bigint,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.submission_status_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  previous_status public.submission_status,
  new_status public.submission_status not null,
  changed_by uuid references public.profiles(id),
  change_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

create index landing_page_versions_page_idx on public.landing_page_versions (landing_page_id, version_number desc);
create index landing_page_sections_version_idx on public.landing_page_sections (landing_page_version_id, display_order);
create index published_pages_program_idx on public.published_pages (program_id, is_active);
create index forms_program_idx on public.forms (program_id, kind);
create index form_versions_form_idx on public.form_versions (form_id, version_number desc);
create index form_fields_version_idx on public.form_fields (form_version_id, display_order);
create index participant_profiles_user_idx on public.participant_profiles (user_id);
create index program_registrations_program_idx on public.program_registrations (program_id, status);
create index program_registrations_user_idx on public.program_registrations (user_id);
create index teams_program_idx on public.teams (program_id);
create index team_members_user_idx on public.team_members (user_id);
create index submissions_program_idx on public.submissions (program_id, status);
create index submissions_team_idx on public.submissions (team_id);
create index submissions_registration_idx on public.submissions (program_registration_id);
create index submission_files_submission_idx on public.submission_files (submission_id);

create trigger landing_pages_set_updated_at
before update on public.landing_pages
for each row execute function public.set_updated_at();

create trigger landing_page_versions_set_updated_at
before update on public.landing_page_versions
for each row execute function public.set_updated_at();

create trigger landing_page_sections_set_updated_at
before update on public.landing_page_sections
for each row execute function public.set_updated_at();

create trigger forms_set_updated_at
before update on public.forms
for each row execute function public.set_updated_at();

create trigger form_versions_set_updated_at
before update on public.form_versions
for each row execute function public.set_updated_at();

create trigger form_fields_set_updated_at
before update on public.form_fields
for each row execute function public.set_updated_at();

create trigger form_field_choices_set_updated_at
before update on public.form_field_choices
for each row execute function public.set_updated_at();

create trigger form_field_conditions_set_updated_at
before update on public.form_field_conditions
for each row execute function public.set_updated_at();

create trigger participant_profiles_set_updated_at
before update on public.participant_profiles
for each row execute function public.set_updated_at();

create trigger program_registrations_set_updated_at
before update on public.program_registrations
for each row execute function public.set_updated_at();

create trigger registration_answers_set_updated_at
before update on public.registration_answers
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger team_invites_set_updated_at
before update on public.team_invites
for each row execute function public.set_updated_at();

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

create trigger submission_answers_set_updated_at
before update on public.submission_answers
for each row execute function public.set_updated_at();

create or replace function public.is_team_member(check_team_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = check_team_id
      and tm.user_id = check_user_id
  );
$$;

create or replace function public.is_team_lead(check_team_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = check_team_id
      and tm.user_id = check_user_id
      and tm.is_lead = true
  );
$$;

create or replace function public.is_program_participant(check_program_id uuid, check_user_id uuid default auth.uid())
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
      and pm.role in ('participant', 'team_lead')
      and pm.status = 'active'
  );
$$;

create or replace function public.sync_program_registration_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.program_memberships (
    program_id,
    user_id,
    role,
    status,
    invited_by
  )
  values (
    new.program_id,
    new.user_id,
    'participant',
    'active',
    new.invited_by
  )
  on conflict (program_id, user_id) do update
  set
    status = case
      when public.program_memberships.role in ('program_manager', 'judge', 'sponsor', 'team_lead')
        then public.program_memberships.status
      else 'active'
    end,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.can_access_submission(check_submission_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.submissions s
    where s.id = check_submission_id
      and (
        public.is_program_manager(s.program_id, check_user_id)
        or (s.program_registration_id is not null and exists (
          select 1
          from public.program_registrations pr
          where pr.id = s.program_registration_id
            and pr.user_id = check_user_id
        ))
        or (s.team_id is not null and public.is_team_member(s.team_id, check_user_id))
      )
  );
$$;

alter table public.landing_pages enable row level security;
alter table public.landing_page_versions enable row level security;
alter table public.landing_page_sections enable row level security;
alter table public.published_pages enable row level security;
alter table public.forms enable row level security;
alter table public.form_versions enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_field_choices enable row level security;
alter table public.form_field_conditions enable row level security;
alter table public.participant_profiles enable row level security;
alter table public.program_registrations enable row level security;
alter table public.registration_answers enable row level security;
alter table public.participant_status_history enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;
alter table public.submission_files enable row level security;
alter table public.submission_status_history enable row level security;

create policy "landing_pages_select_scope_or_public"
on public.landing_pages
for select
to authenticated, anon
using (
  public.is_platform_super_admin()
  or public.can_view_program(program_id)
  or (
    published_version_id is not null
    and published_slug is not null
  )
);

create policy "landing_pages_manage_program_manager"
on public.landing_pages
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

create policy "landing_page_versions_select_scope_or_published"
on public.landing_page_versions
for select
to authenticated, anon
using (
  public.is_platform_super_admin()
  or exists (
    select 1
    from public.landing_pages lp
    where lp.id = landing_page_versions.landing_page_id
      and (
        public.can_view_program(lp.program_id)
        or lp.published_version_id = landing_page_versions.id
      )
  )
);

create policy "landing_page_versions_manage_program_manager"
on public.landing_page_versions
for all
to authenticated
using (
  exists (
    select 1
    from public.landing_pages lp
    where lp.id = landing_page_versions.landing_page_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(lp.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.landing_pages lp
    where lp.id = landing_page_versions.landing_page_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(lp.program_id)
      )
  )
);

create policy "landing_page_sections_select_scope_or_published"
on public.landing_page_sections
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.landing_page_versions lpv
    join public.landing_pages lp on lp.id = lpv.landing_page_id
    where lpv.id = landing_page_sections.landing_page_version_id
      and (
        public.can_view_program(lp.program_id)
        or lp.published_version_id = lpv.id
      )
  )
);

create policy "landing_page_sections_manage_program_manager"
on public.landing_page_sections
for all
to authenticated
using (
  exists (
    select 1
    from public.landing_page_versions lpv
    join public.landing_pages lp on lp.id = lpv.landing_page_id
    where lpv.id = landing_page_sections.landing_page_version_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(lp.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.landing_page_versions lpv
    join public.landing_pages lp on lp.id = lpv.landing_page_id
    where lpv.id = landing_page_sections.landing_page_version_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(lp.program_id)
      )
  )
);

create policy "published_pages_select_public"
on public.published_pages
for select
to authenticated, anon
using (is_active = true);

create policy "published_pages_manage_program_manager"
on public.published_pages
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

create policy "forms_select_scope"
on public.forms
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.can_view_program(program_id)
);

create policy "forms_manage_program_manager"
on public.forms
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

create policy "form_versions_select_scope"
on public.form_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.forms f
    where f.id = form_versions.form_id
      and public.can_view_program(f.program_id)
  )
);

create policy "form_versions_manage_program_manager"
on public.form_versions
for all
to authenticated
using (
  exists (
    select 1
    from public.forms f
    where f.id = form_versions.form_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(f.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.forms f
    where f.id = form_versions.form_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(f.program_id)
      )
  )
);

create policy "form_fields_select_scope"
on public.form_fields
for select
to authenticated
using (
  exists (
    select 1
    from public.form_versions fv
    join public.forms f on f.id = fv.form_id
    where fv.id = form_fields.form_version_id
      and public.can_view_program(f.program_id)
  )
);

create policy "form_fields_manage_program_manager"
on public.form_fields
for all
to authenticated
using (
  exists (
    select 1
    from public.form_versions fv
    join public.forms f on f.id = fv.form_id
    where fv.id = form_fields.form_version_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(f.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.form_versions fv
    join public.forms f on f.id = fv.form_id
    where fv.id = form_fields.form_version_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(f.program_id)
      )
  )
);

create policy "form_field_choices_select_scope"
on public.form_field_choices
for select
to authenticated
using (
  exists (
    select 1
    from public.form_fields ff
    join public.form_versions fv on fv.id = ff.form_version_id
    join public.forms f on f.id = fv.form_id
    where ff.id = form_field_choices.form_field_id
      and public.can_view_program(f.program_id)
  )
);

create policy "form_field_choices_manage_program_manager"
on public.form_field_choices
for all
to authenticated
using (
  exists (
    select 1
    from public.form_fields ff
    join public.form_versions fv on fv.id = ff.form_version_id
    join public.forms f on f.id = fv.form_id
    where ff.id = form_field_choices.form_field_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(f.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.form_fields ff
    join public.form_versions fv on fv.id = ff.form_version_id
    join public.forms f on f.id = fv.form_id
    where ff.id = form_field_choices.form_field_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(f.program_id)
      )
  )
);

create policy "form_field_conditions_select_scope"
on public.form_field_conditions
for select
to authenticated
using (
  exists (
    select 1
    from public.form_fields ff
    join public.form_versions fv on fv.id = ff.form_version_id
    join public.forms f on f.id = fv.form_id
    where ff.id = form_field_conditions.form_field_id
      and public.can_view_program(f.program_id)
  )
);

create policy "form_field_conditions_manage_program_manager"
on public.form_field_conditions
for all
to authenticated
using (
  exists (
    select 1
    from public.form_fields ff
    join public.form_versions fv on fv.id = ff.form_version_id
    join public.forms f on f.id = fv.form_id
    where ff.id = form_field_conditions.form_field_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(f.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.form_fields ff
    join public.form_versions fv on fv.id = ff.form_version_id
    join public.forms f on f.id = fv.form_id
    where ff.id = form_field_conditions.form_field_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(f.program_id)
      )
  )
);

create policy "participant_profiles_select_self_or_program_manager"
on public.participant_profiles
for select
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or exists (
    select 1
    from public.program_registrations pr
    where pr.participant_profile_id = participant_profiles.id
      and public.is_program_manager(pr.program_id)
  )
);

create policy "participant_profiles_manage_self"
on public.participant_profiles
for all
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
)
with check (
  public.is_platform_super_admin()
  or user_id = auth.uid()
);

create policy "program_registrations_select_scope"
on public.program_registrations
for select
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "program_registrations_insert_self_or_manager"
on public.program_registrations
for insert
to authenticated
with check (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "program_registrations_update_self_or_manager"
on public.program_registrations
for update
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or public.is_program_manager(program_id)
)
with check (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "registration_answers_select_scope"
on public.registration_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.program_registrations pr
    where pr.id = registration_answers.program_registration_id
      and (
        public.is_platform_super_admin()
        or pr.user_id = auth.uid()
        or public.is_program_manager(pr.program_id)
      )
  )
);

create policy "registration_answers_manage_self_or_manager"
on public.registration_answers
for all
to authenticated
using (
  exists (
    select 1
    from public.program_registrations pr
    where pr.id = registration_answers.program_registration_id
      and (
        public.is_platform_super_admin()
        or pr.user_id = auth.uid()
        or public.is_program_manager(pr.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.program_registrations pr
    where pr.id = registration_answers.program_registration_id
      and (
        public.is_platform_super_admin()
        or pr.user_id = auth.uid()
        or public.is_program_manager(pr.program_id)
      )
  )
);

create policy "participant_status_history_select_scope"
on public.participant_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.program_registrations pr
    where pr.id = participant_status_history.program_registration_id
      and (
        public.is_platform_super_admin()
        or pr.user_id = auth.uid()
        or public.is_program_manager(pr.program_id)
      )
  )
);

create policy "participant_status_history_insert_manager"
on public.participant_status_history
for insert
to authenticated
with check (
  exists (
    select 1
    from public.program_registrations pr
    where pr.id = participant_status_history.program_registration_id
      and (
        public.is_platform_super_admin()
        or public.is_program_manager(pr.program_id)
      )
  )
);

create trigger sync_program_registration_membership_trigger
after insert on public.program_registrations
for each row execute function public.sync_program_registration_membership();

create policy "teams_select_scope"
on public.teams
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
  or public.is_team_member(id)
);

create policy "teams_insert_participant_or_manager"
on public.teams
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_platform_super_admin()
    or public.is_program_manager(program_id)
    or public.is_program_participant(program_id)
  )
);

create policy "teams_update_lead_or_manager"
on public.teams
for update
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
  or public.is_team_lead(id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(program_id)
  or public.is_team_lead(id)
);

create policy "team_members_select_scope"
on public.team_members
for select
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or public.is_team_member(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_members.team_id
      and public.is_program_manager(t.program_id)
  )
);

create policy "team_members_insert_lead_or_manager"
on public.team_members
for insert
to authenticated
with check (
  public.is_platform_super_admin()
  or public.is_team_lead(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_members.team_id
      and public.is_program_manager(t.program_id)
  )
);

create policy "team_members_update_lead_or_manager"
on public.team_members
for update
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_team_lead(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_members.team_id
      and public.is_program_manager(t.program_id)
  )
)
with check (
  public.is_platform_super_admin()
  or public.is_team_lead(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_members.team_id
      and public.is_program_manager(t.program_id)
  )
);

create policy "team_invites_select_scope"
on public.team_invites
for select
to authenticated
using (
  public.is_platform_super_admin()
  or invited_user_id = auth.uid()
  or public.is_team_member(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_invites.team_id
      and public.is_program_manager(t.program_id)
  )
);

create policy "team_invites_manage_lead_or_manager"
on public.team_invites
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_team_lead(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_invites.team_id
      and public.is_program_manager(t.program_id)
  )
)
with check (
  public.is_platform_super_admin()
  or public.is_team_lead(team_id)
  or exists (
    select 1
    from public.teams t
    where t.id = team_invites.team_id
      and public.is_program_manager(t.program_id)
  )
);

create policy "submissions_select_scope"
on public.submissions
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.can_access_submission(id)
);

create policy "submissions_insert_owner_or_manager"
on public.submissions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_platform_super_admin()
    or public.is_program_manager(program_id)
    or (
      program_registration_id is not null
      and exists (
        select 1
        from public.program_registrations pr
        where pr.id = program_registration_id
          and pr.user_id = auth.uid()
      )
    )
    or (
      team_id is not null
      and public.is_team_member(team_id)
    )
  )
);

create policy "submissions_update_owner_or_manager"
on public.submissions
for update
to authenticated
using (
  public.is_platform_super_admin()
  or public.can_access_submission(id)
)
with check (
  public.is_platform_super_admin()
  or public.can_access_submission(id)
);

create policy "submission_answers_select_scope"
on public.submission_answers
for select
to authenticated
using (
  public.can_access_submission(submission_id)
);

create policy "submission_answers_manage_scope"
on public.submission_answers
for all
to authenticated
using (
  public.can_access_submission(submission_id)
)
with check (
  public.can_access_submission(submission_id)
);

create policy "submission_files_select_scope"
on public.submission_files
for select
to authenticated
using (
  public.can_access_submission(submission_id)
);

create policy "submission_files_insert_scope"
on public.submission_files
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.can_access_submission(submission_id)
);

create policy "submission_status_history_select_scope"
on public.submission_status_history
for select
to authenticated
using (
  public.can_access_submission(submission_id)
);

create policy "submission_status_history_insert_scope"
on public.submission_status_history
for insert
to authenticated
with check (
  public.can_access_submission(submission_id)
);
