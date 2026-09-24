create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  grade text,
  institution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists students_full_name_idx on public.students(full_name);

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

alter table public.students enable row level security;

drop policy if exists "admins can manage students" on public.students;
create policy "admins can manage students"
on public.students
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.recycling_events
  drop constraint if exists recycling_events_student_id_fkey;

alter table public.recycling_events
  add constraint recycling_events_student_id_fkey
  foreign key (student_id) references public.students(id) on delete set null;

alter table public.points_ledger
  drop constraint if exists points_ledger_student_id_fkey;

alter table public.points_ledger
  add constraint points_ledger_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade;

create or replace function public.dashboard_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'students', (select count(*) from public.students),
    'events', (select count(*) from public.recycling_events),
    'points', coalesce((select sum(points) from public.points_ledger), 0),
    'stations', (select count(*) from public.stations),
    'online_stations', (select count(*) from public.stations where status = 'online'),
    'station_list', coalesce(
      (select jsonb_agg(
        jsonb_build_object(
          'code', code,
          'name', name,
          'status', status,
          'device_model', device_model,
          'camera_model', camera_model,
          'last_seen_at', last_seen_at
        )
        order by code
      ) from public.stations),
      '[]'::jsonb
    )
  );
$$;

grant execute on function public.dashboard_summary() to anon, authenticated;
