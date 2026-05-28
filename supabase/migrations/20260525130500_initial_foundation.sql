create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.organization_membership_role as enum (
  'organization_owner'
);

create type public.workspace_membership_role as enum (
  'workspace_admin'
);

create type public.program_membership_role as enum (
  'program_manager',
  'judge',
  'sponsor',
  'participant',
  'team_lead'
);

create type public.membership_status as enum (
  'invited',
  'active',
  'suspended',
  'revoked'
);

create type public.program_status as enum (
  'draft',
  'configured',
  'published',
  'in_review',
  'completed',
  'archived'
);

create type public.visibility_scope as enum (
  'private',
  'workspace',
  'organization',
  'public'
);

create type public.audit_scope as enum (
  'platform',
  'organization',
  'workspace',
  'program'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique,
  full_name text,
  avatar_url text,
  is_platform_super_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  billing_email citext,
  primary_color text,
  logo_path text,
  ai_enabled boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organizations_name_not_blank check (char_length(trim(name)) > 0),
  constraint organizations_slug_not_blank check (char_length(trim(slug::text)) > 0)
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_membership_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug citext not null,
  description text,
  branding_config jsonb not null default '{}'::jsonb,
  ai_settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug),
  constraint workspaces_name_not_blank check (char_length(trim(name)) > 0),
  constraint workspaces_slug_not_blank check (char_length(trim(slug::text)) > 0)
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_membership_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug citext not null,
  program_type text not null,
  short_description text,
  long_description text,
  status public.program_status not null default 'draft',
  visibility public.visibility_scope not null default 'private',
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  submission_closes_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  published_at timestamptz,
  published_by uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, slug),
  constraint programs_name_not_blank check (char_length(trim(name)) > 0),
  constraint programs_slug_not_blank check (char_length(trim(slug::text)) > 0)
);

create table public.program_memberships (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.program_membership_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (program_id, user_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  scope public.audit_scope not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  event_name text not null,
  event_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index organizations_created_by_idx on public.organizations (created_by);
create index organization_memberships_user_idx on public.organization_memberships (user_id);
create index organization_memberships_org_idx on public.organization_memberships (organization_id);
create index workspaces_org_idx on public.workspaces (organization_id);
create index workspace_memberships_user_idx on public.workspace_memberships (user_id);
create index workspace_memberships_workspace_idx on public.workspace_memberships (workspace_id);
create index programs_workspace_idx on public.programs (workspace_id);
create index program_memberships_user_idx on public.program_memberships (user_id);
create index program_memberships_program_idx on public.program_memberships (program_id);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_workspace_idx on public.audit_logs (workspace_id, created_at desc);
create index audit_logs_program_idx on public.audit_logs (program_id, created_at desc);
create index activity_logs_org_idx on public.activity_logs (organization_id, created_at desc);
create index activity_logs_workspace_idx on public.activity_logs (workspace_id, created_at desc);
create index activity_logs_program_idx on public.activity_logs (program_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger workspace_memberships_set_updated_at
before update on public.workspace_memberships
for each row execute function public.set_updated_at();

create trigger programs_set_updated_at
before update on public.programs
for each row execute function public.set_updated_at();

create trigger program_memberships_set_updated_at
before update on public.program_memberships
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function public.is_platform_super_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_user_id
      and p.is_platform_super_admin = true
  );
$$;

create or replace function public.is_organization_owner(check_organization_id uuid, check_user_id uuid default auth.uid())
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
      and om.role = 'organization_owner'
      and om.status = 'active'
  );
$$;

create or replace function public.is_workspace_admin(check_workspace_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_super_admin(check_user_id)
    or exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = check_workspace_id
        and wm.user_id = check_user_id
        and wm.role = 'workspace_admin'
        and wm.status = 'active'
    )
    or exists (
      select 1
      from public.workspaces w
      where w.id = check_workspace_id
        and public.is_organization_owner(w.organization_id, check_user_id)
    );
$$;

create or replace function public.is_workspace_member(check_workspace_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_workspace_admin(check_workspace_id, check_user_id)
    or exists (
      select 1
      from public.workspace_memberships wm
      where wm.workspace_id = check_workspace_id
        and wm.user_id = check_user_id
        and wm.status = 'active'
    );
$$;

create or replace function public.is_program_role(
  check_program_id uuid,
  expected_role public.program_membership_role,
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
    from public.program_memberships pm
    where pm.program_id = check_program_id
      and pm.user_id = check_user_id
      and pm.role = expected_role
      and pm.status = 'active'
  );
$$;

create or replace function public.is_program_manager(check_program_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_super_admin(check_user_id)
    or public.is_program_role(check_program_id, 'program_manager', check_user_id)
    or exists (
      select 1
      from public.programs p
      where p.id = check_program_id
        and public.is_organization_owner(
          (select w.organization_id from public.workspaces w where w.id = p.workspace_id),
          check_user_id
        )
    );
$$;

create or replace function public.can_view_program(check_program_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.programs p
    where p.id = check_program_id
      and (
        public.is_program_manager(check_program_id, check_user_id)
        or public.is_workspace_member(p.workspace_id, check_user_id)
        or exists (
          select 1
          from public.program_memberships pm
          where pm.program_id = check_program_id
            and pm.user_id = check_user_id
            and pm.status = 'active'
        )
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.programs enable row level security;
alter table public.program_memberships enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles_select_self_or_platform_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_platform_super_admin()
);

create policy "profiles_update_self_or_platform_admin"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_platform_super_admin()
)
with check (
  id = auth.uid()
  or public.is_platform_super_admin()
);

create policy "organizations_select_visible_to_members"
on public.organizations
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_organization_owner(id)
  or exists (
    select 1
    from public.workspaces w
    join public.workspace_memberships wm on wm.workspace_id = w.id
    where w.organization_id = organizations.id
      and wm.user_id = auth.uid()
      and wm.status = 'active'
  )
);

create policy "organizations_insert_authenticated_creator"
on public.organizations
for insert
to authenticated
with check (
  created_by = auth.uid()
);

create policy "organizations_update_org_owner"
on public.organizations
for update
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_organization_owner(id)
)
with check (
  public.is_platform_super_admin()
  or public.is_organization_owner(id)
);

create policy "organization_memberships_select_self_or_org_owner"
on public.organization_memberships
for select
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or public.is_organization_owner(organization_id)
);

create policy "organization_memberships_manage_org_owner"
on public.organization_memberships
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_organization_owner(organization_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_organization_owner(organization_id)
);

create policy "workspaces_select_visible_to_members"
on public.workspaces
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_workspace_member(id)
  or public.is_organization_owner(organization_id)
);

create policy "workspaces_insert_org_owner_or_workspace_admin"
on public.workspaces
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_platform_super_admin()
    or public.is_organization_owner(organization_id)
  )
);

create policy "workspaces_update_workspace_admin_or_org_owner"
on public.workspaces
for update
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_workspace_admin(id)
)
with check (
  public.is_platform_super_admin()
  or public.is_workspace_admin(id)
);

create policy "workspace_memberships_select_visible_to_self_admins"
on public.workspace_memberships
for select
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or public.is_workspace_admin(workspace_id)
);

create policy "workspace_memberships_manage_workspace_admin"
on public.workspace_memberships
for all
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_workspace_admin(workspace_id)
)
with check (
  public.is_platform_super_admin()
  or public.is_workspace_admin(workspace_id)
);

create policy "programs_select_visible_to_scope"
on public.programs
for select
to authenticated
using (
  public.is_platform_super_admin()
  or public.can_view_program(id)
);

create policy "programs_insert_workspace_admin_or_org_owner"
on public.programs
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_platform_super_admin()
    or public.is_workspace_admin(workspace_id)
  )
);

create policy "programs_update_program_manager_or_org_owner"
on public.programs
for update
to authenticated
using (
  public.is_platform_super_admin()
  or public.is_program_manager(id)
)
with check (
  public.is_platform_super_admin()
  or public.is_program_manager(id)
);

create policy "program_memberships_select_visible_to_scope"
on public.program_memberships
for select
to authenticated
using (
  public.is_platform_super_admin()
  or user_id = auth.uid()
  or public.is_program_manager(program_id)
  or exists (
    select 1
    from public.programs p
    where p.id = program_memberships.program_id
      and public.is_workspace_admin(p.workspace_id)
  )
);

create policy "program_memberships_manage_program_manager"
on public.program_memberships
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

create policy "audit_logs_select_admins_only"
on public.audit_logs
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

create policy "audit_logs_insert_authenticated_actor"
on public.audit_logs
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  or public.is_platform_super_admin()
);

create policy "activity_logs_select_visible_to_scope"
on public.activity_logs
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
    and public.is_workspace_member(workspace_id)
  )
  or (
    program_id is not null
    and public.can_view_program(program_id)
  )
);

create policy "activity_logs_insert_authenticated_actor"
on public.activity_logs
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  or public.is_platform_super_admin()
);
