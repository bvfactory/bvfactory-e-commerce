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
        if (/^>\s?/.test(line) && out.some((l) => l.trim() !== "")) break;
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
    try {
        const sigBuf = Buffer.from(sig, "hex");
        const expBuf = Buffer.from(expected, "hex");
        if (sigBuf.length !== expBuf.length) return false;
        return timingSafeEqual(sigBuf, expBuf);
    } catch {
        return false;
    }
}
