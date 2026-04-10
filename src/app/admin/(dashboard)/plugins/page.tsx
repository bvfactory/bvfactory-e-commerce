"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProductIcon } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, XCircle, ArrowRight, HardDrive, Loader2, Plus, Trash2, EyeOff } from "lucide-react";

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
  active: boolean;
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
        alert(data.error || "Erreur lors de la création");
        return;
      }
      router.push(`/admin/plugins/${data.product_id}`);
    } catch {
      alert("Erreur réseau");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(productId: string, newActive: boolean) {
    try {
      await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newActive }),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === productId ? { ...p, active: newActive } : p
        )
      );
    } catch {
      alert("Erreur réseau");
    }
  }

  async function handleDelete(productId: string, productName: string) {
    if (!confirm(`Supprimer "${productName}" ? Cette action est irréversible.`)) return;
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
      alert("Erreur réseau");
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
            Consultez et gérez vos plugins Q-SYS
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
          <h3 className="font-semibold text-foreground">Créer un nouveau produit</h3>
          <div className="flex gap-3">
            <Input
              placeholder="Nom du produit"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              disabled={creating}
            />
            <Button onClick={handleCreate} disabled={creating || !newProductName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
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
                className={`border rounded-xl p-5 space-y-3 transition-opacity ${
                  p.active
                    ? "border-border/50 bg-card/50"
                    : "border-border/30 bg-card/20 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={p.active ? "text-primary" : "text-muted-foreground"}>
                      {getProductIcon(iconName, "h-5 w-5")}
                    </div>
                    <span className="font-semibold text-foreground">{name}</span>
                    {!p.active && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        <EyeOff className="h-3 w-3" />
                        Masqué
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.active}
                      onCheckedChange={(checked) => handleToggleActive(p.product_id, checked)}
                      aria-label={p.active ? "Désactiver le produit" : "Activer le produit"}
                    />
                    <Badge variant="outline" className="capitalize text-xs">
                      {category}
                    </Badge>
                  </div>
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
                        Uploadé
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
                      Gérer
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
