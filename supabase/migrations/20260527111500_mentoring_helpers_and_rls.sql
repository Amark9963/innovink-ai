create or replace function public.can_manage_mentoring_program(
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
    or public.is_program_manager(check_program_id, check_user_id)
    or public.is_mentor_manager(check_program_id, check_user_id)
    or exists (
      select 1
      from public.programs p
      where p.id = check_program_id
        and (
          public.is_workspace_admin(p.workspace_id, check_user_id)
          or public.is_workspace_operator(p.workspace_id, check_user_id)
        )
    );
$$;

create or replace function public.can_view_mentoring_program(
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
    public.can_manage_mentoring_program(check_program_id, check_user_id)
    or public.can_view_program(check_program_id, check_user_id);
$$;

create or replace function public.is_mentor_membership_owner(
  check_mentor_program_membership_id uuid,
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
    from public.mentor_program_memberships mpm
    join public.mentor_profiles mp on mp.id = mpm.mentor_profile_id
    where mpm.id = check_mentor_program_membership_id
      and mp.user_id = check_user_id
  );
$$;

create or replace function public.can_view_mentor_session(
  check_session_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.mentor_sessions ms
      where ms.id = check_session_id
        and public.can_manage_mentoring_program(ms.program_id, check_user_id)
    )
    or exists (
      select 1
      from public.mentor_sessions ms
      join public.mentor_program_memberships mpm on mpm.id = ms.mentor_program_membership_id
      join public.mentor_profiles mp on mp.id = mpm.mentor_profile_id
      where ms.id = check_session_id
        and mp.user_id = check_user_id
    )
    or exists (
      select 1
      from public.mentor_session_participants msp
      where msp.mentor_session_id = check_session_id
        and (
          msp.user_id = check_user_id
          or (
            msp.team_id is not null
            and exists (
              select 1
              from public.team_members tm
              where tm.team_id = msp.team_id
                and tm.user_id = check_user_id
            )
          )
        )
    );
$$;

create or replace function public.can_review_mentor_match(
  check_program_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_mentoring_program(check_program_id, check_user_id);
$$;

alter table public.mentor_profiles enable row level security;
alter table public.mentor_expertise_tags enable row level security;
alter table public.mentor_program_memberships enable row level security;
alter table public.mentor_availability_rules enable row level security;
alter table public.mentor_availability_slots enable row level security;
alter table public.mentor_booking_requests enable row level security;
alter table public.mentor_sessions enable row level security;
alter table public.mentor_session_participants enable row level security;
alter table public.mentor_session_notes enable row level security;
alter table public.mentor_match_runs enable row level security;
alter table public.mentor_match_recommendations enable row level security;
alter table public.mentor_feedback enable row level security;

create policy "mentor_profiles_select"
on public.mentor_profiles
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.mentor_profile_id = id
      and public.can_view_mentoring_program(mpm.program_id)
  )
);

create policy "mentor_profiles_insert"
on public.mentor_profiles
for insert
with check (
  user_id = auth.uid() or public.is_platform_super_admin()
);

create policy "mentor_profiles_update"
on public.mentor_profiles
for update
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.mentor_profile_id = id
      and public.can_manage_mentoring_program(mpm.program_id)
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.mentor_profile_id = id
      and public.can_manage_mentoring_program(mpm.program_id)
  )
);

create policy "mentor_expertise_tags_select"
on public.mentor_expertise_tags
for select
using (
  exists (
    select 1
    from public.mentor_profiles mp
    where mp.id = mentor_profile_id
      and (
        mp.user_id = auth.uid()
        or exists (
          select 1
          from public.mentor_program_memberships mpm
          where mpm.mentor_profile_id = mp.id
            and public.can_view_mentoring_program(mpm.program_id)
        )
      )
  )
);

create policy "mentor_expertise_tags_insert"
on public.mentor_expertise_tags
for insert
with check (
  exists (
    select 1
    from public.mentor_profiles mp
    where mp.id = mentor_profile_id
      and mp.user_id = auth.uid()
  )
);

create policy "mentor_expertise_tags_update"
on public.mentor_expertise_tags
for update
using (
  exists (
    select 1
    from public.mentor_profiles mp
    where mp.id = mentor_profile_id
      and mp.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.mentor_profiles mp
    where mp.id = mentor_profile_id
      and mp.user_id = auth.uid()
  )
);

create policy "mentor_program_memberships_select"
on public.mentor_program_memberships
for select
using (
  public.can_view_mentoring_program(program_id)
  or public.is_mentor_membership_owner(id)
);

create policy "mentor_program_memberships_insert"
on public.mentor_program_memberships
for insert
with check (
  public.can_manage_mentoring_program(program_id)
);

create policy "mentor_program_memberships_update"
on public.mentor_program_memberships
for update
using (
  public.can_manage_mentoring_program(program_id)
  or public.is_mentor_membership_owner(id)
)
with check (
  public.can_manage_mentoring_program(program_id)
  or public.is_mentor_membership_owner(id)
);

create policy "mentor_availability_rules_select"
on public.mentor_availability_rules
for select
using (
  public.is_mentor_membership_owner(mentor_program_membership_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.can_view_mentoring_program(mpm.program_id)
  )
);

create policy "mentor_availability_rules_insert"
on public.mentor_availability_rules
for insert
with check (
  public.is_mentor_membership_owner(mentor_program_membership_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.can_manage_mentoring_program(mpm.program_id)
  )
);

create policy "mentor_availability_rules_update"
on public.mentor_availability_rules
for update
using (
  public.is_mentor_membership_owner(mentor_program_membership_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.can_manage_mentoring_program(mpm.program_id)
  )
)
with check (
  public.is_mentor_membership_owner(mentor_program_membership_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.can_manage_mentoring_program(mpm.program_id)
  )
);

create policy "mentor_availability_slots_select"
on public.mentor_availability_slots
for select
using (
  public.is_mentor_membership_owner(mentor_program_membership_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.can_view_mentoring_program(mpm.program_id)
  )
);

create policy "mentor_availability_slots_insert"
on public.mentor_availability_slots
for insert
with check (
  public.is_mentor_membership_owner(mentor_program_membership_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.can_manage_mentoring_program(mpm.program_id)
  )
);

create policy "mentor_availability_slots_update"
on public.mentor_availability_slots
for update
using (
  public.is_mentor_membership_owner(mentor_program_membership_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.can_manage_mentoring_program(mpm.program_id)
  )
)
with check (
  public.is_mentor_membership_owner(mentor_program_membership_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.can_manage_mentoring_program(mpm.program_id)
  )
);

create policy "mentor_booking_requests_select"
on public.mentor_booking_requests
for select
using (
  public.can_view_mentoring_program(program_id)
  or requester_user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.is_mentor_membership_owner(mpm.id)
  )
  or (
    team_id is not null
    and exists (
      select 1
      from public.team_members tm
      where tm.team_id = team_id
        and tm.user_id = auth.uid()
    )
  )
);

create policy "mentor_booking_requests_insert"
on public.mentor_booking_requests
for insert
with check (
  requester_user_id = auth.uid()
  or public.can_manage_mentoring_program(program_id)
);

create policy "mentor_booking_requests_update"
on public.mentor_booking_requests
for update
using (
  public.can_view_mentoring_program(program_id)
  or requester_user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.is_mentor_membership_owner(mpm.id)
  )
)
with check (
  public.can_manage_mentoring_program(program_id)
  or exists (
    select 1
    from public.mentor_program_memberships mpm
    where mpm.id = mentor_program_membership_id
      and public.is_mentor_membership_owner(mpm.id)
  )
  or requester_user_id = auth.uid()
);

create policy "mentor_sessions_select"
on public.mentor_sessions
for select
using (
  public.can_view_mentor_session(id)
);

create policy "mentor_sessions_insert"
on public.mentor_sessions
for insert
with check (
  public.can_manage_mentoring_program(program_id)
  or public.is_mentor_membership_owner(mentor_program_membership_id)
);

create policy "mentor_sessions_update"
on public.mentor_sessions
for update
using (
  public.can_view_mentor_session(id)
)
with check (
  public.can_manage_mentoring_program(program_id)
  or public.is_mentor_membership_owner(mentor_program_membership_id)
);

create policy "mentor_session_participants_select"
on public.mentor_session_participants
for select
using (
  public.can_view_mentor_session(mentor_session_id)
);

create policy "mentor_session_participants_insert"
on public.mentor_session_participants
for insert
with check (
  public.can_view_mentor_session(mentor_session_id)
);

create policy "mentor_session_participants_update"
on public.mentor_session_participants
for update
using (
  public.can_view_mentor_session(mentor_session_id)
)
with check (
  public.can_view_mentor_session(mentor_session_id)
);

create policy "mentor_session_notes_select"
on public.mentor_session_notes
for select
using (
  public.can_view_mentor_session(mentor_session_id)
  and (
    visibility <> 'private_mentor'
    or author_user_id = auth.uid()
    or exists (
      select 1
      from public.mentor_sessions ms
      where ms.id = mentor_session_id
        and public.can_manage_mentoring_program(ms.program_id)
    )
  )
);

create policy "mentor_session_notes_insert"
on public.mentor_session_notes
for insert
with check (
  public.can_view_mentor_session(mentor_session_id)
  and author_user_id = auth.uid()
);

create policy "mentor_session_notes_update"
on public.mentor_session_notes
for update
using (
  author_user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_sessions ms
    where ms.id = mentor_session_id
      and public.can_manage_mentoring_program(ms.program_id)
  )
)
with check (
  author_user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_sessions ms
    where ms.id = mentor_session_id
      and public.can_manage_mentoring_program(ms.program_id)
  )
);

create policy "mentor_match_runs_select"
on public.mentor_match_runs
for select
using (
  public.can_view_mentoring_program(program_id)
);

create policy "mentor_match_runs_insert"
on public.mentor_match_runs
for insert
with check (
  public.can_manage_mentoring_program(program_id)
);

create policy "mentor_match_runs_update"
on public.mentor_match_runs
for update
using (
  public.can_manage_mentoring_program(program_id)
)
with check (
  public.can_manage_mentoring_program(program_id)
);

create policy "mentor_match_recommendations_select"
on public.mentor_match_recommendations
for select
using (
  exists (
    select 1
    from public.mentor_match_runs mmr
    where mmr.id = mentor_match_run_id
      and public.can_view_mentoring_program(mmr.program_id)
  )
);

create policy "mentor_match_recommendations_insert"
on public.mentor_match_recommendations
for insert
with check (
  exists (
    select 1
    from public.mentor_match_runs mmr
    where mmr.id = mentor_match_run_id
      and public.can_review_mentor_match(mmr.program_id)
  )
);

create policy "mentor_match_recommendations_update"
on public.mentor_match_recommendations
for update
using (
  exists (
    select 1
    from public.mentor_match_runs mmr
    where mmr.id = mentor_match_run_id
      and public.can_review_mentor_match(mmr.program_id)
  )
)
with check (
  exists (
    select 1
    from public.mentor_match_runs mmr
    where mmr.id = mentor_match_run_id
      and public.can_review_mentor_match(mmr.program_id)
  )
);

create policy "mentor_feedback_select"
on public.mentor_feedback
for select
using (
  exists (
    select 1
    from public.mentor_sessions ms
    where ms.id = mentor_session_id
      and public.can_view_mentor_session(ms.id)
  )
);

create policy "mentor_feedback_insert"
on public.mentor_feedback
for insert
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.mentor_sessions ms
    where ms.id = mentor_session_id
      and public.can_view_mentor_session(ms.id)
  )
);

create policy "mentor_feedback_update"
on public.mentor_feedback
for update
using (
  author_user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_sessions ms
    where ms.id = mentor_session_id
      and public.can_manage_mentoring_program(ms.program_id)
  )
)
with check (
  author_user_id = auth.uid()
  or exists (
    select 1
    from public.mentor_sessions ms
    where ms.id = mentor_session_id
      and public.can_manage_mentoring_program(ms.program_id)
  )
);
