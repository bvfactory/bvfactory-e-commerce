import { getAllFullProducts } from "@/lib/product-settings";
import PluginsListClient from "./PluginsListClient";

// Allow on-demand revalidation from admin API
export const revalidate = 0;

export default async function PluginsStorePage() {
    const products = await getAllFullProducts();
    return <PluginsListClient products={products} />;
}
