"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProductType, getProductIcon } from "@/data/products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ChevronDown,
  DollarSign,
  Type,
  Loader2,
  RotateCcw,
  Save,
  Check,
} from "lucide-react";

interface ProductSettings {
  product_id: string;
  price_cents: number | null;
  promo_percent: number | null;
  promo_active: boolean | null;
  promo_label: string | null;
  content: Record<string, string | null> | null;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [settings, setSettings] = useState<ProductSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([
    "pricing",
    "general",
  ]);

  const fetchProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setProduct(data.product);
      setSettings(data.settings);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  function toggleSection(sectionId: string) {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-24">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/plugins"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux produits
        </Link>
        <p className="text-destructive">Produit introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/admin/plugins"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux produits
      </Link>

      {/* Page title */}
      <div className="flex items-center gap-3">
        <div className="text-primary">
          {getProductIcon(product.iconName, "h-6 w-6")}
        </div>
        <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
        <Badge variant="outline" className="capitalize text-xs">
          {product.category}
        </Badge>
      </div>

      {/* Section 1: Prix & Promotions */}
      <PricingSection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Section 2: Informations générales */}
      <GeneralInfoSection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Future sections (Tasks 5-7) can be added here */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1: Prix & Promotions
// ---------------------------------------------------------------------------

function PricingSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: {
  product: ProductType;
  settings: ProductSettings | null;
  openSections: string[];
  toggleSection: (id: string) => void;
  onRefetch: () => Promise<void>;
}) {
  const displayPrice = settings?.price_cents ?? product.price_cents;
  const displayPromoActive = settings?.promo_active ?? false;
  const displayPromoPercent = settings?.promo_percent ?? 0;
  const displayPromoLabel = settings?.promo_label ?? "";

  const [priceCents, setPriceCents] = useState(displayPrice);
  const [promoActive, setPromoActive] = useState(displayPromoActive);
  const [promoPercent, setPromoPercent] = useState(displayPromoPercent);
  const [promoLabel, setPromoLabel] = useState(displayPromoLabel);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync state when settings change after refetch
  useEffect(() => {
    setPriceCents(settings?.price_cents ?? product.price_cents);
    setPromoActive(settings?.promo_active ?? false);
    setPromoPercent(settings?.promo_percent ?? 0);
    setPromoLabel(settings?.promo_label ?? "");
  }, [settings, product.price_cents]);

  const effectivePrice = promoActive
    ? Math.round(priceCents * (1 - promoPercent / 100))
    : priceCents;

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_cents: priceCents,
          promo_percent: promoPercent,
          promo_active: promoActive,
          promo_label: promoLabel || null,
        }),
      });
      await onRefetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_cents: null,
          promo_percent: null,
          promo_active: false,
          promo_label: null,
        }),
      });
      await onRefetch();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("pricing")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Prix &amp; Promotions
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("pricing") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("pricing") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Prix (€)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step={0.01}
              value={(priceCents / 100).toFixed(2)}
              onChange={(e) =>
                setPriceCents(Math.round(parseFloat(e.target.value || "0") * 100))
              }
            />
          </div>

          {/* Promo toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="promo-active"
              checked={promoActive}
              onCheckedChange={setPromoActive}
            />
            <Label htmlFor="promo-active">Promotion active</Label>
          </div>

          {/* Promo fields (shown only when active) */}
          {promoActive && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="promo-percent">Réduction (%)</Label>
                <Input
                  id="promo-percent"
                  type="number"
                  min={0}
                  max={100}
                  value={promoPercent}
                  onChange={(e) =>
                    setPromoPercent(
                      Math.min(100, Math.max(0, parseInt(e.target.value || "0")))
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-label">Label promo</Label>
                <Input
                  id="promo-label"
                  type="text"
                  placeholder="ex: Offre de lancement"
                  value={promoLabel}
                  onChange={(e) => setPromoLabel(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Effective price display */}
          <div className="text-sm text-muted-foreground">
            Prix effectif :{" "}
            {promoActive ? (
              <>
                <span className="line-through">{formatPrice(priceCents)}</span>{" "}
                <span className="text-emerald-500 font-semibold">
                  {formatPrice(effectivePrice)}
                </span>
              </>
            ) : (
              <span className="font-semibold text-foreground">
                {formatPrice(priceCents)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
            {saved && (
              <span className="text-sm text-emerald-500 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Enregistré !
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Réinitialiser le prix
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2: Informations générales
// ---------------------------------------------------------------------------

function GeneralInfoSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: {
  product: ProductType;
  settings: ProductSettings | null;
  openSections: string[];
  toggleSection: (id: string) => void;
  onRefetch: () => Promise<void>;
}) {
  const content = (settings?.content as Record<string, string | null>) ?? {};

  const [tagline, setTagline] = useState(content.tagline ?? "");
  const [description, setDescription] = useState(content.description ?? "");
  const [longDescription, setLongDescription] = useState(
    content.longDescription ?? ""
  );
  const [videoUrl, setVideoUrl] = useState(content.videoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync state when settings change after refetch
  useEffect(() => {
    const c = (settings?.content as Record<string, string | null>) ?? {};
    setTagline(c.tagline ?? "");
    setDescription(c.description ?? "");
    setLongDescription(c.longDescription ?? "");
    setVideoUrl(c.videoUrl ?? "");
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    try {
      const contentPayload: Record<string, string | null> = {};
      if (tagline !== product.tagline) contentPayload.tagline = tagline || null;
      if (description !== product.description)
        contentPayload.description = description || null;
      if (longDescription !== product.longDescription)
        contentPayload.longDescription = longDescription || null;
      if (videoUrl !== (product.videoUrl ?? ""))
        contentPayload.videoUrl = videoUrl || null;

      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentPayload }),
      });
      await onRefetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: {
            tagline: null,
            description: null,
            longDescription: null,
            videoUrl: null,
          },
        }),
      });
      await onRefetch();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("general")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          Informations générales
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("general") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("general") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              type="text"
              placeholder={product.tagline}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description courte</Label>
            <Input
              id="description"
              type="text"
              placeholder={product.description}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="longDescription">Description longue</Label>
            <textarea
              id="longDescription"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[144px]"
              rows={6}
              placeholder={product.longDescription}
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoUrl">URL vidéo</Label>
            <Input
              id="videoUrl"
              type="text"
              placeholder={product.videoUrl ?? "https://..."}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
            {saved && (
              <span className="text-sm text-emerald-500 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Enregistré !
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
