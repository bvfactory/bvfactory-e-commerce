"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProductIcon } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, ArrowRight, HardDrive, Loader2, Plus, Trash2 } from "lucide-react";

interface PluginInfo {
  productId: string;
  productName: string;
  pluginFileName: string | null;
  uploaded: boolean;
  fileSize: number | null;
  updatedAt: string | null;
}

interface DbProduct {
  product_id: string;
  price_cents: number | null;
  content: Record<string, unknown> | null;
}

function formatPrice(priceCents: number): string {
  return (priceCents / 100).toFixed(2).replace(".", ",") + " \u20ac";
}

export default function PluginsPage() {
  const router = useRouter();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pluginsRes, productsRes] = await Promise.all([
        fetch("/api/admin/plugins"),
        fetch("/api/admin/products/list"),
      ]);
      const pluginsData = await pluginsRes.json();
      setPlugins(pluginsData.plugins ?? []);

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products ?? []);
      }
    } catch {
      console.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getPluginForProduct(productId: string) {
    return plugins.find((p) => p.productId === productId);
  }

  async function handleCreate() {
    if (!newProductName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProductName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur lors de la cr\u00e9ation");
        return;
      }
      router.push(`/admin/plugins/${data.product_id}`);
    } catch {
      alert("Erreur r\u00e9seau");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(productId: string, productName: string) {
    if (!confirm(`Supprimer "${productName}" ? Cette action est irr\u00e9versible.`)) return;
    setDeleting(productId);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression");
        return;
      }
      fetchData();
    } catch {
      alert("Erreur r\u00e9seau");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des produits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consultez et g\u00e9rez vos plugins Q-SYS
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau produit
        </Button>
      </div>

      {showCreateForm && (
        <div className="border border-border/50 rounded-xl bg-card/50 p-5 space-y-3">
          <h3 className="font-semibold text-foreground">Cr\u00e9er un nouveau produit</h3>
          <div className="flex gap-3">
            <Input
              placeholder="Nom du produit"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              disabled={creating}
            />
            <Button onClick={handleCreate} disabled={creating || !newProductName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cr\u00e9er"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement...
        </div>
      ) : products.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          Aucun produit. Cliquez sur &quot;Nouveau produit&quot; pour commencer.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((p) => {
            const content = p.content ?? {};
            const name = (content.name as string) || p.product_id;
            const category = (content.category as string) || "control";
            const iconName = (content.iconName as string) || "Layers";
            const priceCents = p.price_cents ?? 0;
            const plugin = getPluginForProduct(p.product_id);
            const uploaded = plugin?.uploaded ?? false;

            return (
              <div
                key={p.product_id}
                className="border border-border/50 rounded-xl bg-card/50 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-primary">
                      {getProductIcon(iconName, "h-5 w-5")}
                    </div>
                    <span className="font-semibold text-foreground">{name}</span>
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">
                    {category}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  Prix : {formatPrice(priceCents)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm">
                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                    {uploaded ? (
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Upload\u00e9
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                        <XCircle className="h-3.5 w-3.5" />
                        Manquant
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDelete(p.product_id, name)}
                      disabled={deleting === p.product_id}
                      className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                    >
                      {deleting === p.product_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Supprimer
                    </button>
                    <Link
                      href={`/admin/plugins/${p.product_id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      G\u00e9rer
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
