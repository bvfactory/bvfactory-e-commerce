import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const isAdmin = await validateAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch all orders
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, customer_email, status, items, created_at, discount_code, discount_percent")
    .order("created_at", { ascending: false });

  if (ordersError) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  // Fetch active licenses count
  const { count: activeLicenses, error: licensesError } = await supabase
    .from("licenses")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  if (licensesError) {
    return NextResponse.json({ error: "Failed to fetch licenses" }, { status: 500 });
  }

  // Compute order counts by status
  const ordersByStatus = { paid: 0, pending: 0, failed: 0, refunded: 0 };
  let revenue = 0;

  for (const order of orders ?? []) {
    const status = order.status as keyof typeof ordersByStatus;
    if (status in ordersByStatus) {
      ordersByStatus[status]++;
    }

    if (order.status === "paid") {
      const items = (order.items ?? []) as Array<{ price_cents: number }>;
      const orderTotal = items.reduce((sum, item) => sum + (item.price_cents ?? 0), 0);
      const discounted = order.discount_percent
        ? Math.round(orderTotal * (1 - order.discount_percent / 100))
        : orderTotal;
      revenue += discounted;
    }
  }

  // Recent 10 orders
  const recentOrders = (orders ?? []).slice(0, 10);

  return NextResponse.json({
    revenue,
    ordersByStatus,
    activeLicenses: activeLicenses ?? 0,
    recentOrders,
  });
}
