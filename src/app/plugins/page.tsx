import { getAllFullProducts } from "@/lib/product-settings";
import { getRoadmapPlugins } from "@/lib/roadmap";
import PluginsListClient from "./PluginsListClient";

// Allow on-demand revalidation from admin API
export const revalidate = 0;

export default async function PluginsStorePage() {
    const [products, roadmap] = await Promise.all([
        getAllFullProducts(),
        getRoadmapPlugins(),
    ]);
    return <PluginsListClient products={products} roadmap={roadmap} />;
}
