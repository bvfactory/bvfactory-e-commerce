"use client";

import { useCart } from "@/contexts/CartContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ShoppingCart, X, Trash2, ShieldCheck, Mail, Loader2, ArrowRight, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { getProductIcon } from "@/data/products";

export function CartDrawer() {
    const { items, isCartOpen, setIsCartOpen, removeItem, totalCents } = useCart();
    const { formatPrice, currency, rate } = useCurrency();
    const [email, setEmail] = useState("");
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Discount code state
    const [discountCode, setDiscountCode] = useState("");
    const [isValidatingCode, setIsValidatingCode] = useState(false);
    const [appliedDiscount, setAppliedDiscount] = useState<{ percent: number; label: string } | null>(null);
    const [showDiscountInput, setShowDiscountInput] = useState(false);

    const discountedTotalCents = appliedDiscount
        ? Math.round(totalCents * (1 - appliedDiscount.percent / 100))
        : totalCents;

    const handleApplyDiscount = async () => {
        if (!discountCode.trim()) return;
        setIsValidatingCode(true);

        try {
            const res = await fetch("/api/discount", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: discountCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Invalid discount code");
                setAppliedDiscount(null);
                return;
            }

            setAppliedDiscount({ percent: data.percent, label: data.label });
            toast.success(`Discount applied: -${data.percent}%`);
        } catch {
            toast.error("Failed to validate discount code");
        } finally {
            setIsValidatingCode(false);
        }
    };

    const handleRemoveDiscount = () => {
        setAppliedDiscount(null);
        setDiscountCode("");
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();

        if (items.length === 0) return toast.error("Cart is empty");
        if (!email) return toast.error("Please enter a delivery email");

        setIsCheckingOut(true);

        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    items: items.map(i => ({ productId: i.product.id, coreId: i.coreId, name: i.product.name })),
                    currency,
                    rate,
                    discountCode: appliedDiscount ? appliedDiscount.label : undefined,
                })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to initialize payment");

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error: Error | unknown) {
            const errorMessage = error instanceof Error ? error.message : "An error occurred";
            toast.error(errorMessage);
            setIsCheckingOut(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isCartOpen && (
                    <motion.div
                        key="cart-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCartOpen && (
                    <motion.div
                        key="cart-drawer"
                        initial={{ x: 500 }}
                        animate={{ x: 0 }}
                        exit={{ x: 500 }}
                        transition={{ type: "spring", damping: 28, stiffness: 250 }}
                        className="fixed inset-y-0 right-0 z-[110] w-full max-w-md flex flex-col"
                    >
                        {/* Top accent */}
                        <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-teal-500/50 via-blue-500/30 to-transparent" />

                        <div className="h-full glass-panel-light rounded-l-2xl flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5">
                                <h2 className="text-lg font-bold font-sans tracking-tight text-white uppercase flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                                        <ShoppingCart className="text-teal-400 w-4 h-4" />
                                    </div>
                                    Active Payload
                                    <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full font-mono">
                                        {items.length}
                                    </span>
                                </h2>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {items.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <ShoppingCart className="w-10 h-10 opacity-20" />
                                        </div>
                                        <p className="font-mono text-xs uppercase tracking-widest">No modules queued</p>
                                    </div>
                                ) : (
                                    <AnimatePresence>
                                        {items.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95, x: 20 }}
                                                className="bg-[#0a1628] border border-white/5 p-4 rounded-xl flex items-start gap-3 group hover:border-white/10 transition-colors"
                                            >
                                                <div className="p-2.5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/5">
                                                    {getProductIcon(item.product.iconName, "w-5 h-5 text-teal-500")}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-white text-sm truncate">{item.product.name}</h4>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] font-mono text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20 truncate">
                                                            {item.coreId}
                                                        </span>
                                                    </div>
                                                    <p className="font-mono text-sm text-slate-300 mt-2">{formatPrice(item.product.price_cents)}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>

                            {/* Footer / Checkout */}
                            {items.length > 0 && (
                                <div className="p-6 bg-[#06101f] border-t border-white/5">

                                    {/* Discount Code Section */}
                                    <div className="mb-4">
                                        {appliedDiscount ? (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                className="flex items-center justify-between bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-3"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Check className="w-4 h-4 text-teal-400" />
                                                    <span className="text-teal-400 font-mono text-xs uppercase tracking-wider">
                                                        {appliedDiscount.label} (−{appliedDiscount.percent}%)
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={handleRemoveDiscount}
                                                    className="text-slate-400 hover:text-red-400 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setShowDiscountInput(!showDiscountInput)}
                                                    className="flex items-center gap-2 text-[11px] font-mono text-slate-400 hover:text-teal-400 uppercase tracking-widest transition-colors w-full"
                                                >
                                                    <Tag className="w-3.5 h-3.5" />
                                                    Add a discount code
                                                </button>

                                                <AnimatePresence>
                                                    {showDiscountInput && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="mt-3 flex gap-2 overflow-hidden"
                                                        >
                                                            <Input
                                                                type="text"
                                                                placeholder="DISCOUNT CODE"
                                                                value={discountCode}
                                                                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyDiscount())}
                                                                className="flex-1 font-mono text-xs bg-black/50 border-white/10 text-white focus-visible:ring-teal-500 uppercase h-10 rounded-lg"
                                                            />
                                                            <Button
                                                                type="button"
                                                                onClick={handleApplyDiscount}
                                                                disabled={isValidatingCode || !discountCode.trim()}
                                                                className="bg-teal-600 hover:bg-teal-500 text-white font-mono text-xs uppercase h-10 px-4 rounded-lg"
                                                            >
                                                                {isValidatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                                                            </Button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        )}
                                    </div>

                                    {/* Total */}
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-slate-400 font-mono text-[11px] tracking-widest uppercase">Total</span>
                                        <div className="text-right">
                                            {appliedDiscount ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-mono text-slate-500 line-through">{formatPrice(totalCents)}</span>
                                                    <span className="text-2xl font-bold font-mono text-teal-400">{formatPrice(discountedTotalCents)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-2xl font-bold font-mono text-white">{formatPrice(totalCents)}</span>
                                            )}
                                        </div>
                                    </div>

                                    <form onSubmit={handleCheckout} className="space-y-4">
                                        <div className="space-y-2">
                                            <label htmlFor="cart-email" className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest">Delivery Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    id="cart-email"
                                                    type="email"
                                                    placeholder="admin@system.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                    className="pl-10 font-mono text-xs bg-black/50 border-white/10 text-white focus-visible:ring-teal-500 h-12 rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-slate-600 uppercase py-1">
                                            <ShieldCheck className="w-3 h-3 text-teal-600" /> Secured via Stripe
                                        </div>

                                        <Button
                                            type="submit"
                                            disabled={isCheckingOut}
                                            className="w-full h-14 cta-gradient text-white font-bold tracking-widest uppercase text-sm border-0 flex items-center justify-center gap-2 group"
                                        >
                                            {isCheckingOut ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    Finalize Transaction
                                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
