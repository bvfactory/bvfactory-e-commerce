-- Roadmap / teasing plugins shown as "Coming Soon" on the store
create table if not exists public.roadmap_plugins (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  tier text not null default 'bridge' check (tier in ('bridge', 'forge', 'mind')),
  description text not null default '',
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.roadmap_plugins enable row level security;

create policy "Public read roadmap_plugins"
  on public.roadmap_plugins for select
  using (active = true);
