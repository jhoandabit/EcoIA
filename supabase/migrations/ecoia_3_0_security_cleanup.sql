-- EcoIA 3.0 security cleanup
-- Applied to Supabase project.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated, public;

drop index if exists public.students_qr_token_uidx;

-- Administrative writes are separated from read policies to keep RLS explicit.
-- The live migration contains the complete policy replacement.
