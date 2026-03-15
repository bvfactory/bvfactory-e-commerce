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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  price_cents: number;
  coreId: string;
}

interface Order {
  id: string;
  customer_email: string;
  status: string;
  items: OrderItem[];
  stripe_session_id: string | null;
  activation_code: string | null;
  discount_code: string | null;
  discount_percent: number | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  all: "Tous les statuts",
  paid: "Payée",
  pending: "En attente",
  failed: "Échouée",
  refunded: "Remboursée",
};

const STATUSES = ["all", "paid", "pending", "failed", "refunded"] as const;
const LIMIT = 25;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function computeTotal(items: OrderItem[], discountPercent: number | null): number {
  const subtotal = items.reduce((sum, item) => sum + item.price_cents, 0);
  if (discountPercent && discountPercent > 0) {
    return subtotal * (1 - discountPercent / 100);
  }
  return subtotal;
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commandes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gérez et consultez toutes les commandes
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
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

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Produits</TableHead>
              <TableHead>Réduction</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
                    Chargement...
                  </div>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucune commande trouvée.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
                const isExpanded = expandedId === order.id;
                const orderTotal = computeTotal(items, order.discount_percent);

                return (
                  <Fragment key={order.id}>
                    <TableRow
                      className="cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {order.customer_email}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {items.length} — {items.map((i) => i.name).join(", ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.discount_code
                          ? `${order.discount_code} (-${order.discount_percent}%)`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCents(orderTotal)}
                      </TableCell>
                      <TableCell>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="bg-muted/30 p-0">
                          <div className="px-6 py-4 space-y-3 text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                  ID Commande
                                </p>
                                <p className="font-mono text-foreground text-xs">{order.id}</p>
                              </div>

                              {order.activation_code && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                    Code d&apos;activation
                                  </p>
                                  <p className="font-mono text-foreground text-xs">
                                    {order.activation_code}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Produits
                              </p>
                              <div className="space-y-1.5">
                                {items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-foreground text-sm">{item.name}</span>
                                      {item.coreId && (
                                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                          {item.coreId}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono text-sm text-muted-foreground">
                                      {formatCents(item.price_cents)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {order.stripe_session_id && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                                  Session Stripe
                                </p>
                                <p className="font-mono text-xs text-muted-foreground break-all">
                                  {order.stripe_session_id}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total} commande{total !== 1 ? "s" : ""} — Page {page} sur {totalPages}
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
    </div>
  );
}
