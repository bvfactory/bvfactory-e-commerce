import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_PRODUCTS } from "@/data/products";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("*")
    .eq("product_id", id)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const content = (data.content as Record<string, unknown>) ?? {};
  const mock = MOCK_PRODUCTS.find(p => p.id === id);
  const product = {
    id,
    name: content.name ?? mock?.name ?? "Nouveau produit",
    tagline: content.tagline ?? mock?.tagline ?? "",
    description: content.description ?? mock?.description ?? "",
    longDescription: content.longDescription ?? mock?.longDescription ?? "",
    price_cents: data.price_cents ?? 0,
    iconName: content.iconName ?? mock?.iconName ?? "Layers",
    category: content.category ?? mock?.category ?? "control",
    tier: content.tier ?? mock?.tier ?? "bridge",
    replaces: content.replaces ?? mock?.replaces ?? undefined,
    features: content.features ?? mock?.features ?? [],
    specs: content.specs ?? mock?.specs ?? {},
    compatibility: content.compatibility ?? mock?.compatibility ?? { minQsysVersion: "9.0", supportedCores: ["Any Q-SYS Core"] },
    versionHistory: content.versionHistory ?? mock?.versionHistory ?? [],
    faq: content.faq ?? mock?.faq ?? [],
    pluginFileName: content.pluginFileName ?? mock?.pluginFileName ?? undefined,
    manualUrl: content.manualUrl ?? mock?.manualUrl ?? undefined,
    videoUrl: content.videoUrl ?? mock?.videoUrl ?? undefined,
    screenshots: content.screenshots ?? mock?.screenshots ?? undefined,
    compatibleBrands: content.compatibleBrands ?? mock?.compatibleBrands ?? undefined,
  };

  return NextResponse.json({
    product,
    settings: data,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { price_cents, promo_percent, promo_active, promo_label, algorithm_id, active, content } = body;

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
  if (algorithm_id !== undefined) updateData.algorithm_id = algorithm_id;
  if (active !== undefined) updateData.active = active;

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

  revalidatePath("/plugins");
  revalidatePath(`/plugins/${id}`);

  return NextResponse.json({ settings: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("product_settings")
    .select("product_id")
    .eq("product_id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  // Clean up storage assets
  const folders = [`screenshots/${id}`, `manuals/${id}`];
  for (const folder of folders) {
    const { data: files } = await supabase.storage.from("product-assets").list(folder);
    if (files && files.length > 0) {
      await supabase.storage.from("product-assets").remove(files.map((f) => `${folder}/${f.name}`));
    }
  }

  const { data: pluginFiles } = await supabase.storage.from("plugins").list(id);
  if (pluginFiles && pluginFiles.length > 0) {
    await supabase.storage.from("plugins").remove(pluginFiles.map((f) => `${id}/${f.name}`));
  }

  const { error } = await supabase
    .from("product_settings")
    .delete()
    .eq("product_id", id);

  if (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }

  revalidatePath("/plugins");

  return NextResponse.json({ deleted: true });
}
