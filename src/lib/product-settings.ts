import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_PRODUCTS, ProductType } from "@/data/products";

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

/**
 * Get the effective price for a product (with promo applied).
 * Used server-side at checkout to prevent price tampering.
 */
export async function getEffectivePrice(productId: string): Promise<number> {
  const product = MOCK_PRODUCTS.find((p) => p.id === productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("price_cents, promo_percent, promo_active")
    .eq("product_id", productId)
    .single();

  const basePriceCents = data?.price_cents ?? product.price_cents;
  const promoPercent = data?.promo_active && data?.promo_percent ? data.promo_percent : 0;

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

  const settingsMap = new Map<string, ProductSettings>();
  if (settings) {
    for (const s of settings) {
      settingsMap.set(s.product_id, s);
    }
  }

  return MOCK_PRODUCTS.map((product) => {
    const s = settingsMap.get(product.id);
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      default_price_cents: product.price_cents,
      price_cents: s?.price_cents ?? product.price_cents,
      promo_percent: s?.promo_percent ?? null,
      promo_active: s?.promo_active ?? false,
      promo_label: s?.promo_label ?? null,
    };
  });
}

function deepMergeProduct(base: ProductType, overrides: Record<string, unknown>): ProductType {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined) continue;
    if (key === "compatibility" && typeof value === "object") {
      result.compatibility = { ...base.compatibility, ...(value as Record<string, unknown>) } as ProductType["compatibility"];
    } else if (key === "specs" && typeof value === "object") {
      result.specs = { ...base.specs, ...(value as Record<string, string>) };
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export async function getFullProduct(productId: string): Promise<ProductType> {
  const mock = MOCK_PRODUCTS.find((p) => p.id === productId);
  if (!mock) throw new Error(`Unknown product: ${productId}`);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("price_cents, promo_percent, promo_active, promo_label, content")
    .eq("product_id", productId)
    .maybeSingle();

  if (!data) return mock;
  const merged = data.content ? deepMergeProduct(mock, data.content as Record<string, unknown>) : { ...mock };
  if (data.price_cents != null) merged.price_cents = data.price_cents;
  return merged;
}

export async function getAllFullProducts(): Promise<ProductType[]> {
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("product_settings")
    .select("*");

  const settingsMap = new Map<string, Record<string, unknown>>();
  if (settings) {
    for (const s of settings) {
      settingsMap.set(s.product_id, s);
    }
  }

  return MOCK_PRODUCTS.map((product) => {
    const s = settingsMap.get(product.id);
    if (!s) return product;
    const merged = s.content ? deepMergeProduct(product, s.content as Record<string, unknown>) : { ...product };
    if (s.price_cents != null) merged.price_cents = s.price_cents as number;
    return merged;
  });
}
