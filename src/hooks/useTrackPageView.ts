"use client";

import { useEffect } from "react";

export function useTrackPageView(productId: string) {
    useEffect(() => {
        fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_type: "page_view", product_id: productId }),
        }).catch(() => { /* fire-and-forget, silent on error */ });
    }, [productId]);
}
