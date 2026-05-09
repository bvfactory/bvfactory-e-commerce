import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendAdminNotification } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/contact-email";

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
            try {
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
                            <tr><td style="padding: 8px 0; font-weight: bold; width: 100px;">Name:</td><td>${escapeHtml(name)}</td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td><a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a></td></tr>
                            <tr><td style="padding: 8px 0; font-weight: bold;">Subject:</td><td>${escapeHtml(subject)}</td></tr>
                        </table>
                        <div style="background: #eee; padding: 15px; border-radius: 4px; margin-top: 20px;">
                            <p style="font-weight: bold; margin: 0 0 10px 0;">Message:</p>
                            <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(message)}</p>
                        </div>
                        <p style="font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
                            BVFactory Show Control Division — Contact Form
                        </p>
                    </div>
                `,
                });
            } catch (err) {
                console.error("Contact backup email failed:", err);
                // Non-fatal — thread is already persisted in DB.
            }
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
