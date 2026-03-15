import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_PRODUCTS } from "@/data/products";

const BUCKET_NAME = "plugins";

export async function GET(req: NextRequest) {
    const productId = req.nextUrl.searchParams.get("productId");

    if (!productId) {
        return NextResponse.json(
            { error: "Missing productId parameter" },
            { status: 400 }
        );
    }

    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product?.pluginFileName) {
        return NextResponse.json(
            { error: "No plugin file available for this product" },
            { status: 404 }
        );
    }

    const supabase = createAdminClient();

    const { data: signedUrl, error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(product.pluginFileName, 60, {
            download: product.pluginFileName,
        });

    if (storageError || !signedUrl) {
        console.error("Storage error:", storageError);
        return NextResponse.json(
            { error: "Failed to generate download link" },
            { status: 500 }
        );
    }

    return NextResponse.redirect(signedUrl.signedUrl);
}
