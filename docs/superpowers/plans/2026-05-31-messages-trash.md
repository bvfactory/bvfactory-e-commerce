# Admin Messages — Corbeille (soft-delete) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin delete conversations from `/admin/messages` into a recoverable trash (restore / permanent delete / empty), with automatic 30-day purge.

**Architecture:** Soft-delete via a `deleted_at` column on `contact_threads`, orthogonal to `status`. New API routes for trash/restore/permanent-delete/empty + a `corbeille` list filter. A shared `purgeThread` helper removes Storage attachments then hard-deletes (messages cascade). Lazy purge of >30-day trash runs when the trash view is listed. UI adds a Corbeille filter tab and per-conversation actions.

**Tech Stack:** Next.js 16 App Router (route handlers), Supabase (`@supabase/supabase-js` admin client + Storage), React client components, Tailwind.

> **Testing note:** this repo has **no unit-test runner** (no vitest/jest, no test files); existing features ship verified by type-check + lint + manual checks. This plan follows that pattern: each task is verified with `npx tsc --noEmit`, `npx eslint <files>`, and explicit manual/`curl` checks. Do **not** add a test framework.

> **Spec:** `docs/superpowers/specs/2026-05-31-messages-trash-design.md`

---

## File Structure

- **Create** `supabase/migrations/20260531_add_trash_to_contact_threads.sql` — `deleted_at` column + partial index.
- **Create** `src/lib/contact-trash.ts` — `purgeThread()` + `purgeExpiredTrash()` (Storage cleanup + hard delete).
- **Modify** `src/app/api/admin/messages/route.ts` — exclude trashed from active views; add `corbeille` filter; lazy purge; unread count excludes trashed.
- **Create** `src/app/api/admin/messages/[threadId]/trash/route.ts` — POST trash / `?restore=true`.
- **Modify** `src/app/api/admin/messages/[threadId]/route.ts` — add `DELETE` (permanent, guarded to trashed only).
- **Create** `src/app/api/admin/messages/trash/empty/route.ts` — POST empty trash.
- **Modify** `src/app/api/webhooks/resend/inbound/route.ts` — inbound reply un-trashes its thread.
- **Modify** `src/components/admin/messages/ThreadList.tsx` — Corbeille tab + count + "Vider la corbeille".
- **Modify** `src/components/admin/messages/ReplyComposer.tsx` — "Supprimer" button (active threads → trash).
- **Modify** `src/components/admin/messages/ThreadDetail.tsx` — expose `deleted_at`; show Restaurer / Supprimer définitivement for trashed threads; hide composer.
- **Modify** `src/app/admin/(dashboard)/messages/page.tsx` — add `corbeille` to status type, counts, empty-trash handler.

---

## Task 1: Migration — add `deleted_at`

**Files:**
- Create: `supabase/migrations/20260531_add_trash_to_contact_threads.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Soft-delete (trash) support for contact_threads.
-- deleted_at IS NULL → active; set → in the trash. Orthogonal to status.
alter table public.contact_threads
  add column if not exists deleted_at timestamptz;

create index if not exists contact_threads_deleted_at_idx
  on public.contact_threads (deleted_at)
  where deleted_at is not null;
```

- [ ] **Step 2: Apply the migration**

Apply in the **Supabase dashboard → SQL editor** (project `wmpnxnnhxvskojpujauv`), or `supabase db push` if the CLI is linked. (DDL can't run through the JS client.)

- [ ] **Step 3: Verify the column exists**

In the SQL editor: `select column_name from information_schema.columns where table_name='contact_threads' and column_name='deleted_at';`
Expected: one row `deleted_at`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260531_add_trash_to_contact_threads.sql
git commit -m "feat(db): add deleted_at trash column to contact_threads"
```

---

## Task 2: Purge helper

**Files:**
- Create: `src/lib/contact-trash.ts`

- [ ] **Step 1: Write the helper**

```ts
// src/lib/contact-trash.ts
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "contact-attachments";

interface AttachmentRow {
    storage_path?: string;
}

/**
 * Permanently delete a thread: remove its attachments from Storage (best-effort),
 * then delete the thread row. contact_messages rows cascade via the FK
 * (on delete cascade). Throws if the row delete fails.
 */
export async function purgeThread(supabase: SupabaseClient, threadId: string): Promise<void> {
    const { data: messages } = await supabase
        .from("contact_messages")
        .select("attachments")
        .eq("thread_id", threadId);

    const paths: string[] = [];
    for (const m of messages ?? []) {
        for (const a of ((m.attachments as AttachmentRow[] | null) ?? [])) {
            if (a?.storage_path) paths.push(a.storage_path);
        }
    }
    if (paths.length > 0) {
        const { error } = await supabase.storage.from(BUCKET).remove(paths);
        if (error) console.error("[trash] storage remove failed", threadId, error);
    }

    const { error: delErr } = await supabase.from("contact_threads").delete().eq("id", threadId);
    if (delErr) {
        console.error("[trash] thread delete failed", threadId, delErr);
        throw new Error(delErr.message);
    }
}

/**
 * Permanently delete trashed threads whose deleted_at is older than `days`.
 * Returns the number purged. Failures on individual threads are logged and skipped.
 */
export async function purgeExpiredTrash(supabase: SupabaseClient, days = 30): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: expired } = await supabase
        .from("contact_threads")
        .select("id")
        .not("deleted_at", "is", null)
        .lt("deleted_at", cutoff);

    let purged = 0;
    for (const t of expired ?? []) {
        try {
            await purgeThread(supabase, t.id);
            purged++;
        } catch (e) {
            console.error("[trash] purge expired failed", t.id, e);
        }
    }
    return purged;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: exit 0 (no errors referencing `contact-trash.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/contact-trash.ts
git commit -m "feat(messages): add purgeThread/purgeExpiredTrash helpers"
```

---

## Task 3: List route — trash filter, exclude trashed, lazy purge

**Files:**
- Modify: `src/app/api/admin/messages/route.ts`

- [ ] **Step 1: Replace the file contents**

```ts
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeExpiredTrash } from "@/lib/contact-trash";

/**
 * Escape characters that are meaningful in a PostgREST filter string to
 * prevent search input from breaking the .or(...) structure.
 */
function escapePostgrestFilter(value: string): string {
    return value.replace(/[(),\\]/g, "\\$&");
}

const PAGE_SIZE = 50;
const ACTIVE_STATUSES = ["nouveau", "répondu", "archivé"];

export async function GET(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = (searchParams.get("search") || "").trim();
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const supabase = createAdminClient();
    const isTrash = status === "corbeille";

    // Trash view: purge items deleted more than 30 days ago before listing.
    if (isTrash) {
        await purgeExpiredTrash(supabase, 30);
    }

    let query = supabase
        .from("contact_threads")
        .select("id, subject, from_name, from_email, status, last_message_at, created_at, deleted_at", { count: "exact" })
        .range(offset, offset + PAGE_SIZE - 1);

    if (isTrash) {
        query = query.not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    } else {
        query = query.is("deleted_at", null).order("last_message_at", { ascending: false });
        if (ACTIVE_STATUSES.includes(status)) {
            query = query.eq("status", status);
        }
    }

    if (search) {
        const escaped = escapePostgrestFilter(search);
        const pattern = `%${escaped}%`;
        query = query.or(
            `subject.ilike.${pattern},from_name.ilike.${pattern},from_email.ilike.${pattern}`,
        );
    }

    const { data: threads, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Unread counter for the sidebar badge — active (non-trashed) only.
    const { count: unreadCount } = await supabase
        .from("contact_threads")
        .select("id", { count: "exact", head: true })
        .eq("status", "nouveau")
        .is("deleted_at", null);

    return NextResponse.json({ threads: threads ?? [], total: count ?? 0, unreadCount: unreadCount ?? 0 });
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/admin/messages/route.ts`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/messages/route.ts
git commit -m "feat(messages): exclude trashed from active lists, add corbeille filter + lazy purge"
```

---

## Task 4: Trash / restore route

**Files:**
- Create: `src/app/api/admin/messages/[threadId]/trash/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ threadId: string }> },
) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    const restore = new URL(request.url).searchParams.get("restore") === "true";
    const supabase = createAdminClient();

    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from("contact_threads")
        .update({ deleted_at: restore ? null : now, updated_at: now })
        .eq("id", threadId)
        .select()
        .single();

    if (error || !data) {
        return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });
    }
    return NextResponse.json({ thread: data });
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/api/admin/messages/[threadId]/trash/route.ts"`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/messages/[threadId]/trash/route.ts"
git commit -m "feat(messages): add trash/restore endpoint"
```

---

## Task 5: Permanent delete (DELETE on the thread)

**Files:**
- Modify: `src/app/api/admin/messages/[threadId]/route.ts`

- [ ] **Step 1: Add the imports**

At the top, after the existing imports, add:

```ts
import { purgeThread } from "@/lib/contact-trash";
```

- [ ] **Step 2: Append the DELETE handler**

Add this function at the end of the file (after the existing `GET`):

```ts
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ threadId: string }> },
) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    const supabase = createAdminClient();

    const { data: thread, error } = await supabase
        .from("contact_threads")
        .select("id, deleted_at")
        .eq("id", threadId)
        .single();
    if (error || !thread) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Permanent deletion is only allowed from the trash.
    if (!thread.deleted_at) {
        return NextResponse.json(
            { error: "Le thread doit être dans la corbeille avant suppression définitive" },
            { status: 409 },
        );
    }

    try {
        await purgeThread(supabase, threadId);
    } catch {
        return NextResponse.json({ error: "Échec de la suppression" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/api/admin/messages/[threadId]/route.ts"`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/admin/messages/[threadId]/route.ts"
git commit -m "feat(messages): permanent delete for trashed threads"
```

---

## Task 6: Empty trash route

**Files:**
- Create: `src/app/api/admin/messages/trash/empty/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeThread } from "@/lib/contact-trash";

export async function POST(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: trashed } = await supabase
        .from("contact_threads")
        .select("id")
        .not("deleted_at", "is", null);

    let purged = 0;
    for (const t of trashed ?? []) {
        try {
            await purgeThread(supabase, t.id);
            purged++;
        } catch {
            // purgeThread already logs; continue with the rest.
        }
    }
    return NextResponse.json({ ok: true, purged });
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/api/admin/messages/trash/empty/route.ts`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/messages/trash/empty/route.ts
git commit -m "feat(messages): add empty-trash endpoint"
```

---

## Task 7: Reply behaviour with trash (inbound un-trash + admin reply guard)

**Files:**
- Modify: `src/app/api/webhooks/resend/inbound/route.ts`
- Modify: `src/app/api/admin/messages/[threadId]/reply/route.ts`

- [ ] **Step 1: Inbound — add `deleted_at: null` to the final thread update**

In `inbound/route.ts`, find this block near the end of the file:

```ts
    const nowIso = new Date().toISOString();
    await supabase
        .from("contact_threads")
        .update({ status: "nouveau", last_message_at: nowIso, updated_at: nowIso })
        .eq("id", threadId);
```

Replace it with:

```ts
    const nowIso = new Date().toISOString();
    await supabase
        .from("contact_threads")
        // deleted_at: null restores the thread from the trash if a visitor replies
        // to a deleted conversation (mail-client behaviour).
        .update({ status: "nouveau", last_message_at: nowIso, updated_at: nowIso, deleted_at: null })
        .eq("id", threadId);
```

- [ ] **Step 2: Admin reply route — refuse replying to a trashed thread**

In `reply/route.ts`, find the existing archived guard:

```ts
    if (thread.status === "archivé") {
        return NextResponse.json({ error: "Thread archivé — désarchivez avant de répondre" }, { status: 400 });
    }
```

Immediately after it, add the trash guard (the route already fetches the thread with `select("*")`, so `deleted_at` is present):

```ts
    if (thread.deleted_at) {
        return NextResponse.json({ error: "Thread en corbeille — restaurez avant de répondre" }, { status: 400 });
    }
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/api/webhooks/resend/inbound/route.ts" "src/app/api/admin/messages/[threadId]/reply/route.ts"`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/webhooks/resend/inbound/route.ts" "src/app/api/admin/messages/[threadId]/reply/route.ts"
git commit -m "feat(messages): inbound reply restores trashed thread; reply route refuses trashed"
```

---

## Task 8: ThreadList — Corbeille tab, count, empty-trash button

**Files:**
- Modify: `src/components/admin/messages/ThreadList.tsx`

- [ ] **Step 1: Update the `Status`-related types and props**

Replace the `Props` interface and the `STATUS_LABEL` constant with:

```ts
type StatusFilter = "all" | "nouveau" | "répondu" | "archivé" | "corbeille";

interface Props {
    threads: ThreadRow[];
    selectedId: string | null;
    statusFilter: StatusFilter;
    search: string;
    onSelect: (id: string) => void;
    onStatusChange: (s: StatusFilter) => void;
    onSearchChange: (s: string) => void;
    onEmptyTrash: () => void;
    counts: { all: number; nouveau: number; "répondu": number; "archivé": number; corbeille: number };
}

function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

const STATUS_LABEL = {
    all: "Tous",
    nouveau: "Nouveaux",
    "répondu": "Répondus",
    "archivé": "Archivés",
    corbeille: "Corbeille",
} as const;
```

(The existing `formatRelative` is unchanged — shown here only because it sits between the props and the label constant; keep a single copy.)

- [ ] **Step 2: Update the destructured params and the filter-tab list**

Change the function signature line:

```ts
export function ThreadList({
    threads, selectedId, statusFilter, search,
    onSelect, onStatusChange, onSearchChange, onEmptyTrash, counts,
}: Props) {
```

Change the tab `.map` array from `(["all", "nouveau", "répondu", "archivé"] as const)` to:

```ts
                    {(["all", "nouveau", "répondu", "archivé", "corbeille"] as const).map((s) => (
```

- [ ] **Step 3: Add the "Vider la corbeille" button**

Immediately after the closing `</div>` of the filter-tabs `flex flex-wrap` block (i.e. right before the closing `</div>` of the `p-3 border-b` header), insert:

```tsx
                {statusFilter === "corbeille" && counts.corbeille > 0 && (
                    <button
                        onClick={() => {
                            if (confirm(`Vider définitivement la corbeille (${counts.corbeille}) ? Action irréversible.`)) {
                                onEmptyTrash();
                            }
                        }}
                        className="w-full px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-[0.1em] border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                        Vider la corbeille ({counts.corbeille})
                    </button>
                )}
```

- [ ] **Step 4: Verify type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/messages/ThreadList.tsx`
Expected: exit 0. (Type errors will appear until Task 11 updates the caller `messages/page.tsx` — that is expected; if `tsc` flags only that prop mismatch, proceed; it is fixed in Task 11.)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/messages/ThreadList.tsx
git commit -m "feat(messages): corbeille tab + empty-trash button in ThreadList"
```

---

## Task 9: ReplyComposer — "Supprimer" (trash) button

**Files:**
- Modify: `src/components/admin/messages/ReplyComposer.tsx`

- [ ] **Step 1: Update imports and Props**

Change the lucide import line to add `Trash2`:

```ts
import { Send, Archive, ArchiveRestore, Trash2 } from "lucide-react";
```

Change the `Props` interface to add `onTrashed`:

```ts
interface Props {
    threadId: string;
    isArchived: boolean;
    onSent: () => void;
    onArchiveToggled: () => void;
    onTrashed: () => void;
}
```

Update the destructure:

```ts
export function ReplyComposer({ threadId, isArchived, onSent, onArchiveToggled, onTrashed }: Props) {
```

- [ ] **Step 2: Add the trash handler**

After the existing `toggleArchive` function, add:

```ts
    const trash = async () => {
        setError(null);
        try {
            const res = await fetch(`/api/admin/messages/${threadId}/trash`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok) {
                const { error: msg } = await res.json().catch(() => ({ error: "Échec" }));
                setError(msg || "Échec de la suppression");
                return;
            }
            onTrashed();
        } catch {
            setError("Erreur réseau");
        }
    };
```

- [ ] **Step 3: Add the Supprimer button next to Archiver**

Replace the left-side `<Button …>{isArchived ? … : …}</Button>` (the archive toggle) with a wrapping `<div className="flex items-center gap-1">` containing the archive button **and** the new trash button:

```tsx
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleArchive}
                        className="text-slate-400 hover:text-white"
                    >
                        {isArchived ? (
                            <>
                                <ArchiveRestore className="w-4 h-4 mr-1.5" /> Désarchiver
                            </>
                        ) : (
                            <>
                                <Archive className="w-4 h-4 mr-1.5" /> Archiver
                            </>
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={trash}
                        className="text-slate-400 hover:text-red-300"
                    >
                        <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
                    </Button>
                </div>
```

- [ ] **Step 4: Verify type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/messages/ReplyComposer.tsx`
Expected: exit 0 except an expected prop-mismatch on `ThreadDetail.tsx` (the caller) until Task 10.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/messages/ReplyComposer.tsx
git commit -m "feat(messages): add Supprimer (trash) button to ReplyComposer"
```

---

## Task 10: ThreadDetail — trashed actions + wire callbacks

**Files:**
- Modify: `src/components/admin/messages/ThreadDetail.tsx`

- [ ] **Step 1: Extend the DTO and imports**

Change the `ThreadDto` to add `deleted_at`:

```ts
interface ThreadDto {
    id: string;
    subject: string;
    from_name: string;
    from_email: string;
    status: "nouveau" | "répondu" | "archivé";
    created_at: string;
    deleted_at: string | null;
}
```

Change the lucide import to add the icons used by the trash actions:

```ts
import { ArrowLeft, Loader2, RotateCcw, Trash2 } from "lucide-react";
```

- [ ] **Step 2: Add restore / permanent-delete handlers**

Inside the component, after `load` is defined (before the `if (loading)` block), add:

```ts
    const restore = async () => {
        const res = await fetch(`/api/admin/messages/${threadId}/trash?restore=true`, {
            method: "POST",
            credentials: "include",
        });
        if (res.ok) {
            onBack();
            onChange();
        }
    };

    const deletePermanently = async () => {
        if (!confirm("Supprimer définitivement cette conversation ? Action irréversible.")) return;
        const res = await fetch(`/api/admin/messages/${threadId}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (res.ok) {
            onBack();
            onChange();
        }
    };
```

- [ ] **Step 3: Render trashed-action bar OR the composer**

Replace the existing `<ReplyComposer … />` block at the bottom of the returned JSX with:

```tsx
            {thread.deleted_at ? (
                <div className="border-t border-white/10 bg-[#0a1628] p-4 flex items-center gap-2">
                    <button
                        onClick={restore}
                        className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono uppercase tracking-[0.1em] border border-teal-500/30 text-teal-300 hover:bg-teal-500/10 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" /> Restaurer
                    </button>
                    <button
                        onClick={deletePermanently}
                        className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono uppercase tracking-[0.1em] border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> Supprimer définitivement
                    </button>
                </div>
            ) : (
                <ReplyComposer
                    threadId={thread.id}
                    isArchived={thread.status === "archivé"}
                    onSent={() => { load(); onChange(); }}
                    onArchiveToggled={() => { load(); onChange(); }}
                    onTrashed={() => { onBack(); onChange(); }}
                />
            )}
```

- [ ] **Step 4: Verify type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin/messages/ThreadDetail.tsx`
Expected: exit 0 except an expected prop-mismatch on `messages/page.tsx` until Task 11.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/messages/ThreadDetail.tsx
git commit -m "feat(messages): restore/permanent-delete actions for trashed threads"
```

---

## Task 11: MessagesPage — wire corbeille status, counts, empty-trash

**Files:**
- Modify: `src/app/admin/(dashboard)/messages/page.tsx`

- [ ] **Step 1: Extend the `Status` type and counts state**

Change:

```ts
type Status = "all" | "nouveau" | "répondu" | "archivé";
```
to:
```ts
type Status = "all" | "nouveau" | "répondu" | "archivé" | "corbeille";
```

Change the `counts` initial state to:

```ts
    const [counts, setCounts] = useState({ all: 0, nouveau: 0, "répondu": 0, "archivé": 0, corbeille: 0 });
```

- [ ] **Step 2: Fetch the corbeille count**

Replace the `fetchCounts` body with:

```ts
    const fetchCounts = useCallback(async () => {
        const [all, nouveau, repondu, archive, corbeille] = await Promise.all([
            fetch("/api/admin/messages", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/admin/messages?status=nouveau", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/admin/messages?status=r%C3%A9pondu", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/admin/messages?status=archiv%C3%A9", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/admin/messages?status=corbeille", { credentials: "include" }).then((r) => r.json()),
        ]);
        setCounts({
            all: all.total ?? 0,
            nouveau: nouveau.total ?? 0,
            "répondu": repondu.total ?? 0,
            "archivé": archive.total ?? 0,
            corbeille: corbeille.total ?? 0,
        });
    }, []);
```

- [ ] **Step 3: Add the empty-trash handler and pass it + deselect-on-change**

After `const handleChange = () => { fetchThreads(); fetchCounts(); };` add:

```ts
    const handleEmptyTrash = async () => {
        await fetch("/api/admin/messages/trash/empty", { method: "POST", credentials: "include" });
        setSelectedId(null);
        fetchThreads();
        fetchCounts();
    };
```

Add `onEmptyTrash={handleEmptyTrash}` to the `<ThreadList … />` props (alongside the existing `onStatusChange`, etc.).

- [ ] **Step 4: Verify type-check + lint + build**

Run: `npx tsc --noEmit && npx eslint "src/app/admin/(dashboard)/messages/page.tsx"`
Expected: exit 0 (the whole feature now type-checks end-to-end).

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(dashboard)/messages/page.tsx"
git commit -m "feat(messages): wire corbeille filter, count and empty-trash in MessagesPage"
```

---

## Task 12: Full verification + manual end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Type-check + lint the whole project**

Run: `npx tsc --noEmit && npx eslint src/app src/lib src/components`
Expected: exit 0.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds (all new routes compile).

- [ ] **Step 3: Manual end-to-end (against local `npm run dev` with prod env, or after deploy)**

Verify, logged in as admin at `/admin/messages`:
1. Open a conversation → click **Supprimer** → it disappears from the active list; the **Corbeille** tab count increments.
2. Open the **Corbeille** tab → the conversation is listed; composer is replaced by **Restaurer** / **Supprimer définitivement**.
3. **Restaurer** → conversation returns to its previous status list (e.g. Répondus), Corbeille count decrements.
4. Trash it again → **Supprimer définitivement** (confirm) → gone from Corbeille; verify in Supabase that the `contact_threads` row and its `contact_messages` are deleted and any attachment objects are removed from the `contact-attachments` bucket.
5. With ≥1 item in trash, **Vider la corbeille** (confirm) empties it.
6. Active counts and the sidebar unread badge ignore trashed items.

- [ ] **Step 4: Final commit (if any docs/notes changed)**

```bash
git add -A
git commit -m "chore(messages): trash feature verified" --allow-empty
```

---

## Notes for the implementer

- The admin client (`createAdminClient`) is untyped, so `.from(...)`/`.update(...)` accept the new `deleted_at` field without generated-type changes.
- `purgeThread` relies on the existing `on delete cascade` FK from `contact_messages.thread_id` — do not manually delete messages.
- Do not push to `origin/main` (auto-deploys production) until the migration (Task 1) is applied in Supabase, or the active-list queries selecting `deleted_at` will error in prod.
