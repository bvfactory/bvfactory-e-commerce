// src/lib/contact-email.ts
import { Resend } from "resend";
import { buildSignatureText, prefixReplySubject } from "./contact-messages";

export function escapeHtml(str: string): string {
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
