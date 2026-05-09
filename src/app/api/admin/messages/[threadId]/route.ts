import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

interface AttachmentRow {
    filename: string;
    storage_path: string;
    size: number;
    mime: string;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ threadId: string }> },
) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    const supabase = createAdminClient();

    const { data: thread, error: threadErr } = await supabase
        .from("contact_threads")
        .select("*")
        .eq("id", threadId)
        .single();

    if (threadErr || !thread) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: messages, error: msgErr } = await supabase
        .from("contact_messages")
        .select("id, direction, body_text, body_html, attachments, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

    // Sign attachment URLs (flat list per message).
    const decorated = await Promise.all(
        (messages ?? []).map(async (m) => {
            const atts = (m.attachments as AttachmentRow[] | null) ?? [];
            const signed = await Promise.all(
                atts.map(async (a) => {
                    const { data: sig, error: sigErr } = await supabase.storage
                        .from("contact-attachments")
                        .createSignedUrl(a.storage_path, SIGNED_URL_TTL_SECONDS);
                    if (sigErr) {
                        console.error("[messages] signed URL failed:", a.storage_path, sigErr);
                    }
                    return { ...a, signed_url: sig?.signedUrl ?? null };
                }),
            );
            return { ...m, attachments: signed };
        }),
    );

    return NextResponse.json({ thread, messages: decorated });
}
