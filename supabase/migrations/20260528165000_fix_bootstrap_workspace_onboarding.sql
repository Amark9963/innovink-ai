create or replace function public.bootstrap_workspace_onboarding(
  organization_name_input text,
  organization_slug_input citext,
  workspace_name_input text,
  workspace_slug_input citext,
  billing_email_input citext default null
)
returns table (
  organization_id uuid,
  workspace_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  new_organization_id uuid;
  new_workspace_id uuid;
begin
  if actor_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  insert into public.organizations (
    name,
    slug,
    billing_email,
    created_by
  )
  values (
    organization_name_input,
    organization_slug_input,
    billing_email_input,
    actor_user_id
  )
  returning id into new_organization_id;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role,
    status
  )
  values (
    new_organization_id,
    actor_user_id,
    'organization_owner',
    'active'
  );

  insert into public.workspaces (
    organization_id,
    name,
    slug,
    created_by
  )
  values (
    new_organization_id,
    workspace_name_input,
    workspace_slug_input,
    actor_user_id
  )
  returning id into new_workspace_id;

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role,
    status
  )
  values (
    new_workspace_id,
    actor_user_id,
    'workspace_admin',
    'active'
  );

  insert into public.audit_logs (
    actor_user_id,
    scope,
    organization_id,
    workspace_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values
    (
      actor_user_id,
      'organization',
      new_organization_id,
      null,
      'organization.created',
      'organizations',
      new_organization_id,
      jsonb_build_object('name', organization_name_input, 'slug', organization_slug_input)
    ),
    (
      actor_user_id,
      'workspace',
      new_organization_id,
      new_workspace_id,
      'workspace.created',
      'workspaces',
      new_workspace_id,
      jsonb_build_object('name', workspace_name_input, 'slug', workspace_slug_input)
    );

  return query
  select new_organization_id, new_workspace_id;
end;
$$;

grant execute on function public.bootstrap_workspace_onboarding(text, citext, text, citext, citext) to authenticated;
