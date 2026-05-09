import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    extractReplyToken,
    stripQuotedReply,
    verifyWebhookSignature,
} from "@/lib/contact-messages";
import { sendAdminNotification } from "@/lib/email";

const MAX_FILE_BYTES = 10 * 1024 * 1024;   // 10 MB per file
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;  // 25 MB total

interface InboundAttachment {
    filename: string;
    content_type: string;
    content: string; // base64
    size?: number;
}

interface InboundFrom {
    email?: string;
    name?: string;
}

interface InboundData {
    id?: string;
    from?: InboundFrom | string;
    to?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    attachments?: InboundAttachment[];
}

interface InboundPayload {
    type?: string;
    data?: InboundData;
}

function parseFrom(from: InboundFrom | string | undefined): { name: string; email: string } {
    if (!from) return { name: "", email: "" };
    if (typeof from === "string") {
        const match = from.match(/^\s*(?:"?([^"<]*?)"?\s*)?<?([^>\s]+@[^>\s]+)>?\s*$/);
        return { name: (match?.[1] || "").trim(), email: (match?.[2] || from).trim() };
    }
    return { name: from.name || "", email: from.email || "" };
}

function firstTo(to: string | string[] | undefined): string {
    if (!to) return "";
    return Array.isArray(to) ? to[0] : to;
}

function htmlToText(html: string): string {
    return html.replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .trim();
}

export async function POST(request: Request) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
        console.error("[inbound] RESEND_WEBHOOK_SECRET not set");
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const rawBody = await request.text();
    const sigHeader = request.headers.get("resend-signature");
    if (!verifyWebhookSignature(rawBody, sigHeader, secret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: InboundPayload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const data = payload.data;
    if (!data) {
        return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Idempotency: if we've already seen this resend id, ack and return.
    if (data.id) {
        const { data: existing } = await supabase
            .from("contact_messages")
            .select("id")
            .eq("resend_email_id", data.id)
            .maybeSingle();
        if (existing) {
            return NextResponse.json({ ok: true, deduped: true });
        }
    }

    const to = firstTo(data.to);
    const token = extractReplyToken(to);
    const from = parseFrom(data.from);
    const subject = data.subject || "(sans sujet)";
    const rawText = data.text || (data.html ? htmlToText(data.html) : "");
    const bodyText = stripQuotedReply(rawText) || rawText;
    const inReplyTo = data.headers?.["in-reply-to"] || null;

    // Find thread by token → outbound message → thread_id.
    let threadId: string | null = null;
    if (token) {
        const { data: outboundMsg } = await supabase
            .from("contact_messages")
            .select("thread_id")
            .eq("reply_token", token)
            .maybeSingle();
        threadId = outboundMsg?.thread_id ?? null;
    }

    // Fallback: unknown token → create a new orphan thread.
    if (!threadId) {
        if (!from.email) {
            console.warn("[inbound] rejected: no from.email and no matching token", { to, subject });
            return NextResponse.json({ error: "Missing sender" }, { status: 400 });
        }
        const { data: newThread, error: threadErr } = await supabase
            .from("contact_threads")
            .insert({
                subject,
                from_name: from.name || from.email,
                from_email: from.email,
                status: "nouveau",
            })
            .select()
            .single();
        if (threadErr || !newThread) {
            console.error("[inbound] orphan thread insert failed", threadErr);
            return NextResponse.json({ error: "Persist failed" }, { status: 500 });
        }
        threadId = newThread.id;
    }

    // Process attachments — upload to Supabase Storage under <thread>/<msg>/<filename>.
    const uploaded: Array<{ filename: string; storage_path: string; size: number; mime: string }> = [];
    let skippedForSize = false;

    if (data.attachments && data.attachments.length > 0) {
        let total = 0;
        for (const att of data.attachments) {
            // Base64 encodes 3 bytes as 4 chars → decoded size ≈ content.length * 0.75
            if (att.content.length * 0.75 > MAX_FILE_BYTES) { skippedForSize = true; continue; }
            const buf = Buffer.from(att.content, "base64");
            if (buf.byteLength > MAX_FILE_BYTES) { skippedForSize = true; continue; }
            total += buf.byteLength;
            if (total > MAX_TOTAL_BYTES) { skippedForSize = true; break; }

            const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment";
            const storagePath = `${threadId}/${Date.now()}-${safeName}`;
            const { error: upErr } = await supabase.storage
                .from("contact-attachments")
                .upload(storagePath, buf, { contentType: att.content_type, upsert: false });
            if (upErr) {
                console.error("[inbound] attachment upload failed", upErr);
                continue;
            }
            uploaded.push({
                filename: att.filename,
                storage_path: storagePath,
                size: buf.byteLength,
                mime: att.content_type,
            });
        }
    }

    const finalBody = skippedForSize && uploaded.length === 0
        ? `${bodyText}\n\n[pièce jointe ignorée : trop volumineuse]`
        : bodyText;

    const { error: msgErr } = await supabase.from("contact_messages").insert({
        thread_id: threadId,
        direction: "inbound",
        body_text: finalBody || "",
        body_html: data.html || null,
        resend_email_id: data.id || null,
        in_reply_to: inReplyTo,
        attachments: uploaded,
    });

    if (msgErr) {
        console.error("[inbound] message insert failed", msgErr);
        return NextResponse.json({ error: "Persist failed" }, { status: 500 });
    }

    await supabase
        .from("contact_threads")
        .update({
            status: "nouveau",
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", threadId);

    sendAdminNotification("contact_received", `Reply — ${subject}`, {
        "De": `${from.name} <${from.email}>`,
        "Sujet": subject,
        "Message": (finalBody || "").length > 500 ? finalBody.substring(0, 500) + "..." : (finalBody || ""),
    });

    return NextResponse.json({ ok: true });
}
