alter table public.push_tokens
  drop constraint if exists push_tokens_platform_check;

alter table public.push_tokens
  add constraint push_tokens_platform_check
  check (platform in ('ios', 'android'));

alter table public.feeding_reminder_deliveries
  add column if not exists provider_message_id text;
