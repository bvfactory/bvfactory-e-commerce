-- Singleton table holding site-wide configuration editable from the admin UI.
create table if not exists public.site_settings (
  id int primary key default 1,
  homepage_video_enabled boolean not null default false,
  homepage_video_url text,
  homepage_video_poster_url text,
  updated_at timestamptz default now(),
  constraint site_settings_single_row check (id = 1)
);

insert into public.site_settings (id) values (1)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "Public read site_settings"
  on public.site_settings for select
  using (true);

-- Storage bucket for homepage media (video, poster, etc.). Public so assets are
-- readable via getPublicUrl. Writes go through the service-role client.
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;
