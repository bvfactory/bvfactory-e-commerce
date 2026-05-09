# Admin Webmail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a threaded webmail inside the admin panel so the operator can read contact-form submissions, reply to visitors, and have their replies route back into the same conversation thread via Resend Inbound.

**Architecture:** New Supabase tables `contact_threads` + `contact_messages` persist conversations. `/api/contact` writes the first message. Outbound admin replies go through Resend with a unique reply token in the `Reply-To` address. Resend Inbound forwards visitor replies to `/api/webhooks/resend/inbound`, which matches the token to the thread. Admin UI at `/admin/messages` shows threads with list+detail split layout.

**Tech Stack:** Next.js 16 App Router · Supabase (PG + Storage) · Resend (send + inbound webhook) · React 19 · Tailwind v4 · lucide-react icons.

**Spec:** `docs/superpowers/specs/2026-04-16-admin-webmail-design.md`

**Testing approach:** The project does not currently use a JS test runner (no vitest/jest in deps). All verifications are manual via `curl`, browser inspection, and Supabase SQL. Where unit-testable logic is non-trivial (HMAC verify, subject prefixing, quoted-reply stripping), the plan extracts it into pure functions — the operator can add vitest later if desired.

---

## File Structure

**Create:**
- `supabase/migrations/20260416_add_contact_threads.sql` — tables + storage bucket
- `src/lib/contact-messages.ts` — pure helpers (token, subject, quote, signature, strip-reply, HMAC verify)
- `src/lib/contact-email.ts` — Resend send wrappers + HTML rendering
- `src/app/api/webhooks/resend/inbound/route.ts` — inbound webhook
- `src/app/api/admin/messages/route.ts` — list threads
- `src/app/api/admin/messages/[threadId]/route.ts` — thread detail
- `src/app/api/admin/messages/[threadId]/reply/route.ts` — send reply
- `src/app/api/admin/messages/[threadId]/archive/route.ts` — archive
- `src/app/admin/(dashboard)/messages/page.tsx` — admin page (client)
- `src/components/admin/messages/ThreadList.tsx`
- `src/components/admin/messages/ThreadDetail.tsx`
- `src/components/admin/messages/MessageBubble.tsx`
- `src/components/admin/messages/ReplyComposer.tsx`
- `src/components/admin/messages/AttachmentLink.tsx`

**Modify:**
- `src/app/api/contact/route.ts` — also write thread+message to DB
- `src/components/admin/AdminSidebar.tsx` — add "Messages" nav item with unread badge
- `CLAUDE.md` — add env vars `RESEND_WEBHOOK_SECRET`, `CONTACT_REPLY_DOMAIN` to the required-env list

---

## Task 1: Database migration — tables and storage bucket

**Files:**
- Create: `supabase/migrations/20260416_add_contact_threads.sql`

- [ ] **Step 1.1: Write the migration SQL**

```sql
-- Persist visitor ↔ admin conversations started via the /contact form.
create table if not exists public.contact_threads (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  from_name       text not null,
  from_email      text not null,
  status          text not null default 'nouveau'
                  check (status in ('nouveau', 'répondu', 'archivé')),
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists contact_threads_status_last_message_idx
  on public.contact_threads (status, last_message_at desc);
create index if not exists contact_threads_from_email_idx
  on public.contact_threads (from_email);

alter table public.contact_threads enable row level security;
-- No policies: server-only access via service_role key.

create table if not exists public.contact_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references public.contact_threads(id) on delete cascade,
  direction       text not null check (direction in ('inbound', 'outbound')),
  reply_token     text unique,
  body_text       text not null,
  body_html       text,
  resend_email_id text unique,
  in_reply_to     text,
  attachments     jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists contact_messages_thread_idx
  on public.contact_messages (thread_id, created_at);
create index if not exists contact_messages_reply_token_idx
  on public.contact_messages (reply_token)
  where reply_token is not null;

alter table public.contact_messages enable row level security;
-- No policies: server-only access via service_role key.

-- Private bucket for inbound attachments.
insert into storage.buckets (id, name, public)
values ('contact-attachments', 'contact-attachments', false)
on conflict (id) do nothing;
```

- [ ] **Step 1.2: Apply migration to Supabase**

Run via the Supabase MCP (project `wmpnxnnhxvskojpujauv`) or `supabase db push` if linked locally. Confirm with:

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('contact_threads','contact_messages');
```

Expected: 2 rows.

- [ ] **Step 1.3: Commit**

```bash
git add supabase/migrations/20260416_add_contact_threads.sql
git commit -m "feat(db): add contact_threads and contact_messages tables"
```

---

## Task 2: Pure helpers in `src/lib/contact-messages.ts`

**Files:**
- Create: `src/lib/contact-messages.ts`

- [ ] **Step 2.1: Implement token + subject helpers**

```ts
// src/lib/contact-messages.ts
import { randomBytes, createHmac, timingSafeEqual } from "crypto";

/** 16 random bytes hex-encoded (32 chars). Used in Reply-To addresses. */
export function generateReplyToken(): string {
    return randomBytes(16).toString("hex");
}

/** Extract the reply token from an inbound `to` address. Returns null if not matched. */
export function extractReplyToken(toAddress: string): string | null {
    const match = toAddress.match(/reply\+([a-f0-9]{32})@/i);
    return match ? match[1].toLowerCase() : null;
}

/** Ensure a subject is prefixed with "Re: " (case-insensitive, single occurrence). */
export function prefixReplySubject(subject: string): string {
    return /^re:\s*/i.test(subject) ? subject : `Re: ${subject}`;
}
```

- [ ] **Step 2.2: Add quoted-reply + signature helpers**

Append to the same file:

```ts
/** Build the signature block appended to every outbound reply. */
export function buildSignatureText(): string {
    return "\n\n— Benjamin · BVFactory\ncontact@bvfactory.dev · https://bvfactory.dev";
}

/**
 * Strip the quoted part of a reply email body. Handles common reply patterns:
 * "On <date>, <person> wrote:" and lines starting with ">".
 * Returns the new content only.
 */
export function stripQuotedReply(text: string): string {
    if (!text) return "";

    const lines = text.split(/\r?\n/);
    const out: string[] = [];

    for (const line of lines) {
        // Common reply markers
        if (/^on .+ wrote:\s*$/i.test(line)) break;
        if (/^le .+ a écrit\s*:?\s*$/i.test(line)) break;
        if (/^-{3,}\s*(original message|message original)\s*-{3,}/i.test(line)) break;
        if (/^>\s?/.test(line)) break;
        out.push(line);
    }

    return out.join("\n").trim();
}

/** Build a plain-text quote block from the most recent inbound message. */
export function buildQuoteBlock(fromName: string, fromEmail: string, createdAt: Date, body: string): string {
    const dateStr = createdAt.toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const header = `Le ${dateStr}, ${fromName} <${fromEmail}> a écrit :`;
    const quoted = body.split(/\r?\n/).map((l) => `> ${l}`).join("\n");
    return `\n\n${header}\n${quoted}`;
}
```

- [ ] **Step 2.3: Add HMAC signature verification**

Append to the same file:

```ts
/**
 * Verify a Resend inbound webhook signature.
 * Resend signs the body with HMAC-SHA256 and sends the hex digest in the
 * `resend-signature` header (format: `t=<timestamp>,v1=<hex>`).
 *
 * We compute HMAC over `${timestamp}.${rawBody}` and compare using a
 * constant-time comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
    secret: string,
): boolean {
    if (!signatureHeader || !secret) return false;

    const parts = Object.fromEntries(
        signatureHeader.split(",").map((p) => p.split("=").map((s) => s.trim())),
    );
    const ts = parts.t;
    const sig = parts.v1;
    if (!ts || !sig) return false;

    // Reject timestamps older than 5 minutes (replay protection).
    const tsMs = Number(ts) * 1000;
    if (!Number.isFinite(tsMs)) return false;
    if (Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) return false;

    const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
    if (sig.length !== expected.length) return false;

    try {
        return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
    } catch {
        return false;
    }
}
```

> Note: if Resend's actual signature header format differs from the above (verify in their docs during Task 10), adjust the parser. The HMAC computation strategy is standard.

- [ ] **Step 2.4: Manual verify with a scratch script**

Create `/tmp/verify-contact-helpers.mjs`:

```js
import {
    generateReplyToken, extractReplyToken, prefixReplySubject,
    stripQuotedReply, buildQuoteBlock, verifyWebhookSignature,
} from "../Users/ben/Documents/DEV/bvfactory-e-commerce/src/lib/contact-messages.ts";

// Need tsx or ts-node. Simpler: run inline checks via node in a built project.
```

Instead, run in a next-dev REPL by importing from the running app, OR run `npx tsx /tmp/scratch.ts` with contents:

```ts
import { generateReplyToken, extractReplyToken, prefixReplySubject, stripQuotedReply } from "@/lib/contact-messages";
const t = generateReplyToken();
console.assert(t.length === 32);
console.assert(extractReplyToken(`reply+${t}@reply.bvfactory.dev`) === t);
console.assert(extractReplyToken("contact@bvfactory.dev") === null);
console.assert(prefixReplySubject("Question") === "Re: Question");
console.assert(prefixReplySubject("Re: Question") === "Re: Question");
console.assert(prefixReplySubject("RE:  hi") === "RE:  hi");
console.assert(stripQuotedReply("Hello\n\nOn Thu, John wrote:\n> prev") === "Hello");
console.assert(stripQuotedReply("Hi\n> previous") === "Hi");
console.log("OK");
```

Expected: prints `OK`. If you'd rather skip the scratch file, eyeball-read the assertions — they're the spec.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/contact-messages.ts
git commit -m "feat(contact): add pure helpers for webmail threading"
```

---

## Task 3: Email rendering + Resend send wrapper

**Files:**
- Create: `src/lib/contact-email.ts`

- [ ] **Step 3.1: Implement HTML escape + plain-to-HTML renderer**

```ts
// src/lib/contact-email.ts
import { Resend } from "resend";
import { buildSignatureText, prefixReplySubject } from "./contact-messages";

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Render a plain-text admin reply into a branded HTML email. */
export function renderReplyHtml(bodyText: string): string {
    const bodyHtml = escapeHtml(bodyText).replace(/\n/g, "<br/>");
    const sigHtml = escapeHtml(buildSignatureText().trim()).replace(/\n/g, "<br/>");

    return `
    <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; color: #111; background-color: #fafafa; padding: 0;">
        <div style="background-color: #0a0a0a; padding: 30px 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 18px; letter-spacing: 2px; text-transform: uppercase;">BVFactory</h1>
            <p style="color: #14b8a6; margin: 8px 0 0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Show Control Division</p>
        </div>
        <div style="padding: 24px;">
            <div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #111;">
                ${bodyHtml}
            </div>
            <p style="font-family: sans-serif; font-size: 13px; color: #444; border-top: 1px solid #ddd; padding-top: 16px; margin-top: 24px; line-height: 1.6;">
                ${sigHtml}
            </p>
        </div>
    </div>`;
}
```

- [ ] **Step 3.2: Implement `sendContactReply` wrapper**

Append to the same file:

```ts
export interface SendReplyArgs {
    to: string;
    subject: string;
    bodyText: string;   // admin-authored, plain text
    quotedText: string; // pre-built quote block (pure text)
    replyToken: string;
    replyDomain: string; // e.g. "reply.bvfactory.dev"
}

export interface SendReplyResult {
    resendEmailId: string;
    finalSubject: string;
    plainTextBody: string; // what actually got sent (with signature + quote)
    htmlBody: string;
}

/** Send an admin reply via Resend. Throws on failure. */
export async function sendContactReply(args: SendReplyArgs): Promise<SendReplyResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");

    const resend = new Resend(apiKey);
    const finalSubject = prefixReplySubject(args.subject);
    const signature = buildSignatureText();
    const plainTextBody = `${args.bodyText}${signature}${args.quotedText}`;
    const htmlBody = renderReplyHtml(args.bodyText);

    const result = await resend.emails.send({
        from: "BVFactory <contact@bvfactory.dev>",
        to: args.to,
        replyTo: `reply+${args.replyToken}@${args.replyDomain}`,
        subject: finalSubject,
        html: htmlBody,
        text: plainTextBody,
    });

    if (result.error) {
        throw new Error(`Resend send failed: ${result.error.message}`);
    }
    if (!result.data?.id) {
        throw new Error("Resend returned no email id");
    }

    return {
        resendEmailId: result.data.id,
        finalSubject,
        plainTextBody,
        htmlBody,
    };
}
```

- [ ] **Step 3.3: Commit**

```bash
git add src/lib/contact-email.ts
git commit -m "feat(contact): add Resend reply send wrapper and HTML renderer"
```

---

## Task 4: Modify `/api/contact` to persist thread + message

**Files:**
- Modify: `src/app/api/contact/route.ts`

- [ ] **Step 4.1: Replace the route with the DB-writing version**

Overwrite `src/app/api/contact/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { sendAdminNotification } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
    try {
        const { name, email, subject, message } = await req.json();

        if (!name || !email || !subject || !message) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Persist thread + initial inbound message.
        const supabase = createAdminClient();

        const { data: thread, error: threadErr } = await supabase
            .from("contact_threads")
            .insert({
                subject,
                from_name: name,
                from_email: email,
                status: "nouveau",
            })
            .select()
            .single();

        if (threadErr || !thread) {
            console.error("Contact thread insert failed:", threadErr);
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        const { error: msgErr } = await supabase.from("contact_messages").insert({
            thread_id: thread.id,
            direction: "inbound",
            body_text: message,
            body_html: null,
        });

        if (msgErr) {
            console.error("Contact message insert failed:", msgErr);
            // Thread remains but without message — surfaced in admin as empty thread.
        }

        // Backup email to contact inbox (keeps current workflow working).
        if (process.env.RESEND_API_KEY) {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            const contactEmail = process.env.CONTACT_EMAIL || "contact@bvfactory.dev";

            await resend.emails.send({
                from: "BVFactory Contact <noreply@bvfactory.dev>",
                to: contactEmail,
                replyTo: email,
                subject: `[Contact Form] ${subject} — from ${name}`,
                html: `
                    <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; color: #111; background-color: #fafafa; padding: 20px;">
                        <h2 style="text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 10px;">New Contact Form Submission</h2>
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                            <tr><td style="padding: 8px 0; font-weight: bold; width: 100px;">Name:</td><td>${name}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Subject:</td><td>${subject}</td></tr>
                        </table>
                        <div style="background: #eee; padding: 15px; border-radius: 4px; margin-top: 20px;">
                            <p style="font-weight: bold; margin: 0 0 10px 0;">Message:</p>
                            <p style="white-space: pre-wrap; margin: 0;">${message}</p>
                        </div>
                        <p style="font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
                            BVFactory Show Control Division — Contact Form
                        </p>
                    </div>
                `,
            });
        } else {
            console.log("📬 Contact Form Submission:", { name, email, subject, message });
        }

        sendAdminNotification("contact_received", subject, {
            "Nom": name,
            "Email": email,
            "Sujet": subject,
            "Message": message.length > 500 ? message.substring(0, 500) + "..." : message,
        });

        return NextResponse.json({ success: true, threadId: thread.id });
    } catch (error) {
        console.error("Contact form error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
```

- [ ] **Step 4.2: Test locally**

Start dev server, then:

```bash
curl -X POST http://localhost:3000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","subject":"Plan test","message":"Hello from curl"}'
```

Expected: `{"success":true,"threadId":"<uuid>"}`.

Verify in Supabase:

```sql
select id, subject, from_email, status from contact_threads order by created_at desc limit 1;
select thread_id, direction, body_text from contact_messages order by created_at desc limit 1;
```

Expected: 1 row in each, `direction='inbound'`.

- [ ] **Step 4.3: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "feat(contact): persist submissions in contact_threads and contact_messages"
```

---

## Task 5: Inbound webhook `/api/webhooks/resend/inbound`

**Files:**
- Create: `src/app/api/webhooks/resend/inbound/route.ts`

- [ ] **Step 5.1: Implement the handler**

Full route content:

```ts
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

interface InboundPayload {
    type?: string;
    data?: {
        id?: string;
        from?: { email?: string; name?: string } | string;
        to?: string | string[];
        subject?: string;
        text?: string;
        html?: string;
        headers?: Record<string, string>;
        attachments?: InboundAttachment[];
    };
}

function parseFrom(from: InboundPayload["data"] extends infer T ? (T extends { from?: infer F } ? F : never) : never): { name: string; email: string } {
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
            const buf = Buffer.from(att.content, "base64");
            if (buf.byteLength > MAX_FILE_BYTES) { skippedForSize = true; continue; }
            total += buf.byteLength;
            if (total > MAX_TOTAL_BYTES) { skippedForSize = true; break; }

            const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
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
```

- [ ] **Step 5.2: Local test with a stubbed signed payload**

With `RESEND_WEBHOOK_SECRET=test-secret` in `.env.local`:

```bash
BODY='{"type":"email.received","data":{"id":"test-123","from":{"email":"v@example.com","name":"V"},"to":"reply+00000000000000000000000000000000@reply.bvfactory.dev","subject":"Hi","text":"Hello admin\n\nOn Thu, admin wrote:\n> previous"}}'
TS=$(date +%s)
SIG=$(node -e "console.log(require('crypto').createHmac('sha256','test-secret').update(process.argv[1]+'.'+process.argv[2]).digest('hex'))" "$TS" "$BODY")

curl -X POST http://localhost:3000/api/webhooks/resend/inbound \
  -H "Content-Type: application/json" \
  -H "resend-signature: t=${TS},v1=${SIG}" \
  --data-raw "$BODY"
```

Expected: `{"ok":true}` (it will create an orphan thread because the token doesn't match any outbound message).

Confirm via SQL:

```sql
select subject, from_email from contact_threads order by created_at desc limit 1;
```

Now test the 401 path (wrong secret):

```bash
curl -X POST http://localhost:3000/api/webhooks/resend/inbound \
  -H "Content-Type: application/json" \
  -H "resend-signature: t=${TS},v1=deadbeef" \
  --data-raw "$BODY"
```

Expected: HTTP 401.

- [ ] **Step 5.3: Commit**

```bash
git add src/app/api/webhooks/resend/inbound/route.ts
git commit -m "feat(contact): add Resend inbound webhook for threaded replies"
```

---

## Task 6: Admin API — list + detail

**Files:**
- Create: `src/app/api/admin/messages/route.ts`
- Create: `src/app/api/admin/messages/[threadId]/route.ts`

- [ ] **Step 6.1: List endpoint**

`src/app/api/admin/messages/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = (searchParams.get("search") || "").trim();
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const supabase = createAdminClient();
    let query = supabase
        .from("contact_threads")
        .select("id, subject, from_name, from_email, status, last_message_at, created_at", { count: "exact" })
        .order("last_message_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

    if (["nouveau", "répondu", "archivé"].includes(status)) {
        query = query.eq("status", status);
    }
    if (search) {
        const s = `%${search}%`;
        query = query.or(`subject.ilike.${s},from_name.ilike.${s},from_email.ilike.${s}`);
    }

    const { data: threads, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Unread counter for the sidebar badge.
    const { count: unreadCount } = await supabase
        .from("contact_threads")
        .select("id", { count: "exact", head: true })
        .eq("status", "nouveau");

    return NextResponse.json({ threads: threads ?? [], total: count ?? 0, unreadCount: unreadCount ?? 0 });
}
```

- [ ] **Step 6.2: Detail endpoint**

`src/app/api/admin/messages/[threadId]/route.ts`:

```ts
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
                    const { data: sig } = await supabase.storage
                        .from("contact-attachments")
                        .createSignedUrl(a.storage_path, SIGNED_URL_TTL_SECONDS);
                    return { ...a, signed_url: sig?.signedUrl ?? null };
                }),
            );
            return { ...m, attachments: signed };
        }),
    );

    return NextResponse.json({ thread, messages: decorated });
}
```

- [ ] **Step 6.3: Manual verify**

With admin logged in (cookie set), visit in browser DevTools network:

```
GET /api/admin/messages → {threads: [...], total: N, unreadCount: N}
GET /api/admin/messages/<threadId> → {thread: {...}, messages: [...]}
```

Without cookie:

```bash
curl -i http://localhost:3000/api/admin/messages
```

Expected: `HTTP/1.1 401`.

- [ ] **Step 6.4: Commit**

```bash
git add src/app/api/admin/messages
git commit -m "feat(admin): add contact messages list and detail endpoints"
```

---

## Task 7: Admin API — reply + archive

**Files:**
- Create: `src/app/api/admin/messages/[threadId]/reply/route.ts`
- Create: `src/app/api/admin/messages/[threadId]/archive/route.ts`

- [ ] **Step 7.1: Reply endpoint**

`src/app/api/admin/messages/[threadId]/reply/route.ts`:

```ts
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
    const replyDomain = process.env.CONTACT_REPLY_DOMAIN || "reply.bvfactory.dev";

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
        return NextResponse.json({ error: "Échec de l'envoi" }, { status: 500 });
    }

    const { data: inserted, error: msgErr } = await supabase
        .from("contact_messages")
        .insert({
            thread_id: threadId,
            direction: "outbound",
            reply_token: replyToken,
            resend_email_id: sent.resendEmailId,
            body_text: sent.plainTextBody,
            body_html: sent.htmlBody,
        })
        .select()
        .single();

    if (msgErr) {
        console.error("[admin reply] message insert failed", msgErr);
        return NextResponse.json({ error: "Envoi OK mais persistance échouée" }, { status: 500 });
    }

    await supabase
        .from("contact_threads")
        .update({
            status: "répondu",
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", threadId);

    return NextResponse.json({ message: inserted, status: "répondu" });
}
```

- [ ] **Step 7.2: Archive endpoint**

`src/app/api/admin/messages/[threadId]/archive/route.ts`:

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
    const { searchParams } = new URL(request.url);
    const nextStatus = searchParams.get("unarchive") === "true" ? "répondu" : "archivé";

    const supabase = createAdminClient();
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
```

- [ ] **Step 7.3: Commit**

```bash
git add src/app/api/admin/messages/\[threadId\]/reply src/app/api/admin/messages/\[threadId\]/archive
git commit -m "feat(admin): add reply and archive endpoints for webmail"
```

---

## Task 8: Sidebar nav item + unread badge

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Step 8.1: Add "Messages" nav item with a client-fetched badge**

Edit the imports at the top of `AdminSidebar.tsx`:

```tsx
import {
  LayoutDashboard,
  ShoppingCart,
  KeyRound,
  Tags,
  HardDrive,
  Users,
  Rocket,
  Settings,
  LogOut,
  ChevronRight,
  Mail,
} from "lucide-react";
import { useEffect, useState } from "react";
```

Replace the `navItems` array with the order matching the final nav (Messages between Commandes and Licences):

```tsx
const navItems = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/messages", label: "Messages", icon: Mail, badgeKey: "messages" as const },
  { href: "/admin/licenses", label: "Licences", icon: KeyRound },
  { href: "/admin/discounts", label: "Codes promo", icon: Tags },
  { href: "/admin/plugins", label: "Plugins", icon: HardDrive },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/roadmap", label: "Teasing / Roadmap", icon: Rocket },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];
```

Inside `AdminSidebar`, before the `handleLogout` declaration, add badge state fetching:

```tsx
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/admin/messages?status=nouveau&offset=0", { credentials: "include" });
        if (!res.ok) return;
        const { unreadCount } = await res.json();
        if (!cancelled) setUnreadMessages(unreadCount ?? 0);
      } catch {
        // silent
      }
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
```

In the nav-item map, replace the `<span className="flex-1">{label}</span>` line with:

```tsx
              <span className="flex-1">{label}</span>
              {"badgeKey" in (navItems as unknown as Record<string, unknown>[]).find(n => n.href === href)! && unreadMessages > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-teal-500 text-[10px] font-mono font-bold text-[#050d1a]">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
```

Simpler, drop the ugly lookup — change the map body to destructure and check directly:

```tsx
        {navItems.map((item) => {
          const { href, label, icon: Icon } = item;
          const hasBadge = "badgeKey" in item;
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-teal-500/15 to-blue-600/10 text-teal-400 border border-teal-500/20 shadow-sm shadow-teal-500/5"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors duration-300",
                  isActive
                    ? "text-teal-400"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1">{label}</span>
              {hasBadge && unreadMessages > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-teal-500 text-[10px] font-mono font-bold text-[#050d1a]">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
              {isActive && !hasBadge && (
                <ChevronRight className="w-3 h-3 text-teal-500/50" />
              )}
            </Link>
          );
        })}
```

- [ ] **Step 8.2: Visual check**

Reload `/admin`. Confirm:
- A new "Messages" item appears under "Commandes" with the `Mail` icon.
- If threads with `status='nouveau'` exist (from Task 4 smoke test), a teal pill shows the count.
- Badge refreshes every 30s.

- [ ] **Step 8.3: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): add Messages nav item with unread badge"
```

---

## Task 9: UI primitive components

**Files:**
- Create: `src/components/admin/messages/MessageBubble.tsx`
- Create: `src/components/admin/messages/AttachmentLink.tsx`
- Create: `src/components/admin/messages/ReplyComposer.tsx`

- [ ] **Step 9.1: `AttachmentLink.tsx`**

```tsx
"use client";

import { Paperclip } from "lucide-react";

interface Attachment {
    filename: string;
    size: number;
    mime: string;
    signed_url: string | null;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentLink({ att }: { att: Attachment }) {
    if (!att.signed_url) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 line-through">
                <Paperclip className="w-3 h-3" /> {att.filename}
            </span>
        );
    }
    return (
        <a
            href={att.signed_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-teal-400 hover:text-teal-300 underline decoration-teal-500/30 hover:decoration-teal-400"
        >
            <Paperclip className="w-3 h-3" />
            {att.filename} <span className="text-slate-500">({formatSize(att.size)})</span>
        </a>
    );
}
```

- [ ] **Step 9.2: `MessageBubble.tsx`**

```tsx
"use client";

import { AttachmentLink } from "./AttachmentLink";

interface Message {
    id: string;
    direction: "inbound" | "outbound";
    body_text: string;
    created_at: string;
    attachments: Array<{
        filename: string;
        size: number;
        mime: string;
        signed_url: string | null;
    }>;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export function MessageBubble({ message, fromName }: { message: Message; fromName: string }) {
    const isAdmin = message.direction === "outbound";
    return (
        <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg border p-3 ${
                isAdmin
                    ? "bg-teal-500/10 border-teal-500/20"
                    : "bg-[#0f1e33] border-white/10"
            }`}>
                <div className="flex items-center justify-between gap-4 mb-2">
                    <span className={`text-[10px] uppercase tracking-[0.15em] font-mono ${
                        isAdmin ? "text-teal-400" : "text-slate-400"
                    }`}>
                        {isAdmin ? "Toi" : fromName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                        {formatTime(message.created_at)}
                    </span>
                </div>
                <div className="text-sm text-slate-100 whitespace-pre-wrap break-words">
                    {message.body_text}
                </div>
                {message.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                        {message.attachments.map((att, i) => (
                            <AttachmentLink key={i} att={att} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 9.3: `ReplyComposer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Archive, ArchiveRestore } from "lucide-react";

interface Props {
    threadId: string;
    isArchived: boolean;
    onSent: () => void;
    onArchiveToggled: () => void;
}

export function ReplyComposer({ threadId, isArchived, onSent, onArchiveToggled }: Props) {
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const send = async () => {
        if (!body.trim()) return;
        setSending(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/messages/${threadId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body }),
                credentials: "include",
            });
            if (!res.ok) {
                const { error: msg } = await res.json().catch(() => ({ error: "Échec" }));
                setError(msg || "Échec de l'envoi");
                return;
            }
            setBody("");
            onSent();
        } finally {
            setSending(false);
        }
    };

    const toggleArchive = async () => {
        const url = `/api/admin/messages/${threadId}/archive${isArchived ? "?unarchive=true" : ""}`;
        const res = await fetch(url, { method: "POST", credentials: "include" });
        if (res.ok) onArchiveToggled();
    };

    return (
        <div className="border-t border-white/10 bg-[#0a1628] p-4">
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={isArchived ? "Thread archivé — désarchivez pour répondre" : "Écrivez votre réponse…"}
                disabled={isArchived || sending}
                rows={5}
                className="w-full bg-[#050d1a] border border-white/10 rounded-lg p-3 text-sm text-slate-100 font-sans placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 resize-none disabled:opacity-50"
            />
            {error && <p className="text-xs text-red-400 mt-2 font-mono">{error}</p>}
            <div className="flex items-center justify-between mt-3">
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
                    onClick={send}
                    disabled={!body.trim() || sending || isArchived}
                    className="bg-teal-500 hover:bg-teal-400 text-[#050d1a] font-mono uppercase tracking-[0.1em] text-xs"
                >
                    <Send className="w-4 h-4 mr-1.5" />
                    {sending ? "Envoi…" : "Envoyer"}
                </Button>
            </div>
        </div>
    );
}
```

- [ ] **Step 9.4: Commit**

```bash
git add src/components/admin/messages/MessageBubble.tsx src/components/admin/messages/AttachmentLink.tsx src/components/admin/messages/ReplyComposer.tsx
git commit -m "feat(admin): add message bubble, attachment link and reply composer components"
```

---

## Task 10: Thread list + detail components

**Files:**
- Create: `src/components/admin/messages/ThreadList.tsx`
- Create: `src/components/admin/messages/ThreadDetail.tsx`

- [ ] **Step 10.1: `ThreadList.tsx`**

```tsx
"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface ThreadRow {
    id: string;
    subject: string;
    from_name: string;
    from_email: string;
    status: "nouveau" | "répondu" | "archivé";
    last_message_at: string;
    created_at: string;
}

interface Props {
    threads: ThreadRow[];
    selectedId: string | null;
    statusFilter: "all" | "nouveau" | "répondu" | "archivé";
    search: string;
    onSelect: (id: string) => void;
    onStatusChange: (s: "all" | "nouveau" | "répondu" | "archivé") => void;
    onSearchChange: (s: string) => void;
    counts: { all: number; nouveau: number; "répondu": number; "archivé": number };
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
} as const;

export function ThreadList({
    threads, selectedId, statusFilter, search,
    onSelect, onStatusChange, onSearchChange, counts,
}: Props) {
    return (
        <div className="flex flex-col h-full border-r border-white/5 bg-[#0a1628]/50">
            <div className="p-3 border-b border-white/5 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher…"
                        className="pl-9 bg-[#050d1a] border-white/10 text-white font-mono text-xs placeholder:text-slate-600 focus-visible:ring-teal-500"
                    />
                </div>
                <div className="flex flex-wrap gap-1">
                    {(["all", "nouveau", "répondu", "archivé"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => onStatusChange(s)}
                            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-[0.1em] border transition-colors ${
                                statusFilter === s
                                    ? "bg-teal-500/15 border-teal-500/30 text-teal-300"
                                    : "bg-transparent border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                            }`}
                        >
                            {STATUS_LABEL[s]} ({counts[s]})
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {threads.length === 0 && (
                    <p className="p-6 text-sm text-slate-500 text-center font-mono">Aucun thread</p>
                )}
                {threads.map((t) => {
                    const isActive = t.id === selectedId;
                    const isUnread = t.status === "nouveau";
                    return (
                        <button
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                                isActive
                                    ? "bg-teal-500/10 border-l-2 border-l-teal-400"
                                    : "hover:bg-white/5 border-l-2 border-l-transparent"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-sm truncate ${isUnread ? "text-white font-semibold" : "text-slate-200"}`}>
                                    {t.from_name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                    {formatRelative(t.last_message_at)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{t.subject}</p>
                            <p className="text-[10px] font-mono text-slate-600 truncate mt-0.5">{t.from_email}</p>
                            {isUnread && (
                                <span className="inline-block mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
```

- [ ] **Step 10.2: `ThreadDetail.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ReplyComposer } from "./ReplyComposer";
import { ArrowLeft, Loader2 } from "lucide-react";

interface ThreadDto {
    id: string;
    subject: string;
    from_name: string;
    from_email: string;
    status: "nouveau" | "répondu" | "archivé";
    created_at: string;
}

interface MessageDto {
    id: string;
    direction: "inbound" | "outbound";
    body_text: string;
    created_at: string;
    attachments: Array<{ filename: string; size: number; mime: string; signed_url: string | null }>;
}

const STATUS_COLORS: Record<ThreadDto["status"], string> = {
    nouveau: "bg-teal-500/15 border-teal-500/30 text-teal-300",
    "répondu": "bg-slate-500/15 border-slate-500/30 text-slate-300",
    "archivé": "bg-slate-800 border-slate-700 text-slate-500",
};

interface Props {
    threadId: string;
    onBack: () => void;
    onChange: () => void;
}

export function ThreadDetail({ threadId, onBack, onChange }: Props) {
    const [thread, setThread] = useState<ThreadDto | null>(null);
    const [messages, setMessages] = useState<MessageDto[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const res = await fetch(`/api/admin/messages/${threadId}`, { credentials: "include" });
        if (res.ok) {
            const { thread: t, messages: m } = await res.json();
            setThread(t);
            setMessages(m);
        }
        setLoading(false);
    };

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [threadId]);

    if (loading || !thread) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-white/5 bg-[#0a1628]/50 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="md:hidden p-1.5 rounded hover:bg-white/5 text-slate-400"
                    aria-label="Retour"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-white truncate">{thread.subject}</h2>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        {thread.from_name} &lt;{thread.from_email}&gt;
                    </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.15em] border ${STATUS_COLORS[thread.status]}`}>
                    {thread.status}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} fromName={thread.from_name} />
                ))}
                {messages.length === 0 && (
                    <p className="text-center text-sm text-slate-500 font-mono">Aucun message</p>
                )}
            </div>

            <ReplyComposer
                threadId={thread.id}
                isArchived={thread.status === "archivé"}
                onSent={() => { load(); onChange(); }}
                onArchiveToggled={() => { load(); onChange(); }}
            />
        </div>
    );
}
```

- [ ] **Step 10.3: Commit**

```bash
git add src/components/admin/messages/ThreadList.tsx src/components/admin/messages/ThreadDetail.tsx
git commit -m "feat(admin): add thread list and thread detail components"
```

---

## Task 11: Admin page `/admin/messages`

**Files:**
- Create: `src/app/admin/(dashboard)/messages/page.tsx`

- [ ] **Step 11.1: Page implementation**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { ThreadList, type ThreadRow } from "@/components/admin/messages/ThreadList";
import { ThreadDetail } from "@/components/admin/messages/ThreadDetail";
import { Mail } from "lucide-react";

type Status = "all" | "nouveau" | "répondu" | "archivé";

const REFRESH_MS = 30_000;

export default function MessagesPage() {
    const [threads, setThreads] = useState<ThreadRow[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<Status>("all");
    const [search, setSearch] = useState("");
    const [counts, setCounts] = useState({ all: 0, nouveau: 0, "répondu": 0, "archivé": 0 });

    const fetchThreads = useCallback(async () => {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (search) params.set("search", search);
        const res = await fetch(`/api/admin/messages?${params.toString()}`, { credentials: "include" });
        if (!res.ok) return;
        const { threads: t } = await res.json();
        setThreads(t);
    }, [statusFilter, search]);

    const fetchCounts = useCallback(async () => {
        const all = await fetch("/api/admin/messages", { credentials: "include" }).then((r) => r.json());
        const nouveau = await fetch("/api/admin/messages?status=nouveau", { credentials: "include" }).then((r) => r.json());
        const repondu = await fetch("/api/admin/messages?status=r%C3%A9pondu", { credentials: "include" }).then((r) => r.json());
        const archive = await fetch("/api/admin/messages?status=archiv%C3%A9", { credentials: "include" }).then((r) => r.json());
        setCounts({
            all: all.total ?? 0,
            nouveau: nouveau.total ?? 0,
            "répondu": repondu.total ?? 0,
            "archivé": archive.total ?? 0,
        });
    }, []);

    useEffect(() => { fetchThreads(); }, [fetchThreads]);
    useEffect(() => { fetchCounts(); }, [fetchCounts]);

    useEffect(() => {
        const id = setInterval(() => {
            if (document.visibilityState === "visible") {
                fetchThreads();
                fetchCounts();
            }
        }, REFRESH_MS);
        return () => clearInterval(id);
    }, [fetchThreads, fetchCounts]);

    const handleChange = () => { fetchThreads(); fetchCounts(); };

    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Messages</h1>
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.15em]">
                        Threads du formulaire de contact
                    </p>
                </div>
            </header>

            <div className="bg-[#0a1628] border border-white/10 rounded-xl overflow-hidden h-[calc(100vh-200px)] min-h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] h-full">
                    {/* Mobile: show list when no selection, detail when selected */}
                    <div className={`h-full min-h-0 ${selectedId ? "hidden md:block" : "block"}`}>
                        <ThreadList
                            threads={threads}
                            selectedId={selectedId}
                            statusFilter={statusFilter}
                            search={search}
                            onSelect={setSelectedId}
                            onStatusChange={setStatusFilter}
                            onSearchChange={setSearch}
                            counts={counts}
                        />
                    </div>
                    <div className={`h-full min-h-0 flex ${selectedId ? "flex" : "hidden md:flex"}`}>
                        {selectedId ? (
                            <ThreadDetail
                                threadId={selectedId}
                                onBack={() => setSelectedId(null)}
                                onChange={handleChange}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-mono">
                                Sélectionnez un thread
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 11.2: Smoke test end-to-end in the browser**

1. Submit the `/contact` form (or curl from Task 4).
2. Go to `/admin/messages` — thread appears in the list, status `nouveau` (teal dot).
3. Click the thread → detail panel shows the inbound message.
4. Type a reply → click "Envoyer". Toast succès, bulle teal apparaît, status change to `répondu`.
5. Go to your email inbox (the `from_email`). You receive an email from `contact@bvfactory.dev` with your body + signature + quoted message. `Reply-To` = `reply+<token>@reply.bvfactory.dev`.
6. Click "Archiver" → thread moves to Archivés filter.
7. "Désarchiver" → retour à répondu.

- [ ] **Step 11.3: Commit**

```bash
git add src/app/admin/\(dashboard\)/messages/page.tsx
git commit -m "feat(admin): add /admin/messages page with list+detail layout"
```

---

## Task 12: CLAUDE.md + env var documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 12.1: Add the two new required env vars**

In the "Variables d'environnement requises" section of `CLAUDE.md`, after `NEXT_PUBLIC_SITE_URL`, add:

```markdown
- `RESEND_WEBHOOK_SECRET` — Secret HMAC pour vérifier les webhooks entrants Resend (inbound emails).
- `CONTACT_REPLY_DOMAIN` — Sous-domaine Resend Inbound (défaut: `reply.bvfactory.dev`).
```

Also append a new section near the bottom (before the final "## Architecture clé" or as a new subsection):

```markdown
## Webmail admin (contact threads)

- Les soumissions du formulaire `/contact` sont persistées dans `contact_threads` + `contact_messages` (Supabase).
- L'admin lit et répond via `/admin/messages`. Les réponses partent depuis `contact@bvfactory.dev` avec `Reply-To: reply+<token>@reply.bvfactory.dev`.
- Les replies des visiteurs arrivent via le webhook Resend Inbound sur `/api/webhooks/resend/inbound`, matchés au thread par le token.
- DNS requis : records MX sur `reply.bvfactory.dev` pointant vers Resend Inbound (voir dashboard Resend pour les valeurs exactes).
```

- [ ] **Step 12.2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document webmail feature and new env vars"
```

---

## Task 13: External setup — DNS + Resend Inbound + Vercel env (manual operator task)

This task is performed by the operator in Resend + DNS + Vercel dashboards. No code changes.

- [ ] **Step 13.1: Create Resend Inbound endpoint**

1. Log in to Resend dashboard.
2. Go to "Inbound" (or "Domains" → "Inbound" depending on Resend UI version).
3. Add a new inbound domain: `reply.bvfactory.dev`.
4. Set webhook URL: `https://bvfactory.dev/api/webhooks/resend/inbound`.
5. Copy the generated webhook signing secret.

- [ ] **Step 13.2: Add MX records**

At your DNS provider for `bvfactory.dev`, add the MX records Resend shows (typically):

| Host | Type | Priority | Value |
|------|------|----------|-------|
| `reply` | MX | 10 | `inbound-smtp.resend.com` (or as shown) |

Wait 5–30 min for propagation. Verify in Resend — status should go to "Verified".

- [ ] **Step 13.3: Add env vars on Vercel**

Via `vercel env add` (or dashboard), for Production + Preview + Development:

```bash
vercel env add RESEND_WEBHOOK_SECRET production
# paste the secret from step 13.1

vercel env add CONTACT_REPLY_DOMAIN production
# value: reply.bvfactory.dev
```

Repeat for `preview` and `development` environments.

- [ ] **Step 13.4: Redeploy production**

```bash
vercel --prod --scope contactbvfactory-2806s-projects
```

- [ ] **Step 13.5: End-to-end test on prod**

1. Submit the `/contact` form on prod.
2. Verify thread appears in `/admin/messages`.
3. Reply from admin → visitor receives email.
4. Reply from visitor's email client → within 10-30s the reply shows up in the admin thread (status flips back to `nouveau`).
5. Check Supabase `contact_messages` to confirm 3 rows (inbound, outbound, inbound) for the same `thread_id`.

If step 4 fails: check Resend inbound logs, Vercel function logs for `/api/webhooks/resend/inbound`, and DNS propagation.

---

## Self-Review Notes

**Spec coverage:**
- Tables contact_threads + contact_messages → Task 1 ✓
- Reply token generation → Task 2 ✓
- HMAC webhook verification → Tasks 2 + 5 ✓
- Modified /api/contact → Task 4 ✓
- Inbound webhook → Task 5 ✓
- Admin list/detail/reply/archive endpoints → Tasks 6 + 7 ✓
- Sidebar unread badge → Task 8 ✓
- UI components (ThreadList, ThreadDetail, MessageBubble, ReplyComposer, AttachmentLink) → Tasks 9 + 10 ✓
- /admin/messages page with charte graphique → Task 11 ✓
- Env vars documented → Task 12 ✓
- DNS + Resend setup documented → Task 13 ✓
- Error handling cases (HMAC, unknown token, attachment size, Resend fail, duplicate webhook) → Task 5 ✓
- HTML + signature + quoted-reply rendering → Task 3 ✓
- Subject "Re: " prefixing → Task 2 + 3 ✓

**Type consistency:** Thread status enum (`nouveau`/`répondu`/`archivé`) used consistently across migration, API, components. Message direction (`inbound`/`outbound`) used consistently. `AttachmentRow` shape consistent between webhook insert (Task 5) and component consumption (Task 9/10).

**Notes & risks:**
- Resend's inbound webhook payload format (field names like `data.from`, `data.attachments[].content`) is assumed based on typical patterns. Task 13 includes an e2e test that will surface any field-name mismatch; adjust the parser in `src/app/api/webhooks/resend/inbound/route.ts` if Resend's actual format differs.
- Resend's signature header name and format (`resend-signature: t=…,v1=…`) is assumed. If Resend uses a different header/scheme, adjust `verifyWebhookSignature` and the header lookup in Task 5. The HMAC pattern is standard; verify against Resend docs when doing Task 13.
- `_onArchiveToggled` in the composer refreshes the detail; good for v1. If archiving from the list is desired later, move the action there.
- No test runner is installed. Manual verification is the primary safety net. Consider adding vitest in a separate PR for the pure helpers in `src/lib/contact-messages.ts`.
