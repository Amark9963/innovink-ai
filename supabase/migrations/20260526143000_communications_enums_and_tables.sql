create type public.communication_scope_type as enum (
  'organization',
  'workspace',
  'program'
);

create type public.communication_channel as enum (
  'email',
  'in_app',
  'internal_feed'
);

create type public.communication_template_type as enum (
  'lifecycle',
  'announcement',
  'reminder',
  'transactional',
  'operational'
);

create type public.communication_campaign_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'scheduled',
  'sending',
  'completed',
  'cancelled',
  'failed'
);

create type public.communication_message_status as enum (
  'draft',
  'queued',
  'sent',
  'failed',
  'cancelled'
);

create type public.communication_delivery_status as enum (
  'pending',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed',
  'suppressed'
);

create type public.communication_recipient_type as enum (
  'user',
  'email_address',
  'team',
  'segment_snapshot'
);

create type public.communication_segment_status as enum (
  'draft',
  'active',
  'archived'
);

create type public.notification_item_status as enum (
  'unread',
  'read',
  'archived'
);

create type public.communication_event_type as enum (
  'campaign_created',
  'approval_requested',
  'approval_decided',
  'scheduled',
  'send_started',
  'message_created',
  'delivery_updated',
  'inbox_created',
  'failed',
  'cancelled'
);

create table public.communication_templates (
  id uuid primary key default gen_random_uuid(),
  scope_type public.communication_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  name text not null,
  template_key text not null,
  template_type public.communication_template_type not null,
  channel public.communication_channel not null,
  subject_template text,
  body_template text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint communication_templates_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.communication_campaigns (
  id uuid primary key default gen_random_uuid(),
  scope_type public.communication_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  communication_template_id uuid references public.communication_templates(id) on delete set null,
  campaign_name text not null,
  campaign_type text not null,
  channel public.communication_channel not null,
  status public.communication_campaign_status not null default 'draft',
  audience_summary text,
  segment_snapshot jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint communication_campaigns_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  communication_campaign_id uuid references public.communication_campaigns(id) on delete set null,
  scope_type public.communication_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  channel public.communication_channel not null,
  status public.communication_message_status not null default 'draft',
  subject text,
  body text not null,
  rendered_payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint communication_messages_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_message_id uuid not null references public.communication_messages(id) on delete cascade,
  recipient_type public.communication_recipient_type not null,
  user_id uuid references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  email_address text,
  display_name text,
  segment_key text,
  recipient_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint communication_recipients_identity_check check (
    (recipient_type = 'user' and user_id is not null and team_id is null) or
    (recipient_type = 'email_address' and user_id is null and email_address is not null and team_id is null) or
    (recipient_type = 'team' and user_id is null and team_id is not null and email_address is null) or
    (recipient_type = 'segment_snapshot' and user_id is null and team_id is null)
  )
);

create table public.communication_deliveries (
  id uuid primary key default gen_random_uuid(),
  communication_message_id uuid not null references public.communication_messages(id) on delete cascade,
  communication_recipient_id uuid not null references public.communication_recipients(id) on delete cascade,
  channel public.communication_channel not null,
  status public.communication_delivery_status not null default 'pending',
  provider_message_id text,
  provider_payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.communication_segments (
  id uuid primary key default gen_random_uuid(),
  scope_type public.communication_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  name text not null,
  status public.communication_segment_status not null default 'draft',
  segment_definition jsonb not null default '{}'::jsonb,
  last_resolved_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint communication_segments_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.communication_events (
  id uuid primary key default gen_random_uuid(),
  scope_type public.communication_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  communication_campaign_id uuid references public.communication_campaigns(id) on delete set null,
  communication_message_id uuid references public.communication_messages(id) on delete set null,
  communication_delivery_id uuid references public.communication_deliveries(id) on delete set null,
  event_type public.communication_event_type not null,
  event_payload jsonb not null default '{}'::jsonb,
  actor_user_id uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  constraint communication_events_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create table public.notification_inbox_items (
  id uuid primary key default gen_random_uuid(),
  scope_type public.communication_scope_type not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  program_id uuid references public.programs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  status public.notification_item_status not null default 'unread',
  action_required boolean not null default false,
  deep_link text,
  source_type text,
  source_id uuid,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notification_inbox_items_scope_check check (
    (scope_type = 'organization' and organization_id is not null and workspace_id is null and program_id is null) or
    (scope_type = 'workspace' and organization_id is not null and workspace_id is not null and program_id is null) or
    (scope_type = 'program' and organization_id is not null and workspace_id is not null and program_id is not null)
  )
);

create unique index communication_templates_org_key_unique
  on public.communication_templates (organization_id, template_key, channel)
  where scope_type = 'organization';

create unique index communication_templates_workspace_key_unique
  on public.communication_templates (workspace_id, template_key, channel)
  where scope_type = 'workspace';

create unique index communication_templates_program_key_unique
  on public.communication_templates (program_id, template_key, channel)
  where scope_type = 'program';

create index communication_templates_scope_idx
  on public.communication_templates (scope_type, template_type, updated_at desc);

create index communication_campaigns_scope_idx
  on public.communication_campaigns (scope_type, status, scheduled_for, updated_at desc);

create index communication_campaigns_program_idx
  on public.communication_campaigns (program_id, status, scheduled_for, updated_at desc);

create index communication_messages_campaign_idx
  on public.communication_messages (communication_campaign_id, status, created_at desc);

create index communication_messages_program_idx
  on public.communication_messages (program_id, status, created_at desc);

create index communication_recipients_message_idx
  on public.communication_recipients (communication_message_id, recipient_type);

create index communication_deliveries_message_idx
  on public.communication_deliveries (communication_message_id, status, updated_at desc);

create index communication_deliveries_recipient_idx
  on public.communication_deliveries (communication_recipient_id, status, updated_at desc);

create index communication_segments_scope_idx
  on public.communication_segments (scope_type, status, updated_at desc);

create index communication_segments_program_idx
  on public.communication_segments (program_id, status, updated_at desc);

create index communication_events_campaign_idx
  on public.communication_events (communication_campaign_id, created_at desc);

create index communication_events_message_idx
  on public.communication_events (communication_message_id, created_at desc);

create index communication_events_program_idx
  on public.communication_events (program_id, created_at desc);

create index notification_inbox_items_user_idx
  on public.notification_inbox_items (user_id, status, created_at desc);

create index notification_inbox_items_program_idx
  on public.notification_inbox_items (program_id, status, created_at desc);

create trigger communication_templates_set_updated_at
before update on public.communication_templates
for each row execute function public.set_updated_at();

create trigger communication_campaigns_set_updated_at
before update on public.communication_campaigns
for each row execute function public.set_updated_at();

create trigger communication_messages_set_updated_at
before update on public.communication_messages
for each row execute function public.set_updated_at();

create trigger communication_deliveries_set_updated_at
before update on public.communication_deliveries
for each row execute function public.set_updated_at();

create trigger communication_segments_set_updated_at
before update on public.communication_segments
for each row execute function public.set_updated_at();

create trigger notification_inbox_items_set_updated_at
before update on public.notification_inbox_items
for each row execute function public.set_updated_at();
