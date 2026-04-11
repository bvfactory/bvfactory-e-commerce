"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Cable,
  Brain,
  Cpu,
  Loader2,
  Pencil,
  Plus,
  Rocket,
  Trash2,
  X,
} from "lucide-react";

type Tier = "bridge" | "forge" | "mind";

interface RoadmapPlugin {
  id: string;
  name: string;
  tier: Tier;
  description: string;
  display_order: number;
  active: boolean;
}

const TIER_OPTIONS: { id: Tier; label: string; icon: typeof Cable }[] = [
  { id: "bridge", label: "Bridge", icon: Cable },
  { id: "forge", label: "Forge", icon: Cpu },
  { id: "mind", label: "Mind", icon: Brain },
];

export default function RoadmapAdminPage() {
  const [items, setItems] = useState<RoadmapPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTier, setFormTier] = useState<Tier>("bridge");
  const [formDescription, setFormDescription] = useState("");

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/admin/roadmap");
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function resetForm() {
    setFormName("");
    setFormTier("bridge");
    setFormDescription("");
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(item: RoadmapPlugin) {
    setFormName(item.name);
    setFormTier(item.tier);
    setFormDescription(item.description);
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch("/api/admin/roadmap", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            name: formName,
            tier: formTier,
            description: formDescription,
          }),
        });
      } else {
        await fetch("/api/admin/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            tier: formTier,
            description: formDescription,
          }),
        });
      }
      resetForm();
      await fetchItems();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    await fetch("/api/admin/roadmap", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    await fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce teasing ?")) return;
    setDeleting(id);
    try {
      await fetch("/api/admin/roadmap", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchItems();
    } finally {
      setDeleting(null);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const a = items[idx];
    const b = items[swapIdx];

    await Promise.all([
      fetch("/api/admin/roadmap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: a.id, display_order: b.display_order }),
      }),
      fetch("/api/admin/roadmap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: b.id, display_order: a.display_order }),
      }),
    ]);
    await fetchItems();
  }

  const tierIcon = (tier: Tier) => {
    const opt = TIER_OPTIONS.find((t) => t.id === tier);
    if (!opt) return null;
    const Icon = opt.icon;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-24">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Rocket className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Teasing / Roadmap</h1>
            <p className="text-sm text-muted-foreground">
              Plugins affichés en &quot;Coming Soon&quot; sur le store
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {/* Form (add/edit) */}
      {showForm && (
        <div className="border border-border/50 rounded-xl bg-card/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              {editingId ? "Modifier le teasing" : "Nouveau teasing"}
            </h2>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap-name">Nom du plugin</Label>
            <Input
              id="roadmap-name"
              placeholder="ex: ScreenBridge"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Tier</Label>
            <div className="flex gap-2">
              {TIER_OPTIONS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormTier(t.id)}
                    className={cn(
                      "flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                      formTier === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="roadmap-desc">Description</Label>
            <textarea
              id="roadmap-desc"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px]"
              rows={3}
              placeholder="Description courte affichée sur la card Coming Soon"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={saving || !formName.trim()} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editingId ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Rocket className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucun teasing configuré</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-xl bg-card/50 divide-y divide-border/50 overflow-hidden">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-4 px-4 py-3 transition-colors",
                !item.active && "opacity-50"
              )}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleReorder(item.id, "up")}
                  disabled={idx === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleReorder(item.id, "down")}
                  disabled={idx === items.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tier icon */}
              <div className="text-muted-foreground">
                {tierIcon(item.tier)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{item.name}</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {item.tier}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Active toggle */}
              <Switch
                checked={item.active}
                onCheckedChange={(checked) => handleToggleActive(item.id, checked)}
              />

              {/* Edit */}
              <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                disabled={deleting === item.id}
                className="text-muted-foreground hover:text-destructive"
              >
                {deleting === item.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
