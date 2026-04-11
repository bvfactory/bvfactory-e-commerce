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
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Search, Plus, Key, Copy, Check, Loader2 } from "lucide-react";

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

interface ProductOption {
  product_id: string;
  name: string;
}

interface GenerateResult {
  licenseKey: string;
  activationCode: string;
  productName: string;
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<License | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Generate license state
  const [showGenerate, setShowGenerate] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [genProductId, setGenProductId] = useState("");
  const [genCoreId, setGenCoreId] = useState("");
  const [genEmail, setGenEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [genError, setGenError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

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

  // Fetch products list for the generate form
  useEffect(() => {
    fetch("/api/admin/products/list")
      .then((r) => r.json())
      .then((data) => {
        const opts = (data.products ?? []).map((p: { product_id: string; content: Record<string, unknown> | null }) => ({
          product_id: p.product_id,
          name: (p.content?.name as string) || p.product_id,
        }));
        setProducts(opts);
        if (opts.length > 0 && !genProductId) setGenProductId(opts[0].product_id);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    if (!genProductId || !genCoreId.trim()) return;
    setGenerating(true);
    setGenError("");
    setGenResult(null);
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: genProductId,
          coreId: genCoreId.trim().toUpperCase(),
          email: genEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Erreur lors de la génération");
        return;
      }
      setGenResult({
        licenseKey: data.licenseKey,
        activationCode: data.activationCode,
        productName: data.productName,
      });
      setGenCoreId("");
      setGenEmail("");
      fetchLicenses();
    } catch {
      setGenError("Erreur réseau");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Licences</h1>
          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">
            Gérez les licences actives et révoquées
          </p>
        </div>
        <button
          onClick={() => { setShowGenerate(!showGenerate); setGenResult(null); setGenError(""); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 text-white font-mono text-xs uppercase tracking-widest border-0 hover:brightness-110 transition"
        >
          <Plus className="h-4 w-4" />
          Générer une licence
        </button>
      </div>

      {/* Generate license form */}
      {showGenerate && (
        <div className="glass-panel rounded-2xl p-[1px]">
          <div className="relative bg-[#0a1628] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-4 w-4 text-teal-400" />
              <h3 className="font-semibold text-white tracking-tight">Générer une licence manuellement</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">
                  Produit
                </Label>
                <Select value={genProductId} onValueChange={(v) => setGenProductId(v ?? "")}>
                  <SelectTrigger className="bg-[#0a1628] border-white/10 text-white font-mono text-xs">
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.product_id} value={p.product_id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">
                  Core ID (Locking ID)
                </Label>
                <Input
                  placeholder="Ex: AB12CD34EF56"
                  value={genCoreId}
                  onChange={(e) => setGenCoreId(e.target.value.toUpperCase())}
                  className="bg-[#0a1628] border-white/10 text-white font-mono text-xs placeholder:text-slate-600 focus-visible:ring-teal-500 uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">
                  Email (optionnel)
                </Label>
                <Input
                  placeholder="client@example.com"
                  value={genEmail}
                  onChange={(e) => setGenEmail(e.target.value)}
                  className="bg-[#0a1628] border-white/10 text-white font-mono text-xs placeholder:text-slate-600 focus-visible:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || !genProductId || !genCoreId.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-mono text-xs uppercase tracking-widest transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                Générer
              </button>
              {genError && (
                <p className="text-xs text-red-400 font-mono">{genError}</p>
              )}
            </div>

            {/* Result */}
            {genResult && (
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-3">
                <p className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                  Licence générée avec succès
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em] mb-1">Produit</p>
                    <p className="text-sm text-white font-medium">{genResult.productName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em] mb-1">Code d&apos;activation</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-mono font-semibold">{genResult.activationCode}</p>
                      <button
                        onClick={() => handleCopy(genResult.activationCode, "activation")}
                        className="text-slate-500 hover:text-white transition-colors"
                      >
                        {copied === "activation" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em] mb-1">Clé de licence</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-teal-400 font-mono font-semibold break-all">{genResult.licenseKey}</p>
                      <button
                        onClick={() => handleCopy(genResult.licenseKey, "license")}
                        className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
                      >
                        {copied === "license" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Rechercher par Core ID ou Produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#0a1628] border-white/10 text-white font-mono text-xs placeholder:text-slate-600 focus-visible:ring-teal-500"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-[180px] bg-[#0a1628] border-white/10 text-slate-300 font-mono text-xs">
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

      <div className="glass-panel rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-white/5">
              <TableHead className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">Date</TableHead>
              <TableHead className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">Produit</TableHead>
              <TableHead className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">Core ID</TableHead>
              <TableHead className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">Statut</TableHead>
              <TableHead className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em]">Commande</TableHead>
              <TableHead className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.15em] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-teal-400" />
                    <span className="font-mono text-xs">Chargement...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="glass-panel rounded-2xl p-12 text-center">
                    <span className="text-slate-500 font-mono text-sm">Aucune licence trouvée.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              licenses.map((license) => (
                <TableRow key={license.id} className="hover:bg-white/[0.02]">
                  <TableCell className="text-sm text-slate-400">
                    {formatDate(license.created_at)}
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                      {license.product_id}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-400">
                    {license.core_id}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={license.status} />
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-500" title={license.order_id}>
                    {truncateUUID(license.order_id)}
                  </TableCell>
                  <TableCell className="text-right">
                    {license.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-500/20 hover:bg-red-500/10"
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
        <p className="text-[11px] font-mono text-slate-500">
          {total} licence{total !== 1 ? "s" : ""} au total
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="bg-[#0a1628] border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-[11px] font-mono"
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="bg-[#0a1628] border-white/10 text-slate-300 hover:bg-white/5 hover:text-white text-[11px] font-mono"
          >
            Suivant
          </Button>
        </div>
      </div>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="glass-panel-light bg-[#0a1628] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Révoquer la licence</DialogTitle>
            <DialogDescription className="text-slate-400">
              Êtes-vous sûr de vouloir révoquer la licence pour le Core ID{" "}
              <span className="font-mono font-semibold text-white">{revokeTarget?.core_id}</span> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)} className="bg-[#0a1628] border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">
              Annuler
            </Button>
            <Button variant="outline" onClick={handleRevoke} disabled={revoking} className="text-red-400 border-red-500/20 hover:bg-red-500/10">
              {revoking ? "Révocation..." : "Révoquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
