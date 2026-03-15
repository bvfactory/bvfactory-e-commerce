import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_PRODUCTS } from "@/data/products";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const product = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("*")
    .eq("product_id", id)
    .maybeSingle();

  return NextResponse.json({
    product,
    settings: data || null,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const product = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const { price_cents, promo_percent, promo_active, promo_label, content } = body;

  if (price_cents !== undefined && (typeof price_cents !== "number" || price_cents < 0)) {
    return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
  }
  if (promo_percent !== undefined && promo_percent !== null) {
    if (typeof promo_percent !== "number" || promo_percent < 0 || promo_percent > 100) {
      return NextResponse.json({ error: "Pourcentage promo invalide" }, { status: 400 });
    }
  }

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    product_id: id,
    updated_at: new Date().toISOString(),
  };

  if (price_cents !== undefined) updateData.price_cents = price_cents;
  if (promo_percent !== undefined) updateData.promo_percent = promo_percent;
  if (promo_active !== undefined) updateData.promo_active = promo_active;
  if (promo_label !== undefined) updateData.promo_label = promo_label;

  if (content !== undefined) {
    const { data: existing } = await supabase
      .from("product_settings")
      .select("content")
      .eq("product_id", id)
      .maybeSingle();

    const existingContent = (existing?.content as Record<string, unknown>) || {};
    const merged = { ...existingContent };

    for (const [key, value] of Object.entries(content as Record<string, unknown>)) {
      if (value === null) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }
    updateData.content = merged;
  }

  const { data, error } = await supabase
    .from("product_settings")
    .upsert(updateData, { onConflict: "product_id" })
    .select()
    .single();

  if (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
