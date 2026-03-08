import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { name, email, subject, message } = await req.json();

        if (!name || !email || !subject || !message) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Send via Resend if configured
        if (process.env.RESEND_API_KEY) {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            const contactEmail = process.env.CONTACT_EMAIL || "contact@bvfactory.app";

            await resend.emails.send({
                from: "BVFactory Contact <noreply@bvfactory.app>",
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
            // Fallback: log to console in dev
            console.log("📬 Contact Form Submission:", { name, email, subject, message });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Contact form error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
