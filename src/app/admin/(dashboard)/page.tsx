"use client";

import { useEffect, useState } from "react";
import { Euro, ShoppingCart, KeyRound, Clock } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OrderItem {
  id: string;
  name: string;
  price_cents: number;
  coreId: string;
}

interface RecentOrder {
  id: string;
  customer_email: string;
  status: string;
  items: OrderItem[];
  created_at: string;
  discount_code: string | null;
  discount_percent: number | null;
}

interface Stats {
  revenue: number;
  ordersByStatus: { paid: number; pending: number; failed: number; refunded: number };
  activeLicenses: number;
  recentOrders: RecentOrder[];
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function computeOrderTotal(order: RecentOrder): number {
  const subtotal = order.items.reduce((sum, item) => sum + (item.price_cents ?? 0), 0);
  return order.discount_percent
    ? Math.round(subtotal * (1 - order.discount_percent / 100))
    : subtotal;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) throw new Error("Impossible de charger les statistiques");
        return res.json();
      })
      .then((data) => setStats(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-sm text-destructive">{error ?? "Une erreur est survenue"}</p>
        </div>
      </div>
    );
  }

  const totalOrders =
    stats.ordersByStatus.paid +
    stats.ordersByStatus.pending +
    stats.ordersByStatus.failed +
    stats.ordersByStatus.refunded;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d&apos;ensemble de votre activité
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires"
          value={formatCents(stats.revenue)}
          icon={Euro}
          description="Total des commandes payées"
        />
        <StatCard
          label="Commandes"
          value={totalOrders}
          icon={ShoppingCart}
          description={`${stats.ordersByStatus.paid} payée${stats.ordersByStatus.paid !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Licences actives"
          value={stats.activeLicenses}
          icon={KeyRound}
          description="Actuellement actives"
        />
        <StatCard
          label="En attente"
          value={stats.ordersByStatus.pending}
          icon={Clock}
          description="En attente de paiement"
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Commandes récentes
        </h2>
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Produits</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucune commande pour le moment
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{order.customer_email}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.items.map((item) => item.name).join(", ")}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCents(computeOrderTotal(order))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
