create table if not exists public.category_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  limit_amount numeric(14, 2) not null check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month, year)
);

alter table public.category_limits enable row level security;

drop trigger if exists set_category_limits_updated_at on public.category_limits;
create trigger set_category_limits_updated_at
before update on public.category_limits
for each row
execute function public.set_updated_at();

drop policy if exists "Users can view own category limits" on public.category_limits;
drop policy if exists "Users can insert own category limits" on public.category_limits;
drop policy if exists "Users can update own category limits" on public.category_limits;
drop policy if exists "Users can delete own category limits" on public.category_limits;

create policy "Users can view own category limits"
on public.category_limits
for select
using (auth.uid() = user_id);

create policy "Users can insert own category limits"
on public.category_limits
for insert
with check (auth.uid() = user_id);

create policy "Users can update own category limits"
on public.category_limits
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own category limits"
on public.category_limits
for delete
using (auth.uid() = user_id);
