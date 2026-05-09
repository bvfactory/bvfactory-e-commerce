"use client";

import { AttachmentLink } from "./AttachmentLink";

interface Message {
    id: string;
    direction: "inbound" | "outbound";
    body_text: string;
    created_at: string;
    attachments: Array<{
        filename: string;
        size: number;
        mime: string;
        signed_url: string | null;
    }>;
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

export function MessageBubble({ message, fromName }: { message: Message; fromName: string }) {
    const isAdmin = message.direction === "outbound";
    return (
        <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg border p-3 ${
                isAdmin
                    ? "bg-teal-500/10 border-teal-500/20"
                    : "bg-[#0f1e33] border-white/10"
            }`}>
                <div className="flex items-center justify-between gap-4 mb-2">
                    <span className={`text-[10px] uppercase tracking-[0.15em] font-mono ${
                        isAdmin ? "text-teal-400" : "text-slate-400"
                    }`}>
                        {isAdmin ? "Toi" : fromName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                        {formatTime(message.created_at)}
                    </span>
                </div>
                <div className="text-sm text-slate-100 whitespace-pre-wrap break-words">
                    {message.body_text}
                </div>
                {message.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                        {message.attachments.map((att) => (
                            <AttachmentLink key={att.filename + att.size} att={att} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
