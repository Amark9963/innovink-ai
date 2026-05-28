create table public.judge_calibration_exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  scorecard_id uuid not null references public.scorecards(id) on delete cascade,
  title text not null,
  reference_code text,
  instructions text,
  problem_summary text,
  solution_summary text,
  validation_summary text,
  team_summary text,
  pitch_deck_url text,
  demo_url text,
  consensus_total_score numeric(10,2),
  scoring_anchors jsonb not null default '[]'::jsonb,
  manager_note text,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index judge_calibration_exercises_one_active_per_program
  on public.judge_calibration_exercises (program_id)
  where is_active = true;

create index judge_calibration_exercises_program_idx
  on public.judge_calibration_exercises (program_id, created_at desc);

create table public.judge_calibration_submissions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  calibration_exercise_id uuid not null references public.judge_calibration_exercises(id) on delete cascade,
  judge_user_id uuid not null references public.profiles(id) on delete cascade,
  status public.score_entry_status not null default 'draft',
  total_score numeric(10,2),
  notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (calibration_exercise_id, judge_user_id)
);

create index judge_calibration_submissions_program_idx
  on public.judge_calibration_submissions (program_id, judge_user_id);

create index judge_calibration_submissions_exercise_idx
  on public.judge_calibration_submissions (calibration_exercise_id, status);

create table public.judge_calibration_scores (
  id uuid primary key default gen_random_uuid(),
  calibration_submission_id uuid not null references public.judge_calibration_submissions(id) on delete cascade,
  scorecard_criterion_id uuid not null references public.scorecard_criteria(id) on delete cascade,
  numeric_score numeric(10,2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (calibration_submission_id, scorecard_criterion_id)
);

create index judge_calibration_scores_submission_idx
  on public.judge_calibration_scores (calibration_submission_id);

create trigger judge_calibration_exercises_set_updated_at
before update on public.judge_calibration_exercises
for each row execute function public.set_updated_at();

create trigger judge_calibration_submissions_set_updated_at
before update on public.judge_calibration_submissions
for each row execute function public.set_updated_at();

create trigger judge_calibration_scores_set_updated_at
before update on public.judge_calibration_scores
for each row execute function public.set_updated_at();

alter table public.judge_calibration_exercises enable row level security;
alter table public.judge_calibration_submissions enable row level security;
alter table public.judge_calibration_scores enable row level security;

create policy "judge_calibration_exercises_select_scope"
on public.judge_calibration_exercises
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.can_view_program(program_id)
);

create policy "judge_calibration_exercises_manage_program_manager"
on public.judge_calibration_exercises
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

create policy "judge_calibration_submissions_select_scope"
on public.judge_calibration_submissions
for select
to authenticated
using (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "judge_calibration_submissions_insert_scope"
on public.judge_calibration_submissions
for insert
to authenticated
with check (
  public.is_platform_super_admin()
  or judge_user_id = auth.uid()
  or public.is_program_manager(program_id)
);

create policy "judge_calibration_submissions_update_scope"
on public.judge_calibration_submissions
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

create policy "judge_calibration_scores_select_scope"
on public.judge_calibration_scores
for select
to authenticated
using (
  exists (
    select 1
    from public.judge_calibration_submissions jcs
    where jcs.id = judge_calibration_scores.calibration_submission_id
      and (
        public.is_platform_super_admin()
        or jcs.judge_user_id = auth.uid()
        or public.is_program_manager(jcs.program_id)
      )
  )
);

create policy "judge_calibration_scores_manage_scope"
on public.judge_calibration_scores
for all
to authenticated
using (
  exists (
    select 1
    from public.judge_calibration_submissions jcs
    where jcs.id = judge_calibration_scores.calibration_submission_id
      and (
        public.is_platform_super_admin()
        or jcs.judge_user_id = auth.uid()
        or public.is_program_manager(jcs.program_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.judge_calibration_submissions jcs
    where jcs.id = judge_calibration_scores.calibration_submission_id
      and (
        public.is_platform_super_admin()
        or jcs.judge_user_id = auth.uid()
        or public.is_program_manager(jcs.program_id)
      )
  )
);
