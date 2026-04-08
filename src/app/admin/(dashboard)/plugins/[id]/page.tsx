"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProductType, VersionHistory, FaqItem, getProductIcon } from "@/data/products";
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
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  ImagePlus,
  List,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Check,
  HelpCircle,
  History,
  Pencil,
  Trash2,
  Type,
  Upload,
  Users,
  X,
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
  const router = useRouter();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [settings, setSettings] = useState<ProductSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [pluginInfo, setPluginInfo] = useState<{
    uploaded: boolean;
    fileSize: number | null;
    updatedAt: string | null;
  } | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([
    "pricing",
    "general",
  ]);

  const fetchProduct = useCallback(async () => {
    try {
      const [res, pluginsRes] = await Promise.all([
        fetch(`/api/admin/products/${id}`),
        fetch("/api/admin/plugins"),
      ]);
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setProduct(data.product);
      setSettings(data.settings);

      if (pluginsRes.ok) {
        const pluginsData = await pluginsRes.json();
        const thisPlugin = pluginsData.plugins?.find(
          (p: { productId: string }) => p.productId === id
        );
        setPluginInfo(
          thisPlugin
            ? {
                uploaded: thisPlugin.uploaded,
                fileSize: thisPlugin.fileSize,
                updatedAt: thisPlugin.updatedAt,
              }
            : null
        );
      }
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

  async function handleDeleteProduct() {
    if (!confirm(`Supprimer "${product?.name}" ? Cette action est irréversible et supprimera aussi les fichiers associés.`)) return;
    setDeletingProduct(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression");
        return;
      }
      router.push("/admin/plugins");
    } catch {
      alert("Erreur réseau");
    } finally {
      setDeletingProduct(false);
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-primary">
            {getProductIcon(product.iconName, "h-6 w-6")}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          <Badge variant="outline" className="capitalize text-xs">
            {product.category}
          </Badge>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteProduct}
          disabled={deletingProduct}
          className="gap-2"
        >
          {deletingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Supprimer le produit
        </Button>
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

      {/* Section 8: Images & Screenshots */}
      <ScreenshotsSection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Section 9: Manuel */}
      <ManualSection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Section 10: Fichier Plugin (.qplugx) */}
      <PluginFileSection
        product={product}
        pluginInfo={pluginInfo}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Section 11: Historique des versions */}
      <ChangelogSection
        product={product}
        settings={settings}
        openSections={openSections}
        toggleSection={toggleSection}
        onRefetch={fetchProduct}
      />

      {/* Section 12: FAQ */}
      <FaqSection
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

// ---------------------------------------------------------------------------
// Section 8: Images & Screenshots
// ---------------------------------------------------------------------------

function ScreenshotsSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: SectionProps) {
  const content = (settings?.content ?? {}) as Record<string, unknown>;
  const initScreenshots =
    (content.screenshots as string[] | undefined) ??
    product.screenshots ??
    [];

  const [screenshots, setScreenshots] = useState<string[]>(initScreenshots);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const c = (settings?.content ?? {}) as Record<string, unknown>;
    setScreenshots(
      (c.screenshots as string[] | undefined) ?? product.screenshots ?? []
    );
  }, [settings, product.screenshots]);

  async function handleScreenshotUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingScreenshots(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("type", "screenshot");
        formData.append("file", files[i]);
        await fetch(`/api/admin/products/${product.id}/assets`, {
          method: "POST",
          body: formData,
        });
      }
      await onRefetch();
    } finally {
      setUploadingScreenshots(false);
      e.target.value = "";
    }
  }

  async function handleDeleteScreenshot(url: string) {
    await fetch(`/api/admin/products/${product.id}/assets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "screenshot", url }),
    });
    await onRefetch();
  }

  async function handleReset() {
    setResetting(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { screenshots: null } }),
      });
      await onRefetch();
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("screenshots")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <ImagePlus className="w-4 h-4 text-primary" />
          Images &amp; Screenshots
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("screenshots") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("screenshots") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          {/* Thumbnail grid */}
          {screenshots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {screenshots.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="aspect-square object-cover rounded-lg w-full"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteScreenshot(url)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload drop zone */}
          <label className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors">
            {uploadingScreenshots ? (
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            ) : (
              <ImagePlus className="w-8 h-8 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              Cliquer ou glisser des images ici
            </span>
            <span className="text-xs text-muted-foreground">
              PNG, JPEG, WebP — max 5 Mo par image
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={handleScreenshotUpload}
              disabled={uploadingScreenshots}
            />
          </label>

          {/* Reset */}
          <div className="flex items-center gap-3 pt-2">
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
// Section 9: Manuel
// ---------------------------------------------------------------------------

function ManualSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: SectionProps) {
  const content = (settings?.content ?? {}) as Record<string, unknown>;
  const initManualUrl =
    (content.manualUrl as string | undefined) ?? product.manualUrl ?? null;

  const [manualUrl, setManualUrl] = useState<string | null>(initManualUrl);
  const [uploadingManual, setUploadingManual] = useState(false);

  useEffect(() => {
    const c = (settings?.content ?? {}) as Record<string, unknown>;
    setManualUrl(
      (c.manualUrl as string | undefined) ?? product.manualUrl ?? null
    );
  }, [settings, product.manualUrl]);

  const hasManual = manualUrl && manualUrl !== "#";

  async function handleManualUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingManual(true);
    try {
      const formData = new FormData();
      formData.append("type", "manual");
      formData.append("file", file);
      await fetch(`/api/admin/products/${product.id}/assets`, {
        method: "POST",
        body: formData,
      });
      await onRefetch();
    } finally {
      setUploadingManual(false);
      e.target.value = "";
    }
  }

  async function handleDeleteManual() {
    if (!manualUrl) return;
    await fetch(`/api/admin/products/${product.id}/assets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "manual", url: manualUrl }),
    });
    await onRefetch();
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("manual")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Manuel
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("manual") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("manual") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          {hasManual ? (
            <div className="flex items-center gap-3 flex-wrap">
              <a
                href={manualUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate max-w-xs flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                {manualUrl!.length > 50
                  ? manualUrl!.slice(0, 50) + "..."
                  : manualUrl}
              </a>
              <a
                href={manualUrl!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </a>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDeleteManual}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun manuel uploadé
            </p>
          )}

          {/* Upload */}
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={uploadingManual}
              onClick={() =>
                (document.getElementById("manual-upload") as HTMLInputElement)?.click()
              }
            >
              {uploadingManual ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {hasManual ? "Remplacer le manuel" : "Uploader un manuel"}
            </Button>
            <input
              id="manual-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleManualUpload}
              disabled={uploadingManual}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 10: Fichier Plugin (.qplugx)
// ---------------------------------------------------------------------------

function PluginFileSection({
  product,
  pluginInfo,
  openSections,
  toggleSection,
  onRefetch,
}: {
  product: ProductType;
  pluginInfo: {
    uploaded: boolean;
    fileSize: number | null;
    updatedAt: string | null;
  } | null;
  openSections: string[];
  toggleSection: (id: string) => void;
  onRefetch: () => Promise<void>;
}) {
  const [uploadingPlugin, setUploadingPlugin] = useState(false);

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "\u2014";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  async function handlePluginUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPlugin(true);
    try {
      const formData = new FormData();
      formData.append("productId", product.id);
      formData.append("file", file);
      const res = await fetch("/api/admin/plugins", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Erreur: ${data.error || "Échec de l'upload"}`);
        return;
      }
      await onRefetch();
    } catch (err) {
      alert(`Erreur réseau: ${err instanceof Error ? err.message : "Échec de l'upload"}`);
    } finally {
      setUploadingPlugin(false);
      if (e.target) e.target.value = "";
    }
  }

  async function handleDeletePlugin() {
    try {
      const res = await fetch("/api/admin/plugins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Erreur: ${data.error || "Échec de la suppression"}`);
        return;
      }
      await onRefetch();
    } catch (err) {
      alert(`Erreur réseau: ${err instanceof Error ? err.message : "Échec"}`);
    }
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("plugin-file")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-primary" />
          Fichier Plugin (.qplugx)
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("plugin-file") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("plugin-file") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Statut :</span>
              {pluginInfo?.uploaded ? (
                <Badge
                  variant="outline"
                  className="text-emerald-500 border-emerald-500/30"
                >
                  Uploadé
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Non uploadé
                </Badge>
              )}
            </div>
            {pluginInfo?.uploaded && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Taille :</span>
                  <span>{formatFileSize(pluginInfo.fileSize)}</span>
                </div>
                {pluginInfo.updatedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Dernière mise à jour :
                    </span>
                    <span>
                      {new Date(pluginInfo.updatedAt).toLocaleDateString(
                        "fr-FR",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={uploadingPlugin}
                onClick={() =>
                  (document.getElementById("plugin-upload") as HTMLInputElement)?.click()
                }
              >
                {uploadingPlugin ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {pluginInfo?.uploaded
                  ? "Remplacer le fichier"
                  : "Uploader le fichier"}
              </Button>
              <input
                id="plugin-upload"
                type="file"
                accept=".qplugx"
                className="hidden"
                onChange={handlePluginUpload}
                disabled={uploadingPlugin}
              />
            </div>
            {pluginInfo?.uploaded && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleDeletePlugin}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 11: Historique des versions (Changelog)
// ---------------------------------------------------------------------------

function ChangelogSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: SectionProps) {
  const content = (settings?.content ?? {}) as Record<string, unknown>;
  const initVersionHistory =
    (content.versionHistory as VersionHistory[] | undefined) ??
    product.versionHistory ??
    [];

  const [versionHistory, setVersionHistory] =
    useState<VersionHistory[]>(initVersionHistory);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [addingVersion, setAddingVersion] = useState(false);
  const [newVersion, setNewVersion] = useState({
    version: "",
    date: new Date().toISOString().split("T")[0],
    changes: "",
  });
  const [savingChangelog, setSavingChangelog] = useState(false);
  const [savedChangelog, setSavedChangelog] = useState(false);

  useEffect(() => {
    const c = (settings?.content ?? {}) as Record<string, unknown>;
    setVersionHistory(
      (c.versionHistory as VersionHistory[] | undefined) ??
        product.versionHistory ??
        []
    );
  }, [settings, product.versionHistory]);

  function removeVersion(i: number) {
    setVersionHistory((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateVersion(i: number, updated: VersionHistory) {
    setVersionHistory((prev) =>
      prev.map((v, idx) => (idx === i ? updated : v))
    );
  }

  function addVersion() {
    const changes = newVersion.changes
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    if (!newVersion.version.trim()) return;
    setVersionHistory((prev) => [
      { version: newVersion.version.trim(), date: newVersion.date, changes },
      ...prev,
    ]);
    setNewVersion({
      version: "",
      date: new Date().toISOString().split("T")[0],
      changes: "",
    });
    setAddingVersion(false);
  }

  async function handleSave() {
    setSavingChangelog(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { versionHistory } }),
      });
      await onRefetch();
      setSavedChangelog(true);
      setTimeout(() => setSavedChangelog(false), 2000);
    } finally {
      setSavingChangelog(false);
    }
  }

  function handleReset() {
    setVersionHistory([...(product.versionHistory ?? [])]);
    setEditingVersion(null);
    setAddingVersion(false);
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("changelog")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Historique des versions
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("changelog") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("changelog") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          {/* Add new version */}
          {addingVersion ? (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label>Version</Label>
                  <Input
                    value={newVersion.version}
                    onChange={(e) =>
                      setNewVersion((prev) => ({
                        ...prev,
                        version: e.target.value,
                      }))
                    }
                    placeholder="v1.0.0"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newVersion.date}
                    onChange={(e) =>
                      setNewVersion((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Changements</Label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                  rows={3}
                  placeholder="Un changement par ligne"
                  value={newVersion.changes}
                  onChange={(e) =>
                    setNewVersion((prev) => ({
                      ...prev,
                      changes: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={addVersion}>
                  <Check className="w-4 h-4 mr-2" />
                  OK
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingVersion(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingVersion(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une version
            </Button>
          )}

          {/* Version entries */}
          <div className="space-y-3">
            {versionHistory.map((entry, i) => (
              <div
                key={i}
                className="border border-border/50 rounded-lg p-4 space-y-2"
              >
                {editingVersion === i ? (
                  <VersionEditForm
                    entry={entry}
                    onSave={(updated) => {
                      updateVersion(i, updated);
                      setEditingVersion(null);
                    }}
                    onCancel={() => setEditingVersion(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold">{entry.version}</span>
                        <span className="text-muted-foreground">
                          {entry.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeVersion(i)}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                      {entry.changes.map((change, j) => (
                        <li key={j}>{change}</li>
                      ))}
                    </ul>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingVersion(i)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Éditer
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={savingChangelog}
              size="sm"
            >
              {savingChangelog ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
            {savedChangelog && (
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

function VersionEditForm({
  entry,
  onSave,
  onCancel,
}: {
  entry: VersionHistory;
  onSave: (updated: VersionHistory) => void;
  onCancel: () => void;
}) {
  const [version, setVersion] = useState(entry.version);
  const [date, setDate] = useState(entry.date);
  const [changes, setChanges] = useState(entry.changes.join("\n"));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <Label>Version</Label>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} />
        </div>
        <div className="flex-1 space-y-1">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Changements</Label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
          rows={3}
          value={changes}
          onChange={(e) => setChanges(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() =>
            onSave({
              version: version.trim(),
              date,
              changes: changes
                .split("\n")
                .map((c) => c.trim())
                .filter(Boolean),
            })
          }
        >
          <Check className="w-4 h-4 mr-2" />
          OK
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 12: FAQ (Questions fréquentes)
// ---------------------------------------------------------------------------

function FaqSection({
  product,
  settings,
  openSections,
  toggleSection,
  onRefetch,
}: SectionProps) {
  const content = (settings?.content ?? {}) as Record<string, unknown>;
  const initFaq =
    (content.faq as FaqItem[] | undefined) ?? product.faq ?? [];

  const [faq, setFaq] = useState<FaqItem[]>(initFaq);
  const [editingFaq, setEditingFaq] = useState<number | null>(null);
  const [addingFaq, setAddingFaq] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [savingFaq, setSavingFaq] = useState(false);
  const [savedFaq, setSavedFaq] = useState(false);

  useEffect(() => {
    const c = (settings?.content ?? {}) as Record<string, unknown>;
    setFaq((c.faq as FaqItem[] | undefined) ?? product.faq ?? []);
  }, [settings, product.faq]);

  function removeFaq(i: number) {
    setFaq((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateFaq(i: number, updated: FaqItem) {
    setFaq((prev) => prev.map((f, idx) => (idx === i ? updated : f)));
  }

  function addFaqItem() {
    if (!newFaq.question.trim()) return;
    setFaq((prev) => [...prev, { question: newFaq.question.trim(), answer: newFaq.answer.trim() }]);
    setNewFaq({ question: "", answer: "" });
    setAddingFaq(false);
  }

  async function handleSave() {
    setSavingFaq(true);
    try {
      await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { faq } }),
      });
      await onRefetch();
      setSavedFaq(true);
      setTimeout(() => setSavedFaq(false), 2000);
    } finally {
      setSavingFaq(false);
    }
  }

  function handleReset() {
    setFaq([...(product.faq ?? [])]);
    setEditingFaq(null);
    setAddingFaq(false);
  }

  return (
    <div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
      <button
        onClick={() => toggleSection("faq")}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          Questions fréquentes
        </h2>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            openSections.includes("faq") && "rotate-180"
          )}
        />
      </button>
      {openSections.includes("faq") && (
        <div className="p-5 pt-0 border-t border-border/50 space-y-4">
          {/* FAQ entries */}
          <div className="space-y-3">
            {faq.map((item, i) => (
              <div
                key={i}
                className="border border-border/50 rounded-lg p-4 space-y-2"
              >
                {editingFaq === i ? (
                  <FaqEditForm
                    item={item}
                    onSave={(updated) => {
                      updateFaq(i, updated);
                      setEditingFaq(null);
                    }}
                    onCancel={() => setEditingFaq(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-semibold">
                          Q: {item.question}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R: {item.answer}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeFaq(i)}
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingFaq(i)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Éditer
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new FAQ */}
          {addingFaq ? (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="space-y-1">
                <Label>Question</Label>
                <Input
                  value={newFaq.question}
                  onChange={(e) =>
                    setNewFaq((prev) => ({ ...prev, question: e.target.value }))
                  }
                  placeholder="Comment fonctionne le plugin ?"
                />
              </div>
              <div className="space-y-1">
                <Label>Réponse</Label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                  rows={3}
                  placeholder="La réponse à la question..."
                  value={newFaq.answer}
                  onChange={(e) =>
                    setNewFaq((prev) => ({ ...prev, answer: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={addFaqItem}>
                  <Check className="w-4 h-4 mr-2" />
                  OK
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingFaq(false)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingFaq(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une question
            </Button>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={savingFaq} size="sm">
              {savingFaq ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
            {savedFaq && (
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

function FaqEditForm({
  item,
  onSave,
  onCancel,
}: {
  item: FaqItem;
  onSave: (updated: FaqItem) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState(item.question);
  const [answer, setAnswer] = useState(item.answer);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Question</Label>
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Réponse</Label>
        <textarea
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() =>
            onSave({ question: question.trim(), answer: answer.trim() })
          }
        >
          <Check className="w-4 h-4 mr-2" />
          OK
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Annuler
        </Button>
      </div>
    </div>
  );
}
