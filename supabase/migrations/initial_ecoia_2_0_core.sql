create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('admin','teacher','student')),
  grade text,
  institution text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location text,
  device_model text not null default 'ESP32-S3',
  camera_model text,
  status text not null default 'offline' check (status in ('online','offline','maintenance')),
  last_seen_at timestamptz,
  firmware_version text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recycling_events (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references public.stations(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  object_type text not null,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  points integer not null default 0 check (points >= 0),
  image_path text,
  source text not null default 'station' check (source in ('station','manual','import')),
  created_at timestamptz not null default now()
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.recycling_events(id) on delete set null,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index recycling_events_station_id_idx on public.recycling_events(station_id);
create index recycling_events_student_id_idx on public.recycling_events(student_id);
create index recycling_events_created_at_idx on public.recycling_events(created_at desc);
create index points_ledger_student_id_idx on public.points_ledger(student_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger stations_set_updated_at before update on public.stations
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.stations enable row level security;
alter table public.recycling_events enable row level security;
alter table public.points_ledger enable row level security;

create policy "authenticated users can read profiles"
on public.profiles for select to authenticated using (true);

create policy "authenticated users can read stations"
on public.stations for select to authenticated using (true);

create policy "authenticated users can read recycling events"
on public.recycling_events for select to authenticated using (true);

create policy "authenticated users can read points ledger"
on public.points_ledger for select to authenticated using (true);

insert into public.stations (code, name, location, camera_model, status)
values
  ('ECOIA-001', 'Estación ECOIA-001', 'Institución educativa', 'OV3660', 'offline'),
  ('ECOIA-002', 'Estación ECOIA-002', 'Institución educativa', 'OV3660', 'offline')
on conflict (code) do nothing;
