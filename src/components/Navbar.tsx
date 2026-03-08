"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { BVFactoryLogo } from "@/components/BVFactoryLogo";
import { useCart } from "@/contexts/CartContext";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export function Navbar() {
    const { items, setIsCartOpen } = useCart();
    const pathname = usePathname();

    const navLinks = [
        { href: "/#plugins", label: "Q-SYS Plugins" },
        { href: "/activation", label: "Activation" },
        { href: "/contact", label: "Contact" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full">
            {/* Top accent line */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

            <div className="glass-panel-light border-b border-white/5">
                <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 transition-all hover:opacity-90 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-teal-500/30 blur-lg rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <BVFactoryLogo className="h-10 w-10 relative" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold tracking-[0.2em] uppercase font-mono text-white">BVFactory</span>
                            <span className="text-[9px] text-teal-500/70 uppercase font-mono tracking-[0.3em]">Show Control</span>
                        </div>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href || (link.href.includes('#') && pathname === '/');
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`relative px-4 py-2 text-[11px] font-mono uppercase tracking-[0.15em] rounded-lg transition-all duration-300 ${isActive
                                        ? 'text-teal-400'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.label}
                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-teal-500 to-blue-500 rounded-full"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            );
                        })}

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-2" />

                        {/* Cart Button */}
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500/10 to-blue-600/10 border border-teal-500/20 text-teal-400 hover:from-teal-500/20 hover:to-blue-600/20 hover:border-teal-400/40 transition-all duration-300 group"
                        >
                            <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                            <span className="text-[11px] font-mono uppercase tracking-wider">
                                Panier
                            </span>
                            {items.length > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-teal-500 text-slate-900 rounded-full"
                                >
                                    {items.length}
                                </motion.span>
                            )}
                            {items.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-400 rounded-full animate-status-blink" />
                            )}
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}
