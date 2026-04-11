import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminNotification } from "@/lib/email";
import Stripe from "stripe";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const isAdmin = await validateAdminRequest(request);
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await params;
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
        .from("orders")
        .select("id, status, stripe_payment_intent_id, customer_email, items, discount_code")
        .eq("id", orderId)
        .single();

    if (error || !order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "paid") {
        return NextResponse.json(
            { error: `Cannot refund order with status '${order.status}'` },
            { status: 400 }
        );
    }

    if (!order.stripe_payment_intent_id) {
        return NextResponse.json(
            { error: "No payment intent — free orders cannot be refunded via Stripe" },
            { status: 400 }
        );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: "2026-02-25.clover",
    });

    let refund: Stripe.Refund;
    try {
        refund = await stripe.refunds.create({
            payment_intent: order.stripe_payment_intent_id,
        });
    } catch (stripeErr) {
        const msg = stripeErr instanceof Error ? stripeErr.message : "Stripe error";
        console.error("Stripe refund error:", stripeErr);
        return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Update order status
    await supabase
        .from("orders")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", orderId);

    // Revoke all licenses
    await supabase
        .from("licenses")
        .update({ status: "revoked" })
        .eq("order_id", orderId);

    // Decrement discount usage if applicable
    if (order.discount_code) {
        await supabase.rpc("decrement_discount_usage", { d_code: order.discount_code });
    }

    // Notify admin
    sendAdminNotification(
        "order_refunded",
        `${(refund.amount / 100).toFixed(2)}EUR — ${order.customer_email}`,
        {
            "Commande": orderId.substring(0, 8) + "...",
            "Client": order.customer_email,
            "Montant remboursé": `${(refund.amount / 100).toFixed(2)} EUR`,
            "Source": "Admin",
            "Stripe Refund ID": refund.id,
        }
    );

    return NextResponse.json({ success: true, refundId: refund.id });
}
