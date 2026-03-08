"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { ProductType } from "@/data/products";

export interface CartItem {
    id: string; // unique ID for the cart item instance (e.g. timestamp or uuid)
    product: ProductType;
    coreId: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (product: ProductType, coreId: string) => void;
    removeItem: (itemId: string) => void;
    clearCart: () => void;
    totalCents: number;
    isCartOpen: boolean;
    setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Persist to localStorage
    useEffect(() => {
        setIsMounted(true);
        const storedCart = localStorage.getItem("qsys_cart");
        if (storedCart) {
            try {
                const parsed = JSON.parse(storedCart);
                if (Array.isArray(parsed)) {
                    setItems(parsed);
                } else {
                    console.warn("Invalid cart data structure, resetting.");
                    localStorage.removeItem("qsys_cart");
                }
            } catch (e) {
                console.error("Failed to parse cart from local storage", e);
                localStorage.removeItem("qsys_cart");
            }
        }
    }, [setIsMounted]);

    useEffect(() => {
        if (isMounted) {
            localStorage.setItem("qsys_cart", JSON.stringify(items));
        }
    }, [items, isMounted]);

    const addItem = (product: ProductType, coreId: string) => {
        const newItem: CartItem = {
            id: `${product.id}-${Date.now()}`,
            product,
            coreId,
        };
        setItems((prev) => [...prev, newItem]);
        setIsCartOpen(true); // Auto-open cart on add
    };

    const removeItem = (itemId: string) => {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
    };

    const clearCart = () => {
        setItems([]);
    };

    const totalCents = items.reduce((total, item) => total + item.product.price_cents, 0);

    return (
        <CartContext.Provider value={{
            items,
            addItem,
            removeItem,
            clearCart,
            totalCents,
            isCartOpen,
            setIsCartOpen
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
