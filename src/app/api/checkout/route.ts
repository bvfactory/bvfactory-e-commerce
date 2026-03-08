import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLicenseKey, generateActivationCode } from "@/lib/license";
import { Resend } from "resend";
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

        // 2. Check if all items are free — skip Stripe entirely
        const allFree = items.every((item: { product: { price_cents: number } }) => item.product.price_cents === 0);

        if (allFree) {
            return await handleFreeOrder(supabase, order, items, email);
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

        const lineItems = items
            .filter((item: { product: { price_cents: number } }) => item.product.price_cents > 0)
            .map((item: { product: { name: string; description: string; price_cents: number; }; coreId: string; }) => ({
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
        console.error("Checkout error:", error);
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
        const { licenseKey, salt, keyHash } = generateLicenseKey(item.product.id, item.coreId);
        // Use the freshly generated key (not the one from map above) so salt/hash are consistent
        item.licenseKey = licenseKey;

        await supabase.from("licenses").insert({
            order_id: order.id,
            product_id: item.product.id,
            core_id: item.coreId.toUpperCase(),
            license_key: licenseKey,
            key_hash: keyHash,
            salt: salt,
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

    // Send activation email
    if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const activationLink = `${baseUrl}/activation?code=${activationCode}`;

        await resend.emails.send({
            from: "BVFactory <licences@bvfactory.app>",
            to: email,
            subject: "Your Free Q-SYS Plugin License - BVFactory",
            html: `
                <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; color: #111; background-color: #fafafa; padding: 20px;">
                    <h2 style="text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 10px;">License Compiled Successfully</h2>
                    <p>Your free Q-SYS plugin license has been compiled for your Core ID and is ready for deployment.</p>

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
                        <a href="https://bvfactory.app" style="color: #666;">bvfactory.app</a>
                    </p>
                </div>
            `,
        });
    }

    // Redirect to success page directly (no Stripe)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return NextResponse.json({ url: `${baseUrl}/success?order_id=${order.id}` });
}
