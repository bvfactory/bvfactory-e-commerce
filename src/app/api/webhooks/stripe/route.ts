import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLicenseKey, generateActivationCode } from "@/lib/license";
import { sendOrderConfirmation, sendAdminNotification } from "@/lib/email";

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
            return NextResponse.json({ error: "Missing webhook secret or signature" }, { status: 401 });
        }

        {
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

            const supabase = createAdminClient();

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

                const { licenseKey, salt, keyHash, algorithmVersion } = await generateLicenseKey(productId, coreId);

                itemsWithLicenses.push({ ...item });

                // Insert into licenses table
                await supabase.from("licenses").insert({
                    order_id: order.id,
                    product_id: productId,
                    core_id: coreId.toUpperCase(),
                    license_key: licenseKey,
                    key_hash: keyHash,
                    salt: salt,
                    algorithm_version: algorithmVersion,
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
                    stripe_payment_intent_id: (session.payment_intent as string) ?? null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", order.id);

            // Atomically validate and increment discount usage now that payment is confirmed
            if (order.discount_code) {
                await supabase.rpc('try_use_discount', {
                    d_code: order.discount_code
                });
                sendAdminNotification("discount_used", `${order.discount_code}`, {
                    "Code": order.discount_code,
                    "Reduction": `${order.discount_percent}%`,
                    "Client": order.customer_email,
                });
            }

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

            // Notify admin
            const totalCents = itemsWithLicenses.reduce((sum, i) => sum + (i.product?.price_cents || 0), 0);
            const discountCents = order.discount_percent ? Math.round((totalCents * order.discount_percent) / 100) : 0;
            const finalCents = totalCents - discountCents;
            sendAdminNotification("order_paid", `${(finalCents / 100).toFixed(2)}EUR de ${order.customer_email}`, {
                "Commande": order.id.substring(0, 8) + "...",
                "Client": order.customer_email,
                "Montant": `${(finalCents / 100).toFixed(2)} EUR`,
                "Produits": itemsWithLicenses.map(i => `${i.product.name} (${i.coreId})`).join(", "),
                ...(order.discount_code ? { "Code promo": `${order.discount_code} (-${order.discount_percent}%)` } : {}),
            });

            return NextResponse.json({ success: true });
        }

        // Process Stripe refund
        if (event.type === "charge.refunded") {
            const charge = event.data.object as Stripe.Charge;
            const paymentIntentId = charge.payment_intent as string;

            if (!paymentIntentId) {
                return NextResponse.json({ message: "No payment_intent on charge" }, { status: 200 });
            }

            const supabase = createAdminClient();

            const { data: order, error } = await supabase
                .from("orders")
                .select("id, status, customer_email, items, discount_code")
                .eq("stripe_payment_intent_id", paymentIntentId)
                .single();

            if (error || !order) {
                console.warn("charge.refunded: no order found for payment_intent", paymentIntentId);
                return NextResponse.json({ message: "Order not found, ignored" }, { status: 200 });
            }

            // Idempotency: already refunded
            if (order.status === "refunded") {
                return NextResponse.json({ message: "Already refunded" }, { status: 200 });
            }

            // Update order status
            await supabase
                .from("orders")
                .update({ status: "refunded", updated_at: new Date().toISOString() })
                .eq("id", order.id);

            // Revoke all licenses for this order
            await supabase
                .from("licenses")
                .update({ status: "revoked" })
                .eq("order_id", order.id);

            // Decrement discount code usage if applicable
            if (order.discount_code) {
                await supabase.rpc("decrement_discount_usage", { d_code: order.discount_code });
            }

            // Notify admin
            const refundedAmount = charge.amount_refunded;
            sendAdminNotification("order_refunded", `${(refundedAmount / 100).toFixed(2)}EUR — ${order.customer_email}`, {
                "Commande": order.id.substring(0, 8) + "...",
                "Client": order.customer_email,
                "Montant remboursé": `${(refundedAmount / 100).toFixed(2)} EUR`,
                "Source": "Webhook Stripe",
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    } catch (error) {
        console.error("Webhook processing error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
