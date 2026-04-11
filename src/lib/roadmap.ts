import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductTier } from "@/data/products";

export interface RoadmapPlugin {
  id: string;
  name: string;
  tier: ProductTier;
  description: string;
  display_order: number;
}

export async function getRoadmapPlugins(): Promise<RoadmapPlugin[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("roadmap_plugins")
    .select("id, name, tier, description, display_order")
    .eq("active", true)
    .order("display_order", { ascending: true });

  return (data ?? []) as RoadmapPlugin[];
}
