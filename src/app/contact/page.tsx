"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, CheckCircle2, Mail, User, MessageSquare } from "lucide-react";
import { Footer } from "@/components/Footer";
import Link from "next/link";

const SUBJECTS = [
    { value: "general", label: "General Inquiry" },
    { value: "sales", label: "Sales & Pricing" },
    { value: "support", label: "Technical Support" },
    { value: "licensing", label: "Licensing & Activation" },
];

export default function ContactPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("general");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        setError("");

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, subject, message }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to send message");

            setIsSent(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col font-sans selection:bg-teal-500/30 overflow-x-hidden bg-[#050d1a]">

            {/* === BACKGROUND SYSTEM === */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-15%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/10 blur-[180px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-blue-600/10 blur-[150px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="noise-overlay absolute inset-0" />
            </div>

            <Navbar />

            <main className="relative z-10 flex-1 pt-20 pb-16 px-6">
                <div className="max-w-2xl mx-auto">

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center justify-center p-4 bg-teal-500/10 rounded-full border border-teal-500/30 text-teal-400 mb-6 drop-shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold font-sans tracking-tight text-white uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                            Contact Us
                        </h1>
                        <p className="text-teal-400 font-mono mt-4 text-sm tracking-widest uppercase opacity-80">
                            Direct Communication Channel
                        </p>
                    </motion.div>

                    {/* Form Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                            {/* Decorative grid */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                            {/* Top accent */}
                            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

                            {isSent ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative z-10 text-center py-12"
                                >
                                    <div className="inline-flex items-center justify-center p-5 bg-teal-500/10 rounded-full border border-teal-500/30 text-teal-400 mb-6">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
                                        Message Transmitted
                                    </h3>
                                    <p className="text-slate-400 font-mono text-sm mb-8">
                                        We&apos;ll get back to you as soon as possible.
                                    </p>
                                    <Button
                                        onClick={() => { setIsSent(false); setName(""); setEmail(""); setSubject("general"); setMessage(""); }}
                                        className="bg-teal-600 hover:bg-teal-500 text-white font-mono uppercase tracking-widest text-xs"
                                    >
                                        Send Another Message
                                    </Button>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="relative z-10 space-y-6">

                                    {/* Name */}
                                    <div>
                                        <label htmlFor="contact-name" className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">
                                            <User className="w-3 h-3 text-teal-500" /> Name
                                        </label>
                                        <Input
                                            id="contact-name"
                                            type="text"
                                            placeholder="John Doe"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="font-mono text-xs bg-black/50 border-white/10 text-white focus-visible:ring-teal-500 h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label htmlFor="contact-email" className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">
                                            <Mail className="w-3 h-3 text-teal-500" /> Email
                                        </label>
                                        <Input
                                            id="contact-email"
                                            type="email"
                                            placeholder="admin@system.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="font-mono text-xs bg-black/50 border-white/10 text-white focus-visible:ring-teal-500 h-12 rounded-xl"
                                        />
                                    </div>

                                    {/* Subject */}
                                    <div>
                                        <label htmlFor="contact-subject" className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">
                                            Subject
                                        </label>
                                        <select
                                            id="contact-subject"
                                            value={subject}
                                            onChange={(e) => setSubject(e.target.value)}
                                            className="w-full h-12 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs px-4 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
                                        >
                                            {SUBJECTS.map((s) => (
                                                <option key={s.value} value={s.value} className="bg-slate-900 text-white">
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label htmlFor="contact-message" className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-widest mb-2">
                                            <MessageSquare className="w-3 h-3 text-teal-500" /> Message
                                        </label>
                                        <textarea
                                            id="contact-message"
                                            placeholder="Describe your inquiry..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            required
                                            rows={5}
                                            className="w-full rounded-xl bg-black/50 border border-white/10 text-white font-mono text-xs p-4 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none placeholder:text-slate-600"
                                        />
                                    </div>

                                    {/* Error */}
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="text-red-400 font-mono text-[10px] bg-red-500/10 p-3 rounded border border-red-500/20 uppercase leading-relaxed"
                                        >
                                            {error}
                                        </motion.div>
                                    )}

                                    {/* Submit */}
                                    <Button
                                        type="submit"
                                        disabled={isSending}
                                        className="w-full h-14 cta-gradient text-white font-bold tracking-widest uppercase text-sm border-0 flex items-center justify-center gap-2 group animate-glow-pulse"
                                    >
                                        {isSending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Transmitting...
                                            </>
                                        ) : (
                                            <>
                                                Send Message
                                                <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
