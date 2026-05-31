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
