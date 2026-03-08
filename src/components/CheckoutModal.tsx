"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";

import { useCart } from "@/contexts/CartContext";

import type { ProductType } from "@/data/products";

interface AddToCartModalProps {
    product: ProductType | null;
    isOpen: boolean;
    onClose: () => void;
}

export function AddToCartModal({ product, isOpen, onClose }: AddToCartModalProps) {
    const [coreId, setCoreId] = useState("");
    const { formatPrice, isLoading: isCurrencyLoading } = useCurrency();
    const { addItem } = useCart();

    if (!isOpen || !product) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!coreId) {
            toast.error("Please fill in all required fields.");
            return;
        }

        if (!coreId.match(/^[A-Z0-9-]{8,}$/i)) {
            toast.error("Invalid Q-SYS Core ID format.");
            return;
        }

        addItem(product, coreId);
        toast.success(`${product.name} added to cart!`);
        setCoreId(""); // reset
        onClose();
    };

    return (
        <div className="flex flex-col h-full bg-transparent w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight uppercase text-white drop-shadow-md">
                    Target Configuration
                </h2>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors text-sm font-mono uppercase tracking-widest">
                    [ Close ]
                </button>
            </div>

            <div className="mb-8 border-b border-blue-500/20 pb-4">
                <p className="text-sm font-mono text-blue-200/80 uppercase tracking-widest">Module Selection</p>
                <p className="text-lg font-bold font-sans text-white mt-1">{product.name}</p>
                <p className="text-xl font-mono mt-1 text-teal-400">
                    {isCurrencyLoading ? "..." : formatPrice(product.price_cents)}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col justify-between">

                <div className="space-y-4">
                    {/* Target Core ID Field - Emphasized like in the concept */}
                    <div className="relative isolate">
                        {/* Glow effect matching the concept "Q-SYS Core ID" blue box */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur opacity-50"></div>
                        <div className="relative bg-[#0d1b2a] border-2 border-blue-500 p-4 rounded-lg shadow-[inset_0_0_20px_rgba(59,130,246,0.3)]">
                            <label htmlFor="coreId" className="block text-blue-300 font-bold mb-2 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Q-SYS Core ID
                            </label>
                            <Input
                                id="coreId"
                                type="text"
                                placeholder="Q-CORE-123456-78901"
                                value={coreId}
                                onChange={(e) => setCoreId(e.target.value)}
                                required
                                className="font-mono text-base uppercase bg-black/50 border-blue-500/50 focus-visible:ring-blue-400 text-white placeholder:text-blue-200/30"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-6 relative">
                    <Button type="submit" className="w-full h-14 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white font-bold tracking-widest uppercase text-sm shadow-[0_10px_30px_rgba(20,184,166,0.5)] transition-all hover:shadow-[0_10px_40px_rgba(20,184,166,0.7)] border border-white/20">
                        Queue License Generation
                    </Button>
                </div>
            </form>
        </div>
    );
}
