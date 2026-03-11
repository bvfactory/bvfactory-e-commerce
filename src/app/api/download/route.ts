import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MOCK_PRODUCTS } from "@/data/products";

const BUCKET_NAME = "plugins";

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(req: NextRequest) {
    try {
        const { activationCode, productId } = await req.json();

        if (!activationCode || !productId) {
            return NextResponse.json(
                { error: "Missing activation code or product ID" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Verify the activation code belongs to a paid order containing this product
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("id, items, status")
            .eq("activation_code", activationCode.toUpperCase().trim())
            .single();

        if (orderError || !order) {
            return NextResponse.json(
                { error: "Invalid activation code" },
                { status: 403 }
            );
        }

        if (order.status !== "paid") {
            return NextResponse.json(
                { error: "Order has not been paid" },
                { status: 403 }
            );
        }

        // Check that the product is in the order items
        const items = order.items as Array<{ product: { id: string } }>;
        const hasProduct = items.some((item) => item.product.id === productId);

        if (!hasProduct) {
            return NextResponse.json(
                { error: "This product is not part of your order" },
                { status: 403 }
            );
        }

        // Find the plugin file name
        const product = MOCK_PRODUCTS.find((p) => p.id === productId);
        if (!product?.pluginFileName) {
            return NextResponse.json(
                { error: "No plugin file available for this product" },
                { status: 404 }
            );
        }

        // Generate a signed URL (valid for 60 seconds)
        const { data: signedUrl, error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(product.pluginFileName, 60);

        if (storageError || !signedUrl) {
            console.error("Storage error:", storageError);
            return NextResponse.json(
                { error: "Failed to generate download link" },
                { status: 500 }
            );
        }

        return NextResponse.json({ url: signedUrl.signedUrl });
    } catch (error) {
        console.error("Download API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
