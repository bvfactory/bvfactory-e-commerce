import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get("id");

        if (!orderId) {
            return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
        }

        const supabase = await createClient();

        const { data, error } = await supabase
            .from("orders")
            .select("status, activation_code")
            .eq("id", orderId)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Order status API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
