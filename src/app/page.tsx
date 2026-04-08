import { getAllFullProducts } from "@/lib/product-settings";
import HomeClient from "./HomeClient";

export const revalidate = 0;

export default async function Home() {
  const products = await getAllFullProducts();
  return <HomeClient products={products} />;
}
