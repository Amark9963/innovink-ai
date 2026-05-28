create or replace function public.bootstrap_landing_page_draft(
  program_id_input uuid
)
returns table (
  landing_page_id uuid,
  landing_page_version_id uuid,
  version_number integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user uuid := auth.uid();
  current_landing_page_id uuid;
  next_version integer;
  new_version_id uuid;
  program_name text;
begin
  if current_user is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_program_manager(program_id_input, current_user) then
    raise exception 'Insufficient privileges to manage this landing page'
      using errcode = '42501';
  end if;

  select p.name
  into program_name
  from public.programs p
  where p.id = program_id_input;

  if program_name is null then
    raise exception 'Program not found'
      using errcode = 'P0002';
  end if;

  select lp.id
  into current_landing_page_id
  from public.landing_pages lp
  where lp.program_id = program_id_input;

  if current_landing_page_id is null then
    insert into public.landing_pages (
      program_id,
      title,
      seo_title,
      created_by
    )
    values (
      program_id_input,
      program_name,
      program_name || ' | Innovink',
      current_user
    )
    returning id into current_landing_page_id;
  end if;

  select coalesce(max(lpv.version_number), 0) + 1
  into next_version
  from public.landing_page_versions lpv
  where lpv.landing_page_id = current_landing_page_id;

  insert into public.landing_page_versions (
    landing_page_id,
    version_number,
    status,
    content,
    created_by
  )
  values (
    current_landing_page_id,
    next_version,
    'draft',
    jsonb_build_object(
      'program_id', program_id_input,
      'generation_source', 'ai_workflow'
    ),
    current_user
  )
  returning id into new_version_id;

  return query
  select current_landing_page_id, new_version_id, next_version;
end;
$$;

grant execute on function public.bootstrap_landing_page_draft(uuid) to authenticated;

create or replace function public.publish_landing_page_version(
  program_id_input uuid,
  landing_page_version_id_input uuid,
  published_slug_input citext
)
returns table (
  published_page_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user uuid := auth.uid();
  current_landing_page_id uuid;
  organization_scope_id uuid;
  workspace_scope_id uuid;
  new_published_page_id uuid;
begin
  if current_user is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.is_program_manager(program_id_input, current_user) then
    raise exception 'Insufficient privileges to publish this landing page'
      using errcode = '42501';
  end if;

  select lp.id, p.workspace_id, w.organization_id
  into current_landing_page_id, workspace_scope_id, organization_scope_id
  from public.landing_page_versions lpv
  join public.landing_pages lp on lp.id = lpv.landing_page_id
  join public.programs p on p.id = lp.program_id
  join public.workspaces w on w.id = p.workspace_id
  where lpv.id = landing_page_version_id_input
    and lp.program_id = program_id_input;

  if current_landing_page_id is null then
    raise exception 'Landing page version not found for the program'
      using errcode = 'P0002';
  end if;

  update public.published_pages
  set is_active = false
  where program_id = program_id_input
    and is_active = true;

  update public.landing_page_versions
  set status = case
    when id = landing_page_version_id_input then 'published'
    when status = 'published' then 'archived'
    else status
  end
  where landing_page_id = current_landing_page_id
    and (id = landing_page_version_id_input or status = 'published');

  insert into public.published_pages (
    program_id,
    landing_page_id,
    landing_page_version_id,
    slug,
    published_by,
    is_active
  )
  values (
    program_id_input,
    current_landing_page_id,
    landing_page_version_id_input,
    published_slug_input,
    current_user,
    true
  )
  returning id into new_published_page_id;

  update public.landing_pages
  set
    published_version_id = landing_page_version_id_input,
    published_slug = published_slug_input,
    published_at = timezone('utc', now()),
    published_by = current_user
  where id = current_landing_page_id;

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
    workspace_scope_id,
    program_id_input,
    'landing_page.published',
    'landing_page_version',
    landing_page_version_id_input,
    jsonb_build_object(
      'published_slug', published_slug_input,
      'published_page_id', new_published_page_id
    )
  );

  return query
  select new_published_page_id;
end;
$$;

grant execute on function public.publish_landing_page_version(uuid, uuid, citext) to authenticated;
