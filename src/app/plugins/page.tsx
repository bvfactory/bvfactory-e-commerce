import { getAllFullProducts } from "@/lib/product-settings";
import PluginsListClient from "./PluginsListClient";

export default async function PluginsStorePage() {
    const products = await getAllFullProducts();
    return <PluginsListClient products={products} />;
}
