"use client";

import { Paperclip } from "lucide-react";

interface Attachment {
    filename: string;
    size: number;
    mime: string;
    signed_url: string | null;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentLink({ att }: { att: Attachment }) {
    if (!att.signed_url) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 line-through">
                <Paperclip className="w-3 h-3" /> {att.filename}
            </span>
        );
    }
    return (
        <a
            href={att.signed_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-teal-400 hover:text-teal-300 underline decoration-teal-500/30 hover:decoration-teal-400"
        >
            <Paperclip className="w-3 h-3" />
            {att.filename} <span className="text-slate-500">({formatSize(att.size)})</span>
        </a>
    );
}
