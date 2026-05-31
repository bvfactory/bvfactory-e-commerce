# Admin Messages — Corbeille (soft-delete) — Design

**Date:** 2026-05-31
**Status:** Approved (design), pending spec review
**Scope:** Add the ability to delete conversations from the admin webmail (`/admin/messages`) into a recoverable trash, with manual restore / permanent delete / empty-trash, plus automatic 30-day purge.

## Context

The admin webmail lists `contact_threads` (conversations) with a status filter
(`nouveau` / `répondu` / `archivé`), counts per status, search, and per-thread
actions (reply, archive/unarchive) wired through `ThreadList`, `ThreadDetail`
and `ReplyComposer`. Archiving toggles `contact_threads.status`.

Today there is **no way to delete** a conversation — only archive. The operator
wants a trash: delete a conversation (recoverable), see a trash view, restore or
permanently delete, and have old trash auto-purged.

Deletion is at the **conversation (thread) level**, mirroring archive and a
classic mail client. Message-level deletion is explicitly out of scope.

## Data model

Trash is a **soft-delete flag orthogonal to `status`** so the original workflow
status is preserved and restored unchanged.

Migration `supabase/migrations/<ts>_add_trash_to_contact_threads.sql`:

```sql
alter table public.contact_threads
  add column if not exists deleted_at timestamptz;

create index if not exists contact_threads_deleted_at_idx
  on public.contact_threads (deleted_at)
  where deleted_at is not null;
```

- `deleted_at IS NULL` → active conversation (appears in normal views).
- `deleted_at` set → in the trash.
- `status` is untouched when trashing/restoring.

All existing active-list queries and counts add `.is("deleted_at", null)` so
trashed threads disappear from `all` / `nouveau` / `répondu` / `archivé` views
and from the sidebar unread badge.

## API

All routes require `validateAdminRequest` (admin session), like the existing ones.

| Method & path | Effect |
|---|---|
| `POST /api/admin/messages/[threadId]/trash` | Move to trash: `deleted_at = now()`. |
| `POST /api/admin/messages/[threadId]/trash?restore=true` | Restore: `deleted_at = null`. Status unchanged. |
| `DELETE /api/admin/messages/[threadId]` | **Permanent** delete of a trashed thread: purge attachments from Storage, then delete the thread (messages cascade). Only allowed when the thread is in the trash (`deleted_at` set); otherwise 409. |
| `POST /api/admin/messages/trash/empty` | Permanently delete **all** trashed threads (purge each). |
| `GET /api/admin/messages?status=corbeille` | List trashed threads (`deleted_at IS NOT NULL`, any status), newest-`deleted_at` first. Triggers lazy purge (below). |

`GET /api/admin/messages` (existing): for `status` ∈ {all, nouveau, répondu,
archivé} add `deleted_at IS NULL`. Add `corbeille` as a recognized filter that
instead selects `deleted_at IS NOT NULL`. The `unreadCount` query also adds
`deleted_at IS NULL`.

## Shared purge helper

`src/lib/contact-messages.ts` (or a small `contact-trash.ts`) exports:

```
purgeThread(supabase, threadId): Promise<void>
```

Steps: fetch the thread's messages' `attachments[].storage_path`, remove them
from the `contact-attachments` Storage bucket (best-effort, log failures), then
`delete` the thread row (messages cascade via the existing FK
`on delete cascade`). Used by both permanent-delete and auto-purge.

## Auto-purge (30 days) — lazy purge-on-list (Approach A)

No new cron infrastructure. When `GET …?status=corbeille` is served, before
returning, the server purges threads with
`deleted_at < now() - interval '30 days'` by calling `purgeThread` for each.
This keeps the trash bounded for a regularly-used admin and cleans Storage.

> Alternative considered (B): a Vercel Cron daily job. Rejected for now to avoid
> new infra; can be added later if the admin is opened infrequently. A code
> comment near the lazy-purge notes this trade-off.

## UI (`/admin/messages`)

- **Filter tab "Corbeille"** added to `ThreadList` alongside `archivé`, with its
  count. Selecting it lists trashed threads. `MessagesPage` adds `corbeille` to
  its `Status` type and fetches its count.
- **Per-conversation actions** (in `ReplyComposer` / `ThreadDetail` header):
  - Active thread: a **"Supprimer"** (trash icon) button next to Archive →
    moves to trash, then deselects/refreshes.
  - Trashed thread (status filter = corbeille): the composer is hidden; show
    **"Restaurer"** and **"Supprimer définitivement"** buttons instead.
- **"Vider la corbeille"** button shown in the trash view (list header) when the
  trash is non-empty.
- **Confirmation** (native `confirm()` or existing dialog pattern) before any
  permanent delete and before emptying the trash. Trashing (recoverable) needs
  no confirmation.
- After any action, refresh threads + counts (existing `onChange` pattern).

## Error handling & edge cases

| Case | Behavior |
|---|---|
| Permanent-delete a thread that is NOT in trash | 409 — must trash first. |
| Restore a thread that isn't trashed | No-op success (idempotent). |
| Storage attachment removal fails | Log, continue with row deletion (don't block purge). |
| Reply attempted on a trashed thread | Existing reply route also checks trash and refuses (like the archived guard). |
| Inbound reply arrives for a trashed thread (token matches) | Restore it (`deleted_at = null`) so the new message is visible, mirroring a mail client reopening a deleted conversation on reply. |
| Empty trash with 0 items | No-op success. |

## Testing

- Manual: trash a conversation → disappears from active views, appears in
  Corbeille with correct count → restore → returns with original status →
  trash again → permanent delete → gone, attachments removed from bucket →
  empty trash removes all.
- Auto-purge: a thread with `deleted_at` older than 30 days is gone after
  opening the Corbeille view (verify row + attachments removed).
- Regression: active counts/badge exclude trashed; archive still works.

## Out of scope

- Message-level deletion (only whole conversations).
- Vercel Cron purge (lazy purge only for now).
- Bulk multi-select in the list (single-thread actions only).
