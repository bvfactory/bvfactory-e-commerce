import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLicenseKey, generateActivationCode } from "@/lib/license";

export async function GET(request: NextRequest) {
  const isAdmin = await validateAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "25", 10);
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  let query = supabase
    .from("licenses")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    const sanitized = search.replace(/[%,.*()]/g, "");
    if (sanitized) {
      query = query.or(
        `core_id.ilike.%${sanitized}%,product_id.ilike.%${sanitized}%`
      );
    }
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: licenses, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ licenses, total: count ?? 0 });
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await validateAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id || status !== "revoked") {
    return NextResponse.json(
      { error: "Invalid request. Provide id and status 'revoked'." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("licenses")
    .update({ status: "revoked" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ license: data });
}

export async function POST(request: NextRequest) {
  const isAdmin = await validateAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { productId, coreId, email } = body;

  if (!productId || typeof productId !== "string") {
    return NextResponse.json({ error: "productId requis" }, { status: 400 });
  }
  if (!coreId || typeof coreId !== "string" || coreId.trim().length < 2) {
    return NextResponse.json({ error: "Core ID requis (min 2 caractères)" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify product exists
  const { data: product } = await supabase
    .from("product_settings")
    .select("product_id, content")
    .eq("product_id", productId)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  // Generate the license key using the product's configured algorithm
  const { licenseKey, salt, keyHash, algorithmVersion } = await generateLicenseKey(productId, coreId.toUpperCase());

  // Create an admin order to link the license to
  const activationCode = generateActivationCode();
  const productName = (product.content as Record<string, unknown>)?.name ?? productId;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_email: email || "admin@bvfactory.dev",
      status: "paid",
      items: [{ product: { id: productId, name: productName, price_cents: 0 }, coreId: coreId.toUpperCase(), licenseKey }],
      activation_code: activationCode,
      discount_code: "ADMIN-MANUAL",
      discount_percent: 100,
    })
    .select()
    .single();

  if (orderError) {
    console.error("Error creating admin order:", orderError);
    return NextResponse.json({ error: "Erreur lors de la création de la commande" }, { status: 500 });
  }

  // Insert the license
  const { data: license, error: licenseError } = await supabase
    .from("licenses")
    .insert({
      order_id: order.id,
      product_id: productId,
      core_id: coreId.toUpperCase(),
      license_key: licenseKey,
      key_hash: keyHash,
      salt,
      algorithm_version: algorithmVersion,
      status: "active",
    })
    .select()
    .single();

  if (licenseError) {
    console.error("Error creating license:", licenseError);
    return NextResponse.json({ error: "Erreur lors de la création de la licence" }, { status: 500 });
  }

  revalidatePath("/admin/licenses");

  return NextResponse.json({
    license,
    licenseKey,
    activationCode,
    productName,
  }, { status: 201 });
}
