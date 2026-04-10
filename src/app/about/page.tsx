"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Wrench, Target, Layers, Users, MapPin, Mail } from "lucide-react";

const principles = [
    {
        icon: <Wrench className="w-5 h-5" />,
        title: "Built from the field",
        text: "Every feature started on a job site. Real deadline, real problems, real client waiting.",
    },
    {
        icon: <Target className="w-5 h-5" />,
        title: "Problem-first design",
        text: "If it doesn't solve a real problem in the field, it doesn't belong in the product.",
    },
    {
        icon: <Layers className="w-5 h-5" />,
        title: "The connecting layer",
        text: "Our tools sit between your systems and handle the messy part: making them talk to each other.",
    },
    {
        icon: <Users className="w-5 h-5" />,
        title: "For integrators, by integrators",
        text: "We needed these tools. Nobody made them. So we did.",
    },
];

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col font-sans selection:bg-teal-500/30 overflow-x-hidden bg-[#050d1a]">

            {/* === BACKGROUND === */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full bg-blue-600/15 blur-[180px]" />
                <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full bg-teal-500/15 blur-[180px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="noise-overlay absolute inset-0" />
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-[0.07]" style={{ animation: 'scanline 6s linear infinite' }} />
                    <div className="absolute w-full h-[60px] bg-gradient-to-r from-transparent via-teal-500/[0.03] to-transparent blur-sm" style={{ animation: 'scanline 6s linear infinite' }} />
                </div>
                <div className="absolute top-6 left-6 w-16 h-16 border-l border-t border-teal-500/10" />
                <div className="absolute top-6 right-6 w-16 h-16 border-r border-t border-teal-500/10" />
                <div className="absolute bottom-6 left-6 w-16 h-16 border-l border-b border-teal-500/10" />
                <div className="absolute bottom-6 right-6 w-16 h-16 border-r border-b border-teal-500/10" />
            </div>

            <Navbar />

            <main className="relative z-10 flex-1">
                <div className="max-w-4xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-32">

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-16 md:mb-24"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-8">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-status-blink" />
                            <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400">About Us</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-[1.05] mb-6">
                            We build tools we{" "}
                            <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                                always wished existed.
                            </span>
                        </h1>
                    </motion.div>

                    {/* Body */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="space-y-8 mb-20 md:mb-28"
                    >
                        <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-light">
                            We make software for audiovisual systems. Live shows, permanent installations, the kind of setups where something going wrong on opening night isn't an option. We've spent years designing and deploying these systems, and the software comes directly from that work.
                        </p>

                        <p className="text-base md:text-lg text-slate-400 leading-relaxed">
                            Show control, media servers, lighting, networked AV: the individual pieces are good. But getting them to work together reliably? That usually means custom scripts, workarounds, and hoping nothing breaks when the client changes their mind at 4pm.
                        </p>

                        <p className="text-base md:text-lg text-slate-400 leading-relaxed">
                            So we built plugins and tools that handle the connections.
                        </p>

                        {/* Mission statement */}
                        <div className="relative my-12 md:my-16 py-8 px-6 md:px-10 rounded-lg border border-teal-500/20 bg-teal-500/[0.03]">
                            <div className="absolute top-0 left-6 md:left-10 -translate-y-1/2 px-3 py-0.5 bg-[#050d1a] text-[10px] font-mono uppercase tracking-[0.2em] text-teal-400">
                                Mission
                            </div>
                            <p className="text-xl md:text-2xl font-semibold text-white leading-snug tracking-tight">
                                Make show control and system integration{" "}
                                <span className="text-teal-400">easier</span>,{" "}
                                <span className="text-cyan-400">faster</span>, and{" "}
                                <span className="text-blue-400">more reliable</span>.
                            </p>
                        </div>

                        <p className="text-base md:text-lg text-slate-400 leading-relaxed">
                            They plug into the AV systems you already use and cut out the glue code that slows everyone down.
                        </p>

                        <p className="text-base md:text-lg text-slate-400 leading-relaxed">
                            Lighting playback, show sequencing, media server control, automation. Our tools sit in the middle and make everything talk to each other.
                        </p>
                    </motion.div>

                    {/* Quote */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="mb-20 md:mb-28 text-center py-12 md:py-16"
                    >
                        <div className="w-12 h-[2px] bg-gradient-to-r from-teal-500 to-blue-500 mx-auto mb-8" />
                        <blockquote className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug max-w-2xl mx-auto">
                            "If it doesn't solve a real problem in the field, it doesn't belong in the product."
                        </blockquote>
                        <div className="w-12 h-[2px] bg-gradient-to-r from-teal-500 to-blue-500 mx-auto mt-8" />
                    </motion.div>

                    {/* Principles grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                    >
                        <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-teal-400 mb-8">
                            Guiding Principles
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {principles.map((p, i) => (
                                <motion.div
                                    key={p.title}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + i * 0.08 }}
                                    className="group p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-teal-500/20 transition-all duration-300"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 group-hover:bg-teal-500/20 transition-colors">
                                            {p.icon}
                                        </div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">{p.title}</h3>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed">{p.text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Contact & location */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="mt-20 md:mt-28"
                    >
                        <h2 className="text-[11px] font-mono uppercase tracking-[0.2em] text-teal-400 mb-8">
                            Find us
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Address card */}
                            <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-center gap-5">
                                <div className="flex items-start gap-3">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white uppercase tracking-wide mb-2">Address</p>
                                        <p className="text-sm text-slate-400 leading-relaxed">
                                            BV Factory<br />
                                            16 rue des Caill&egrave;res<br />
                                            44330 Le Pallet<br />
                                            France
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white uppercase tracking-wide mb-2">Email</p>
                                        <a
                                            href="mailto:contact@bvfactory.dev"
                                            className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                                        >
                                            contact@bvfactory.dev
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Map */}
                            <div className="rounded-xl border border-white/5 overflow-hidden aspect-[4/3] md:aspect-auto md:min-h-[280px]">
                                <iframe
                                    title="BV Factory location"
                                    src="https://www.openstreetmap.org/export/embed.html?bbox=-1.3738%2C47.1460%2C-1.3538%2C47.1560&layer=mapnik&marker=47.1510%2C-1.3638"
                                    className="w-full h-full border-0 grayscale brightness-75 contrast-125 invert"
                                    loading="lazy"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    </motion.div>

                    {/* Closing line */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="mt-20 md:mt-28 pt-10 border-t border-white/5 text-center"
                    >
                        <p className="text-lg md:text-xl font-semibold text-white">
                            We build tools for integrators, by integrators.
                        </p>
                        <p className="mt-3 text-sm text-slate-500 font-mono uppercase tracking-widest">
                            BVFactory &mdash; Show Control Division
                        </p>
                    </motion.div>

                </div>
            </main>

            <Footer />
        </div>
    );
}
