"use client";

import { motion } from "framer-motion";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function CancelPage() {
    return (
        <div className="flex min-h-screen flex-col font-sans selection:bg-teal-500/30 overflow-x-hidden bg-[#050d1a]">
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-red-500/5 blur-[150px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="noise-overlay absolute inset-0" />
            </div>

            <Navbar />

            <main className="relative z-10 flex-1 flex items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden">
                        <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="inline-flex items-center justify-center p-5 bg-red-500/10 rounded-full border border-red-500/30 text-red-400 mb-6"
                        >
                            <XCircle className="w-10 h-10" />
                        </motion.div>

                        <h1 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
                            Transaction Cancelled
                        </h1>
                        <p className="text-slate-400 font-mono text-sm mb-8 leading-relaxed">
                            Your payment was not processed. No charges have been made.
                            Your cart items are still saved.
                        </p>

                        <div className="flex flex-col gap-3">
                            <Link href="/#plugins" className="w-full">
                                <Button className="w-full h-12 cta-gradient text-white font-bold tracking-widest uppercase text-sm border-0 flex items-center justify-center gap-2 group">
                                    <RotateCcw className="w-4 h-4" />
                                    Try Again
                                </Button>
                            </Link>
                            <Link href="/" className="w-full">
                                <Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Return to Store
                                </Button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </main>

            <Footer />
        </div>
    );
}
