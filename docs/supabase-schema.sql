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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  baby_id uuid not null references babies(id) on delete cascade,
  event_type text not null check (event_type in ('feed', 'sleep', 'pee', 'poop')),
  occurred_at timestamptz not null,
  ended_at timestamptz,
  amount_ml integer check (amount_ml is null or (amount_ml >= 0 and amount_ml <= 300)),
  poop_amount text check (poop_amount is null or poop_amount in ('small', 'normal', 'large')),
  poop_color text check (poop_color is null or poop_color in ('ocher', 'brown', 'dark_brown', 'green', 'red_orange')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists babies_owner_id_idx on babies(owner_id);
create index if not exists events_baby_id_occurred_at_idx on events(baby_id, occurred_at desc);
create index if not exists events_user_id_idx on events(user_id);

alter table profiles enable row level security;
alter table babies enable row level security;
alter table events enable row level security;

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
using (owner_id = auth.uid());

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

drop policy if exists "events_select_own" on events;
create policy "events_select_own"
on events for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and babies.owner_id = auth.uid()
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
      and babies.owner_id = auth.uid()
  )
);

drop policy if exists "events_update_own" on events;
create policy "events_update_own"
on events for update
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and babies.owner_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and babies.owner_id = auth.uid()
  )
);

drop policy if exists "events_delete_own" on events;
create policy "events_delete_own"
on events for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1
    from babies
    where babies.id = events.baby_id
      and babies.owner_id = auth.uid()
  )
);
