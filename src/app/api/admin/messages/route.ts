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
        await purgeExpiredTrash(supabase, 30).catch((e) =>
            console.error("[trash] lazy purge error", e),
        );
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
