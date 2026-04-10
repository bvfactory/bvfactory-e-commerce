-- Trusted clients / "They trust us" logo carousel
create table if not exists public.trusted_clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text not null,
  website_url text,
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.trusted_clients enable row level security;

create policy "Public read trusted_clients"
  on public.trusted_clients for select
  using (active = true);
