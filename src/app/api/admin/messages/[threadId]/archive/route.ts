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
    const { searchParams } = new URL(request.url);
    const unarchive = searchParams.get("unarchive") === "true";

    const supabase = createAdminClient();

    let nextStatus: "archivé" | "nouveau" | "répondu" = "archivé";
    if (unarchive) {
        // Restore: if at least one outbound message exists → "répondu", else → "nouveau".
        const { count } = await supabase
            .from("contact_messages")
            .select("id", { count: "exact", head: true })
            .eq("thread_id", threadId)
            .eq("direction", "outbound");
        nextStatus = (count ?? 0) > 0 ? "répondu" : "nouveau";
    }

    const { data, error } = await supabase
        .from("contact_threads")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", threadId)
        .select()
        .single();

    if (error || !data) {
        return NextResponse.json({ error: error?.message || "Not found" }, { status: 404 });
    }

    return NextResponse.json({ thread: data });
}
