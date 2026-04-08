import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const isAdmin = await validateAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: discounts, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ discounts });
}

export async function POST(request: NextRequest) {
  const isAdmin = await validateAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { code, percent_off, active, expires_at, max_uses } = body;

  if (!code || !percent_off) {
    return NextResponse.json(
      { error: "code and percent_off are required." },
      { status: 400 }
    );
  }

  if (percent_off < 1 || percent_off > 100) {
    return NextResponse.json(
      { error: "percent_off must be between 1 and 100." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("discount_codes")
    .insert({
      code: code.toUpperCase(),
      percent_off,
      active: active ?? true,
      expires_at: expires_at || null,
      max_uses: max_uses || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ discount: data });
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await validateAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json(
      { error: "id is required." },
      { status: 400 }
    );
  }

  // Allowlist: only permit safe fields to be updated
  const allowed: Record<string, unknown> = {};
  if (body.code !== undefined) allowed.code = typeof body.code === "string" ? body.code.toUpperCase() : body.code;
  if (body.percent_off !== undefined) allowed.percent_off = body.percent_off;
  if (body.active !== undefined) allowed.active = body.active;
  if (body.expires_at !== undefined) allowed.expires_at = body.expires_at;
  if (body.max_uses !== undefined) allowed.max_uses = body.max_uses;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("discount_codes")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ discount: data });
}

export async function DELETE(request: NextRequest) {
  const isAdmin = await validateAdminRequest(request);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json(
      { error: "id is required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("discount_codes")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
