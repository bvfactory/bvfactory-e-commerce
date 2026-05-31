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

    const { data: current, error: fetchErr } = await supabase
        .from("contact_threads")
        .select("*")
        .eq("id", threadId)
        .single();
    if (fetchErr || !current) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Re-trashing an already-trashed thread must not reset its purge clock.
    if (!restore && current.deleted_at) {
        return NextResponse.json({ thread: current });
    }

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
