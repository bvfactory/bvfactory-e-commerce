"use client";

import Link from "next/link";
import { ShoppingCart, Menu, X } from "lucide-react";
import { BVFactoryLogo } from "@/components/BVFactoryLogo";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function Navbar() {
    const { items, setIsCartOpen } = useCart();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isMobileMenuOpen]);

    const navLinks = [
        { href: "/plugins", label: "Store" },
        { href: "/about", label: "About" },
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

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
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
                            aria-label={`Open cart${items.length > 0 ? `, ${items.length} items` : ''}`}
                            className="relative flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500/10 to-blue-600/10 border border-teal-500/20 text-teal-400 hover:from-teal-500/20 hover:to-blue-600/20 hover:border-teal-400/40 transition-all duration-300 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                        >
                            <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                            <span className="text-[11px] font-mono uppercase tracking-wider">
                                Cart
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

                    {/* Mobile: Cart + Hamburger */}
                    <div className="flex md:hidden items-center gap-3">
                        <button
                            onClick={() => setIsCartOpen(true)}
                            aria-label="Open cart"
                            className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {items.length > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-teal-500 text-slate-900 rounded-full"
                                >
                                    {items.length}
                                </motion.span>
                            )}
                        </button>
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isMobileMenuOpen}
                            className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                        >
                            <AnimatePresence mode="wait">
                                {isMobileMenuOpen ? (
                                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                        <X className="w-5 h-5" />
                                    </motion.div>
                                ) : (
                                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                                        <Menu className="w-5 h-5" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            key="mobile-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            key="mobile-menu"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="absolute top-full left-0 right-0 z-50 md:hidden"
                        >
                            <div className="glass-panel-light border-b border-white/5 mx-4 mt-2 rounded-2xl overflow-hidden shadow-2xl">
                                <nav className="flex flex-col p-4 gap-1">
                                    {navLinks.map((link, i) => {
                                        const isActive = pathname === link.href || (link.href.includes('#') && pathname === '/');
                                        return (
                                            <motion.div
                                                key={link.href}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <Link
                                                    href={link.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={`block px-4 py-3 rounded-xl text-sm font-mono uppercase tracking-wider transition-all ${isActive
                                                        ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20'
                                                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                                                        }`}
                                                >
                                                    {link.label}
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                                </nav>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
}
