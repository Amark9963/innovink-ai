create or replace function public.can_view_communication_scope(
  check_scope_type public.communication_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
  check_program_id uuid default null,
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
    or (
      check_scope_type = 'organization'
      and check_organization_id is not null
      and exists (
        select 1
        from public.organization_memberships om
        where om.organization_id = check_organization_id
          and om.user_id = check_user_id
          and om.status = 'active'
      )
    )
    or (
      check_scope_type = 'workspace'
      and check_workspace_id is not null
      and public.is_workspace_member(check_workspace_id, check_user_id)
    )
    or (
      check_scope_type = 'program'
      and check_program_id is not null
      and public.can_view_program(check_program_id, check_user_id)
    );
$$;

create or replace function public.can_manage_communication_scope(
  check_scope_type public.communication_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
  check_program_id uuid default null,
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
    or (
      check_scope_type = 'organization'
      and check_organization_id is not null
      and (
        public.is_organization_owner(check_organization_id, check_user_id)
        or public.is_organization_admin(check_organization_id, check_user_id)
      )
    )
    or (
      check_scope_type = 'workspace'
      and check_workspace_id is not null
      and (
        public.is_workspace_admin(check_workspace_id, check_user_id)
        or public.is_workspace_operator(check_workspace_id, check_user_id)
        or public.is_communications_manager(check_workspace_id, check_user_id)
      )
    )
    or (
      check_scope_type = 'program'
      and check_program_id is not null
      and (
        public.is_program_manager(check_program_id, check_user_id)
        or public.can_manage_control_scope(
          check_organization_id,
          check_workspace_id,
          check_program_id,
          check_user_id
        )
      )
    );
$$;

create or replace function public.can_approve_communication(
  check_scope_type public.communication_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
  check_program_id uuid default null,
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
    or (
      check_scope_type = 'organization'
      and check_organization_id is not null
      and (
        public.is_organization_owner(check_organization_id, check_user_id)
        or public.is_organization_admin(check_organization_id, check_user_id)
      )
    )
    or (
      check_scope_type = 'workspace'
      and check_workspace_id is not null
      and public.is_workspace_admin(check_workspace_id, check_user_id)
    )
    or (
      check_scope_type = 'program'
      and check_program_id is not null
      and public.is_program_manager(check_program_id, check_user_id)
    );
$$;

create or replace function public.can_view_notification_item(
  check_user_id_target uuid,
  check_scope_type public.communication_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
  check_program_id uuid default null,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    check_user_id_target = check_user_id
    or public.is_platform_super_admin(check_user_id)
    or public.can_manage_communication_scope(
      check_scope_type,
      check_organization_id,
      check_workspace_id,
      check_program_id,
      check_user_id
    );
$$;

create or replace function public.log_communication_event(
  check_scope_type public.communication_scope_type,
  check_organization_id uuid default null,
  check_workspace_id uuid default null,
  check_program_id uuid default null,
  check_campaign_id uuid default null,
  check_message_id uuid default null,
  check_delivery_id uuid default null,
  check_event_type public.communication_event_type default 'message_created',
  check_event_payload jsonb default '{}'::jsonb,
  check_actor_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.communication_events (
    scope_type,
    organization_id,
    workspace_id,
    program_id,
    communication_campaign_id,
    communication_message_id,
    communication_delivery_id,
    event_type,
    event_payload,
    actor_user_id
  )
  values (
    check_scope_type,
    check_organization_id,
    check_workspace_id,
    check_program_id,
    check_campaign_id,
    check_message_id,
    check_delivery_id,
    check_event_type,
    coalesce(check_event_payload, '{}'::jsonb),
    check_actor_user_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

alter table public.communication_templates enable row level security;
alter table public.communication_campaigns enable row level security;
alter table public.communication_messages enable row level security;
alter table public.communication_recipients enable row level security;
alter table public.communication_deliveries enable row level security;
alter table public.communication_segments enable row level security;
alter table public.communication_events enable row level security;
alter table public.notification_inbox_items enable row level security;

create policy "communication_templates_select"
on public.communication_templates
for select
using (
  public.can_view_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_templates_insert"
on public.communication_templates
for insert
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_templates_update"
on public.communication_templates
for update
using (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
)
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_templates_delete"
on public.communication_templates
for delete
using (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_campaigns_select"
on public.communication_campaigns
for select
using (
  public.can_view_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_campaigns_insert"
on public.communication_campaigns
for insert
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_campaigns_update"
on public.communication_campaigns
for update
using (
  public.can_view_communication_scope(scope_type, organization_id, workspace_id, program_id)
)
with check (
  (
    public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
    and status in ('draft', 'pending_approval', 'scheduled', 'cancelled', 'failed', 'completed', 'sending', 'approved')
  )
  or public.can_approve_communication(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_messages_select"
on public.communication_messages
for select
using (
  public.can_view_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_messages_insert"
on public.communication_messages
for insert
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_messages_update"
on public.communication_messages
for update
using (
  public.can_view_communication_scope(scope_type, organization_id, workspace_id, program_id)
)
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
  or public.can_approve_communication(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_recipients_select"
on public.communication_recipients
for select
using (
  exists (
    select 1
    from public.communication_messages m
    where m.id = communication_message_id
      and public.can_view_communication_scope(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
  )
);

create policy "communication_recipients_insert"
on public.communication_recipients
for insert
with check (
  exists (
    select 1
    from public.communication_messages m
    where m.id = communication_message_id
      and public.can_manage_communication_scope(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
  )
);

create policy "communication_recipients_update"
on public.communication_recipients
for update
using (
  exists (
    select 1
    from public.communication_messages m
    where m.id = communication_message_id
      and public.can_manage_communication_scope(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
  )
)
with check (
  exists (
    select 1
    from public.communication_messages m
    where m.id = communication_message_id
      and public.can_manage_communication_scope(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
  )
);

create policy "communication_deliveries_select"
on public.communication_deliveries
for select
using (
  exists (
    select 1
    from public.communication_messages m
    where m.id = communication_message_id
      and public.can_view_communication_scope(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
  )
);

create policy "communication_deliveries_insert"
on public.communication_deliveries
for insert
with check (
  exists (
    select 1
    from public.communication_messages m
    where m.id = communication_message_id
      and public.can_manage_communication_scope(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
  )
);

create policy "communication_deliveries_update"
on public.communication_deliveries
for update
using (
  exists (
    select 1
    from public.communication_messages m
    where m.id = communication_message_id
      and public.can_view_communication_scope(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
  )
)
with check (
  exists (
    select 1
    from public.communication_messages m
    where m.id = communication_message_id
      and (
        public.can_manage_communication_scope(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
        or public.can_approve_communication(m.scope_type, m.organization_id, m.workspace_id, m.program_id)
      )
  )
);

create policy "communication_segments_select"
on public.communication_segments
for select
using (
  public.can_view_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_segments_insert"
on public.communication_segments
for insert
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_segments_update"
on public.communication_segments
for update
using (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
)
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_segments_delete"
on public.communication_segments
for delete
using (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_events_select"
on public.communication_events
for select
using (
  public.can_view_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "communication_events_insert"
on public.communication_events
for insert
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
);

create policy "notification_inbox_items_select"
on public.notification_inbox_items
for select
using (
  public.can_view_notification_item(user_id, scope_type, organization_id, workspace_id, program_id)
);

create policy "notification_inbox_items_insert"
on public.notification_inbox_items
for insert
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
  or user_id = auth.uid()
);

create policy "notification_inbox_items_update"
on public.notification_inbox_items
for update
using (
  public.can_view_notification_item(user_id, scope_type, organization_id, workspace_id, program_id)
)
with check (
  public.can_manage_communication_scope(scope_type, organization_id, workspace_id, program_id)
  or user_id = auth.uid()
);
