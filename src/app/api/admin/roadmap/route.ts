import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — list all roadmap plugins (including inactive)
export async function GET(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("roadmap_plugins")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

// POST — create a new roadmap plugin
export async function POST(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { name, tier, description } = body;

  if (!name || !tier) {
    return NextResponse.json({ error: "name et tier requis" }, { status: 400 });
  }

  if (!["bridge", "forge", "mind"].includes(tier)) {
    return NextResponse.json({ error: "tier invalide" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get max display_order
  const { data: last } = await supabase
    .from("roadmap_plugins")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("roadmap_plugins")
    .insert({
      name,
      tier,
      description: description || "",
      display_order: (last?.display_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/plugins");
  return NextResponse.json({ item: data });
}

// PATCH — update a roadmap plugin
export async function PATCH(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  if (updates.tier && !["bridge", "forge", "mind"].includes(updates.tier)) {
    return NextResponse.json({ error: "tier invalide" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("roadmap_plugins")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/plugins");
  return NextResponse.json({ item: data });
}

// DELETE — remove a roadmap plugin
export async function DELETE(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("roadmap_plugins")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/plugins");
  return NextResponse.json({ success: true });
}
