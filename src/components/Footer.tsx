"use client";

import Link from "next/link";
import { BVFactoryLogo } from "@/components/BVFactoryLogo";

export function Footer() {
    return (
        <footer className="relative z-10 border-t border-white/5 mt-auto">
            <div className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <BVFactoryLogo className="h-10 w-10" />
                        <div>
                            <span className="text-sm font-bold tracking-[0.15em] uppercase font-mono text-white">BVFactory</span>
                            <span className="text-[9px] text-slate-500 uppercase font-mono tracking-widest block">Show Control Division</span>
                        </div>
                    </div>
                    <nav className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider" aria-label="Footer navigation">
                        <Link href="/plugins" className="px-3 py-2 rounded-lg hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">Store</Link>
                        <Link href="/about" className="px-3 py-2 rounded-lg hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">About</Link>
                        <Link href="/activation" className="px-3 py-2 rounded-lg hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">Activation</Link>
                        <Link href="/contact" className="px-3 py-2 rounded-lg hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50">Contact</Link>
                    </nav>
                    <p className="text-[10px] font-mono text-slate-600 tracking-wider">
                        &copy; {new Date().getFullYear()} BVFactory. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
