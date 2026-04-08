import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get("id");

        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        const supabase = createAdminClient();

        const { data, error } = await supabase
            .from("orders")
            .select("status, activation_code")
            .eq("id", orderId)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Only return status and whether activation is ready — never leak the full code
        // The activation code is delivered via email only
        return NextResponse.json({
            status: data.status,
            ready: data.status === "paid" && !!data.activation_code,
        });
    } catch (error) {
        console.error("Order status API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
