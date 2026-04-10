import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY missing" });

    const resend = new Resend(apiKey);
    try {
        const result = await resend.emails.send({
            from: "BVFactory <licences@bvfactory.dev>",
            to: "benjamin@make-it-event.com",
            subject: "Test email - BVFactory debug",
            html: "<p>Test email from BVFactory checkout debug.</p>",
        });
        return NextResponse.json({ result });
    } catch (err) {
        return NextResponse.json({
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
