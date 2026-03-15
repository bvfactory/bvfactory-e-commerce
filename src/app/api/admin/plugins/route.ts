import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_PRODUCTS } from "@/data/products";

const BUCKET_NAME = "plugins";

export async function GET(request: NextRequest) {
    const isAdmin = await validateAdminRequest(request);
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: files, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const plugins = MOCK_PRODUCTS.map((product) => {
        const file = files?.find((f) => f.name === product.pluginFileName);
        return {
            productId: product.id,
            productName: product.name,
            pluginFileName: product.pluginFileName || null,
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

    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product?.pluginFileName) {
        return NextResponse.json(
            { error: "Unknown product or no pluginFileName configured" },
            { status: 400 }
        );
    }

    if (!file.name.endsWith(".qplugx")) {
        return NextResponse.json(
            { error: "File must be a .qplugx file" },
            { status: 400 }
        );
    }

    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(product.pluginFileName, buffer, {
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

    return NextResponse.json({ success: true, fileName: product.pluginFileName });
}

export async function DELETE(request: NextRequest) {
    const isAdmin = await validateAdminRequest(request);
    if (!isAdmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await request.json();

    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product?.pluginFileName) {
        return NextResponse.json(
            { error: "Unknown product or no pluginFileName configured" },
            { status: 400 }
        );
    }

    const supabase = createAdminClient();

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([product.pluginFileName]);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
