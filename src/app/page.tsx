import { getAllFullProducts } from "@/lib/product-settings";
import { getTrustedClients } from "@/lib/trusted-clients";
import HomeClient from "./HomeClient";

export const revalidate = 0;

export default async function Home() {
  const [products, trustedClients] = await Promise.all([
    getAllFullProducts(),
    getTrustedClients(),
  ]);
  return <HomeClient products={products} trustedClients={trustedClients} />;
}
