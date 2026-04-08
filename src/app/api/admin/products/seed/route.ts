import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_PRODUCTS } from "@/data/products";

/**
 * One-time seed route: inserts all MOCK_PRODUCTS into the product_settings table.
 * Skips products that already exist in the DB.
 * After running this, the MOCK_PRODUCTS array can be removed from the codebase.
 */
export async function POST(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get existing product IDs to avoid duplicates
  const { data: existing } = await supabase
    .from("product_settings")
    .select("product_id");

  const existingIds = new Set((existing ?? []).map((e) => e.product_id));

  const toInsert = MOCK_PRODUCTS.filter((p) => !existingIds.has(p.id));

  if (toInsert.length === 0) {
    return NextResponse.json({ message: "Tous les produits sont déjà en base", inserted: 0 });
  }

  const rows = toInsert.map((product) => {
    // Extract price_cents separately since it's a top-level column
    const { price_cents, id, ...rest } = product;
    return {
      product_id: id,
      price_cents,
      promo_percent: null,
      promo_active: false,
      promo_label: null,
      content: rest,
    };
  });

  const { error } = await supabase
    .from("product_settings")
    .insert(rows);

  if (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Erreur lors du seed", details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `${toInsert.length} produit(s) importé(s) avec succès`,
    inserted: toInsert.length,
    ids: toInsert.map((p) => p.id),
  });
}
