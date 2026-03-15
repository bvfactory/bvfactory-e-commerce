"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Key, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";

function SuccessSequence() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("order_id");
    const { clearCart } = useCart();

    const [step, setStep] = useState<"generating" | "delivered">("generating");
    const [activationCode, setActivationCode] = useState<string | null>(null);

    const [hashMask] = useState<string>(() =>
        Array.from({ length: 400 }).map(() => Math.random().toString(36).substring(2, 3)).join('')
    );

    // Clear cart on successful checkout
    useEffect(() => {
        clearCart();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!orderId) return;

        const checkOrderStatus = async () => {
            try {
                const res = await fetch(`/api/order-status?id=${orderId}`);
                const data = await res.json();

                if (data.status === "paid" && data.activation_code) {
                    setActivationCode(data.activation_code);
                    setStep("delivered");
                    clearInterval(pollInterval);
                }
            } catch (err) {
                console.error("Failed to check order status:", err);
            }
        };

        const pollInterval = setInterval(checkOrderStatus, 2000);

        // Timeout after 30 seconds
        const timeout = setTimeout(() => {
            clearInterval(pollInterval);
            if (step === "generating") {
                // Keep showing generating, but the user should check email
                setStep("delivered"); // Force delivery state with email instructions
            }
        }, 30000);

        return () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
        };
    }, [orderId, step]);

    return (
        <main className="relative z-10 w-full max-w-5xl flex items-center justify-center perspective-[1000px] p-4">
            <AnimatePresence mode="wait">
                {step === "generating" && (
                    <motion.div
                        key="generating"
                        initial={{ opacity: 0, scale: 0.8, rotateY: -15, filter: "blur(10px)" }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)", transition: { duration: 0.5 } }}
                        transition={{ duration: 0.8, type: "spring" }}
                        className="w-full max-w-md xl:max-w-[450px]"
                    >
                        <div className="bg-white/5 dark:bg-[#0f172a]/80 backdrop-blur-2xl rounded-2xl border-2 border-teal-500/50 p-8 shadow-[0_0_100px_rgba(20,184,166,0.3)] relative overflow-hidden group">

                            {/* Glowing border effect inside */}
                            <div className="absolute inset-0 bg-gradient-to-b from-teal-400/10 to-transparent pointer-events-none"></div>

                            {/* Simulated "Lightning" effect using animated borders and glows */}
                            <motion.div
                                animate={{ opacity: [0, 0.5, 0, 1, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
                                className="absolute inset-0 bg-teal-400/5 pointer-events-none mix-blend-screen"
                            ></motion.div>

                            <div className="flex flex-col items-center text-center relative z-10">
                                <h2 className="text-2xl font-bold tracking-tight text-white mb-2 uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                    Generating License
                                </h2>
                                <p className="text-teal-400 font-mono text-xs opacity-70 mb-8 flex items-center gap-2">
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Binding to Q-SYS Hardware
                                </p>

                                {/* Certificate visual */}
                                <div className="relative w-48 h-64 border border-teal-500/50 bg-black/40 rounded-lg flex flex-col items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(20,184,166,0.2)] mb-8">
                                    <div className="absolute inset-0 opacity-20 font-mono text-[8px] text-teal-500 leading-tight overflow-hidden break-words pointer-events-none select-none p-2">
                                        {hashMask}
                                    </div>

                                    <motion.div
                                        animate={{ scale: [1, 1.05, 1], filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                        className="text-white text-3xl font-bold font-sans tracking-widest relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                                    >
                                        Q-SYS
                                    </motion.div>

                                    <div className="absolute bottom-4 right-4 text-teal-400 bg-teal-900/50 p-2 rounded-full border border-teal-500/50 drop-shadow-[0_0_10px_rgba(20,184,166,1)]">
                                        <Shield className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="w-full bg-slate-900 rounded-full h-1 mt-4 overflow-hidden border border-white/10">
                                    <motion.div
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 4.2, ease: "easeInOut" }}
                                        className="h-full bg-gradient-to-r from-teal-600 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                                    />
                                </div>
                                <p className="text-white/40 font-mono text-[10px] uppercase mt-4">Compiling Cryptographic Hash...</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "delivered" && (
                    <motion.div
                        key="delivered"
                        initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                        className="w-full max-w-md xl:max-w-[400px]"
                    >
                        <div className="bg-white/95 dark:bg-amber-500/10 backdrop-blur-2xl rounded-2xl border-2 border-amber-500/50 p-8 shadow-[0_0_100px_rgba(245,158,11,0.2)] relative overflow-hidden">

                            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/5 to-transparent pointer-events-none"></div>

                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                                        className="bg-amber-500/20 p-5 rounded-full border border-amber-500/50 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                                    >
                                        <Mail className="w-12 h-12 text-amber-500" />
                                    </motion.div>
                                    <motion.div
                                        initial={{ scale: 0, x: -20 }}
                                        animate={{ scale: 1, x: 0 }}
                                        transition={{ type: "spring", stiffness: 300, delay: 0.5 }}
                                        className="absolute -bottom-2 -right-2 bg-slate-900 border border-amber-500 p-2 rounded-full"
                                    >
                                        <Key className="w-5 h-5 text-amber-400" />
                                    </motion.div>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold tracking-tight text-white mb-2 text-center uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                                Delivered
                            </h2>

                            <div className="bg-slate-900/80 rounded-lg p-5 mb-8 border border-amber-500/20 shadow-inner text-center mt-6">
                                <p className="text-xs font-mono text-white/50 mb-2 uppercase tracking-wide">Status:</p>
                                <p className="font-bold text-base text-white">Your Plugin Licenses are Ready!</p>
                                <p className="text-sm text-amber-200 mt-3 font-mono">
                                    Your secure keys have been compiled and are waiting in the Activation Portal.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4">
                                {activationCode ? (
                                    <Link href={`/activation?code=${activationCode}`} className="w-full">
                                        <Button className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold uppercase tracking-widest text-sm transition-colors shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer">
                                            Access Activation Portal
                                        </Button>
                                    </Link>
                                ) : orderId ? (
                                    <Link href={`/activation`} className="w-full">
                                        <Button className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold uppercase tracking-widest text-sm transition-colors shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer">
                                            Activation Portal (Check Email)
                                        </Button>
                                    </Link>
                                ) : null}
                                <Link href="/" className="w-full">
                                    <Button className="w-full h-12 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-50 font-mono uppercase tracking-widest text-xs transition-colors cursor-pointer">
                                        Return to Store
                                    </Button>
                                </Link>
                            </div>

                            {activationCode ? (
                                <p className="text-center font-mono text-[14px] text-teal-400 font-bold uppercase tracking-widest mt-6">
                                    CODE: {activationCode}
                                </p>
                            ) : orderId ? (
                                <p className="text-center font-mono text-[10px] text-white/30 uppercase tracking-widest mt-6">
                                    Trace_ID: {orderId}
                                </p>
                            ) : null}

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

export default function SuccessPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center font-sans selection:bg-teal-500/30 overflow-hidden bg-[#050d1a]">
            {/* Background gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[10%] xl:top-[20%] left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-teal-500/10 blur-[150px]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]"></div>
                <div className="noise-overlay absolute inset-0"></div>
            </div>
            <Suspense fallback={<div className="text-teal-500 font-mono uppercase tracking-widest relative z-10">Initializing Sequencer...</div>}>
                <SuccessSequence />
            </Suspense>
        </div>
    );
}
