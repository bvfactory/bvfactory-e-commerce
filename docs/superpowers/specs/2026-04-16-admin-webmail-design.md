# Admin Webmail — Design

**Date**: 2026-04-16
**Status**: Approved, ready for implementation plan
**Scope**: v1 — threaded conversation between visitors (contact form) and admin, fully integrated in the existing admin panel.

---

## Goal

Let the admin read and reply to contact-form messages directly from the `/admin` interface. Visitor replies route back into the admin via Resend Inbound, creating a full threaded conversation — not just a one-shot notification.

Today the contact form only sends a Resend notification to `contact@bvfactory.dev`. There is no persistence, no reply workflow, and no way to see conversation history in the admin.

## Non-goals (v1)

- Full-text search inside message bodies
- Attachments on outbound (admin → visitor) replies
- WYSIWYG / markdown editor
- Labels or custom tags
- Multi-admin assignment
- Response templates
- Browser push notifications
- Bounce detection
- Hard delete (archive only)

## Architecture

```
Visitor                                      Next.js (bvfactory.dev)
─────────                                    ──────────────────────
/contact form         ── POST ──────────▶    /api/contact
                                                   │
                                                   ▼
                                             contact_threads + contact_messages
                                             sendAdminNotification("contact_received")

Visitor email reply   ── SMTP ──▶ Resend ── webhook ─▶ /api/webhooks/resend/inbound
(to reply+<token>@                                           │
  reply.bvfactory.dev)                                       ▼
                                             Match reply_token → thread_id
                                             Append contact_message (inbound)
                                             sendAdminNotification("contact_reply_received")

Admin UI ── POST ─▶ /api/admin/messages/[threadId]/reply
                                                   │
                                                   ▼
                                             Generate reply_token
                                             Resend send (From: contact@, Reply-To: reply+<token>@)
                                             Append contact_message (outbound)
```

## Data model

### `contact_threads`

```sql
create table contact_threads (
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

create index on contact_threads (status, last_message_at desc);
create index on contact_threads (from_email);

alter table contact_threads enable row level security;
-- No policies: server-only access via service_role key.
```

### `contact_messages`

```sql
create table contact_messages (
  id              uuid primary key default gen_random_uuid(),
  thread_id       uuid not null references contact_threads(id) on delete cascade,
  direction       text not null check (direction in ('inbound', 'outbound')),
  reply_token     text unique,           -- outbound only: token placed in Reply-To
  body_text       text not null,
  body_html       text,                   -- null for plain-text form submissions
  resend_email_id text unique,            -- Resend id (both directions, for idempotency)
  in_reply_to     text,                   -- parent Message-ID header (diagnostic)
  attachments     jsonb not null default '[]',  -- [{filename, storage_path, size, mime}]
  created_at      timestamptz not null default now()
);

create index on contact_messages (thread_id, created_at);
create index on contact_messages (reply_token) where reply_token is not null;

alter table contact_messages enable row level security;
-- No policies: server-only access via service_role key.
```

### Storage

Bucket `contact-attachments` (private). Path convention: `<thread_id>/<message_id>/<filename>`. Admin UI reads via time-limited signed URLs generated server-side.

## Reply token

- Format: 16 random bytes rendered as hex (32 chars).
- Generated with `crypto.randomBytes(16).toString('hex')`.
- Stored on the **outbound** message (not the thread) — every outbound reply gets its own token. This way, if the token is ever leaked, we can revoke it by deleting the row without breaking other replies.
- Placed in the `Reply-To` address: `reply+<token>@reply.bvfactory.dev`.
- Unique constraint enforces no collisions.

## API routes

### `POST /api/contact` (modified)

Existing route. Changes:
1. Insert `contact_threads` row (status=`nouveau`) + `contact_messages` row (direction=`inbound`, body_html=null). **Each form submission creates a new thread** — no dedup on `from_email`. Threading is driven by replies via the reply token, not by sender identity.
2. Keep the existing Resend notification to `contact@bvfactory.dev` (backup).
3. Keep the existing `sendAdminNotification("contact_received", ...)` call.

### `POST /api/webhooks/resend/inbound` (new)

Called by Resend when an email arrives on `reply.bvfactory.dev`.

**Security**: verify Resend webhook HMAC signature using `RESEND_WEBHOOK_SECRET`. Return 401 on mismatch before any DB work.

**Logic**:
1. Verify HMAC signature.
2. Check idempotency: if `resend_email_id` already exists in `contact_messages`, return 200 (Resend retries on 5xx).
3. Parse payload: `to`, `from`, `subject`, `text`, `html`, `attachments[]`.
4. Extract token from the `to` address via regex `reply\+([a-f0-9]{32})@reply\.bvfactory\.dev`.
5. Look up `contact_messages.reply_token` → get `thread_id`.
   - If not found: create a new thread with sender info as fallback.
6. Strip quoted reply from `text` (keep only the new content). Fallback to `html` stripped to text if `text` is empty.
7. Upload attachments to Supabase Storage (skip files > 10 MB, skip entire batch if total > 25 MB with a marker in the body).
8. Insert `contact_messages` (direction=`inbound`, thread_id, body_text, body_html, resend_email_id, in_reply_to).
9. Update `contact_threads` set `status='nouveau'`, `last_message_at=now()`, `updated_at=now()`.
10. Call `sendAdminNotification("contact_reply_received", ...)`.
11. Return 200.

### `POST /api/admin/messages/[threadId]/reply` (new)

**Auth**: admin session cookie (same pattern as other `/api/admin/*` routes).

**Body**: `{ body: string }` (plain text).

**Logic**:
1. Verify admin session.
2. Load thread. 404 if archived or not found.
3. Generate `reply_token` via `crypto.randomBytes(16).toString('hex')`.
4. Render HTML: escape body, wrap in styled template, append fixed signature, append quoted previous inbound message.
5. Subject: prefix `Re: ` if not already present (regex `/^re:\s*/i`).
6. Send via Resend:
   - `from`: `"BVFactory <contact@bvfactory.dev>"`
   - `to`: `thread.from_email`
   - `subject`: computed above
   - `reply_to`: `reply+<token>@${CONTACT_REPLY_DOMAIN}`
   - `html`: rendered HTML
   - `text`: plain version
7. Insert `contact_messages` (direction=`outbound`, reply_token, resend_email_id, body_text, body_html).
8. Update `contact_threads` set `status='répondu'`, `last_message_at=now()`, `updated_at=now()`.
9. Return the new message.

On Resend send failure: roll back (no DB write), return 500, admin sees an error toast.

### `GET /api/admin/messages` (new)

**Auth**: admin session.

**Query**: `?status=nouveau|répondu|archivé|all&search=<query>&limit=25&offset=0`.

**Response**: threads with preview (last message snippet, unread flag, attachment count).

### `GET /api/admin/messages/[threadId]` (new)

**Auth**: admin session.

Returns thread + all messages ordered by `created_at`. Attachment URLs are signed (1h TTL).

### `POST /api/admin/messages/[threadId]/archive` (new)

**Auth**: admin session.

Sets `status='archivé'`. Idempotent.

## Email rendering

### Signature (fixed v1)
```
— Benjamin · BVFactory
contact@bvfactory.dev · https://bvfactory.dev
```

### HTML template
Styled container matching brand (dark navy → light for email readability, monospace metadata, teal accent on signature). Plain-text version generated by stripping tags + decoding entities.

### Subject prefixing
`Re: ` is prepended only when absent (case-insensitive).

## Admin UI

### Route
`/admin/messages` (new, under `(dashboard)` layout).

### Sidebar
Add entry in `AdminSidebar.tsx`:
- Icon: `Mail` from `lucide-react`.
- Label: `Messages`.
- Badge: count of threads with `status='nouveau'` (teal, matching existing unread badges).

### Layout (desktop ≥ md)
Two panels side-by-side:
- **Left (380px)**: thread list with filter tabs (`Tous`, `Nouveaux`, `Répondus`, `Archivés`) and a search input (filters on `subject`, `from_name`, `from_email`).
- **Right (fluid)**: thread detail — header (subject, contact, status badge), vertical timeline of message bubbles, reply composer pinned to bottom.

### Layout (mobile < md)
Single column: list by default, clicking a thread pushes to a full-screen detail view with a back button.

### Visual design (brand charter)
- Page background: `bg-[#050d1a]` with teal/blue glow blobs + grid overlay + noise (inherited from `(dashboard)/layout.tsx`).
- Card panels: `bg-[#0a1628] border border-white/10 rounded-lg`.
- Accent: `teal-400` for primary actions, active thread indicator, unread badge, signature link.
- Metadata typography: `font-mono text-xs text-slate-400` (emails, dates, ids).
- Body typography: `font-sans text-sm text-slate-100`.
- Bubbles:
  - Inbound: `bg-[#0f1e33] border-white/10`, aligned left.
  - Outbound: `bg-teal-500/10 border-teal-500/20`, aligned right.
- Status badges: reuse `StatusBadge` component (nouveau=teal, répondu=slate, archivé=slate-600).
- Thread list row hover: `hover:bg-white/5`.
- Active thread row: `bg-teal-500/10 border-l-2 border-teal-400`.

### Components (new, under `src/components/admin/messages/`)
- `ThreadList.tsx` — scrollable list with filter tabs + search.
- `ThreadDetail.tsx` — header + timeline + composer.
- `MessageBubble.tsx` — renders inbound/outbound bubble.
- `ReplyComposer.tsx` — textarea (autoresize) + archive + send buttons.
- `AttachmentLink.tsx` — icon + filename + size + signed-URL download.

### Refresh behavior
- Polling every 30s while page is focused (to surface new inbound replies).
- `router.refresh()` after send/archive.

## Error handling & edge cases

| Case | Behavior |
|------|----------|
| Webhook HMAC invalid | Return 401, log, no DB write. |
| Unknown token in inbound | Create new thread with sender info; surface in admin normally. |
| Inbound with no text body (HTML only) | Fallback: strip HTML to text. If still empty: store empty string + flag in notification. |
| Attachment > 10 MB | Skip, insert `[pièce jointe ignorée : trop volumineuse]` marker in body. |
| Total attachments > 25 MB | Skip all attachments, same marker. |
| Resend send fails (outbound) | No DB write, return 500, admin toast error. |
| Visitor email bounce | Not detected v1. |
| Duplicate webhook (Resend retry) | Idempotent via unique `resend_email_id`; return 200 silently on collision. |
| Spam / bot | No extra filter v1; existing `/api/contact` rate limit still applies. |
| Visitor replies from different email address | Token in `to` address still matches the thread; new `from` renders in the bubble. |

## Environment variables (new)

To add on Vercel (Production + Preview + Development):
- `RESEND_WEBHOOK_SECRET` — HMAC secret for Resend webhook signature verification.
- `CONTACT_REPLY_DOMAIN` — default `reply.bvfactory.dev`.

Existing variables already sufficient:
- `RESEND_API_KEY`
- `CONTACT_EMAIL`

## External setup (DNS + Resend)

Operator task (manual, one-time):
1. Resend dashboard → Inbound → new endpoint for `reply.bvfactory.dev`, webhook URL `https://bvfactory.dev/api/webhooks/resend/inbound`.
2. Add MX records in DNS (Cloudflare/OVH/Gandi) per Resend instructions (typically `inbound-smtp.resend.com` priority 10).
3. Wait for Resend to verify (5–30 min).
4. Copy the webhook signing secret → Vercel env `RESEND_WEBHOOK_SECRET`.
5. Redeploy.

## Testing plan

- Unit: reply-token generation, subject "Re:" prefixing, HTML/text rendering, HMAC signature verification.
- Integration: `/api/contact` creates thread+message; `/api/webhooks/resend/inbound` with valid + invalid signatures + unknown token; `/api/admin/messages/[id]/reply` sends and persists.
- Manual: full loop — submit contact form → see thread in admin → reply → receive on external email → reply back from external → see new inbound message in admin thread.

## Rollout

1. Merge migration + API + UI behind a feature flag not needed (read-only for non-admins; no breaking change to `/api/contact`).
2. Configure Resend Inbound + DNS.
3. Add env vars on Vercel.
4. Deploy.
5. Smoke test with personal email.
