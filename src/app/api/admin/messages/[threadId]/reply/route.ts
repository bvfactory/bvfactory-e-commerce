import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReplyToken, buildQuoteBlock } from "@/lib/contact-messages";
import { sendContactReply } from "@/lib/contact-email";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ threadId: string }> },
) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    const body = await request.json().catch(() => null);
    const text = (body?.body ?? "").toString().trim();
    if (!text) {
        return NextResponse.json({ error: "Le corps du message est vide" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: thread, error: threadErr } = await supabase
        .from("contact_threads")
        .select("*")
        .eq("id", threadId)
        .single();
    if (threadErr || !thread) {
        return NextResponse.json({ error: "Thread introuvable" }, { status: 404 });
    }
    if (thread.status === "archivé") {
        return NextResponse.json({ error: "Thread archivé — désarchivez avant de répondre" }, { status: 400 });
    }
    if (thread.deleted_at) {
        return NextResponse.json({ error: "Thread en corbeille — restaurez avant de répondre" }, { status: 400 });
    }

    // Last inbound message — quoted in the reply.
    const { data: lastInbound } = await supabase
        .from("contact_messages")
        .select("body_text, created_at")
        .eq("thread_id", threadId)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const quoted = lastInbound
        ? buildQuoteBlock(
              thread.from_name,
              thread.from_email,
              new Date(lastInbound.created_at),
              lastInbound.body_text,
          )
        : "";

    const replyToken = generateReplyToken();
    // Defaults to the root domain because that is the domain with Resend
    // inbound/receiving enabled (verified MX). The Reply-To becomes
    // reply+<token>@bvfactory.dev, which the existing inbound pipeline accepts.
    const replyDomain = process.env.CONTACT_REPLY_DOMAIN || "bvfactory.dev";

    // Insert outbound row BEFORE sending so we never have an orphan email
    // without a DB record. resend_email_id is filled in after send succeeds.
    const now = new Date().toISOString();
    const { data: inserted, error: insertErr } = await supabase
        .from("contact_messages")
        .insert({
            thread_id: threadId,
            direction: "outbound",
            reply_token: replyToken,
            body_text: text, // seed with admin input so a post-send update failure still renders
            body_html: null,
        })
        .select()
        .single();

    if (insertErr || !inserted) {
        console.error("[admin reply] pre-send insert failed", insertErr);
        return NextResponse.json({ error: "Échec persistance" }, { status: 500 });
    }

    let sent;
    try {
        sent = await sendContactReply({
            to: thread.from_email,
            subject: thread.subject,
            bodyText: text,
            quotedText: quoted,
            replyToken,
            replyDomain,
        });
    } catch (err) {
        console.error("[admin reply] send failed", err);
        // Roll back the orphan row so a retry doesn't accumulate tokens.
        await supabase.from("contact_messages").delete().eq("id", inserted.id);
        return NextResponse.json({ error: "Échec de l'envoi" }, { status: 500 });
    }

    // Update the row with the actual rendered bodies + Resend id.
    const { data: updated, error: updateErr } = await supabase
        .from("contact_messages")
        .update({
            resend_email_id: sent.resendEmailId,
            body_text: sent.plainTextBody,
            body_html: sent.htmlBody,
        })
        .eq("id", inserted.id)
        .select()
        .single();

    if (updateErr) {
        // Email sent, row exists with reply_token. Log but don't fail the admin
        // — the visitor received the email and the row is still linkable via reply_token.
        console.error("[admin reply] post-send update failed (non-fatal)", updateErr);
    }

    await supabase
        .from("contact_threads")
        .update({
            status: "répondu",
            last_message_at: now,
            updated_at: now,
        })
        .eq("id", threadId);

    return NextResponse.json({ message: updated ?? inserted, status: "répondu" });
}
