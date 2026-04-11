import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, icon: Icon, description, trend }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl glass-panel p-[1px] transition-all duration-500 hover:shadow-lg hover:shadow-teal-500/5">
      {/* Gradient border on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-blue-600/0 group-hover:from-teal-500/20 group-hover:to-blue-600/10 transition-all duration-700 rounded-2xl" />

      <div className="relative bg-[#0a1628] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-[0.15em]">
            {label}
          </p>
          <div className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 p-2 group-hover:border-teal-500/20 transition-colors duration-500">
            <Icon className="h-4 w-4 text-teal-400/70 group-hover:text-teal-400 transition-colors duration-500" />
          </div>
        </div>
        <p
          className={cn(
            "mt-3 text-2xl font-bold font-mono tracking-tight text-white",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-red-400"
          )}
        >
          {value}
        </p>
        {description && (
          <p className="mt-1.5 text-[11px] font-mono text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
