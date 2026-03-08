import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const { code } = await req.json();

        if (!code || typeof code !== "string") {
            return NextResponse.json({ error: "Discount code is required" }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("discount_codes")
            .select("*")
            .eq("code", code.toUpperCase().trim())
            .eq("active", true)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: "Invalid discount code" }, { status: 404 });
        }

        // Check expiry
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            return NextResponse.json({ error: "This discount code has expired" }, { status: 410 });
        }

        // Check usage limit
        if (data.max_uses !== null && data.current_uses >= data.max_uses) {
            return NextResponse.json({ error: "This discount code has reached its usage limit" }, { status: 410 });
        }

        return NextResponse.json({
            valid: true,
            percent: data.percent_off,
            label: data.code,
        });
    } catch (error) {
        console.error("Discount validation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
