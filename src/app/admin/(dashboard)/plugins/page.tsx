"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MOCK_PRODUCTS, getProductIcon } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowRight, HardDrive, Loader2 } from "lucide-react";

interface PluginInfo {
  productId: string;
  productName: string;
  pluginFileName: string | null;
  uploaded: boolean;
  fileSize: number | null;
  updatedAt: string | null;
}

function formatPrice(priceCents: number): string {
  return (priceCents / 100).toFixed(2).replace(".", ",") + " €";
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/plugins");
      const data = await res.json();
      setPlugins(data.plugins ?? []);
    } catch {
      console.error("Erreur lors du chargement des plugins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  function getPluginForProduct(productId: string) {
    return plugins.find((p) => p.productId === productId);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestion des produits</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consultez et gérez vos plugins Q-SYS
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MOCK_PRODUCTS.map((product) => {
            const plugin = getPluginForProduct(product.id);
            const uploaded = plugin?.uploaded ?? false;

            return (
              <div
                key={product.id}
                className="border border-border/50 rounded-xl bg-card/50 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-primary">
                      {getProductIcon(product.iconName, "h-5 w-5")}
                    </div>
                    <span className="font-semibold text-foreground">{product.name}</span>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">
                    {product.category}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  Prix : {formatPrice(product.price_cents)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    {uploaded ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Uploadé
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                        <XCircle className="h-3.5 w-3.5" />
                        Manquant
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/admin/plugins/${product.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Gérer
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
