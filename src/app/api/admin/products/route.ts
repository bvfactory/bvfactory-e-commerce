import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Nom du produit requis" }, { status: 400 });
  }

  // Generate a URL-safe slug from the name
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (!slug) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check if product_id already exists
  const { data: existing } = await supabase
    .from("product_settings")
    .select("product_id")
    .eq("product_id", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Un produit avec cet identifiant existe déjà" }, { status: 409 });
  }

  const content = {
    name: name.trim(),
    tagline: "",
    description: "",
    longDescription: "",
    iconName: "Layers",
    category: "control",
    features: [],
    specs: {},
    compatibility: { minQsysVersion: "9.0", supportedCores: ["Any Q-SYS Core"] },
    versionHistory: [],
    faq: [],
  };

  const { data, error } = await supabase
    .from("product_settings")
    .insert({
      product_id: slug,
      price_cents: 0,
      promo_percent: null,
      promo_active: false,
      promo_label: null,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }

  revalidatePath("/plugins");

  return NextResponse.json({ product_id: slug, settings: data }, { status: 201 });
}
