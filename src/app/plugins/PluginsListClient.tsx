"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCurrency } from "@/contexts/CurrencyContext";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ArrowRight, Search, Package, Cable, Cpu, Brain, Rocket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PRODUCT_TIERS, PRODUCT_CATEGORIES, TIER_STYLES, ROADMAP_PLUGINS, getProductIcon, type ProductTier } from "@/data/products";
import { ProductWithPromo } from "@/lib/product-settings";
import type { RoadmapPlugin } from "@/lib/roadmap";

const TIER_ICONS: Record<ProductTier, typeof Cable> = {
    bridge: Cable,
    forge: Cpu,
    mind: Brain,
};

export default function PluginsListClient({ products, roadmap = [] }: { products: ProductWithPromo[]; roadmap?: RoadmapPlugin[] }) {
    const { formatPrice, isLoading } = useCurrency();
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");

    const filtered = products.filter((product) => {
        const matchesCategory = activeCategory === "all" || product.category === activeCategory;
        const matchesSearch = !search || product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const isFiltering = search !== "" || activeCategory !== "all";

    const container: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 }
        }
    };

    const item: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 20 } }
    };

    const renderProductCard = (product: ProductWithPromo) => {
        const tierStyle = TIER_STYLES[product.tier];
        return (
            <motion.div key={product.id} variants={item}>
                <Link href={`/plugins/${product.id}`} className="block group h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a] rounded-2xl">
                    <div className="premium-card relative rounded-2xl overflow-hidden glass-panel p-[1px] h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-teal-500/30 group-hover:via-blue-500/20 group-hover:to-purple-500/30 transition-all duration-700 rounded-2xl" />

                        <div className="relative bg-[#0a1628] rounded-2xl p-8 h-full flex flex-col">
                            {/* Tier + Category badges */}
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                <span className={`text-[9px] font-mono uppercase tracking-widest ${tierStyle.text} ${tierStyle.badgeBg} px-2 py-1 rounded-full ${tierStyle.border} border`}>
                                    {product.tier}
                                </span>
                            </div>

                            {/* Icon */}
                            <div className="relative mb-6 w-fit">
                                <div className={`absolute inset-0 ${tierStyle.glow} blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
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

                            {/* Replaces badge */}
                            {product.replaces && (
                                <div className="mb-6 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                                    <p className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider">
                                        Replaces {product.replaces.device} <span className="text-slate-500">({product.replaces.estimatedCost})</span>
                                    </p>
                                </div>
                            )}

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
        );
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
                        className="text-center mb-6"
                    >
                        <div className="inline-flex items-center justify-center p-4 bg-teal-500/10 rounded-full border border-teal-500/30 text-teal-400 mb-6">
                            <Package className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold font-sans tracking-tight text-white uppercase">
                            Plugin Store
                        </h1>
                        <p className="text-teal-400 font-mono mt-4 text-sm tracking-widest uppercase opacity-80">
                            Bridge connects. Forge creates. Mind orchestrates.
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
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 flex-wrap">
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

                    {/* When filtering: flat grid */}
                    {isFiltering ? (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeCategory + search}
                                variants={container}
                                initial="hidden"
                                animate="show"
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                            >
                                {filtered.map((product) => renderProductCard(product))}
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        /* Default: organized by tiers */
                        <div className="space-y-16">
                            {PRODUCT_TIERS.map((tier, tierIndex) => {
                                const tierProducts = products.filter(p => p.tier === tier.id);
                                const TierIcon = TIER_ICONS[tier.id];
                                const tierStyle = TIER_STYLES[tier.id];
                                const activeIds = new Set(products.map(p => p.id));
                                const roadmapSource = roadmap.length > 0 ? roadmap : ROADMAP_PLUGINS;
                                const roadmapForTier = roadmapSource.filter(r => r.tier === tier.id && !activeIds.has(r.name.toLowerCase().replace(/\s+/g, "")));

                                if (tierProducts.length === 0 && roadmapForTier.length === 0) return null;

                                return (
                                    <motion.section
                                        key={tier.id}
                                        initial={{ opacity: 0, y: 30 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-50px" }}
                                        transition={{ delay: tierIndex * 0.1 }}
                                    >
                                        {/* Tier header */}
                                        <div className={`flex items-center gap-4 mb-8 pb-4 border-b ${tierStyle.border}`}>
                                            <div className={`inline-flex p-3 rounded-xl ${tierStyle.badgeBg} border ${tierStyle.border}`}>
                                                <TierIcon className={`w-6 h-6 ${tierStyle.text}`} />
                                            </div>
                                            <div>
                                                <h2 className={`text-2xl font-bold tracking-tight ${tierStyle.text} uppercase`}>
                                                    {tier.label}
                                                </h2>
                                                <p className="text-sm text-slate-400 mt-0.5">
                                                    {tier.tagline} — {tier.description}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Product cards grid */}
                                        <motion.div
                                            variants={container}
                                            initial="hidden"
                                            whileInView="show"
                                            viewport={{ once: true }}
                                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                        >
                                            {tierProducts.map((product) => renderProductCard(product))}

                                            {/* Roadmap coming soon cards for this tier */}
                                            {roadmapForTier.map((roadmap) => (
                                                <motion.div key={roadmap.name} variants={item}>
                                                    <div className="relative rounded-2xl overflow-hidden p-[1px] h-full">
                                                        <div className={`absolute inset-0 bg-gradient-to-br ${tierStyle.bg} rounded-2xl`} />
                                                        <div className="relative bg-[#0a1628]/90 rounded-2xl p-8 h-full flex flex-col min-h-[280px]">
                                                            <div className="absolute top-4 right-4">
                                                                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 bg-slate-500/10 px-2 py-1 rounded-full border border-slate-500/20">
                                                                    coming soon
                                                                </span>
                                                            </div>

                                                            <div className="relative mb-6 w-fit">
                                                                <div className="relative inline-flex p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5">
                                                                    <Rocket className="w-8 h-8 text-slate-500" />
                                                                </div>
                                                            </div>

                                                            <h3 className="text-xl font-bold text-slate-400 mb-2 tracking-tight uppercase">
                                                                {roadmap.name}
                                                            </h3>
                                                            <p className="text-sm text-slate-500 leading-relaxed flex-1">
                                                                {roadmap.description}
                                                            </p>

                                                            <div className="flex gap-1.5 mt-6">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500/40 animate-pulse" />
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500/40 animate-pulse [animation-delay:0.2s]" />
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500/40 animate-pulse [animation-delay:0.4s]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    </motion.section>
                                );
                            })}
                        </div>
                    )}

                    {/* Empty state */}
                    {isFiltering && filtered.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <Package className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">No modules match your filters</p>
                        </motion.div>
                    )}

                    {/* Bundle pricing callout */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-20 glass-panel rounded-2xl p-8 md:p-12 text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
                        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-teal-500 mb-3">Bundle Discount</p>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                            3+ plugins = <span className="text-teal-400">20% off</span>
                        </h3>
                        <p className="text-slate-400 leading-relaxed max-w-xl mx-auto">
                            Build your ecosystem incrementally. Purchase 3 or more plugins and get 20% off automatically at checkout. All licenses are perpetual — no subscription.
                        </p>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
