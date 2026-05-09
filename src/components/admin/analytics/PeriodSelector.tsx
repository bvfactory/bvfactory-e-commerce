"use client";

interface Props {
    value: 7 | 30 | 90;
    onChange: (days: 7 | 30 | 90) => void;
}

const OPTIONS: Array<{ days: 7 | 30 | 90; label: string }> = [
    { days: 7, label: "7 j" },
    { days: 30, label: "30 j" },
    { days: 90, label: "90 j" },
];

export function PeriodSelector({ value, onChange }: Props) {
    return (
        <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
            {OPTIONS.map(({ days, label }) => (
                <button
                    key={days}
                    onClick={() => onChange(days)}
                    className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] transition-colors ${
                        value === days
                            ? "bg-teal-500/20 text-teal-400 border-r border-white/10 last:border-r-0"
                            : "text-slate-400 hover:text-white hover:bg-white/5 border-r border-white/10 last:border-r-0"
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
