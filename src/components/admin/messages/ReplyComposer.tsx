"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Archive, ArchiveRestore } from "lucide-react";

interface Props {
    threadId: string;
    isArchived: boolean;
    onSent: () => void;
    onArchiveToggled: () => void;
}

export function ReplyComposer({ threadId, isArchived, onSent, onArchiveToggled }: Props) {
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const send = async () => {
        if (!body.trim()) return;
        setSending(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/messages/${threadId}/reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body }),
                credentials: "include",
            });
            if (!res.ok) {
                const { error: msg } = await res.json().catch(() => ({ error: "Échec" }));
                setError(msg || "Échec de l'envoi");
                return;
            }
            setBody("");
            onSent();
        } finally {
            setSending(false);
        }
    };

    const toggleArchive = async () => {
        setError(null);
        try {
            const url = `/api/admin/messages/${threadId}/archive${isArchived ? "?unarchive=true" : ""}`;
            const res = await fetch(url, { method: "POST", credentials: "include" });
            if (!res.ok) {
                const { error: msg } = await res.json().catch(() => ({ error: "Échec" }));
                setError(msg || "Échec de l'archivage");
                return;
            }
            onArchiveToggled();
        } catch {
            setError("Erreur réseau");
        }
    };

    return (
        <div className="border-t border-white/10 bg-[#0a1628] p-4">
            <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={isArchived ? "Thread archivé — désarchivez pour répondre" : "Écrivez votre réponse…"}
                disabled={isArchived || sending}
                rows={5}
                className="w-full bg-[#050d1a] border border-white/10 rounded-lg p-3 text-sm text-slate-100 font-sans placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50 resize-none disabled:opacity-50"
            />
            {error && <p className="text-xs text-red-400 mt-2 font-mono">{error}</p>}
            <div className="flex items-center justify-between mt-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleArchive}
                    className="text-slate-400 hover:text-white"
                >
                    {isArchived ? (
                        <>
                            <ArchiveRestore className="w-4 h-4 mr-1.5" /> Désarchiver
                        </>
                    ) : (
                        <>
                            <Archive className="w-4 h-4 mr-1.5" /> Archiver
                        </>
                    )}
                </Button>
                <Button
                    onClick={send}
                    disabled={!body.trim() || sending || isArchived}
                    className="bg-teal-500 hover:bg-teal-400 text-[#050d1a] font-mono uppercase tracking-[0.1em] text-xs"
                >
                    <Send className="w-4 h-4 mr-1.5" />
                    {sending ? "Envoi…" : "Envoyer"}
                </Button>
            </div>
        </div>
    );
}
