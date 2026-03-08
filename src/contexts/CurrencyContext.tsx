"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface CurrencyContextType {
    currency: string;
    rate: number;
    symbol: string;
    formatPrice: (cents: number) => string;
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CAD: "CA$",
    AUD: "A$",
    JPY: "¥",
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const [currency, setCurrency] = useState("EUR");
    const [rate, setRate] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCurrency() {
            try {
                const res = await fetch("/api/currency");
                if (res.ok) {
                    const data = await res.json();
                    setCurrency(data.currency || "EUR");
                    setRate(data.rate || 1);
                }
            } catch (error) {
                console.error("Failed to load currency preferences", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchCurrency();
    }, []);

    const symbol = CURRENCY_SYMBOLS[currency] || "€";

    const formatPrice = (cents: number) => {
        if (cents === 0) return "Free";

        const converted = (cents / 100) * rate;

        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currency,
            minimumFractionDigits: currency === 'JPY' ? 0 : 2,
            maximumFractionDigits: currency === 'JPY' ? 0 : 2,
        }).format(converted);
    };

    return (
        <CurrencyContext.Provider value={{ currency, rate, symbol, formatPrice, isLoading }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error("useCurrency must be used within a CurrencyProvider");
    }
    return context;
}
