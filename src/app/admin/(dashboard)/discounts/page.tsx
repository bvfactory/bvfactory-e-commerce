"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface Discount {
  id: string;
  code: string;
  percent_off: number;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  created_at: string;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formCode, setFormCode] = useState("");
  const [formPercentOff, setFormPercentOff] = useState("");
  const [formExpiresAt, setFormExpiresAt] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/discounts");
      const data = await res.json();
      setDiscounts(data.discounts ?? []);
    } catch {
      console.error("Erreur lors du chargement des codes promo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const payload: Record<string, unknown> = {
      code: formCode.toUpperCase(),
      percent_off: parseInt(formPercentOff, 10),
      active: true,
    };
    if (formExpiresAt) payload.expires_at = new Date(formExpiresAt).toISOString();
    if (formMaxUses) payload.max_uses = parseInt(formMaxUses, 10);

    try {
      await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCreateOpen(false);
      resetForm();
      fetchDiscounts();
    } catch {
      console.error("Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setFormCode("");
    setFormPercentOff("");
    setFormExpiresAt("");
    setFormMaxUses("");
  }

  async function handleToggleActive(discount: Discount) {
    try {
      await fetch("/api/admin/discounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: discount.id, active: !discount.active }),
      });
      fetchDiscounts();
    } catch {
      console.error("Erreur lors de la modification");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch("/api/admin/discounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      setDeleteTarget(null);
      fetchDiscounts();
    } catch {
      console.error("Erreur lors de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Codes promo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez et gérez vos codes de réduction
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="w-4 h-4 mr-1.5" />
            Créer un code
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nouveau code promo</DialogTitle>
                <DialogDescription>
                  Créez un nouveau code de réduction pour vos clients.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    placeholder="ex. PROMO20"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="percent_off">Réduction %</Label>
                  <Input
                    id="percent_off"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="ex. 20"
                    value={formPercentOff}
                    onChange={(e) => setFormPercentOff(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expires_at">Date d&apos;expiration (optionnel)</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max_uses">Utilisations max (optionnel)</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    min={1}
                    placeholder="Illimité si vide"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Création..." : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Code</TableHead>
              <TableHead>Réduction</TableHead>
              <TableHead>Actif</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Limite</TableHead>
              <TableHead>Utilisé</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    Chargement...
                  </div>
                </TableCell>
              </TableRow>
            ) : discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Aucun code promo. Créez-en un pour commencer.
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                      {discount.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground">{discount.percent_off}%</span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={discount.active}
                      onCheckedChange={() => handleToggleActive(discount)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(discount.expires_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{discount.max_uses ?? "∞"}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-foreground">
                      {discount.current_uses}
                      {discount.max_uses && (
                        <span className="text-muted-foreground">/{discount.max_uses}</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(discount.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(discount)}
                    >
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le code promo</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le code{" "}
              <span className="font-mono font-semibold">{deleteTarget?.code}</span> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
