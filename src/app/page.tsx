import { getAllFullProducts } from "@/lib/product-settings";
import { getTrustedClients } from "@/lib/trusted-clients";
import { getSiteSettings } from "@/lib/site-settings";
import HomeClient from "./HomeClient";

export const revalidate = 0;

export default async function Home() {
  const [products, trustedClients, siteSettings] = await Promise.all([
    getAllFullProducts(),
    getTrustedClients(),
    getSiteSettings(),
  ]);
  return (
    <HomeClient
      products={products}
      trustedClients={trustedClients}
      siteSettings={siteSettings}
    />
  );
}
