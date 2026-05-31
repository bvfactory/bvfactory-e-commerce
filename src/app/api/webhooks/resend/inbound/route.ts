import { NextResponse } from "next/server";
import { Resend } from "resend";
import type { WebhookEventPayload, AttachmentData } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractReplyToken, stripQuotedReply } from "@/lib/contact-messages";
import { sendAdminNotification } from "@/lib/email";

const MAX_FILE_BYTES = 10 * 1024 * 1024;   // 10 MB per file
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;  // 25 MB total

type UploadedAttachment = { filename: string; storage_path: string; size: number; mime: string };

function parseFrom(from: string | undefined): { name: string; email: string } {
    if (!from) return { name: "", email: "" };
    // "Display Name <email@host>" → split on the angle brackets.
    const angle = from.match(/<([^>]+)>/);
    if (angle) {
        const name = from.slice(0, from.indexOf("<")).replace(/"/g, "").trim();
        return { name, email: angle[1].trim() };
    }
    // Bare address (no display name, no brackets) → the whole string is the email.
    return { name: "", email: from.trim() };
}

/** Find the first `reply+<token>@…` address among the recipients. */
function findReplyToken(addresses: string[]): string | null {
    for (const addr of addresses) {
        const token = extractReplyToken(addr);
        if (token) return token;
    }
    return null;
}

/** Case-insensitive header lookup (Resend returns a plain object). */
function header(headers: Record<string, string> | null | undefined, name: string): string | null {
    if (!headers) return null;
    const target = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
        if (k.toLowerCase() === target) return v;
    }
    return null;
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

/**
 * Download inbound attachments (Resend stores them; the webhook carries only
 * metadata) and upload them to the private Supabase bucket. Returns the rows to
 * persist and whether any file was skipped for size.
 */
async function storeAttachments(
    resend: Resend,
    supabase: ReturnType<typeof createAdminClient>,
    emailId: string,
    threadId: string,
): Promise<{ uploaded: UploadedAttachment[]; skippedForSize: boolean }> {
    const uploaded: UploadedAttachment[] = [];
    let skippedForSize = false;

    let list: AttachmentData[] = [];
    try {
        const res = await resend.emails.receiving.attachments.list({ emailId });
        list = res.data?.data ?? [];
    } catch (err) {
        console.error("[inbound] attachment list failed", err);
        return { uploaded, skippedForSize };
    }

    let total = 0;
    for (const att of list) {
        if (att.size > MAX_FILE_BYTES) { skippedForSize = true; continue; }
        if (total + att.size > MAX_TOTAL_BYTES) { skippedForSize = true; break; }

        let buf: Buffer;
        try {
            const r = await fetch(att.download_url);
            if (!r.ok) { console.error("[inbound] attachment download failed", att.id, r.status); continue; }
            buf = Buffer.from(await r.arrayBuffer());
        } catch (err) {
            console.error("[inbound] attachment fetch error", att.id, err);
            continue;
        }
        total += buf.byteLength;

        const safeName = (att.filename || "attachment").replace(/[^a-zA-Z0-9._-]/g, "_") || "attachment";
        const storagePath = `${threadId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
            .from("contact-attachments")
            .upload(storagePath, buf, { contentType: att.content_type, upsert: false });
        if (upErr) {
            console.error("[inbound] attachment upload failed", upErr);
            continue;
        }
        uploaded.push({
            filename: att.filename || safeName,
            storage_path: storagePath,
            size: buf.byteLength,
            mime: att.content_type,
        });
    }

    return { uploaded, skippedForSize };
}

export async function POST(request: Request) {
    const apiKey = process.env.RESEND_API_KEY;
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!apiKey || !secret) {
        console.error("[inbound] RESEND_API_KEY or RESEND_WEBHOOK_SECRET not set");
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const rawBody = await request.text();
    const resend = new Resend(apiKey);

    // Verify the Svix signature (svix-id / svix-timestamp / svix-signature
    // headers, base64). The SDK throws on any mismatch or replay.
    let event: WebhookEventPayload;
    try {
        event = resend.webhooks.verify({
            payload: rawBody,
            headers: {
                id: request.headers.get("svix-id") ?? "",
                timestamp: request.headers.get("svix-timestamp") ?? "",
                signature: request.headers.get("svix-signature") ?? "",
            },
            webhookSecret: secret,
        });
    } catch (err) {
        console.error("[inbound] signature verification failed", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Only inbound received emails are processed; ack any other event type.
    if (event.type !== "email.received") {
        return NextResponse.json({ ok: true, ignored: event.type });
    }

    const data = event.data;
    const emailId = data.email_id;
    if (!emailId) {
        console.error("[inbound] email.received without email_id", data);
        return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Idempotency: Resend retries webhooks. Dedupe on the received email id.
    {
        const { data: existing } = await supabase
            .from("contact_messages")
            .select("id")
            .eq("resend_email_id", emailId)
            .maybeSingle();
        if (existing) {
            return NextResponse.json({ ok: true, deduped: true });
        }
    }

    // The root domain's MX points at Resend inbound, so any mail WE send (admin
    // notifications, order receipts, contact-form backups) loops back into this
    // webhook. Ignore anything from our own domain — real visitors are never
    // @bvfactory.dev. This is the loop circuit-breaker.
    const from = parseFrom(data.from);
    if (from.email.toLowerCase().endsWith("@bvfactory.dev")) {
        return NextResponse.json({ ok: true, ignored: "self-domain" });
    }

    // The webhook is metadata-only — fetch body, headers and reply-to from the
    // stored email.
    let html: string | null = null;
    let text: string | null = null;
    let headers: Record<string, string> | null = null;
    let fetchOk = false;
    try {
        const full = await resend.emails.receiving.get(emailId);
        if (full.data) {
            html = full.data.html;
            text = full.data.text;
            headers = full.data.headers;
            fetchOk = true;
        } else if (full.error) {
            console.error("[inbound] receiving.get error", full.error);
        }
    } catch (err) {
        console.error("[inbound] receiving.get failed", err);
    }

    // If the body could not be retrieved, bail with a 5xx BEFORE persisting
    // anything. Otherwise we would store a permanent empty message (with
    // resend_email_id set), and the idempotency check above would then block
    // every retry from ever backfilling it. Resend retries on non-2xx, so a
    // transient failure self-heals; a genuinely empty email still has
    // fetchOk === true (empty text/html) and is persisted normally.
    if (!fetchOk) {
        return NextResponse.json({ error: "Body unavailable, retry later" }, { status: 503 });
    }

    const recipients = [...(data.to ?? []), ...(data.cc ?? [])];
    const token = findReplyToken(recipients);
    const subject = data.subject || "(sans sujet)";
    const rawText = text || (html ? htmlToText(html) : "");
    const bodyText = stripQuotedReply(rawText) || rawText;
    const inReplyTo = header(headers, "in-reply-to");

    // Resolve the thread: known token → existing thread; otherwise a new one.
    let threadId: string | null = null;
    let createdThreadId: string | null = null;
    if (token) {
        const { data: outboundMsg } = await supabase
            .from("contact_messages")
            .select("thread_id")
            .eq("reply_token", token)
            .maybeSingle();
        threadId = outboundMsg?.thread_id ?? null;
    }

    if (!threadId) {
        if (!from.email) {
            console.warn("[inbound] rejected: no from.email and no matching token", { recipients, subject });
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
        createdThreadId = newThread.id;
    }

    if (!threadId) {
        console.error("[inbound] unresolved thread id");
        return NextResponse.json({ error: "Persist failed" }, { status: 500 });
    }

    const { uploaded, skippedForSize } = data.attachments && data.attachments.length > 0
        ? await storeAttachments(resend, supabase, emailId, threadId)
        : { uploaded: [] as UploadedAttachment[], skippedForSize: false };

    const finalBody = skippedForSize && uploaded.length === 0
        ? `${bodyText}\n\n[pièce jointe ignorée : trop volumineuse]`
        : bodyText;

    const { error: msgErr } = await supabase.from("contact_messages").insert({
        thread_id: threadId,
        direction: "inbound",
        body_text: finalBody || "",
        body_html: html,
        resend_email_id: emailId,
        in_reply_to: inReplyTo,
        attachments: uploaded,
    });

    if (msgErr) {
        console.error("[inbound] message insert failed", msgErr);
        // A unique-violation on resend_email_id means a concurrent delivery of
        // the same email won the race. If we created a fresh thread for this
        // (tokenless) email, roll it back so it doesn't linger as an empty
        // conversation in the admin webmail.
        if (createdThreadId) {
            await supabase.from("contact_threads").delete().eq("id", createdThreadId);
        }
        return NextResponse.json({ error: "Persist failed" }, { status: 500 });
    }

    const nowIso = new Date().toISOString();
    await supabase
        .from("contact_threads")
        .update({ status: "nouveau", last_message_at: nowIso, updated_at: nowIso })
        .eq("id", threadId);

    // Deferred internally via after() — guaranteed to send after the response.
    sendAdminNotification("contact_received", `Réponse — ${subject}`, {
        "De": `${from.name} <${from.email}>`,
        "Sujet": subject,
        "Message": (finalBody || "").length > 500 ? finalBody.substring(0, 500) + "..." : (finalBody || ""),
    });

    return NextResponse.json({ ok: true });
}
