"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  CreditCard,
  ExternalLink,
  Key,
  Package,
  Search,
  ShoppingCart,
  Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

/** Raw item shape as stored in the orders JSONB column */
interface RawOrderItem {
  product: {
    id: string;
    name: string;
    price_cents: number;
    description?: string;
    iconName?: string;
  };
  coreId: string;
  licenseKey?: string;
}

interface Order {
  id: string;
  customer_email: string;
  status: string;
  items: RawOrderItem[];
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  activation_code: string | null;
  discount_code: string | null;
  discount_percent: number | null;
  created_at: string;
  updated_at: string;
}

// ── Constants ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  all: "Tous",
  paid: "Payée",
  pending: "En attente",
  failed: "Échouée",
  refunded: "Remboursée",
};

const STATUSES = ["all", "paid", "pending", "failed", "refunded"] as const;
const LIMIT = 25;
const STALE_PENDING_HOURS = 1;

// ── Helpers ────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function computeTotal(items: RawOrderItem[], discountPercent: number | null): number {
  const subtotal = items.reduce((sum, item) => sum + (item.product?.price_cents ?? 0), 0);
  if (discountPercent && discountPercent > 0) {
    return Math.round(subtotal * (1 - discountPercent / 100));
  }
  return subtotal;
}

function formatCents(cents: number): string {
  if (isNaN(cents)) return "—";
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

function getAnomalies(order: Order, items: RawOrderItem[]): string[] {
  const issues: string[] = [];

  // Pending order older than threshold
  if (order.status === "pending") {
    const age = Date.now() - new Date(order.created_at).getTime();
    if (age > STALE_PENDING_HOURS * 3600000) {
      issues.push("Commande en attente depuis plus d'1 heure");
    }
  }

  // Failed order
  if (order.status === "failed") {
    issues.push("Le paiement a échoué");
  }

  // Empty items
  if (items.length === 0) {
    issues.push("Aucun produit dans la commande");
  }

  // Paid but no activation code
  if (order.status === "paid" && !order.activation_code) {
    issues.push("Payée mais pas de code d'activation");
  }

  // Items with missing product data
  const broken = items.filter((i) => !i.product?.name);
  if (broken.length > 0) {
    issues.push(`${broken.length} produit(s) avec données manquantes`);
  }

  return issues;
}

// ── Clipboard button ───────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-slate-500 hover:text-white transition-colors duration-300"
      title="Copier"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("page", String(page));
    params.set("limit", String(LIMIT));

    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur");
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
    } catch {
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefund = async (orderId: string) => {
    setRefunding(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(`Erreur : ${data.error}`);
        return;
      }
      await fetchOrders();
    } catch {
      alert("Erreur réseau lors du remboursement");
    } finally {
      setRefunding(null);
      setConfirmRefundId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // Stats
  const anomalyCount = orders.filter((o) => {
    const items: RawOrderItem[] = Array.isArray(o.items) ? o.items : [];
    return getAnomalies(o, items).length > 0;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Commandes</h1>
          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">
            {total} commande{total !== 1 ? "s" : ""} au total
          </p>
        </div>
        {anomalyCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            {anomalyCount} anomalie{anomalyCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <Input
            placeholder="Rechercher par email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#0a1628] border-white/10 text-white font-mono text-xs placeholder:text-slate-600 focus-visible:ring-teal-500"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Order list */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 text-slate-500 py-16 font-mono text-xs">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-teal-500" />
          Chargement...
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center text-slate-500 py-16 font-mono text-xs">
          <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-40" />
          Aucune commande trouvée.
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const items: RawOrderItem[] = Array.isArray(order.items) ? order.items : [];
            const isExpanded = expandedId === order.id;
            const orderTotal = computeTotal(items, order.discount_percent);
            const anomalies = getAnomalies(order, items);
            const hasAnomaly = anomalies.length > 0;
            const productNames = items
              .map((i) => i.product?.name ?? "Produit inconnu")
              .join(", ");

            return (
              <Fragment key={order.id}>
                <div
                  className={`
                    rounded-xl transition-all duration-300 cursor-pointer
                    ${hasAnomaly ? "glass-panel border-amber-500/30 bg-amber-500/[0.02]" : "glass-panel"}
                    ${isExpanded ? "ring-1 ring-teal-500/20" : "hover:bg-white/[0.03]"}
                  `}
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Status dot + date */}
                    <div className="flex-shrink-0 w-36">
                      <StatusBadge status={order.status} />
                      <p className="text-[11px] font-mono text-slate-500 mt-1.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {relativeTime(order.created_at)}
                      </p>
                    </div>

                    {/* Customer + products */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">
                        {order.customer_email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Package className="h-3 w-3 text-slate-500 flex-shrink-0" />
                        <p className="text-[11px] font-mono text-slate-500 truncate">
                          {items.length} produit{items.length !== 1 ? "s" : ""} — {productNames}
                        </p>
                      </div>
                    </div>

                    {/* Discount */}
                    {order.discount_code && (
                      <div className="flex-shrink-0 hidden sm:block">
                        <span className="text-xs font-mono px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          -{order.discount_percent}%
                        </span>
                      </div>
                    )}

                    {/* Anomaly indicator */}
                    {hasAnomaly && (
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex-shrink-0 text-right w-24">
                      <p className={`font-mono font-semibold text-sm ${orderTotal === 0 ? "text-slate-600" : "text-white"}`}>
                        {formatCents(orderTotal)}
                      </p>
                    </div>

                    {/* Expand arrow */}
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-white/5 px-5 py-4 space-y-4 bg-white/[0.03]" onClick={(e) => e.stopPropagation()}>
                      {/* Anomalies alert */}
                      {hasAnomaly && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 space-y-1">
                          {anomalies.map((a, i) => (
                            <p key={i} className="text-sm text-amber-500 flex items-center gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                              {a}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Meta grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">
                            ID Commande
                          </p>
                          <div className="flex items-center gap-1.5">
                            <p className="font-mono text-xs text-white truncate">{order.id}</p>
                            <CopyButton text={order.id} />
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">
                            Date
                          </p>
                          <p className="text-[11px] font-mono text-slate-400">{formatDate(order.created_at)}</p>
                        </div>

                        {order.activation_code && (
                          <div>
                            <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">
                              Code d&apos;activation
                            </p>
                            <div className="flex items-center gap-1.5">
                              <p className="font-mono text-xs text-white font-semibold">
                                {order.activation_code}
                              </p>
                              <CopyButton text={order.activation_code} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Products detail */}
                      <div>
                        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-2">
                          Détail des produits
                        </p>
                        <div className="space-y-1.5">
                          {items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                                  <Package className="h-4 w-4 text-teal-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-white text-sm truncate">
                                    {item.product?.name ?? "Produit inconnu"}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {item.coreId && (
                                      <span className="text-[10px] font-mono text-slate-500 bg-white/[0.05] px-1.5 py-0.5 rounded">
                                        Core: {item.coreId}
                                      </span>
                                    )}
                                    {item.licenseKey && (
                                      <span className="text-[10px] font-mono text-emerald-500/80 flex items-center gap-0.5">
                                        <Key className="h-2.5 w-2.5" />
                                        Licence générée
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="font-mono text-sm font-medium text-white flex-shrink-0 ml-3">
                                {formatCents(item.product?.price_cents ?? 0)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Subtotal / discount / total */}
                        {order.discount_code && (
                          <div className="mt-3 pt-3 border-t border-white/5 space-y-1 text-right">
                            <p className="text-xs text-slate-500">
                              Sous-total :{" "}
                              <span className="font-mono">
                                {formatCents(items.reduce((s, i) => s + (i.product?.price_cents ?? 0), 0))}
                              </span>
                            </p>
                            <p className="text-xs text-emerald-500">
                              Réduction {order.discount_code} :{" "}
                              <span className="font-mono">-{order.discount_percent}%</span>
                            </p>
                            <p className="text-sm font-semibold text-white">
                              Total :{" "}
                              <span className="font-mono">{formatCents(orderTotal)}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Stripe info */}
                      {order.stripe_session_id && (
                        <div>
                          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">
                            Stripe
                          </p>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                            <p className="font-mono text-[11px] text-slate-500 truncate">
                              {order.stripe_session_id}
                            </p>
                            <CopyButton text={order.stripe_session_id} />
                          </div>
                        </div>
                      )}

                      {/* Refund action */}
                      {order.status === "paid" && order.stripe_payment_intent_id && (
                        <div className="border-t border-white/5 pt-4">
                          {confirmRefundId === order.id ? (
                            <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                              <p className="text-sm text-red-500 flex-1">
                                Confirmer le remboursement complet ? Les licences seront révoquées.
                              </p>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={refunding === order.id}
                                onClick={() => handleRefund(order.id)}
                              >
                                {refunding === order.id ? "..." : "Confirmer"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmRefundId(null)}
                              >
                                Annuler
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => setConfirmRefundId(order.id)}
                            >
                              Rembourser
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] font-mono text-slate-500">
            Page {page} sur {totalPages}
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
      )}
    </div>
  );
}
