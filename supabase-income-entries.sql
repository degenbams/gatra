-- =========================
-- GATRA INCOME ENTRIES
-- =========================

create extension if not exists "pgcrypto";

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  source text not null,
  note text,
  date date not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.income_entries enable row level security;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_income_entries_updated_at on public.income_entries;
create trigger set_income_entries_updated_at
before update on public.income_entries
for each row
execute function public.set_updated_at();

drop policy if exists "Users can view own income entries" on public.income_entries;
drop policy if exists "Users can insert own income entries" on public.income_entries;
drop policy if exists "Users can update own income entries" on public.income_entries;
drop policy if exists "Users can delete own income entries" on public.income_entries;

create policy "Users can view own income entries"
on public.income_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own income entries"
on public.income_entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own income entries"
on public.income_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete own income entries"
on public.income_entries
for delete
to authenticated
using ((select auth.uid()) = user_id);
