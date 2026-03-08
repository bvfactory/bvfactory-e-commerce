"use client";

import { useRef, useState } from "react";
import { MOCK_PRODUCTS, getProductIcon } from "@/data/products";
import { useCurrency } from "@/contexts/CurrencyContext";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Download, ChevronLeft, ShieldCheck, Box } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { AddToCartModal } from "@/components/CheckoutModal";
import Image from "next/image";

export default function ProductPage() {
    const { id } = useParams();
    const product = MOCK_PRODUCTS.find((p) => p.id === id);

    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const { formatPrice, isLoading } = useCurrency();

    // Smooth scroll configuration
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    // Parallax effects
    const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);

    if (!product) {
        notFound();
    }

    return (
        <div ref={containerRef} className="bg-[#050d1a] min-h-screen text-slate-200 selection:bg-teal-500/30 overflow-x-hidden relative">

            {/* Fixed Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full bg-blue-600/15 blur-[180px]"></div>
                <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full bg-teal-500/15 blur-[180px]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]"></div>
                <div className="noise-overlay absolute inset-0"></div>
            </div>

            <Navbar />

            {/* Floating Back Button */}
            <div className="fixed top-24 left-4 xl:left-12 z-50">
                <Link href="/">
                    <Button variant="ghost" className="text-white/50 hover:text-white group border border-white/0 hover:border-white/20 bg-black/20 backdrop-blur-md">
                        <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        BACK TO MODULES
                    </Button>
                </Link>
            </div>

            {/* Hero Section with Parallax */}
            <motion.section
                style={{ y: heroY, opacity: heroOpacity }}
                className="relative pt-32 pb-20 px-4 min-h-[60vh] flex flex-col items-center justify-center text-center z-10"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                    className="mb-8 p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-3xl shadow-[0_0_50px_rgba(20,184,166,0.15)] relative group"
                >
                    <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    {getProductIcon(product.iconName, "w-20 h-20 text-teal-400 relative z-10")}
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 mb-4"
                >
                    {product.name}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-xl md:text-2xl text-teal-400 font-mono tracking-widest uppercase mb-8"
                >
                    {product.tagline}
                </motion.p>
            </motion.section>

            {/* Main Content Area */}
            <motion.section
                style={{ y: contentY }}
                className="relative z-20 container mx-auto px-4 pb-32 max-w-5xl"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Details */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Description Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="glass-panel-light rounded-3xl p-8 md:p-10 shadow-2xl">
                            {/* Top accent */}
                            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent"></div>
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
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                                            <span className="text-slate-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Screenshots Gallery */}
                            {product.screenshots && product.screenshots.length > 0 && (
                                <div className="mt-8 pt-8 border-t border-slate-700/50">
                                    <h4 className="text-sm font-mono text-teal-400 uppercase tracking-widest mb-4">Interface Preview</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {product.screenshots.map((src, idx) => (
                                            <div
                                                key={idx}
                                                className="relative group aspect-video rounded-xl overflow-hidden border border-white/10 cursor-pointer"
                                                onClick={() => setSelectedImage(src)}
                                            >
                                                <div className="absolute inset-0 bg-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                                                    <span className="bg-black/80 text-white text-xs font-mono px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">Agrandir</span>
                                                </div>
                                                <Image
                                                    src={src}
                                                    alt={`${product.name} screenshot ${idx + 1}`}
                                                    fill
                                                    className="object-cover transition-transform duration-700 group-hover:scale-110 blur-[2px] group-hover:blur-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>

                        {/* Version History Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            className="glass-panel rounded-3xl p-8 shadow-xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wide">Version Payload History</h3>
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                                {product.versionHistory.map((vh, i) => (
                                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-slate-900 group-[.is-active]:bg-teal-900 text-slate-500 group-[.is-active]:text-teal-50 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow flex-col">
                                            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-slate-200">{vh.version}</div>
                                                <time className="font-mono text-xs font-medium text-teal-500">{vh.date}</time>
                                            </div>
                                            <ul className="text-sm text-slate-400 mt-2 space-y-1">
                                                {vh.changes.map((c, j) => <li key={j}>- {c}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: CTA & Specs */}
                    <div className="space-y-6">

                        {/* Sticky Action Card */}
                        <div className="sticky top-24">
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="bg-gradient-to-b from-[#0a1628] to-[#0f172a] backdrop-blur-xl border border-teal-500/20 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                            >
                                <div className="mb-6">
                                    <p className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-1">LIFETIME LICENSE</p>
                                    <div className="flex items-end gap-2 text-white">
                                        <span className="text-4xl font-bold font-mono">
                                            {isLoading ? "..." : formatPrice(product.price_cents)}
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => setIsCheckoutOpen(true)}
                                    className="w-full h-14 cta-gradient text-white font-bold tracking-widest uppercase text-sm mb-4 border-0 animate-glow-pulse"
                                >
                                    INITIATE PURCHASE
                                </Button>

                                <div className="flex flex-col gap-3">
                                    <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-mono text-xs uppercase tracking-widest">
                                        <Download className="w-4 h-4 mr-2" /> Download Manual
                                    </Button>
                                </div>

                                <div className="mt-6 flex items-center justify-center gap-2 text-xs font-mono text-slate-500 uppercase">
                                    <ShieldCheck className="w-4 h-4 text-green-500/70" /> Secured via Stripe
                                </div>
                            </motion.div>

                            {/* Specs Card */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="mt-6 glass-panel rounded-3xl p-6"
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

            {/* Checkout Modal Overlay */}
            <AnimatePresence>
                {isCheckoutOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-[#0f172a] border border-blue-500/30 rounded-2xl shadow-2xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
                            <div className="relative p-6 px-1">
                                <AddToCartModal
                                    product={product}
                                    isOpen={isCheckoutOpen}
                                    onClose={() => setIsCheckoutOpen(false)}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Image Viewer Overlay */}
            <AnimatePresence>
                {selectedImage && (
                    <div
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
                                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-md border border-white/20 transition-colors"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
