"use client";

interface ProductTotals {
    product_id: string;
    product_name: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface Props {
    totals: ProductTotals[];
}

const COLS: Array<{ key: keyof Omit<ProductTotals, "product_id" | "product_name">; label: string; color: string }> = [
    { key: "page_views",         label: "Vues",           color: "text-teal-400" },
    { key: "plugin_downloads",   label: "Télécharg.",     color: "text-indigo-400" },
    { key: "checkout_initiated", label: "Checkouts",      color: "text-amber-400" },
    { key: "license_activated",  label: "Activations",    color: "text-green-400" },
];

export function ProductStatsTable({ totals }: Props) {
    if (totals.length === 0) {
        return (
            <div className="glass-panel rounded-2xl p-8 text-center">
                <p className="text-sm text-slate-500 font-mono">Aucune donnée pour cette période</p>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-[0.15em]">
                            Produit
                        </th>
                        {COLS.map(({ key, label, color }) => (
                            <th
                                key={key}
                                className={`px-5 py-3 text-right text-[10px] font-mono font-semibold uppercase tracking-[0.15em] ${color}`}
                            >
                                {label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {totals.map((row) => (
                        <tr
                            key={row.product_id}
                            className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                        >
                            <td className="px-5 py-3 font-medium text-white">
                                {row.product_name}
                            </td>
                            {COLS.map(({ key, color }) => (
                                <td
                                    key={key}
                                    className={`px-5 py-3 text-right font-mono font-semibold ${color}`}
                                >
                                    {row[key].toLocaleString("fr-FR")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
