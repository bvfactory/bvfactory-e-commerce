"use client";

import { useRef, useState } from "react";
import { ProductType, getProductIcon } from "@/data/products";
import { ProductWithPromo } from "@/lib/product-settings";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Download, ChevronLeft, ShieldCheck, Box, Play, ChevronDown, HelpCircle, Cpu, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddToCartModal } from "@/components/CheckoutModal";
import Image from "next/image";

export default function ProductPageClient({ product, relatedProducts }: { product: ProductWithPromo; relatedProducts: ProductWithPromo[] }) {
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showVideo, setShowVideo] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const { formatPrice, isLoading } = useCurrency();

    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);

    return (
        <div ref={containerRef} className="bg-[#050d1a] min-h-screen text-slate-200 selection:bg-teal-500/30 overflow-x-hidden relative">
            {/* Fixed Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full bg-blue-600/15 blur-[180px]" />
                <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full bg-teal-500/15 blur-[180px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="noise-overlay absolute inset-0" />
            </div>

            <Navbar />

            {/* Floating Back Button */}
            <div className="fixed top-24 left-4 xl:left-12 z-50">
                <Link href="/plugins">
                    <Button variant="ghost" className="text-white/50 hover:text-white group border border-white/0 hover:border-white/20 bg-black/20 backdrop-blur-md">
                        <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden sm:inline">BACK TO STORE</span>
                        <span className="sm:hidden">BACK</span>
                    </Button>
                </Link>
            </div>

            {/* Hero Section with Parallax */}
            <motion.section
                style={{ y: heroY, opacity: heroOpacity }}
                className="relative pt-32 pb-20 px-4 min-h-[50vh] md:min-h-[60vh] flex flex-col items-center justify-center text-center z-10"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                    className="mb-8 p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl shadow-[0_0_50px_rgba(20,184,166,0.15)] relative group"
                >
                    <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {getProductIcon(product.iconName, "w-16 h-16 md:w-20 md:h-20 text-teal-400 relative z-10")}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2 mb-4"
                >
                    <span className="text-[10px] font-mono uppercase tracking-widest text-teal-500/60 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                        {product.category}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                        {product.versionHistory[0]?.version}
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-4xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-4"
                >
                    {product.name}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-lg md:text-2xl text-teal-400 font-mono tracking-widest uppercase mb-4"
                >
                    {product.tagline}
                </motion.p>

                {/* Compatibility badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-xs font-mono text-slate-400"
                >
                    <Cpu className="w-3.5 h-3.5 text-teal-500/60" />
                    Requires Q-SYS {product.compatibility.minQsysVersion}+ &middot; {product.compatibility.supportedCores.join(", ")}
                </motion.div>

                {/* Compatible Brands */}
                {product.compatibleBrands && product.compatibleBrands.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6 flex items-center gap-4"
                    >
                        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Works with</span>
                        <div className="flex items-center gap-3">
                            {product.compatibleBrands.map((brand) => (
                                <div
                                    key={brand.name}
                                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
                                >
                                    <Image
                                        src={brand.logo}
                                        alt={brand.name}
                                        width={20}
                                        height={20}
                                        className="h-4 w-4 opacity-80"
                                    />
                                    <span className="text-[11px] font-medium text-slate-300 tracking-wide">{brand.name}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </motion.section>

            {/* Main Content Area */}
            <motion.section
                style={{ y: contentY }}
                className="relative z-20 container mx-auto px-4 pb-16 max-w-5xl"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Details */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Video Demo Section */}
                        {product.videoUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                className="glass-panel rounded-3xl overflow-hidden shadow-2xl"
                            >
                                {showVideo ? (
                                    <div className="relative aspect-video">
                                        <iframe
                                            src={product.videoUrl + "?autoplay=1"}
                                            title={`${product.name} demo`}
                                            className="absolute inset-0 w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowVideo(true)}
                                        className="relative w-full aspect-video bg-gradient-to-br from-[#0a1628] to-[#0f172a] flex items-center justify-center group cursor-pointer"
                                    >
                                        {product.screenshots?.[0] && (
                                            <Image
                                                src={product.screenshots[0]}
                                                alt={`${product.name} preview`}
                                                fill
                                                className="object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500"
                                            />
                                        )}
                                        <div className="relative z-10 flex flex-col items-center gap-4">
                                            <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                className="w-20 h-20 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center backdrop-blur-sm group-hover:bg-teal-500/30 transition-colors"
                                            >
                                                <Play className="w-8 h-8 text-teal-400 ml-1" />
                                            </motion.div>
                                            <span className="text-xs font-mono text-teal-400 uppercase tracking-widest">Watch Demo</span>
                                        </div>
                                    </button>
                                )}
                            </motion.div>
                        )}

                        {/* Description Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="glass-panel-light rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
                            <h3 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide flex items-center gap-3">
                                <Box className="text-teal-500" /> Module Overview
                            </h3>
                            <p className="text-lg leading-relaxed text-slate-300 font-light">
                                {product.longDescription}
                            </p>

                            <div className="mt-8 pt-8 border-t border-slate-700/50">
                                <h4 className="text-sm font-mono text-teal-400 uppercase tracking-widest mb-4">Core Features</h4>
                                <ul className="space-y-3">
                                    {product.features.map((feature, i) => (
                                        <motion.li
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.05 }}
                                            className="flex items-start gap-3"
                                        >
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                                            <span className="text-slate-300">{feature}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>

                            {/* Screenshots Gallery */}
                            {product.screenshots && product.screenshots.length > 0 && (
                                <div className="mt-8 pt-8 border-t border-slate-700/50">
                                    <h4 className="text-sm font-mono text-teal-400 uppercase tracking-widest mb-4">Interface Preview</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {product.screenshots.map((src, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                aria-label={`Enlarge ${product.name} screenshot ${idx + 1}`}
                                                className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a]"
                                                onClick={() => setSelectedImage(src)}
                                            >
                                                <div className="absolute inset-0 bg-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                                                    <span className="bg-black/80 text-white text-xs font-mono px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">Enlarge</span>
                                                </div>
                                                <Image
                                                    src={src}
                                                    alt={`${product.name} screenshot ${idx + 1}`}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* FAQ Accordion */}
                        {product.faq.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                className="glass-panel rounded-3xl p-8 shadow-xl"
                            >
                                <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wide flex items-center gap-3">
                                    <HelpCircle className="w-5 h-5 text-teal-500" /> Frequently Asked Questions
                                </h3>
                                <div className="space-y-3">
                                    {product.faq.map((faqItem, i) => (
                                        <div key={i} className="border border-white/5 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                                aria-expanded={openFaqIndex === i}
                                                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a] rounded-xl"
                                            >
                                                <span className="text-sm font-medium text-slate-200 pr-4">{faqItem.question}</span>
                                                <motion.div
                                                    animate={{ rotate: openFaqIndex === i ? 180 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronDown className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                                </motion.div>
                                            </button>
                                            <AnimatePresence>
                                                {openFaqIndex === i && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <p className="px-4 pb-4 text-sm text-slate-400 leading-relaxed">
                                                            {faqItem.answer}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Version History Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="glass-panel rounded-3xl p-8 shadow-xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wide">Changelog</h3>
                            <div className="space-y-4">
                                {product.versionHistory.map((vh, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -10 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className="flex gap-4"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 rounded-full bg-teal-500 border-2 border-teal-400/50 flex-shrink-0" />
                                            {i < product.versionHistory.length - 1 && (
                                                <div className="w-px flex-1 bg-gradient-to-b from-teal-500/30 to-transparent mt-1" />
                                            )}
                                        </div>
                                        <div className="pb-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="font-bold text-white font-mono">{vh.version}</span>
                                                <span className="text-[10px] font-mono text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">{vh.date}</span>
                                                {i === 0 && <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Latest</span>}
                                            </div>
                                            <ul className="text-sm text-slate-400 space-y-1">
                                                {vh.changes.map((c, j) => <li key={j} className="flex items-start gap-2"><span className="text-slate-600 mt-0.5">-</span> {c}</li>)}
                                            </ul>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: CTA & Specs */}
                    <div className="space-y-6">
                        <div className="sticky top-24 space-y-6">
                            {/* Action Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] backdrop-blur-xl border border-teal-500/20 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                            >
                                <div className="mb-6">
                                    <p className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-1">{product.price_cents === 0 ? "Free License" : "Lifetime License"}</p>
                                    <div className="flex items-end gap-3">
                                        <span className={`text-4xl font-bold font-mono ${product.price_cents === 0 ? 'text-teal-400' : 'text-white'}`}>
                                            {isLoading ? "..." : formatPrice(product.price_cents)}
                                        </span>
                                        {product.promo_active && product.original_price_cents !== product.price_cents && (
                                            <span className="text-xl font-mono text-slate-500 line-through">
                                                {isLoading ? "" : formatPrice(product.original_price_cents)}
                                            </span>
                                        )}
                                    </div>
                                    {product.promo_active && product.promo_label && (
                                        <span className="inline-block mt-2 px-3 py-1 text-xs font-bold font-mono uppercase tracking-widest bg-teal-500/20 text-teal-400 rounded-full border border-teal-500/30">
                                            {product.promo_label}
                                        </span>
                                    )}
                                    {product.promo_active && !product.promo_label && product.promo_percent && (
                                        <span className="inline-block mt-2 px-3 py-1 text-xs font-bold font-mono uppercase tracking-widest bg-teal-500/20 text-teal-400 rounded-full border border-teal-500/30">
                                            -{product.promo_percent}%
                                        </span>
                                    )}
                                </div>

                                <Button
                                    onClick={() => setIsCheckoutOpen(true)}
                                    className="w-full h-14 cta-gradient text-white font-bold tracking-widest uppercase text-sm mb-4 border-0 animate-glow-pulse cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a]"
                                >
                                    {product.price_cents === 0 ? "Get Free License" : "Add to Cart"}
                                </Button>

                                {product.pluginFileName && (
                                    <a href={`/api/download-plugin?productId=${product.id}`} className="block">
                                        <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-mono text-xs uppercase tracking-widest cursor-pointer">
                                            <Download className="w-4 h-4 mr-2" /> Download Plugin
                                        </Button>
                                    </a>
                                )}

                                {product.manualUrl && (
                                    <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-mono text-xs uppercase tracking-widest">
                                        <Download className="w-4 h-4 mr-2" /> Download Manual
                                    </Button>
                                )}

                                {product.price_cents > 0 && (
                                    <div className="mt-6 flex items-center justify-center gap-2 text-xs font-mono text-slate-500 uppercase">
                                        <ShieldCheck className="w-4 h-4 text-green-500/70" /> Secured via Stripe
                                    </div>
                                )}
                            </motion.div>

                            {/* Compatibility Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="glass-panel rounded-3xl p-6"
                            >
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-4 flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-teal-500" /> Compatibility
                                </h4>
                                <dl className="space-y-3">
                                    <div className="flex flex-col gap-1 text-sm">
                                        <dt className="text-slate-500 font-mono uppercase text-[10px] tracking-widest">Min. Q-SYS Version</dt>
                                        <dd className="text-slate-200 font-mono">{product.compatibility.minQsysVersion}</dd>
                                    </div>
                                    <div className="flex flex-col gap-1 text-sm">
                                        <dt className="text-slate-500 font-mono uppercase text-[10px] tracking-widest">Supported Cores</dt>
                                        <dd className="flex flex-wrap gap-1.5">
                                            {product.compatibility.supportedCores.map((core) => (
                                                <span key={core} className="text-[10px] font-mono bg-white/5 text-slate-300 px-2 py-1 rounded-md border border-white/10">
                                                    {core}
                                                </span>
                                            ))}
                                        </dd>
                                    </div>
                                    {product.compatibility.os && (
                                        <div className="flex flex-col gap-1 text-sm">
                                            <dt className="text-slate-500 font-mono uppercase text-[10px] tracking-widest">Designer Version</dt>
                                            <dd className="text-slate-200 font-mono">{product.compatibility.os}</dd>
                                        </div>
                                    )}
                                </dl>
                            </motion.div>

                            {/* Specs Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="glass-panel rounded-3xl p-6"
                            >
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-4">Technical Specs</h4>
                                <dl className="space-y-4">
                                    {Object.entries(product.specs).map(([key, value]) => (
                                        <div key={key} className="flex flex-col gap-1 text-sm">
                                            <dt className="text-slate-500 font-mono uppercase text-[10px] tracking-widest">{key}</dt>
                                            <dd className="text-slate-200">{value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <section className="relative z-20 container mx-auto px-4 pb-20 max-w-5xl">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                    >
                        <h3 className="text-xl font-bold text-white mb-8 uppercase tracking-wide text-center">Other Modules</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {relatedProducts.map((rp) => (
                                <Link key={rp.id} href={`/plugins/${rp.id}`} className="block group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 rounded-2xl">
                                    <motion.div
                                        whileHover={{ y: -4 }}
                                        className="glass-panel rounded-2xl p-6 flex items-center gap-5 group-hover:border-teal-500/20 transition-colors"
                                    >
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 group-hover:border-teal-500/30 transition-colors flex-shrink-0">
                                            {getProductIcon(rp.iconName, "w-6 h-6 text-teal-400")}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-white group-hover:text-teal-50 transition-colors">{rp.name}</h4>
                                            <p className="text-xs text-slate-400 truncate">{rp.tagline}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`font-mono font-bold ${rp.price_cents === 0 ? 'text-teal-400' : 'text-white'}`}>{isLoading ? "..." : formatPrice(rp.price_cents)}</p>
                                            <ArrowRight className="w-4 h-4 text-teal-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ml-auto" />
                                        </div>
                                    </motion.div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                </section>
            )}

            <Footer />

            {/* Checkout Modal Overlay */}
            <AnimatePresence>
                {isCheckoutOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsCheckoutOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-[#0f172a] border border-blue-500/30 rounded-2xl shadow-2xl relative overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
                            <div className="relative p-6">
                                <AddToCartModal
                                    product={product}
                                    isOpen={isCheckoutOpen}
                                    onClose={() => setIsCheckoutOpen(false)}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Image Viewer Overlay */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-6xl aspect-video rounded-xl overflow-hidden border border-white/20 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Image src={selectedImage} alt="Enlarged screenshot" fill className="object-contain" />
                            <button
                                onClick={() => setSelectedImage(null)}
                                aria-label="Close image viewer"
                                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-md border border-white/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
