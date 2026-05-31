-- Soft-delete (trash) support for contact_threads.
-- deleted_at IS NULL → active; set → in the trash. Orthogonal to status.
alter table public.contact_threads
  add column if not exists deleted_at timestamptz;

create index if not exists contact_threads_deleted_at_idx
  on public.contact_threads (deleted_at)
  where deleted_at is not null;
