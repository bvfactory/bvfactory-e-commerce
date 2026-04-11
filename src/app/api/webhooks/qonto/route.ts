import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLicenseKey, generateActivationCode } from "@/lib/license";
import { Resend } from "resend";
import { sendAdminNotification } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const signature = req.headers.get("x-qonto-stamping");
        const rawBody = await req.text();
        const secret = process.env.QONTO_WEBHOOK_SECRET;

        if (!secret) {
            return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
        }
        if (!signature) {
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
        }
        const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        if (hmac !== signature) {
            console.error("Qonto Signature invalide");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let payload;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        // Process Qonto Payment Link event
        if (payload.event === "payment_link.completed" || payload.event === "payment_link.paid") {
            // payment_link object or similar according to actual payload
            // Let's assume standard object structure for payment links or use the referenced ID
            const paymentLinkId = payload.data?.payment_link?.id || payload.payment_link?.id || payload.id;

            const supabase = createAdminClient();

            // Find the order
            const { data: order, error } = await supabase
                .from("orders")
                .select("*")
                .eq("qonto_payment_link_id", paymentLinkId)
                .single();

            if (error || !order) {
                console.error("Commande introuvable pour ce webhook", error);
                return NextResponse.json({ error: "Order not found" }, { status: 404 });
            }

            if (order.status === "paid") {
                return NextResponse.json({ message: "Order already paid" }, { status: 200 });
            }

            // Generate license using the secure system
            const { licenseKey, salt, keyHash, algorithmVersion } = await generateLicenseKey(
                order.product_id || "UNKNOWN",
                (order.core_id || "UNKNOWN").toUpperCase()
            );

            // Insert into licenses table
            await supabase.from("licenses").insert({
                order_id: order.id,
                product_id: order.product_id || "UNKNOWN",
                core_id: (order.core_id || "UNKNOWN").toUpperCase(),
                license_key: licenseKey,
                key_hash: keyHash,
                salt: salt,
                algorithm_version: algorithmVersion,
                status: "active",
            });

            const activationCode = generateActivationCode();

            // Update order — do NOT store licenseKey in order
            await supabase
                .from("orders")
                .update({ status: "paid", activation_code: activationCode, updated_at: new Date().toISOString() })
                .eq("id", order.id);

            // Send Email Delivery
            if (process.env.RESEND_API_KEY) {
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: "BVFactory <licences@bvfactory.app>", // Make sure to use verified domain
                    to: order.customer_email,
                    subject: "Your Q-SYS Plugin License - BVFactory",
                    html: `
                        <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; color: #111; background-color: #fafafa; padding: 20px;">
                            <h2 style="text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 10px;">Deployment Authorized</h2>
                            <p>Transaction verified. Your Q-SYS plugin hardware license has been compiled and is ready for deployment.</p>

                            <div style="background-color: #000; color: #0f0; padding: 25px; border-radius: 4px; margin: 25px 0; border: 1px solid #333;">
                                <p style="margin: 0; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">TARGET CORE ID</p>
                                <p style="margin: 5px 0 20px 0; font-size: 16px;"><strong>${order.core_id}</strong></p>

                                <p style="margin: 0; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">ACTIVATION CODE</p>
                                <p style="margin: 5px 0 0 0; font-size: 20px; color: #fff;"><strong>${activationCode}</strong></p>
                            </div>

                            <p style="font-size: 14px; line-height: 1.6;">Follow these steps to activate your module:</p>
                            <ol style="font-size: 14px; line-height: 1.6;">
                                <li>Visit the activation portal at <a href="https://bvfactory.app/activate" style="color: #0f0;">bvfactory.app/activate</a>.</li>
                                <li>Enter your activation code shown above.</li>
                                <li>Your license key will be generated and applied to your Q-SYS Core.</li>
                            </ol>
                            <br/>
                            <p style="font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
                                SYS.DEV: BVFactory Show Control Division<br/>
                                <a href="https://bvfactory.app" style="color: #666;">bvfactory.app</a>
                            </p>
                        </div>
                    `
                });
            }

            // Notify admin
            sendAdminNotification("order_paid", `Qonto — ${order.customer_email}`, {
                "Commande": order.id.substring(0, 8) + "...",
                "Client": order.customer_email,
                "Core ID": order.core_id || "N/A",
                "Paiement": "Qonto (virement)",
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    } catch (error) {
        console.error("Webhook processing error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
