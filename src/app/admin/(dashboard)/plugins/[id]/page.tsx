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
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Cpu,
  DollarSign,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Check,
  Trash2,
  Type,
  Users,
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

      {/* Section 3: Fonctionnalités */}
      <FeaturesSection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Section 5: Spécifications techniques */}
      <SpecsSection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Section 6: Compatibilité */}
      <CompatibilitySection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Section 7: Marques compatibles */}
      <BrandsSection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />
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

// ---------------------------------------------------------------------------
// Section 3: Fonctionnalités
// ---------------------------------------------------------------------------

interface SectionProps {
  product: ProductType;
  settings: ProductSettings | null;
  openSections: string[];
  toggleSection: (id: string) => void;
  onRefetch: () => Promise<void>;
}

function FeaturesSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: SectionProps) {
  const content = (settings?.content ?? {}) as Record<string, unknown>;
  const initFeatures = (content.features as string[] | undefined) ?? product.features;

  const [features, setFeatures] = useState<string[]>(initFeatures);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = (settings?.content ?? {}) as Record<string, unknown>;
    setFeatures((c.features as string[] | undefined) ?? product.features);
  }, [settings, product.features]);

  function updateFeature(i: number, value: string) {
    setFeatures((prev) => prev.map((f, idx) => (idx === i ? value : f)));
  }

  function removeFeature(i: number) {
    setFeatures((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveFeature(i: number, direction: number) {
    setFeatures((prev) => {
      const next = [...prev];
      const j = i + direction;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { features } }),
      });
      await onRefetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setFeatures([...product.features]);
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("features")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <List className="w-4 h-4 text-primary" />
          Fonctionnalités
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("features") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("features") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          <div className="space-y-2">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveFeature(i, -1)}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFeature(i, 1)}
                    disabled={i === features.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
                <Input
                  value={feature}
                  onChange={(e) => updateFeature(i, e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeFeature(i)}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFeatures((prev) => [...prev, ""])}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une fonctionnalité
          </Button>

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
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5: Spécifications techniques
// ---------------------------------------------------------------------------

function SpecsSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: SectionProps) {
  const content = (settings?.content ?? {}) as Record<string, unknown>;
  const initSpecs = (content.specs as Record<string, string> | undefined) ?? product.specs;

  function toArray(obj: Record<string, string>) {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(
    toArray(initSpecs)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = (settings?.content ?? {}) as Record<string, unknown>;
    const s = (c.specs as Record<string, string> | undefined) ?? product.specs;
    setSpecs(toArray(s));
  }, [settings, product.specs]);

  function updateSpec(i: number, field: "key" | "value", val: string) {
    setSpecs((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s))
    );
  }

  function removeSpec(i: number) {
    setSpecs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const specsObj: Record<string, string> = {};
      for (const s of specs) {
        if (s.key.trim()) specsObj[s.key.trim()] = s.value;
      }
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { specs: specsObj } }),
      });
      await onRefetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSpecs(toArray(product.specs));
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("specs")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Spécifications techniques
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("specs") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("specs") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          <div className="space-y-2">
            {specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={spec.key}
                  onChange={(e) => updateSpec(i, "key", e.target.value)}
                  placeholder="Clé"
                  className="flex-1"
                />
                <Input
                  value={spec.value}
                  onChange={(e) => updateSpec(i, "value", e.target.value)}
                  placeholder="Valeur"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeSpec(i)}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSpecs((prev) => [...prev, { key: "", value: "" }])}
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une spécification
          </Button>

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
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 6: Compatibilité
// ---------------------------------------------------------------------------

function CompatibilitySection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: SectionProps) {
  const content = (settings?.content ?? {}) as Record<string, unknown>;
  const initCompat = (content.compatibility as {
    minQsysVersion?: string;
    supportedCores?: string[];
    os?: string;
  } | undefined) ?? product.compatibility;

  const [compatibility, setCompatibility] = useState({
    minQsysVersion: initCompat.minQsysVersion ?? "",
    supportedCores: (initCompat.supportedCores ?? []).join(", "),
    os: initCompat.os ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = (settings?.content ?? {}) as Record<string, unknown>;
    const compat = (c.compatibility as {
      minQsysVersion?: string;
      supportedCores?: string[];
      os?: string;
    } | undefined) ?? product.compatibility;
    setCompatibility({
      minQsysVersion: compat.minQsysVersion ?? "",
      supportedCores: (compat.supportedCores ?? []).join(", "),
      os: compat.os ?? "",
    });
  }, [settings, product.compatibility]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: {
            compatibility: {
              minQsysVersion: compatibility.minQsysVersion,
              supportedCores: compatibility.supportedCores
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              os: compatibility.os || undefined,
            },
          },
        }),
      });
      await onRefetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setCompatibility({
      minQsysVersion: product.compatibility.minQsysVersion,
      supportedCores: product.compatibility.supportedCores.join(", "),
      os: product.compatibility.os ?? "",
    });
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("compatibility")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" />
          Compatibilité
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("compatibility") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("compatibility") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minQsysVersion">Version Q-SYS minimum</Label>
            <Input
              id="minQsysVersion"
              type="text"
              value={compatibility.minQsysVersion}
              onChange={(e) =>
                setCompatibility((prev) => ({
                  ...prev,
                  minQsysVersion: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportedCores">Cores supportés</Label>
            <Input
              id="supportedCores"
              type="text"
              placeholder="Core 110f, Core 510i, ..."
              value={compatibility.supportedCores}
              onChange={(e) =>
                setCompatibility((prev) => ({
                  ...prev,
                  supportedCores: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="os">Système requis</Label>
            <Input
              id="os"
              type="text"
              placeholder="Windows, macOS, ..."
              value={compatibility.os}
              onChange={(e) =>
                setCompatibility((prev) => ({
                  ...prev,
                  os: e.target.value,
                }))
              }
            />
          </div>

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
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 7: Marques compatibles
// ---------------------------------------------------------------------------

const AVAILABLE_LOGOS = [
  { value: "/brands/iiyama.svg", label: "iiyama" },
  { value: "/brands/philips.svg", label: "Philips" },
  { value: "/brands/resolume.svg", label: "Resolume" },
  { value: "/brands/madmapper.svg", label: "MadMapper" },
  { value: "/brands/mitsubishi.svg", label: "Mitsubishi" },
  { value: "/brands/avaccess.svg", label: "AV Access" },
];

function BrandsSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: SectionProps) {
  const content = (settings?.content ?? {}) as Record<string, unknown>;
  const initBrands = (content.compatibleBrands as { name: string; logo: string }[] | undefined) ??
    product.compatibleBrands ?? [];

  const [brands, setBrands] = useState<{ name: string; logo: string }[]>(
    initBrands.map((b) => ({ ...b }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = (settings?.content ?? {}) as Record<string, unknown>;
    const b = (c.compatibleBrands as { name: string; logo: string }[] | undefined) ??
      product.compatibleBrands ?? [];
    setBrands(b.map((br) => ({ ...br })));
  }, [settings, product.compatibleBrands]);

  function updateBrand(i: number, field: "name" | "logo", val: string) {
    setBrands((prev) =>
      prev.map((b, idx) => (idx === i ? { ...b, [field]: val } : b))
    );
  }

  function removeBrand(i: number) {
    setBrands((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { compatibleBrands: brands } }),
      });
      await onRefetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    const b = product.compatibleBrands ?? [];
    setBrands(b.map((br) => ({ ...br })));
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("brands")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Marques compatibles
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("brands") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("brands") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          <div className="space-y-2">
            {brands.map((brand, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={brand.name}
                  onChange={(e) => updateBrand(i, "name", e.target.value)}
                  placeholder="Nom de la marque"
                  className="flex-1"
                />
                <select
                  value={brand.logo}
                  onChange={(e) => updateBrand(i, "logo", e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">— Logo —</option>
                  {AVAILABLE_LOGOS.map((logo) => (
                    <option key={logo.value} value={logo.value}>
                      {logo.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeBrand(i)}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setBrands((prev) => [...prev, { name: "", logo: "" }])
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une marque
          </Button>

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
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
