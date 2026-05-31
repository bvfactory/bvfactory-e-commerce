"use client";

import { useEffect, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ReplyComposer } from "./ReplyComposer";
import { ArrowLeft, Loader2, RotateCcw, Trash2 } from "lucide-react";

interface ThreadDto {
    id: string;
    subject: string;
    from_name: string;
    from_email: string;
    status: "nouveau" | "répondu" | "archivé";
    created_at: string;
    deleted_at: string | null;
}

interface MessageDto {
    id: string;
    direction: "inbound" | "outbound";
    body_text: string;
    created_at: string;
    attachments: Array<{ filename: string; size: number; mime: string; signed_url: string | null }>;
}

const STATUS_COLORS: Record<ThreadDto["status"], string> = {
    nouveau: "bg-teal-500/15 border-teal-500/30 text-teal-300",
    "répondu": "bg-slate-500/15 border-slate-500/30 text-slate-300",
    "archivé": "bg-slate-800 border-slate-700 text-slate-500",
};

interface Props {
    threadId: string;
    onBack: () => void;
    onChange: () => void;
}

export function ThreadDetail({ threadId, onBack, onChange }: Props) {
    const [thread, setThread] = useState<ThreadDto | null>(null);
    const [messages, setMessages] = useState<MessageDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/messages/${threadId}`, { credentials: "include" });
            if (!res.ok) {
                setError(res.status === 404 ? "Thread introuvable" : "Impossible de charger le thread");
                return;
            }
            const { thread: t, messages: m } = await res.json();
            setThread(t);
            setMessages(m);
        } catch {
            setError("Erreur réseau");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [threadId]);

    const restore = async () => {
        const res = await fetch(`/api/admin/messages/${threadId}/trash?restore=true`, {
            method: "POST",
            credentials: "include",
        });
        if (res.ok) {
            onBack();
            onChange();
        }
    };

    const deletePermanently = async () => {
        if (!confirm("Supprimer définitivement cette conversation ? Action irréversible.")) return;
        const res = await fetch(`/api/admin/messages/${threadId}`, {
            method: "DELETE",
            credentials: "include",
        });
        if (res.ok) {
            onBack();
            onChange();
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
            </div>
        );
    }

    if (error || !thread) {
        return (
            <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-red-400 font-mono">{error || "Thread introuvable"}</p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-white/5 bg-[#0a1628]/50 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="md:hidden p-1.5 rounded hover:bg-white/5 text-slate-400"
                    aria-label="Retour"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-white truncate">{thread.subject}</h2>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        {thread.from_name} &lt;{thread.from_email}&gt;
                    </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.15em] border ${STATUS_COLORS[thread.status]}`}>
                    {thread.status}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                    <MessageBubble key={m.id} message={m} fromName={thread.from_name} />
                ))}
                {messages.length === 0 && (
                    <p className="text-center text-sm text-slate-500 font-mono">Aucun message</p>
                )}
            </div>

            {thread.deleted_at ? (
                <div className="border-t border-white/10 bg-[#0a1628] p-4 flex items-center gap-2">
                    <button
                        onClick={restore}
                        className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono uppercase tracking-[0.1em] border border-teal-500/30 text-teal-300 hover:bg-teal-500/10 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" /> Restaurer
                    </button>
                    <button
                        onClick={deletePermanently}
                        className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono uppercase tracking-[0.1em] border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" /> Supprimer définitivement
                    </button>
                </div>
            ) : (
                <ReplyComposer
                    threadId={thread.id}
                    isArchived={thread.status === "archivé"}
                    onSent={() => { load(); onChange(); }}
                    onArchiveToggled={() => { load(); onChange(); }}
                    onTrashed={() => { onBack(); onChange(); }}
                />
            )}
        </div>
    );
}
