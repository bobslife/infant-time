create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists name text not null default '';

create table if not exists babies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  birth_date date not null,
  gender text not null default 'girl' check (gender in ('girl', 'boy')),
  invite_code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table babies add column if not exists gender text;
update babies set gender = 'girl' where gender is null;
alter table babies alter column gender set default 'girl';
alter table babies alter column gender set not null;
alter table babies drop constraint if exists babies_gender_check;
alter table babies add constraint babies_gender_check check (gender in ('girl', 'boy'));

alter table babies add column if not exists invite_code text;
update babies
set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where invite_code is null or length(invite_code) <> 8;
alter table babies alter column invite_code set not null;
alter table babies alter column invite_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

create table if not exists baby_members (
  baby_id uuid not null references babies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (baby_id, user_id)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  baby_id uuid not null references babies(id) on delete cascade,
  event_type text not null check (event_type in ('feed', 'sleep', 'pee', 'poop', 'diaper', 'medicine', 'temperature', 'meal', 'bath', 'play')),
  occurred_at timestamptz not null,
  ended_at timestamptz,
  amount_ml integer check (amount_ml is null or (amount_ml >= 0 and amount_ml <= 300)),
  diaper_type text check (diaper_type is null or diaper_type in ('wet', 'dirty', 'both')),
  poop_amount text check (poop_amount is null or poop_amount in ('small', 'normal', 'large')),
  poop_color text check (poop_color is null or poop_color in ('ocher', 'brown', 'dark_brown', 'green', 'red_orange')),
  medicine_name text,
  medicine_dose text,
  medicine_next_at timestamptz,
  temperature_c numeric(4,1),
  temperature_location text check (temperature_location is null or temperature_location in ('forehead', 'ear', 'armpit')),
  meal_name text,
  meal_amount_g integer check (meal_amount_g is null or (meal_amount_g >= 0 and meal_amount_g <= 500)),
  meal_reaction text check (meal_reaction is null or meal_reaction in ('good', 'normal', 'poor', 'allergy')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table events add column if not exists diaper_type text;
alter table events add column if not exists medicine_name text;
alter table events add column if not exists medicine_dose text;
alter table events add column if not exists medicine_next_at timestamptz;
alter table events add column if not exists temperature_c numeric(4,1);
alter table events add column if not exists temperature_location text;
alter table events add column if not exists meal_name text;
alter table events add column if not exists meal_amount_g integer;
alter table events add column if not exists meal_reaction text;
alter table events drop constraint if exists events_event_type_check;
alter table events add constraint events_event_type_check check (event_type in ('feed', 'sleep', 'pee', 'poop', 'diaper', 'medicine', 'temperature', 'meal', 'bath', 'play'));
alter table events drop constraint if exists events_diaper_type_check;
alter table events add constraint events_diaper_type_check check (diaper_type is null or diaper_type in ('wet', 'dirty', 'both'));
alter table events drop constraint if exists events_temperature_location_check;
alter table events add constraint events_temperature_location_check check (temperature_location is null or temperature_location in ('forehead', 'ear', 'armpit'));
alter table events drop constraint if exists events_meal_reaction_check;
alter table events add constraint events_meal_reaction_check check (meal_reaction is null or meal_reaction in ('good', 'normal', 'poor', 'allergy'));

create table if not exists account_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null check (event_type in ('sign_up', 'withdrawal')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists growth_records (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  measured_at timestamptz not null,
  weight_kg numeric(4,1),
  height_cm numeric(4,1),
  head_cm numeric(4,1),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  baby_id uuid references babies(id) on delete cascade,
  platform text not null default 'ios' check (platform in ('ios')),
  token text not null unique,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feeding_reminder_settings (
  baby_id uuid not null references babies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  enabled boolean not null default true,
  interval_minutes integer not null default 180 check (interval_minutes between 30 and 720),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (baby_id, user_id)
);

alter table feeding_reminder_settings add column if not exists interval_minutes integer;
update feeding_reminder_settings set interval_minutes = 180 where interval_minutes is null;
alter table feeding_reminder_settings alter column interval_minutes set default 180;
alter table feeding_reminder_settings alter column interval_minutes set not null;
alter table feeding_reminder_settings drop constraint if exists feeding_reminder_settings_interval_minutes_check;
alter table feeding_reminder_settings add constraint feeding_reminder_settings_interval_minutes_check check (interval_minutes between 30 and 720);

create table if not exists feeding_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references babies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  push_token_id uuid not null references push_tokens(id) on delete cascade,
  feed_event_id uuid not null references events(id) on delete cascade,
  last_feed_occurred_at timestamptz not null,
  average_interval_minutes integer not null check (average_interval_minutes between 30 and 720),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  apns_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error jsonb,
  created_at timestamptz not null default now()
);

alter table feeding_reminder_deliveries alter column sent_at drop not null;
alter table feeding_reminder_deliveries alter column sent_at drop default;
alter table feeding_reminder_deliveries alter column status set default 'pending';
alter table feeding_reminder_deliveries drop constraint if exists feeding_reminder_deliveries_status_check;
alter table feeding_reminder_deliveries add constraint feeding_reminder_deliveries_status_check check (status in ('pending', 'sent', 'failed'));

create index if not exists babies_owner_id_idx on babies(owner_id);
create unique index if not exists babies_invite_code_key on babies(invite_code);
create index if not exists baby_members_user_id_idx on baby_members(user_id);
create index if not exists events_baby_id_occurred_at_idx on events(baby_id, occurred_at desc);
create index if not exists events_user_id_idx on events(user_id);
create index if not exists account_histories_user_id_idx on account_histories(user_id);
create unique index if not exists account_histories_user_event_key on account_histories(user_id, event_type);
create index if not exists growth_records_baby_id_measured_at_idx on growth_records(baby_id, measured_at desc);
create index if not exists push_tokens_user_id_idx on push_tokens(user_id);
create index if not exists push_tokens_baby_id_idx on push_tokens(baby_id);
create index if not exists feeding_reminder_settings_user_id_idx on feeding_reminder_settings(user_id);
create unique index if not exists feeding_reminder_deliveries_token_feed_key on feeding_reminder_deliveries(push_token_id, feed_event_id);
create index if not exists feeding_reminder_deliveries_baby_sent_at_idx on feeding_reminder_deliveries(baby_id, sent_at desc);

alter table profiles enable row level security;
alter table babies enable row level security;
alter table baby_members enable row level security;
alter table events enable row level security;
alter table account_histories enable row level security;
alter table growth_records enable row level security;
alter table push_tokens enable row level security;
alter table feeding_reminder_settings enable row level security;
alter table feeding_reminder_deliveries enable row level security;

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
on profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own"
on profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
on profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "babies_select_own" on babies;
create policy "babies_select_own"
on babies for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from baby_members
    where baby_members.baby_id = babies.id
      and baby_members.user_id = auth.uid()
  )
);

drop policy if exists "babies_insert_own" on babies;
create policy "babies_insert_own"
on babies for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "babies_update_own" on babies;
create policy "babies_update_own"
on babies for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "baby_members_select_own" on baby_members;
create policy "baby_members_select_own"
on baby_members for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "baby_members_insert_self" on baby_members;
create policy "baby_members_insert_self"
on baby_members for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "baby_members_delete_self_or_owner" on baby_members;
create policy "baby_members_delete_self_or_owner"
on baby_members for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from babies
    where babies.id = baby_members.baby_id
      and babies.owner_id = auth.uid()
  )
);

drop policy if exists "events_select_own" on events;
create policy "events_select_own"
on events for select
to authenticated
using (
  exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "events_insert_own" on events;
create policy "events_insert_own"
on events for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "events_update_own" on events;
drop policy if exists "events_update_accessible_baby" on events;
create policy "events_update_accessible_baby"
on events for update
to authenticated
using (
  exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "events_delete_own" on events;
drop policy if exists "events_delete_accessible_baby" on events;
create policy "events_delete_accessible_baby"
on events for delete
to authenticated
using (
  exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "growth_records_select_accessible_baby" on growth_records;
create policy "growth_records_select_accessible_baby"
on growth_records for select
to authenticated
using (
  exists (
    select 1
    from babies
    where babies.id = growth_records.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "growth_records_insert_accessible_baby" on growth_records;
create policy "growth_records_insert_accessible_baby"
on growth_records for insert
to authenticated
with check (
  exists (
    select 1
    from babies
    where babies.id = growth_records.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "growth_records_delete_accessible_baby" on growth_records;
create policy "growth_records_delete_accessible_baby"
on growth_records for delete
to authenticated
using (
  exists (
    select 1
    from babies
    where babies.id = growth_records.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "push_tokens_select_own" on push_tokens;
create policy "push_tokens_select_own"
on push_tokens for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on push_tokens;
create policy "push_tokens_insert_own"
on push_tokens for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    baby_id is null
    or exists (
      select 1
      from babies
      where babies.id = push_tokens.baby_id
        and (
          babies.owner_id = auth.uid()
          or exists (
            select 1
            from baby_members
            where baby_members.baby_id = babies.id
              and baby_members.user_id = auth.uid()
          )
        )
    )
  )
);

drop policy if exists "push_tokens_update_own" on push_tokens;
create policy "push_tokens_update_own"
on push_tokens for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on push_tokens;
create policy "push_tokens_delete_own"
on push_tokens for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "feeding_reminder_settings_select_own" on feeding_reminder_settings;
create policy "feeding_reminder_settings_select_own"
on feeding_reminder_settings for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "feeding_reminder_settings_insert_own" on feeding_reminder_settings;
create policy "feeding_reminder_settings_insert_own"
on feeding_reminder_settings for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from babies
    where babies.id = feeding_reminder_settings.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "feeding_reminder_settings_update_own" on feeding_reminder_settings;
create policy "feeding_reminder_settings_update_own"
on feeding_reminder_settings for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from babies
    where babies.id = feeding_reminder_settings.baby_id
      and (
        babies.owner_id = auth.uid()
        or exists (
          select 1
          from baby_members
          where baby_members.baby_id = babies.id
            and baby_members.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "feeding_reminder_settings_delete_own" on feeding_reminder_settings;
create policy "feeding_reminder_settings_delete_own"
on feeding_reminder_settings for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "feeding_reminder_deliveries_select_own" on feeding_reminder_deliveries;
create policy "feeding_reminder_deliveries_select_own"
on feeding_reminder_deliveries for select
to authenticated
using (user_id = auth.uid());

drop trigger if exists profiles_log_sign_up on profiles;
drop function if exists log_profile_sign_up();

create function log_profile_sign_up()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into account_histories (user_id, event_type, occurred_at, metadata)
  values (new.id, 'sign_up', coalesce(new.created_at, now()), '{}'::jsonb)
  on conflict (user_id, event_type) do nothing;

  return new;
end;
$$;

create trigger profiles_log_sign_up
after insert on profiles
for each row
execute function log_profile_sign_up();

drop function if exists join_baby_by_invite_code(text, uuid);

create function join_baby_by_invite_code(target_invite_code text, target_user_id uuid)
returns table (
  id uuid,
  owner_id uuid,
  name text,
  birth_date date,
  gender text,
  invite_code text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id <> auth.uid() then
    raise exception 'invalid user';
  end if;

  insert into baby_members (baby_id, user_id)
  select babies.id, target_user_id
  from babies
  where babies.invite_code = upper(target_invite_code)
  on conflict (baby_id, user_id) do nothing;

  if not exists (
    select 1
    from babies
    where babies.invite_code = upper(target_invite_code)
  ) then
    raise exception 'baby not found';
  end if;

  return query
  select babies.id, babies.owner_id, babies.name, babies.birth_date, babies.gender, babies.invite_code, babies.created_at
  from babies
  where babies.invite_code = upper(target_invite_code);
end;
$$;

grant execute on function join_baby_by_invite_code(text, uuid) to authenticated;

drop function if exists delete_current_user_account();

create function delete_current_user_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into account_histories (user_id, event_type, occurred_at, metadata)
  values (current_user_id, 'withdrawal', now(), '{}'::jsonb)
  on conflict (user_id, event_type) do update
  set occurred_at = excluded.occurred_at,
      metadata = excluded.metadata;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function delete_current_user_account() from public;
grant execute on function delete_current_user_account() to authenticated;
