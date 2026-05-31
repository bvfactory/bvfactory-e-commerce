"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface ThreadRow {
    id: string;
    subject: string;
    from_name: string;
    from_email: string;
    status: "nouveau" | "répondu" | "archivé";
    last_message_at: string;
    created_at: string;
}

type StatusFilter = "all" | "nouveau" | "répondu" | "archivé" | "corbeille";

interface Props {
    threads: ThreadRow[];
    selectedId: string | null;
    statusFilter: StatusFilter;
    search: string;
    onSelect: (id: string) => void;
    onStatusChange: (s: StatusFilter) => void;
    onSearchChange: (s: string) => void;
    onEmptyTrash: () => void;
    counts: { all: number; nouveau: number; "répondu": number; "archivé": number; corbeille: number };
}

function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

const STATUS_LABEL = {
    all: "Tous",
    nouveau: "Nouveaux",
    "répondu": "Répondus",
    "archivé": "Archivés",
    corbeille: "Corbeille",
} as const;

export function ThreadList({
    threads, selectedId, statusFilter, search,
    onSelect, onStatusChange, onSearchChange, onEmptyTrash, counts,
}: Props) {
    return (
        <div className="flex flex-col h-full border-r border-white/5 bg-[#0a1628]/50">
            <div className="p-3 border-b border-white/5 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Rechercher…"
                        className="pl-9 bg-[#050d1a] border-white/10 text-white font-mono text-xs placeholder:text-slate-600 focus-visible:ring-teal-500"
                    />
                </div>
                <div className="flex flex-wrap gap-1">
                    {(["all", "nouveau", "répondu", "archivé", "corbeille"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => onStatusChange(s)}
                            className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-[0.1em] border transition-colors ${
                                statusFilter === s
                                    ? "bg-teal-500/15 border-teal-500/30 text-teal-300"
                                    : "bg-transparent border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                            }`}
                        >
                            {STATUS_LABEL[s]} ({counts[s]})
                        </button>
                    ))}
                </div>
                {statusFilter === "corbeille" && counts.corbeille > 0 && (
                    <button
                        onClick={() => {
                            if (confirm(`Vider définitivement la corbeille (${counts.corbeille}) ? Action irréversible.`)) {
                                onEmptyTrash();
                            }
                        }}
                        className="w-full px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-[0.1em] border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                        Vider la corbeille ({counts.corbeille})
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {threads.length === 0 && (
                    <p className="p-6 text-sm text-slate-500 text-center font-mono">Aucun thread</p>
                )}
                {threads.map((t) => {
                    const isActive = t.id === selectedId;
                    const isUnread = t.status === "nouveau" && statusFilter !== "corbeille";
                    return (
                        <button
                            key={t.id}
                            onClick={() => onSelect(t.id)}
                            className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                                isActive
                                    ? "bg-teal-500/10 border-l-2 border-l-teal-400"
                                    : "hover:bg-white/5 border-l-2 border-l-transparent"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-sm truncate ${isUnread ? "text-white font-semibold" : "text-slate-200"}`}>
                                    {t.from_name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                    {formatRelative(t.last_message_at)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{t.subject}</p>
                            <p className="text-[10px] font-mono text-slate-600 truncate mt-0.5">{t.from_email}</p>
                            {isUnread && (
                                <span className="inline-block mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
