// src/app/api/analytics/track/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EVENTS = ["page_view", "plugin_download", "checkout_initiated", "license_activated"] as const;

export async function POST(req: Request) {
    try {
        const { event_type, product_id } = await req.json();

        if (!ALLOWED_EVENTS.includes(event_type)) {
            return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
        }

        const supabase = createAdminClient();
        await supabase.from("analytics_events").insert({
            event_type,
            product_id: product_id ?? null,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
