import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLicenseKey, generateActivationCode } from "@/lib/license";
import { sendOrderConfirmation } from "@/lib/email";

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

            // Send confirmation email with invoice
            await sendOrderConfirmation({
                to: order.customer_email,
                orderId: order.id,
                activationCode,
                items: itemsWithLicenses.map((i) => ({
                    productName: i.product.name,
                    coreId: i.coreId,
                    priceCents: i.product.price_cents,
                })),
                currency: "EUR",
                discountCode: order.discount_code,
                discountPercent: order.discount_percent,
            });

            return NextResponse.json({ success: true, licensedItemsCount: itemsWithLicenses.length });
        }

        return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    } catch (error) {
        console.error("Webhook processing error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
