import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET_NAME = "plugins";

export async function GET(req: NextRequest) {
    const productId = req.nextUrl.searchParams.get("productId");

    if (!productId) {
        return NextResponse.json(
            { error: "Missing productId parameter" },
            { status: 400 }
        );
    }

    const supabase = createAdminClient();

    // Get pluginFileName from DB
    const { data: product } = await supabase
        .from("product_settings")
        .select("content")
        .eq("product_id", productId)
        .maybeSingle();

    const pluginFileName = (product?.content as Record<string, unknown>)?.pluginFileName as string | undefined;
    if (!pluginFileName) {
        return NextResponse.json(
            { error: "No plugin file available for this product" },
            { status: 404 }
        );
    }

    const { data: signedUrl, error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(pluginFileName, 60, {
            download: pluginFileName,
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
