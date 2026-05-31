"use client";

import { useCallback, useEffect, useState } from "react";
import { ThreadList, type ThreadRow } from "@/components/admin/messages/ThreadList";
import { ThreadDetail } from "@/components/admin/messages/ThreadDetail";
import { Mail } from "lucide-react";

type Status = "all" | "nouveau" | "répondu" | "archivé" | "corbeille";

const REFRESH_MS = 30_000;

export default function MessagesPage() {
    const [threads, setThreads] = useState<ThreadRow[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<Status>("all");
    const [search, setSearch] = useState("");
    const [counts, setCounts] = useState({ all: 0, nouveau: 0, "répondu": 0, "archivé": 0, corbeille: 0 });

    const fetchThreads = useCallback(async () => {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (search) params.set("search", search);
        const res = await fetch(`/api/admin/messages?${params.toString()}`, { credentials: "include" });
        if (!res.ok) return;
        const { threads: t } = await res.json();
        setThreads(t);
    }, [statusFilter, search]);

    const fetchCounts = useCallback(async () => {
        const [all, nouveau, repondu, archive, corbeille] = await Promise.all([
            fetch("/api/admin/messages", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/admin/messages?status=nouveau", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/admin/messages?status=r%C3%A9pondu", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/admin/messages?status=archiv%C3%A9", { credentials: "include" }).then((r) => r.json()),
            fetch("/api/admin/messages?status=corbeille", { credentials: "include" }).then((r) => r.json()),
        ]);
        setCounts({
            all: all.total ?? 0,
            nouveau: nouveau.total ?? 0,
            "répondu": repondu.total ?? 0,
            "archivé": archive.total ?? 0,
            corbeille: corbeille.total ?? 0,
        });
    }, []);

    useEffect(() => { fetchThreads(); }, [fetchThreads]);
    useEffect(() => { fetchCounts(); }, [fetchCounts]);

    useEffect(() => {
        const id = setInterval(() => {
            if (document.visibilityState === "visible") {
                fetchThreads();
                fetchCounts();
            }
        }, REFRESH_MS);
        return () => clearInterval(id);
    }, [fetchThreads, fetchCounts]);

    const handleChange = () => { fetchThreads(); fetchCounts(); };

    const handleEmptyTrash = async () => {
        await fetch("/api/admin/messages/trash/empty", { method: "POST", credentials: "include" });
        setSelectedId(null);
        fetchThreads();
        fetchCounts();
    };

    return (
        <div className="space-y-4">
            <header className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Messages</h1>
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.15em]">
                        Threads du formulaire de contact
                    </p>
                </div>
            </header>

            <div className="bg-[#0a1628] border border-white/10 rounded-xl overflow-hidden h-[calc(100vh-200px)] min-h-[500px]">
                <div className="grid grid-cols-1 md:grid-cols-[380px_1fr] h-full">
                    {/* Mobile: show list when no selection, detail when selected */}
                    <div className={`h-full min-h-0 ${selectedId ? "hidden md:block" : "block"}`}>
                        <ThreadList
                            threads={threads}
                            selectedId={selectedId}
                            statusFilter={statusFilter}
                            search={search}
                            onSelect={setSelectedId}
                            onStatusChange={(s) => { setStatusFilter(s); setSelectedId(null); }}
                            onSearchChange={setSearch}
                            onEmptyTrash={handleEmptyTrash}
                            counts={counts}
                        />
                    </div>
                    <div className={`h-full min-h-0 flex ${selectedId ? "flex" : "hidden md:flex"}`}>
                        {selectedId ? (
                            <ThreadDetail
                                threadId={selectedId}
                                onBack={() => setSelectedId(null)}
                                onChange={handleChange}
                            />
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm font-mono">
                                Sélectionnez un thread
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
