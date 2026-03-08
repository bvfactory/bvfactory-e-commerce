"use client";

import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, ShieldCheck, Search, Loader2, Cpu, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface LicenseItem {
    id: string;
    coreId: string;
    product: {
        id: string;
        name: string;
        price_cents: number;
        iconName: string;
        description: string;
    };
    licenseKey?: string;
}

function ActivationPortalInner() {
    const searchParams = useSearchParams();
    const initialCode = searchParams.get("code");

    const [codeInput, setCodeInput] = useState(initialCode || "");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [licenses, setLicenses] = useState<LicenseItem[] | null>(null);

    // If code is in URL, auto-fetch
    useEffect(() => {
        if (initialCode) {
            handleSearch(initialCode);
        }
    }, [initialCode]);

    const handleSearch = async (searchCode: string) => {
        if (!searchCode) return;
        setIsLoading(true);
        setError("");

        try {
            const supabase = createClient();

            // Only fetch if status is 'paid' to ensure security
            const { data, error: fetchError } = await supabase
                .from("orders")
                .select("items, status")
                .eq("activation_code", searchCode.toUpperCase().trim())
                .single();

            if (fetchError || !data) {
                setError("Activation Code not found. Please verify your input.");
                setLicenses(null);
                return;
            }

            if (data.status !== "paid") {
                setError("This order has not been fully processed or paid yet.");
                setLicenses(null);
                return;
            }

            setLicenses(data.items as LicenseItem[]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred retrieving your licenses.");
            setLicenses(null);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("License key copied to clipboard");
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Header sequence effect */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="inline-flex items-center justify-center p-4 bg-teal-500/10 rounded-full border border-teal-500/30 text-teal-400 mb-6 drop-shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                    <ShieldCheck className="w-8 h-8" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-sans tracking-tight text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                    Activation Portal
                </h1>
                <p className="text-teal-400 font-mono mt-4 text-sm tracking-widest uppercase opacity-80">
                    Secure License Distribution System
                </p>
            </motion.div>

            {/* Main Content Area */}
            <div className="grid md:grid-cols-12 gap-8">

                {/* Lateral Search Panel */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="md:col-span-4"
                >
                    <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden h-full">
                        {/* Decorative grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col h-full">
                            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                                <Search className="w-4 h-4 text-teal-500" />
                                Lookup
                            </h3>

                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="block text-xs font-mono text-slate-400 uppercase mb-2">Activation Code</label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. BVFA-7K3M-9P2X"
                                        value={codeInput}
                                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                                        className="font-mono text-xs bg-black/50 border-white/10 text-white focus-visible:ring-teal-500 pr-10 uppercase"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(codeInput)}
                                    />
                                </div>
                                <Button
                                    onClick={() => handleSearch(codeInput)}
                                    disabled={isLoading || !codeInput}
                                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-widest text-xs"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate Sequence"}
                                </Button>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="text-red-400 font-mono text-[10px] bg-red-500/10 p-3 rounded border border-red-500/20 mt-4 uppercase leading-relaxed"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </div>

                            <div className="pt-8 border-t border-white/10 mt-8">
                                <p className="text-[10px] font-mono text-slate-500 leading-relaxed uppercase">
                                    Your Activation Code was securely generated and emailed to you upon successful payment. Keep it safe to access your licenses at any time.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Results Panel */}
                <div className="md:col-span-8 flex flex-col gap-4">
                    <AnimatePresence mode="wait">
                        {!licenses && !isLoading && !error && (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-slate-900/40 border border-white/5 border-dashed rounded-2xl flex items-center justify-center p-12 h-full min-h-[400px]"
                            >
                                <div className="text-center opacity-50">
                                    <Cpu className="w-16 h-16 mx-auto mb-4 text-slate-500" />
                                    <p className="font-mono text-xs uppercase tracking-widest text-slate-400">Waiting for Uplink...</p>
                                </div>
                            </motion.div>
                        )}

                        {isLoading && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="bg-slate-900/60 backdrop-blur-md border border-teal-500/20 rounded-2xl flex flex-col items-center justify-center p-12 h-full min-h-[400px]"
                            >
                                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-6" />
                                <h3 className="text-xl font-bold tracking-widest text-white uppercase animate-pulse">Decrypting Payload</h3>
                                <p className="font-mono text-xs text-teal-400/60 mt-2 uppercase">Negotiating Handshake...</p>
                            </motion.div>
                        )}

                        {licenses && (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ staggerChildren: 0.1 }}
                                className="space-y-4"
                            >
                                {licenses.map((license, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        key={idx}
                                        className="bg-[#0b1322] border border-teal-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(20,184,166,0.05)] relative group hover:border-teal-400/60 transition-colors"
                                    >
                                        <div className="absolute top-0 right-0 p-4">
                                            <div className="text-[10px] font-mono bg-teal-500/20 text-teal-400 px-2 py-1 rounded-full uppercase border border-teal-500/30">
                                                Active
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            <h3 className="text-xl font-bold text-white mb-1">{license.product.name}</h3>
                                            <p className="text-sm text-slate-400 font-mono mb-6">{license.product.description}</p>

                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                                                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                        <Cpu className="w-3 h-3" /> Target Hardware
                                                    </p>
                                                    <p className="font-mono text-sm text-white">{license.coreId}</p>
                                                </div>

                                                <div className="bg-teal-950/30 rounded-lg p-4 border border-teal-500/20 relative cursor-pointer hover:bg-teal-900/40 transition-colors"
                                                    onClick={() => license.licenseKey && copyToClipboard(license.licenseKey)}
                                                >
                                                    <p className="text-[10px] font-mono text-teal-600 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                        <Key className="w-3 h-3" /> Cryptographic Key
                                                    </p>
                                                    <div className="flex justify-between items-center group/key">
                                                        <p className="font-mono text-base text-teal-400 font-bold overflow-hidden text-ellipsis mr-2 tracking-tight">
                                                            {license.licenseKey || "PENDING"}
                                                        </p>
                                                        <CheckCircle2 className="w-4 h-4 text-teal-500 opacity-0 group-hover/key:opacity-100 transition-opacity flex-shrink-0" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Deployment Instructions Strip */}
                                        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-t border-white/5">
                                            <p className="text-xs text-slate-400">
                                                Deploy this via <span className="text-white font-mono">Q-SYS Designer {'>'} Plugin Properties</span>
                                            </p>
                                            <Button variant="outline" size="sm" className="bg-transparent border-white/10 text-white font-mono text-[10px] uppercase tracking-wider hover:bg-white/5 hover:text-white" onClick={() => license.licenseKey && copyToClipboard(license.licenseKey)}>
                                                Copy Key
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

export default function ActivationPage() {
    return (
        <div className="flex min-h-screen flex-col font-sans selection:bg-teal-500/30 overflow-x-hidden bg-[#050d1a]">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-[120px]" />
                <div className="absolute bottom-[10%] left-[10%] w-[600px] h-[600px] rounded-full bg-blue-900/10 blur-[150px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="noise-overlay absolute inset-0" />
            </div>

            <Navbar />

            <main className="relative z-10 flex-1 pt-20 pb-12 px-4 md:px-8">
                <Suspense fallback={<div className="flex justify-center items-center py-32"><Loader2 className="w-12 h-12 text-teal-500 animate-spin" /></div>}>
                    <ActivationPortalInner />
                </Suspense>
            </main>

            <Footer />
        </div>
    );
}
