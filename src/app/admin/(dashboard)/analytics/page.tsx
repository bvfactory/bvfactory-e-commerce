"use client";

import { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";
import { PeriodSelector } from "@/components/admin/analytics/PeriodSelector";
import { GlobalChart } from "@/components/admin/analytics/GlobalChart";
import { ProductStatsTable } from "@/components/admin/analytics/ProductStatsTable";

interface DaySeries {
    date: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface ProductTotals {
    product_id: string;
    product_name: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface AnalyticsData {
    period: { days: number };
    totals: ProductTotals[];
    series: DaySeries[];
}

export default function AnalyticsPage() {
    const [days, setDays] = useState<7 | 30 | 90>(30);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/admin/analytics?days=${days}`)
            .then(async (res) => {
                if (!res.ok) throw new Error("Impossible de charger les analytics");
                return res.json();
            })
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [days]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BarChart2 className="h-6 w-6 text-teal-400" />
                        Analytics
                    </h1>
                    <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">
                        Trafic et usage par produit
                    </p>
                </div>
                <PeriodSelector value={days} onChange={setDays} />
            </div>

            {loading && (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-teal-400" />
                </div>
            )}

            {error && (
                <div className="glass-panel rounded-xl px-6 py-4">
                    <p className="text-sm text-red-400 font-mono">{error}</p>
                </div>
            )}

            {data && !loading && (
                <>
                    {/* Global chart */}
                    <div>
                        <h2 className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Vue globale — {days} derniers jours
                        </h2>
                        <GlobalChart series={data.series} />
                    </div>

                    {/* Per-product table */}
                    <div>
                        <h2 className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Par produit
                        </h2>
                        <ProductStatsTable totals={data.totals} />
                    </div>
                </>
            )}
        </div>
    );
}
