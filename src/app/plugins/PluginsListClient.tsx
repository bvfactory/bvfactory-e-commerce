"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCurrency } from "@/contexts/CurrencyContext";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ArrowRight, Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PRODUCT_CATEGORIES, getProductIcon } from "@/data/products";
import { ProductWithPromo } from "@/lib/product-settings";

export default function PluginsListClient({ products }: { products: ProductWithPromo[] }) {
    const { formatPrice, isLoading } = useCurrency();
    const [activeCategory, setActiveCategory] = useState("all");
    const [search, setSearch] = useState("");

    const filtered = products.filter((product) => {
        const matchesCategory = activeCategory === "all" || product.category === activeCategory;
        const matchesSearch = !search || product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const container: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.15 }
        }
    };

    const item: Variants = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
    };

    return (
        <div className="flex min-h-screen flex-col font-sans selection:bg-teal-500/30 overflow-x-hidden bg-[#050d1a]">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full bg-blue-600/15 blur-[180px]" />
                <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full bg-teal-500/15 blur-[180px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="noise-overlay absolute inset-0" />
            </div>

            <Navbar />

            <main className="relative z-10 flex-1 pt-20 pb-16 px-6">
                <div className="max-w-6xl mx-auto">

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center justify-center p-4 bg-teal-500/10 rounded-full border border-teal-500/30 text-teal-400 mb-6">
                            <Package className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold font-sans tracking-tight text-white uppercase">
                            Plugin Store
                        </h1>
                        <p className="text-teal-400 font-mono mt-4 text-sm tracking-widest uppercase opacity-80">
                            Professional Q-SYS Modules
                        </p>
                    </motion.div>

                    {/* Filters bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-col sm:flex-row items-center gap-4 mb-12"
                    >
                        {/* Category tabs */}
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                            {PRODUCT_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    aria-pressed={activeCategory === cat.id}
                                    className={`relative px-4 py-2 text-[11px] font-mono uppercase tracking-wider rounded-lg transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 ${activeCategory === cat.id
                                        ? "text-white"
                                        : "text-slate-400 hover:text-white"
                                        }`}
                                >
                                    {activeCategory === cat.id && (
                                        <motion.div
                                            layoutId="store-category-bg"
                                            className="absolute inset-0 bg-teal-500/20 border border-teal-500/30 rounded-lg"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">{cat.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="relative sm:ml-auto w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <Input
                                type="text"
                                placeholder="Search modules..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 font-mono text-xs bg-black/50 border-white/10 text-white focus-visible:ring-teal-500 h-10 rounded-lg"
                            />
                        </div>
                    </motion.div>

                    {/* Products grid */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeCategory + search}
                            variants={container}
                            initial="hidden"
                            animate="show"
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {filtered.map((product) => (
                                <motion.div key={product.id} variants={item}>
                                    <Link href={`/plugins/${product.id}`} className="block group h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a] rounded-2xl">
                                        <div className="premium-card relative rounded-2xl overflow-hidden glass-panel p-[1px] h-full">
                                            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-teal-500/30 group-hover:via-blue-500/20 group-hover:to-purple-500/30 transition-all duration-700 rounded-2xl" />

                                            <div className="relative bg-[#0a1628] rounded-2xl p-8 h-full flex flex-col">
                                                {/* Category badge */}
                                                <div className="absolute top-4 right-4">
                                                    <span className="text-[9px] font-mono uppercase tracking-widest text-teal-500/60 bg-teal-500/10 px-2 py-1 rounded-full border border-teal-500/20">
                                                        {product.category}
                                                    </span>
                                                </div>

                                                {/* Icon */}
                                                <div className="relative mb-6 w-fit">
                                                    <div className="absolute inset-0 bg-teal-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                                    <div className="relative inline-flex p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 group-hover:border-teal-500/30 transition-colors duration-500">
                                                        {getProductIcon(product.iconName, "w-8 h-8 text-teal-400 group-hover:text-teal-300 transition-colors")}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-teal-50 transition-colors">
                                                    {product.name}
                                                </h3>
                                                <p className="text-[11px] font-mono text-teal-500/80 uppercase tracking-widest mb-4">
                                                    {product.tagline}
                                                </p>
                                                <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">
                                                    {product.description}
                                                </p>

                                                {/* Compatibility badge */}
                                                <div className="flex items-center gap-2 mb-6 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                                                    Q-SYS {product.compatibility.minQsysVersion}+
                                                </div>

                                                {/* Features preview */}
                                                <div className="mb-8 space-y-2">
                                                    {product.features.slice(0, 3).map((feature, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                                                            <div className="w-1 h-1 rounded-full bg-teal-500/50" />
                                                            <span className="truncate">{feature}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Footer */}
                                                <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                                                    <div>
                                                        <div className="flex items-baseline gap-2">
                                                            <p className={`text-2xl font-bold font-mono ${product.price_cents === 0 ? 'text-teal-400' : 'text-white'}`}>
                                                                {isLoading ? "..." : formatPrice(product.price_cents)}
                                                            </p>
                                                            {product.promo_active && product.original_price_cents !== product.price_cents && (
                                                                <p className="text-sm font-mono text-slate-500 line-through">
                                                                    {isLoading ? "" : formatPrice(product.original_price_cents)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                                                            {product.price_cents === 0 ? "Free License" : "Lifetime License"}
                                                            {product.promo_active && product.promo_label && (
                                                                <span className="ml-2 text-teal-400">{product.promo_label}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-teal-500 text-xs font-mono uppercase tracking-wider opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatePresence>

                    {/* Empty state */}
                    {filtered.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <Package className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">No modules match your filters</p>
                        </motion.div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
