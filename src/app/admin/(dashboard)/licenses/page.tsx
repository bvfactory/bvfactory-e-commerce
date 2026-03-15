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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Search } from "lucide-react";

interface License {
  id: string;
  order_id: string;
  product_id: string;
  core_id: string;
  license_key: string;
  status: "active" | "revoked" | "expired";
  activated_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  all: "Tous les statuts",
  active: "Active",
  revoked: "Révoquée",
  expired: "Expirée",
};

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<License | null>(null);
  const [revoking, setRevoking] = useState(false);

  const limit = 25;
  const totalPages = Math.ceil(total / limit);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    params.set("page", page.toString());
    params.set("limit", limit.toString());

    try {
      const res = await fetch(`/api/admin/licenses?${params.toString()}`);
      const data = await res.json();
      setLicenses(data.licenses ?? []);
      setTotal(data.total ?? 0);
    } catch {
      console.error("Erreur lors du chargement des licences");
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await fetch("/api/admin/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: revokeTarget.id, status: "revoked" }),
      });
      setRevokeTarget(null);
      fetchLicenses();
    } catch {
      console.error("Erreur lors de la révocation");
    } finally {
      setRevoking(false);
    }
  }

  function truncateUUID(uuid: string) {
    return uuid.slice(0, 8) + "…";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Licences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez les licences actives et révoquées
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par Core ID ou Produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Produit</TableHead>
              <TableHead>Core ID</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Commande</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    Chargement...
                  </div>
                </TableCell>
              </TableRow>
            ) : licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Aucune licence trouvée.
                </TableCell>
              </TableRow>
            ) : (
              licenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(license.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                      {license.product_id}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {license.core_id}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={license.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground" title={license.order_id}>
                    {truncateUUID(license.order_id)}
                  </TableCell>
                  <TableCell className="text-right">
                    {license.status === "active" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setRevokeTarget(license)}
                      >
                        Révoquer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} licence{total !== 1 ? "s" : ""} au total
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Révoquer la licence</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir révoquer la licence pour le Core ID{" "}
              <span className="font-mono font-semibold">{revokeTarget?.core_id}</span> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? "Révocation..." : "Révoquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
