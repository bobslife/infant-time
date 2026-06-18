-- Run this migration before deploying the breastfeeding-enabled client.

alter table events add column if not exists feeding_method text;
alter table events add column if not exists breast_left_minutes integer;
alter table events add column if not exists breast_right_minutes integer;

update events
set feeding_method = 'bottle'
where feeding_method is null;

alter table events alter column feeding_method set default 'bottle';
alter table events alter column feeding_method set not null;

alter table events drop constraint if exists events_feeding_method_check;
alter table events add constraint events_feeding_method_check
check (feeding_method in ('bottle', 'breast'));

alter table events drop constraint if exists events_breast_left_minutes_check;
alter table events add constraint events_breast_left_minutes_check
check (
  breast_left_minutes is null
  or (breast_left_minutes >= 0 and breast_left_minutes <= 120)
);

alter table events drop constraint if exists events_breast_right_minutes_check;
alter table events add constraint events_breast_right_minutes_check
check (
  breast_right_minutes is null
  or (breast_right_minutes >= 0 and breast_right_minutes <= 120)
);
