create or replace function public.bootstrap_program_creation(
  workspace_id_input uuid,
  name_input text,
  slug_input citext,
  program_type_input text,
  short_description_input text default null,
  visibility_input public.visibility_scope default 'private',
  starts_at_input timestamptz default null,
  registration_opens_at_input timestamptz default null,
  registration_closes_at_input timestamptz default null,
  submission_closes_at_input timestamptz default null,
  ends_at_input timestamptz default null
)
returns table (
  program_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user uuid := auth.uid();
  new_program_id uuid;
  organization_scope_id uuid;
begin
  if current_user is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_workspace_admin(workspace_id_input, current_user) then
    raise exception 'Insufficient privileges to create a program in this workspace'
      using errcode = '42501';
  end if;

  select organization_id
  into organization_scope_id
  from public.workspaces
  where id = workspace_id_input;

  if organization_scope_id is null then
    raise exception 'Workspace not found'
      using errcode = 'P0002';
  end if;

  insert into public.programs (
    workspace_id,
    name,
    slug,
    program_type,
    short_description,
    visibility,
    starts_at,
    registration_opens_at,
    registration_closes_at,
    submission_closes_at,
    ends_at,
    created_by
  )
  values (
    workspace_id_input,
    name_input,
    slug_input,
    program_type_input,
    short_description_input,
    visibility_input,
    starts_at_input,
    registration_opens_at_input,
    registration_closes_at_input,
    submission_closes_at_input,
    ends_at_input,
    current_user
  )
  returning id into new_program_id;

  insert into public.program_memberships (
    program_id,
    user_id,
    role,
    status
  )
  values (
    new_program_id,
    current_user,
    'program_manager',
    'active'
  );

  insert into public.audit_logs (
    actor_user_id,
    scope,
    organization_id,
    workspace_id,
    program_id,
    action,
    entity_type,
    entity_id,
    payload
  )
  values (
    current_user,
    'program',
    organization_scope_id,
    workspace_id_input,
    new_program_id,
    'program.created',
    'program',
    new_program_id,
    jsonb_build_object(
      'name', name_input,
      'slug', slug_input,
      'program_type', program_type_input,
      'visibility', visibility_input
    )
  );

  return query
  select new_program_id;
end;
$$;

grant execute on function public.bootstrap_program_creation(
  uuid,
  text,
  citext,
  text,
  text,
  public.visibility_scope,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
) to authenticated;
