import { cn } from "@/lib/utils";

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  paid: {
    bg: "bg-emerald-500/10 border border-emerald-500/20",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    label: "Payée",
  },
  active: {
    bg: "bg-emerald-500/10 border border-emerald-500/20",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    label: "Active",
  },
  pending: {
    bg: "bg-amber-500/10 border border-amber-500/20",
    text: "text-amber-400",
    dot: "bg-amber-400 animate-pulse",
    label: "En attente",
  },
  failed: {
    bg: "bg-red-500/10 border border-red-500/20",
    text: "text-red-400",
    dot: "bg-red-400",
    label: "Échouée",
  },
  refunded: {
    bg: "bg-sky-500/10 border border-sky-500/20",
    text: "text-sky-400",
    dot: "bg-sky-400",
    label: "Remboursée",
  },
  revoked: {
    bg: "bg-red-500/10 border border-red-500/20",
    text: "text-red-400",
    dot: "bg-red-400",
    label: "Révoquée",
  },
  expired: {
    bg: "bg-slate-500/10 border border-slate-500/20",
    text: "text-slate-400",
    dot: "bg-slate-500",
    label: "Expirée",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    bg: "bg-slate-500/10 border border-slate-500/20",
    text: "text-slate-400",
    dot: "bg-slate-500",
    label: status,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium tracking-wide",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
