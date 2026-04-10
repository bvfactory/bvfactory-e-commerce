import { createAdminClient } from "@/lib/supabase/admin";

export interface TrustedClient {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
}

export async function getTrustedClients(): Promise<TrustedClient[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("trusted_clients")
    .select("id, name, logo_url, website_url")
    .eq("active", true)
    .order("display_order", { ascending: true });

  return (data as TrustedClient[]) ?? [];
}
