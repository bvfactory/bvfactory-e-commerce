"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Euro, ShoppingCart, KeyRound, Clock, Package, ArrowRight } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface RawOrderItem {
  product: {
    id: string;
    name: string;
    price_cents: number;
  };
  coreId: string;
}

interface RecentOrder {
  id: string;
  customer_email: string;
  status: string;
  items: RawOrderItem[];
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
  if (isNaN(cents)) return "—";
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function computeOrderTotal(order: RecentOrder): number {
  const subtotal = order.items.reduce((sum, item) => sum + (item.product?.price_cents ?? 0), 0);
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-teal-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="rounded-xl glass-panel px-6 py-4">
          <p className="text-sm text-red-400 font-mono">{error ?? "Une erreur est survenue"}</p>
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Tableau de bord
        </h1>
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">
          Vue d&apos;ensemble de votre activité
        </p>
      </div>

      {/* Stats */}
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

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white tracking-tight">
            Commandes récentes
          </h2>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono text-teal-400 uppercase tracking-[0.15em] hover:text-teal-300 transition-colors"
          >
            Voir tout
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <ShoppingCart className="h-8 w-8 mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-slate-500 font-mono">Aucune commande pour le moment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentOrders.map((order) => {
              const total = computeOrderTotal(order);
              const productNames = order.items
                .map((i) => i.product?.name ?? "Inconnu")
                .join(", ");

              return (
                <div
                  key={order.id}
                  className="glass-panel rounded-xl p-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors duration-300"
                >
                  {/* Status */}
                  <div className="flex-shrink-0 w-28">
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Customer + products */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {order.customer_email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Package className="h-3 w-3 text-slate-600 flex-shrink-0" />
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {productNames}
                      </p>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 hidden sm:block">
                    <p className="text-[11px] font-mono text-slate-600">
                      {relativeTime(order.created_at)}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="flex-shrink-0 w-24 text-right">
                    <p className="text-sm font-mono font-semibold text-white">
                      {formatCents(total)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
