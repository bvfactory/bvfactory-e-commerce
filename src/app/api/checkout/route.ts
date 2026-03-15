import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLicenseKey, generateActivationCode } from "@/lib/license";
import { sendOrderConfirmation } from "@/lib/email";
import { getEffectivePrice } from "@/lib/product-settings";
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
            // Increment discount usage if applicable
            if (appliedDiscountPercent > 0 && discountCode) {
                await supabase.rpc('increment_discount_usage', {
                    d_code: discountCode.toUpperCase().trim()
                });
            }
            return await handleFreeOrder(supabase, order, verifiedItems, email);
        }

        // 3. Call Stripe API to create Checkout Session for paid items
        const stripeSecret = process.env.STRIPE_SECRET_KEY;

        if (!stripeSecret) {
            console.warn("STRIPE_SECRET_KEY missing, simulating Checkout success.");
            return NextResponse.json({ url: `/api/sandbox-payment?orderId=${order.id}` });
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

            await supabase.rpc('increment_discount_usage', {
                d_code: discountCode.toUpperCase().trim()
            });
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
    const itemsWithLicenses = items.map((item) => {
        const { licenseKey } = generateLicenseKey(item.product.id, item.coreId);
        return { ...item, licenseKey };
    });

    // Insert individual license records
    for (const item of itemsWithLicenses) {
        const { licenseKey, salt, keyHash, algorithmVersion } = generateLicenseKey(item.product.id, item.coreId);
        // Use the freshly generated key (not the one from map above) so salt/hash are consistent
        item.licenseKey = licenseKey;

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
