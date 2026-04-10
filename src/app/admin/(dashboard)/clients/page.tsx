"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

interface TrustedClient {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  display_order: number;
  active: boolean;
}

export default function TrustedClientsPage() {
  const [clients, setClients] = useState<TrustedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/admin/trusted-clients");
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  function resetForm() {
    setFormName("");
    setFormWebsite("");
    setFormFile(null);
    setFormPreview(null);
    setEditingId(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startEdit(client: TrustedClient) {
    setFormName(client.name);
    setFormWebsite(client.website_url || "");
    setFormPreview(client.logo_url);
    setFormFile(null);
    setEditingId(client.id);
    setShowForm(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFormFile(file);
      setFormPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName) return;
    if (!editingId && !formFile) return;

    setSaving(true);
    const fd = new FormData();
    fd.append("name", formName);
    fd.append("website_url", formWebsite);

    if (editingId) {
      fd.append("id", editingId);
      if (formFile) fd.append("logo", formFile);

      await fetch("/api/admin/trusted-clients", { method: "PATCH", body: fd });
    } else {
      fd.append("logo", formFile!);
      fd.append("display_order", String(clients.length));
      await fetch("/api/admin/trusted-clients", { method: "POST", body: fd });
    }

    setSaving(false);
    resetForm();
    fetchClients();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce client ?")) return;
    setDeleting(id);
    await fetch("/api/admin/trusted-clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    fetchClients();
  }

  async function handleToggleActive(client: TrustedClient) {
    const fd = new FormData();
    fd.append("id", client.id);
    fd.append("active", String(!client.active));
    await fetch("/api/admin/trusted-clients", { method: "PATCH", body: fd });
    setClients((prev) =>
      prev.map((c) => (c.id === client.id ? { ...c, active: !c.active } : c))
    );
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = clients.findIndex((c) => c.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= clients.length) return;

    const updated = [...clients];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];

    // Optimistic update
    setClients(updated);

    // Persist both order changes
    const fd1 = new FormData();
    fd1.append("id", updated[idx].id);
    fd1.append("display_order", String(idx));

    const fd2 = new FormData();
    fd2.append("id", updated[swapIdx].id);
    fd2.append("display_order", String(swapIdx));

    await Promise.all([
      fetch("/api/admin/trusted-clients", { method: "PATCH", body: fd1 }),
      fetch("/api/admin/trusted-clients", { method: "PATCH", body: fd2 }),
    ]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients de confiance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Logos affichés sur la page d&apos;accueil
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border border-border/50 rounded-xl bg-card/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              {editingId ? "Modifier le client" : "Nouveau client"}
            </h2>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nom *</Label>
                <Input
                  id="client-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nom du client"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-website">Site web</Label>
                <Input
                  id="client-website"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Logo upload */}
            <div className="space-y-2">
              <Label>Logo {!editingId && "*"}</Label>
              <div className="flex items-center gap-4">
                {formPreview && (
                  <div className="h-16 w-32 rounded-lg border border-border/50 bg-black/50 flex items-center justify-center p-2">
                    <Image
                      src={formPreview}
                      alt="Aperçu"
                      width={128}
                      height={48}
                      className="object-contain max-h-12 w-auto"
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4" />
                  {formPreview ? "Changer" : "Choisir un logo"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <span className="text-xs text-muted-foreground">
                  PNG, SVG, WebP ou JPEG — max 2 Mo
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={resetForm}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || (!editingId && !formFile)}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingId ? "Enregistrer" : "Ajouter"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Aucun client pour le moment</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-xl bg-card/50 divide-y divide-border/50 overflow-hidden">
          {clients.map((client, idx) => (
            <div
              key={client.id}
              className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
            >
              {/* Drag handle / order */}
              <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                <GripVertical className="w-4 h-4 opacity-30" />
                <span className="text-[10px] font-mono">{idx + 1}</span>
              </div>

              {/* Logo preview */}
              <div className="h-12 w-24 rounded-lg border border-border/50 bg-black/50 flex items-center justify-center p-1.5 shrink-0">
                <Image
                  src={client.logo_url}
                  alt={client.name}
                  width={96}
                  height={48}
                  className="object-contain max-h-10 w-auto"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{client.name}</p>
                {client.website_url && (
                  <p className="text-xs text-muted-foreground truncate">{client.website_url}</p>
                )}
              </div>

              {/* Active toggle */}
              <Switch
                checked={client.active}
                onCheckedChange={() => handleToggleActive(client)}
              />

              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === 0}
                  onClick={() => handleReorder(client.id, "up")}
                >
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={idx === clients.length - 1}
                  onClick={() => handleReorder(client.id, "down")}
                >
                  <ArrowDown className="w-3 h-3" />
                </Button>
              </div>

              {/* Edit */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => startEdit(client)}
              >
                <Pencil className="w-4 h-4" />
              </Button>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                disabled={deleting === client.id}
                onClick={() => handleDelete(client.id)}
              >
                {deleting === client.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
