create type public.mentor_membership_status as enum (
  'invited',
  'active',
  'paused',
  'archived'
);

create type public.mentor_session_type as enum (
  'one_to_one',
  'team_office_hour',
  'expert_review',
  'pitch_coaching',
  'group_clinic',
  'panel_session'
);

create type public.mentor_booking_status as enum (
  'draft',
  'requested',
  'pending_approval',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled'
);

create type public.mentor_note_visibility as enum (
  'private_mentor',
  'shared_with_pm',
  'shared_with_participant'
);

create type public.mentor_match_run_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create type public.mentor_match_status as enum (
  'suggested',
  'approved',
  'rejected',
  'booked',
  'expired'
);

create type public.mentor_feedback_status as enum (
  'pending',
  'submitted',
  'reviewed'
);

create table public.mentor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  title text,
  organization_name text,
  bio text,
  regions jsonb not null default '[]'::jsonb,
  languages jsonb not null default '[]'::jsonb,
  stage_preferences jsonb not null default '{}'::jsonb,
  session_format_preferences jsonb not null default '{}'::jsonb,
  availability_preferences jsonb not null default '{}'::jsonb,
  max_mentoring_load integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create table public.mentor_expertise_tags (
  id uuid primary key default gen_random_uuid(),
  mentor_profile_id uuid not null references public.mentor_profiles(id) on delete cascade,
  tag_type text not null,
  tag_value text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.mentor_program_memberships (
  id uuid primary key default gen_random_uuid(),
  mentor_profile_id uuid not null references public.mentor_profiles(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  status public.mentor_membership_status not null default 'invited',
  visibility_policy jsonb not null default '{}'::jsonb,
  booking_policy jsonb not null default '{}'::jsonb,
  max_sessions integer,
  auto_confirm_allowed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (mentor_profile_id, program_id)
);

create table public.mentor_availability_rules (
  id uuid primary key default gen_random_uuid(),
  mentor_program_membership_id uuid not null references public.mentor_program_memberships(id) on delete cascade,
  timezone text not null,
  session_type public.mentor_session_type not null,
  slot_duration_minutes integer not null,
  buffer_minutes integer not null default 0,
  recurrence_rule jsonb not null default '{}'::jsonb,
  availability_window jsonb not null default '{}'::jsonb,
  blackout_rules jsonb not null default '{}'::jsonb,
  max_bookings_per_day integer,
  max_bookings_per_week integer,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_availability_rules_slot_duration_check check (slot_duration_minutes > 0),
  constraint mentor_availability_rules_buffer_minutes_check check (buffer_minutes >= 0)
);

create table public.mentor_availability_slots (
  id uuid primary key default gen_random_uuid(),
  mentor_program_membership_id uuid not null references public.mentor_program_memberships(id) on delete cascade,
  mentor_availability_rule_id uuid references public.mentor_availability_rules(id) on delete set null,
  session_type public.mentor_session_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  is_available boolean not null default true,
  capacity integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_availability_slots_time_check check (ends_at > starts_at),
  constraint mentor_availability_slots_capacity_check check (capacity > 0)
);

create table public.mentor_booking_requests (
  id uuid primary key default gen_random_uuid(),
  mentor_program_membership_id uuid not null references public.mentor_program_memberships(id) on delete cascade,
  mentor_availability_slot_id uuid references public.mentor_availability_slots(id) on delete set null,
  program_id uuid not null references public.programs(id) on delete cascade,
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  session_type public.mentor_session_type not null,
  status public.mentor_booking_status not null default 'requested',
  requested_starts_at timestamptz not null,
  requested_ends_at timestamptz not null,
  session_goals text,
  request_metadata jsonb not null default '{}'::jsonb,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_booking_requests_time_check check (requested_ends_at > requested_starts_at)
);

create table public.mentor_sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_booking_request_id uuid references public.mentor_booking_requests(id) on delete set null,
  mentor_program_membership_id uuid not null references public.mentor_program_memberships(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  session_type public.mentor_session_type not null,
  status public.mentor_booking_status not null default 'confirmed',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  session_context jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_sessions_time_check check (ends_at > starts_at)
);

create table public.mentor_session_participants (
  id uuid primary key default gen_random_uuid(),
  mentor_session_id uuid not null references public.mentor_sessions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  role_in_session text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mentor_session_participants_target_check check (
    user_id is not null or team_id is not null
  )
);

create table public.mentor_session_notes (
  id uuid primary key default gen_random_uuid(),
  mentor_session_id uuid not null references public.mentor_sessions(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  visibility public.mentor_note_visibility not null default 'private_mentor',
  note_type text not null,
  content text not null,
  structured_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.mentor_match_runs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  status public.mentor_match_run_status not null default 'queued',
  run_scope text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.mentor_match_recommendations (
  id uuid primary key default gen_random_uuid(),
  mentor_match_run_id uuid not null references public.mentor_match_runs(id) on delete cascade,
  mentor_program_membership_id uuid not null references public.mentor_program_memberships(id) on delete cascade,
  participant_user_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  status public.mentor_match_status not null default 'suggested',
  reasoning_summary text,
  score numeric(5,4),
  recommendation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_match_recommendations_target_check check (
    participant_user_id is not null or team_id is not null
  ),
  constraint mentor_match_recommendations_score_check check (
    score is null or (score >= 0 and score <= 1)
  )
);

create table public.mentor_feedback (
  id uuid primary key default gen_random_uuid(),
  mentor_session_id uuid not null references public.mentor_sessions(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null,
  subject_user_id uuid references public.profiles(id) on delete set null,
  status public.mentor_feedback_status not null default 'pending',
  rating integer,
  feedback_text text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mentor_feedback_rating_check check (
    rating is null or (rating >= 1 and rating <= 5)
  )
);

create index mentor_profiles_user_idx
  on public.mentor_profiles (user_id);

create index mentor_expertise_tags_profile_idx
  on public.mentor_expertise_tags (mentor_profile_id, tag_type, tag_value);

create index mentor_program_memberships_program_idx
  on public.mentor_program_memberships (program_id, status, updated_at desc);

create index mentor_program_memberships_profile_idx
  on public.mentor_program_memberships (mentor_profile_id, status, updated_at desc);

create index mentor_availability_rules_membership_idx
  on public.mentor_availability_rules (mentor_program_membership_id, session_type, active);

create index mentor_availability_slots_membership_idx
  on public.mentor_availability_slots (mentor_program_membership_id, starts_at, ends_at);

create index mentor_availability_slots_rule_idx
  on public.mentor_availability_slots (mentor_availability_rule_id, starts_at, ends_at);

create index mentor_booking_requests_membership_idx
  on public.mentor_booking_requests (mentor_program_membership_id, status, requested_starts_at desc);

create index mentor_booking_requests_program_idx
  on public.mentor_booking_requests (program_id, status, requested_starts_at desc);

create index mentor_booking_requests_requester_idx
  on public.mentor_booking_requests (requester_user_id, status, requested_starts_at desc);

create index mentor_sessions_membership_idx
  on public.mentor_sessions (mentor_program_membership_id, status, starts_at desc);

create index mentor_sessions_program_idx
  on public.mentor_sessions (program_id, status, starts_at desc);

create index mentor_session_participants_session_idx
  on public.mentor_session_participants (mentor_session_id, created_at);

create index mentor_session_notes_session_idx
  on public.mentor_session_notes (mentor_session_id, visibility, created_at desc);

create index mentor_match_runs_program_idx
  on public.mentor_match_runs (program_id, status, created_at desc);

create index mentor_match_recommendations_run_idx
  on public.mentor_match_recommendations (mentor_match_run_id, status, created_at desc);

create index mentor_match_recommendations_membership_idx
  on public.mentor_match_recommendations (mentor_program_membership_id, status, created_at desc);

create index mentor_feedback_session_idx
  on public.mentor_feedback (mentor_session_id, status, created_at desc);

create trigger mentor_profiles_set_updated_at
before update on public.mentor_profiles
for each row execute function public.set_updated_at();

create trigger mentor_program_memberships_set_updated_at
before update on public.mentor_program_memberships
for each row execute function public.set_updated_at();

create trigger mentor_availability_rules_set_updated_at
before update on public.mentor_availability_rules
for each row execute function public.set_updated_at();

create trigger mentor_availability_slots_set_updated_at
before update on public.mentor_availability_slots
for each row execute function public.set_updated_at();

create trigger mentor_booking_requests_set_updated_at
before update on public.mentor_booking_requests
for each row execute function public.set_updated_at();

create trigger mentor_sessions_set_updated_at
before update on public.mentor_sessions
for each row execute function public.set_updated_at();

create trigger mentor_session_notes_set_updated_at
before update on public.mentor_session_notes
for each row execute function public.set_updated_at();

create trigger mentor_match_runs_set_updated_at
before update on public.mentor_match_runs
for each row execute function public.set_updated_at();

create trigger mentor_match_recommendations_set_updated_at
before update on public.mentor_match_recommendations
for each row execute function public.set_updated_at();

create trigger mentor_feedback_set_updated_at
before update on public.mentor_feedback
for each row execute function public.set_updated_at();
