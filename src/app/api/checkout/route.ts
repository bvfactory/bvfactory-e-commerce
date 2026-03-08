import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: Request) {
    try {
        const { items, email, currency, rate, discountCode } = await req.json();

        if (!items || !items.length || !email) {
            return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
        }

        // Server-side validation
        for (const item of items) {
            if (!item.coreId || !item.coreId.match(/^[A-Z0-9-]{8,}$/i)) {
                return NextResponse.json({ error: `Format de Q-SYS Core ID invalide pour ${item.product.name}.` }, { status: 400 });
            }
        }

        const supabase = await createClient();

        const finalCurrency = currency || "EUR";
        const finalRate = rate || 1;

        let appliedDiscountPercent = 0;

        if (discountCode) {
            const { data: dData, error: dError } = await supabase
                .from("discount_codes")
                .select("*")
                .eq("code", discountCode.toUpperCase().trim())
                .eq("active", true)
                .single();

            if (!dError && dData) {
                const isValid = (!dData.expires_at || new Date(dData.expires_at) >= new Date())
                    && (dData.max_uses === null || dData.current_uses < dData.max_uses);
                if (isValid) {
                    appliedDiscountPercent = dData.percent_off;
                }
            }
        }

        // 1. Create pending order in Supabase
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
                customer_email: email,
                status: "pending",
                items: items, // Store array of CartItems natively as JSONB
                discount_code: appliedDiscountPercent > 0 ? discountCode.toUpperCase().trim() : null,
                discount_percent: appliedDiscountPercent > 0 ? appliedDiscountPercent : null
            })
            // Ideally, record `currency` and `amount` here for history if schema updated
            .select()
            .single();

        if (orderError) {
            console.error("Supabase error:", orderError);
            return NextResponse.json({ error: "Erreur lors de la création de la commande" }, { status: 500 });
        }

        // 2. Call Stripe API to create Checkout Session
        const stripeSecret = process.env.STRIPE_SECRET_KEY;

        if (!stripeSecret) {
            console.warn("STRIPE_SECRET_KEY missing, simulating Checkout success.");
            // Sandbox fallback behavior
            return NextResponse.json({ url: `/api/sandbox-payment?orderId=${order.id}` });
        }

        const stripe = new Stripe(stripeSecret, {
            apiVersion: '2026-02-25.clover' // latest or project standard
        });

        const lineItems = items.map((item: { product: { name: string; description: string; price_cents: number; }; coreId: string; }) => ({
            price_data: {
                currency: finalCurrency.toLowerCase(),
                product_data: {
                    name: `${item.product.name} (Core ID: ${item.coreId})`,
                    description: item.product.description,
                },
                unit_amount: Math.round(item.product.price_cents * finalRate),
            },
            quantity: 1,
        }));

        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/success?order_id=${order.id}`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}`,
            customer_email: email,
            metadata: {
                order_id: order.id,
            },
        };

        if (appliedDiscountPercent > 0) {
            // Apply single-use coupon for this session
            const coupon = await stripe.coupons.create({
                percent_off: appliedDiscountPercent,
                duration: 'once',
                name: `Discount: ${discountCode.toUpperCase()}`,
            });
            sessionConfig.discounts = [{ coupon: coupon.id }];

            // Increment usage
            await supabase.rpc('increment_discount_usage', {
                d_code: discountCode.toUpperCase().trim()
            });
            // if you don't have this RPC, you can do:
            // const { data } = await supabase...select usages...
            // await supabase...update usages + 1...
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        // 3. Update order with payment link id
        await supabase
            .from("orders")
            .update({ stripe_session_id: session.id })
            .eq("id", order.id);

        // 4. Return Stripe URL for redirection
        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
    }
}
