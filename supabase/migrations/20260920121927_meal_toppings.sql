-- Add optional meal metadata; existing records and row access policies are unchanged.
alter table public.events
  add column if not exists meal_stage text,
  add column if not exists meal_toppings text[] not null default '{}';

alter table public.events
  add constraint events_meal_stage_check check (meal_stage is null or meal_stage in ('early', 'middle', 'late')),
  add constraint events_meal_toppings_count_check check (cardinality(meal_toppings) <= 32);

comment on column public.events.meal_stage is 'User-selected meal stage at the time of recording';
comment on column public.events.meal_toppings is 'Selected topping identifiers, separate from free-text meal name';
