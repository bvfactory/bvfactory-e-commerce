import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
    try {
        const { activationCode } = await req.json();

        if (!activationCode || typeof activationCode !== "string") {
            return NextResponse.json({ error: "Activation code is required" }, { status: 400 });
        }

        const code = activationCode.toUpperCase().trim();
        if (!/^BVFA-[A-F0-9]{6}-[A-F0-9]{6}$/.test(code)) {
            return NextResponse.json({ error: "Invalid activation code format" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // Find the paid order by activation code
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("id, items, status")
            .eq("activation_code", code)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: "Activation code not found" }, { status: 404 });
        }

        if (order.status !== "paid") {
            return NextResponse.json({ error: "Order has not been paid" }, { status: 403 });
        }

        // Fetch licenses for this order from the secure licenses table
        const { data: licenses } = await supabase
            .from("licenses")
            .select("product_id, core_id, license_key, status")
            .eq("order_id", order.id);

        // Merge license keys with order items for display
        const items = (order.items as Array<{
            product: { id: string; name: string; price_cents: number; iconName: string; description: string };
            coreId: string;
        }>) || [];

        const result = items.map((item) => {
            const license = licenses?.find(
                (l) => l.product_id === item.product.id && l.core_id === item.coreId.toUpperCase()
            );
            return {
                product: item.product,
                coreId: item.coreId,
                licenseKey: license?.license_key ?? null,
                licenseStatus: license?.status ?? "unknown",
            };
        });

        return NextResponse.json({ items: result });
    } catch (error) {
        console.error("Activation API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
