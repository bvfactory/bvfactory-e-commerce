-- Persist visitor ↔ admin conversations started via the /contact form.
create table if not exists public.contact_threads (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  from_name       text not null,
  from_email      text not null,
  status          text not null default 'nouveau'
                  check (status in ('nouveau', 'répondu', 'archivé')),
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contact_threads_status_last_message_idx
  on public.contact_threads (status, last_message_at desc);
create index if not exists contact_threads_from_email_idx
  on public.contact_threads (from_email);

alter table public.contact_threads enable row level security;
-- No policies: server-only access via service_role key.

create table if not exists public.contact_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.contact_threads(id) on delete cascade,
  direction       text not null check (direction in ('inbound', 'outbound')),
  reply_token     text unique,
  body_text       text not null,
  body_html       text,
  resend_email_id text unique,
  in_reply_to     text,
  attachments     jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists contact_messages_thread_idx
  on public.contact_messages (thread_id, created_at);
create index if not exists contact_messages_reply_token_idx
  on public.contact_messages (reply_token)
  where reply_token is not null;

alter table public.contact_messages enable row level security;
-- No policies: server-only access via service_role key.

-- Private bucket for inbound attachments.
insert into storage.buckets (id, name, public)
values ('contact-attachments', 'contact-attachments', false)
on conflict (id) do nothing;
