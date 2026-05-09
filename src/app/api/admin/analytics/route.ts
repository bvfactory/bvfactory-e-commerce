// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type EventType = "page_view" | "plugin_download" | "checkout_initiated" | "license_activated";

interface DayTotals {
    date: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface ProductTotals {
    product_id: string;
    product_name: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

const EVENT_FIELD: Record<EventType, keyof Omit<DayTotals, "date">> = {
    page_view: "page_views",
    plugin_download: "plugin_downloads",
    checkout_initiated: "checkout_initiated",
    license_activated: "license_activated",
};

export async function GET(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const days = Math.min(
        parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10) || 30,
        90
    );
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const supabase = createAdminClient();

    // Fetch events for the period
    const { data: events, error } = await supabase
        .from("analytics_events")
        .select("event_type, product_id, created_at")
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }

    // Fetch product names
    const { data: products } = await supabase
        .from("product_settings")
        .select("product_id, name");

    const nameByProductId: Record<string, string> = {};
    for (const p of products ?? []) {
        nameByProductId[p.product_id] = p.name;
    }

    // Aggregate: series (by day, all products combined)
    const seriesMap: Record<string, DayTotals> = {};
    // Aggregate: totals by product
    const productMap: Record<string, ProductTotals> = {};

    for (const ev of events ?? []) {
        const date = ev.created_at.slice(0, 10); // YYYY-MM-DD
        const field = EVENT_FIELD[ev.event_type as EventType];
        if (!field) continue;

        // Series
        if (!seriesMap[date]) {
            seriesMap[date] = { date, page_views: 0, plugin_downloads: 0, checkout_initiated: 0, license_activated: 0 };
        }
        seriesMap[date][field]++;

        // Product totals
        const pid = ev.product_id ?? "__unknown__";
        if (!productMap[pid]) {
            productMap[pid] = {
                product_id: pid,
                product_name: nameByProductId[pid] ?? pid,
                page_views: 0,
                plugin_downloads: 0,
                checkout_initiated: 0,
                license_activated: 0,
            };
        }
        productMap[pid][field]++;
    }

    // Fill missing days in series (so the chart has a continuous x-axis)
    const series: DayTotals[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        series.push(seriesMap[key] ?? { date: key, page_views: 0, plugin_downloads: 0, checkout_initiated: 0, license_activated: 0 });
    }

    return NextResponse.json({
        period: { days, from: from.toISOString(), to: new Date().toISOString() },
        totals: Object.values(productMap).filter((p) => p.product_id !== "__unknown__"),
        series,
    });
}
