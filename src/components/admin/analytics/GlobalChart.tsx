"use client";

interface DaySeries {
    date: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface Props {
    series: DaySeries[];
}

const LINES: Array<{ key: keyof Omit<DaySeries, "date">; color: string; label: string }> = [
    { key: "page_views",          color: "#14b8a6", label: "Vues" },
    { key: "plugin_downloads",    color: "#6366f1", label: "Téléchargements" },
    { key: "checkout_initiated",  color: "#f59e0b", label: "Checkouts" },
    { key: "license_activated",   color: "#22c55e", label: "Activations" },
];

const W = 600;
const H = 120;
const PAD_X = 4;
const PAD_Y = 8;

function toPolyline(values: number[], maxVal: number): string {
    if (values.length < 2) return "";
    return values
        .map((v, i) => {
            const x = PAD_X + (i / (values.length - 1)) * (W - 2 * PAD_X);
            const y = maxVal === 0
                ? H - PAD_Y
                : H - PAD_Y - ((v / maxVal) * (H - 2 * PAD_Y));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
}

export function GlobalChart({ series }: Props) {
    if (series.length === 0) return null;

    const maxVal = Math.max(
        ...series.flatMap((d) => LINES.map((l) => d[l.key])),
        1
    );

    return (
        <div className="glass-panel rounded-2xl p-5">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-32"
                preserveAspectRatio="none"
            >
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = H - PAD_Y - ratio * (H - 2 * PAD_Y);
                    return (
                        <line
                            key={ratio}
                            x1={PAD_X} y1={y.toFixed(1)}
                            x2={W - PAD_X} y2={y.toFixed(1)}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="1"
                        />
                    );
                })}
                {LINES.map(({ key, color }) => (
                    <polyline
                        key={key}
                        points={toPolyline(series.map((d) => d[key]), maxVal)}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity="0.85"
                    />
                ))}
            </svg>
            <div className="flex flex-wrap gap-4 mt-3">
                {LINES.map(({ key, color, label }) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span
                            className="inline-block w-3 h-0.5 rounded"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-[11px] font-mono text-slate-400">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
