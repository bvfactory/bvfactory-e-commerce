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
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 transition-all hover:border-border hover:shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="rounded-lg bg-muted/50 p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <p className={cn(
          "mt-3 text-2xl font-bold tracking-tight text-foreground",
          trend === "up" && "text-emerald-500",
          trend === "down" && "text-red-500"
        )}>
          {value}
        </p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
