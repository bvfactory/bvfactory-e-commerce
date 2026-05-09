-- supabase/migrations/20260509_add_analytics_events.sql

create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null
              check (event_type in ('page_view', 'plugin_download', 'checkout_initiated', 'license_activated')),
  product_id  text,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_type_product_date_idx
  on public.analytics_events (event_type, product_id, created_at desc);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

alter table public.analytics_events enable row level security;
-- Pas de policy anon/authenticated : les insertions passent toujours par
-- une route Next.js qui utilise la clé service_role côté serveur.
