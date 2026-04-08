import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET_NAME = "plugins";

export async function GET(request: NextRequest) {
    const isAdmin = await validateAdminRequest(request);
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get all products from DB
    const { data: products } = await supabase
        .from("product_settings")
        .select("product_id, content");

    // Get all files in the plugins bucket
    const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const plugins = (products ?? []).map((p) => {
        const content = (p.content as Record<string, unknown>) ?? {};
        const pluginFileName = (content.pluginFileName as string) || null;
        const file = pluginFileName ? files?.find((f) => f.name === pluginFileName) : null;
        return {
            productId: p.product_id,
            productName: (content.name as string) || p.product_id,
            pluginFileName,
            uploaded: !!file,
            fileSize: file?.metadata?.size || null,
            updatedAt: file?.updated_at || null,
        };
    });

    return NextResponse.json({ plugins });
}

export async function POST(request: NextRequest) {
    const isAdmin = await validateAdminRequest(request);
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const productId = formData.get("productId") as string;
    const file = formData.get("file") as File;

    if (!productId || !file) {
        return NextResponse.json(
            { error: "productId and file are required" },
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
            { error: "Produit introuvable ou pas de nom de fichier plugin configuré" },
            { status: 400 }
        );
    }

    if (!file.name.endsWith(".qplugx")) {
        return NextResponse.json(
            { error: "File must be a .qplugx file" },
            { status: 400 }
        );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(pluginFileName, buffer, {
            upsert: true,
            contentType: "application/octet-stream",
        });

    if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true, fileName: pluginFileName });
}

export async function DELETE(request: NextRequest) {
    const isAdmin = await validateAdminRequest(request);
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await request.json();

    const supabase = createAdminClient();

    const { data: product } = await supabase
        .from("product_settings")
        .select("content")
        .eq("product_id", productId)
        .maybeSingle();

    const pluginFileName = (product?.content as Record<string, unknown>)?.pluginFileName as string | undefined;
    if (!pluginFileName) {
        return NextResponse.json(
            { error: "Produit introuvable ou pas de nom de fichier plugin configuré" },
            { status: 400 }
        );
    }

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([pluginFileName]);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
