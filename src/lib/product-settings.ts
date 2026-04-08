import { createAdminClient } from "@/lib/supabase/admin";
import { ProductType } from "@/data/products";

export interface ProductSettings {
  product_id: string;
  price_cents: number;
  promo_percent: number | null;
  promo_active: boolean;
  promo_label: string | null;
}

export interface ProductWithSettings {
  id: string;
  name: string;
  category: string;
  default_price_cents: number;
  price_cents: number;
  promo_percent: number | null;
  promo_active: boolean;
  promo_label: string | null;
}

export interface ProductWithPromo extends ProductType {
  original_price_cents: number;
  promo_percent: number | null;
  promo_active: boolean;
  promo_label: string | null;
}

/** Default template for new products */
const DEFAULT_PRODUCT: Omit<ProductType, "id"> = {
  name: "Nouveau produit",
  tagline: "",
  description: "",
  longDescription: "",
  price_cents: 0,
  iconName: "Layers",
  category: "control",
  features: [],
  specs: {},
  compatibility: { minQsysVersion: "9.0", supportedCores: ["Any Q-SYS Core"] },
  versionHistory: [],
  faq: [],
};

function rowToProduct(row: Record<string, unknown>): ProductWithPromo {
  const content = (row.content as Record<string, unknown>) ?? {};
  const product = { ...DEFAULT_PRODUCT, id: row.product_id as string, ...content } as ProductType;

  const basePriceCents = (row.price_cents as number) ?? 0;
  const promoActive = (row.promo_active as boolean) ?? false;
  const promoPercent = (row.promo_percent as number) ?? null;

  let effectivePrice = basePriceCents;
  if (promoActive && promoPercent && promoPercent > 0) {
    effectivePrice = Math.round(basePriceCents * (1 - promoPercent / 100));
  }
  product.price_cents = effectivePrice;

  return {
    ...product,
    original_price_cents: basePriceCents,
    promo_percent: promoPercent,
    promo_active: promoActive,
    promo_label: (row.promo_label as string) ?? null,
  };
}

/**
 * Get the effective price for a product (with promo applied).
 * Used server-side at checkout to prevent price tampering.
 */
export async function getEffectivePrice(productId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("price_cents, promo_percent, promo_active")
    .eq("product_id", productId)
    .maybeSingle();

  if (!data) throw new Error(`Unknown product: ${productId}`);

  const basePriceCents = data.price_cents ?? 0;
  const promoPercent = data.promo_active && data.promo_percent ? data.promo_percent : 0;

  if (promoPercent > 0) {
    return Math.round(basePriceCents * (1 - promoPercent / 100));
  }
  return basePriceCents;
}

/**
 * Get all products merged with their settings from DB.
 */
export async function getAllProductsWithSettings(): Promise<ProductWithSettings[]> {
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("product_settings")
    .select("*");

  if (!settings) return [];

  return settings.map((s) => {
    const content = (s.content as Record<string, unknown>) ?? {};
    return {
      id: s.product_id,
      name: (content.name as string) ?? "Sans nom",
      category: (content.category as string) ?? "control",
      default_price_cents: s.price_cents ?? 0,
      price_cents: s.price_cents ?? 0,
      promo_percent: s.promo_percent ?? null,
      promo_active: s.promo_active ?? false,
      promo_label: s.promo_label ?? null,
    };
  });
}

export async function getFullProduct(productId: string): Promise<ProductWithPromo> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();

  if (!data) throw new Error(`Unknown product: ${productId}`);

  return rowToProduct(data);
}

export async function getAllFullProducts(): Promise<ProductWithPromo[]> {
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("product_settings")
    .select("*");

  if (!settings) return [];

  return settings.map((s) => rowToProduct(s));
}
