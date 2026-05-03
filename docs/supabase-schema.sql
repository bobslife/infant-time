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
create unique index if not exists babies_invite_code_key on babies(invite_code);
create index if not exists baby_members_user_id_idx on baby_members(user_id);
create index if not exists events_baby_id_occurred_at_idx on events(baby_id, occurred_at desc);
create index if not exists events_user_id_idx on events(user_id);

alter table profiles enable row level security;
alter table babies enable row level security;
alter table baby_members enable row level security;
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
