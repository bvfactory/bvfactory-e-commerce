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
                    <div className="flex items-center gap-8 text-xs font-mono text-slate-500 uppercase tracking-wider">
                        <Link href="/plugins" className="hover:text-teal-400 transition-colors">Store</Link>
                        <Link href="/activation" className="hover:text-teal-400 transition-colors">Activation</Link>
                        <Link href="/contact" className="hover:text-teal-400 transition-colors">Contact</Link>
                    </div>
                    <p className="text-[10px] font-mono text-slate-600 tracking-wider">
                        &copy; {new Date().getFullYear()} BVFactory. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
