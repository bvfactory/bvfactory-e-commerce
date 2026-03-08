import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLicenseKey, generateActivationCode } from "@/lib/license";
import { Resend } from "resend";

interface WebhookCartItem {
    id: string;
    coreId: string;
    product: { id: string; name: string; price_cents: number; iconName: string; description: string };
    licenseKey?: string;
}

import Stripe from "stripe";

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("stripe-signature");
        const secret = process.env.STRIPE_WEBHOOK_SECRET;

        let event: Stripe.Event;

        if (!secret || !signature) {
            console.warn("STRIPE_WEBHOOK_SECRET or signature missing, simulating fallback parsed event in sandbox.");
            // Sandbox manual parsing for testing without hitting webhooks locally if needed
            event = JSON.parse(rawBody) as Stripe.Event;
        } else {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
                apiVersion: '2026-02-25.clover'
            });

            try {
                event = stripe.webhooks.constructEvent(rawBody, signature, secret);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown Webhook Error';
                console.error("Stripe Signature invalide:", errorMessage);
                return NextResponse.json({ error: "Unauthorized / Webhook Error" }, { status: 400 });
            }
        }

        // Process Stripe Checkout completion
        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const orderId = session.metadata?.order_id;

            if (!orderId) {
                console.error("No order_id found in session metadata");
                return NextResponse.json({ error: "Invalid metadata" }, { status: 400 });
            }

            const supabase = await createClient();

            // Find the order
            const { data: order, error } = await supabase
                .from("orders")
                .select("*")
                .eq("id", orderId)
                .single();

            if (error || !order) {
                console.error("Commande introuvable pour ce webhook", error);
                return NextResponse.json({ error: "Order not found" }, { status: 404 });
            }

            if (order.status === "paid") {
                return NextResponse.json({ message: "Order already paid" }, { status: 200 });
            }

            // Generate secure licenses for each item
            const itemsWithLicenses: WebhookCartItem[] = [];

            for (const item of (order.items || []) as WebhookCartItem[]) {
                const coreId = item.coreId || "UNKNOWN";
                const productId = item.product?.id || "UNKNOWN";

                const { licenseKey, salt, keyHash } = generateLicenseKey(productId, coreId);

                itemsWithLicenses.push({
                    ...item,
                    licenseKey,
                });

                // Insert into licenses table
                await supabase.from("licenses").insert({
                    order_id: order.id,
                    product_id: productId,
                    core_id: coreId.toUpperCase(),
                    license_key: licenseKey,
                    key_hash: keyHash,
                    salt: salt,
                    status: "active",
                });
            }

            const activationCode = generateActivationCode();

            await supabase
                .from("orders")
                .update({
                    status: "paid",
                    items: itemsWithLicenses,
                    activation_code: activationCode,
                    updated_at: new Date().toISOString()
                })
                .eq("id", order.id);

            // Send Email Delivery
            if (process.env.RESEND_API_KEY) {
                const resend = new Resend(process.env.RESEND_API_KEY);
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
                const activationLink = `${baseUrl}/activation?code=${activationCode}`;

                await resend.emails.send({
                    from: "BVFactory <licences@bvfactory.dev>",
                    to: order.customer_email,
                    subject: "Your Q-SYS Plugins are Ready - BVFactory",
                    html: `
                        <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; color: #111; background-color: #fafafa; padding: 20px;">
                            <h2 style="text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 10px;">Licenses Compiled successfully</h2>
                            <p>Your transaction has been verified. Your requested Q-SYS plugin hardware licenses have been successfully compiled for your custom Core IDs and are now securely stored.</p>
                            
                            <div style="background-color: #000; text-align: center; padding: 40px 20px; border-radius: 4px; margin: 30px 0; border: 1px solid #333;">
                                <p style="color: #0f0; margin: 0 0 20px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Ready for uplink</p>
                                <a href="${activationLink}" style="display: inline-block; background-color: #0f4a42; color: #fff; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 16px; padding: 15px 30px; border-radius: 4px; border: 1px solid #14b8a6; text-transform: uppercase; letter-spacing: 1px;">
                                    Access Activation Portal
                                </a>
                            </div>

                            <p style="font-size: 14px; line-height: 1.6;">Your unique Activation Code is:</p>
                            <p style="font-family: monospace; background: #eee; padding: 10px; text-align: center; font-weight: bold; font-size: 20px; color: #0f4a42;">${activationCode}</p>
                            
                            <br/>
                            <p style="font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
                                SYS.DEV: BVFactory Show Control Division<br/>
                                <a href="https://bvfactory.dev" style="color: #666;">bvfactory.dev</a>
                            </p>
                        </div>
                    `
                });
            }

            return NextResponse.json({ success: true, licensedItemsCount: itemsWithLicenses.length });
        }

        return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    } catch (error) {
        console.error("Webhook processing error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
