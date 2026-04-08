import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLicenseKey, generateActivationCode } from "@/lib/license";
import { sendOrderConfirmation } from "@/lib/email";
import { getEffectivePrice } from "@/lib/product-settings";
import Stripe from "stripe";

export async function POST(req: Request) {
    try {
        const { items, email, currency, discountCode } = await req.json();

        if (!items || !items.length || !email) {
            return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
        }

        // Server-side validation
        for (const item of items) {
            if (!item.coreId || !item.coreId.match(/^[A-Z0-9-]{8,}$/i)) {
                return NextResponse.json({ error: `Format de Q-SYS Core ID invalide pour ${item.product.name}.` }, { status: 400 });
            }
        }

        const supabase = createAdminClient();

        const finalCurrency = currency || "EUR";
        // Server-side exchange rate — never trust client-provided rates
        const EXCHANGE_RATES: Record<string, number> = {
            EUR: 1, USD: 1.05, GBP: 0.85, CAD: 1.45, AUD: 1.65, JPY: 160.5,
        };
        const finalRate = EXCHANGE_RATES[finalCurrency.toUpperCase()] ?? 1;

        let appliedDiscountPercent = 0;

        if (discountCode) {
            // Read-only check for discount validity (no increment yet).
            // For free orders: atomic try_use_discount is called in handleFreeOrder.
            // For paid orders: increment happens in the Stripe webhook after payment.
            const { data: dData, error: dError } = await supabase
                .from("discount_codes")
                .select("percent_off, active, expires_at, max_uses, current_uses")
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

        // 2. Server-side price verification — never trust client-sent prices
        const verifiedItems = await Promise.all(
            items.map(async (item: { product: { id: string; name: string; description: string; price_cents: number; iconName: string }; coreId: string }) => {
                const serverPrice = await getEffectivePrice(item.product.id);
                return {
                    ...item,
                    product: { ...item.product, price_cents: serverPrice },
                };
            })
        );

        // Replace items with verified prices for all downstream logic
        const allFree = verifiedItems.every((item) => item.product.price_cents === 0);
        const effectivelyFree = allFree || appliedDiscountPercent === 100;

        if (effectivelyFree) {
            // For free orders, atomically validate and consume the discount
            if (appliedDiscountPercent > 0 && discountCode) {
                const { data: used } = await supabase.rpc('try_use_discount', {
                    d_code: discountCode.toUpperCase().trim()
                });
                if (!used || used.length === 0) {
                    return NextResponse.json({ error: "Code de réduction invalide ou épuisé" }, { status: 400 });
                }
            }
            return await handleFreeOrder(supabase, order, verifiedItems, email);
        }

        // 3. Call Stripe API to create Checkout Session for paid items
        const stripeSecret = process.env.STRIPE_SECRET_KEY;

        if (!stripeSecret) {
            console.error("STRIPE_SECRET_KEY is not configured");
            return NextResponse.json({ error: "Payment system not configured" }, { status: 500 });
        }

        const stripe = new Stripe(stripeSecret, {
            apiVersion: '2026-02-25.clover'
        });

        const lineItems = verifiedItems
            .filter((item) => item.product.price_cents > 0)
            .map((item) => ({
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
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/cancel`,
            customer_email: email,
            metadata: {
                order_id: order.id,
            },
        };

        if (appliedDiscountPercent > 0) {
            const coupon = await stripe.coupons.create({
                percent_off: appliedDiscountPercent,
                duration: 'once',
                name: `Discount: ${discountCode.toUpperCase()}`,
            });
            sessionConfig.discounts = [{ coupon: coupon.id }];
        }

        const session = await stripe.checkout.sessions.create(sessionConfig);

        await supabase
            .from("orders")
            .update({ stripe_session_id: session.id })
            .eq("id", order.id);

        return NextResponse.json({ url: session.url });

    } catch (error) {
        console.error("Checkout error:", error instanceof Error ? error.message : error);
        return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
    }
}

interface FreeOrderItem {
    product: { id: string; name: string; price_cents: number; iconName: string; description: string };
    coreId: string;
    licenseKey?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleFreeOrder(supabase: any, order: any, items: FreeOrderItem[], email: string) {
    const activationCode = generateActivationCode();

    // Generate licenses for each free item
    const itemsWithLicenses: FreeOrderItem[] = [];

    for (const item of items) {
        const { licenseKey, salt, keyHash, algorithmVersion } = await generateLicenseKey(item.product.id, item.coreId);

        itemsWithLicenses.push({ ...item });

        await supabase.from("licenses").insert({
            order_id: order.id,
            product_id: item.product.id,
            core_id: item.coreId.toUpperCase(),
            license_key: licenseKey,
            key_hash: keyHash,
            salt: salt,
            algorithm_version: algorithmVersion,
            status: "active",
        });
    }

    // Mark order as paid immediately (no payment needed)
    await supabase
        .from("orders")
        .update({
            status: "paid",
            items: itemsWithLicenses,
            activation_code: activationCode,
            updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

    // Send confirmation email with invoice
    await sendOrderConfirmation({
        to: email,
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

    // Redirect to success page directly (no Stripe)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return NextResponse.json({ url: `${baseUrl}/success?order_id=${order.id}` });
}
