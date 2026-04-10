import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "logos";
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

// GET — list all trusted clients (including inactive)
export async function GET(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("trusted_clients")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients: data });
}

// POST — create a new trusted client (with logo upload)
export async function POST(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const websiteUrl = formData.get("website_url") as string | null;
  const displayOrder = parseInt(formData.get("display_order") as string || "0", 10);
  const file = formData.get("logo") as File;

  if (!name || !file) {
    return NextResponse.json({ error: "name et logo requis" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Logo trop volumineux (max 2 Mo)" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Format non supporté (PNG, JPEG, WebP, SVG)" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "png";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const storagePath = `${slug}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error: dbError } = await supabase
    .from("trusted_clients")
    .insert({
      name,
      logo_url: publicUrl,
      website_url: websiteUrl || null,
      display_order: displayOrder,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    console.error("DB error:", dbError);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }

  return NextResponse.json({ client: data });
}

// PATCH — update a trusted client (name, website, order, active, or replace logo)
export async function PATCH(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const formData = await request.formData();
  const id = formData.get("id") as string;

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {};

  const name = formData.get("name");
  if (name) updates.name = name;

  const websiteUrl = formData.get("website_url");
  if (websiteUrl !== null && websiteUrl !== undefined) updates.website_url = websiteUrl || null;

  const displayOrder = formData.get("display_order");
  if (displayOrder !== null && displayOrder !== undefined) updates.display_order = parseInt(displayOrder as string, 10);

  const active = formData.get("active");
  if (active !== null && active !== undefined) updates.active = active === "true";

  // Handle optional logo replacement
  const file = formData.get("logo") as File | null;
  if (file && file.size > 0) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Logo trop volumineux (max 2 Mo)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format non supporté" }, { status: 400 });
    }

    // Remove old logo
    const { data: existing } = await supabase
      .from("trusted_clients")
      .select("logo_url")
      .eq("id", id)
      .single();

    if (existing?.logo_url) {
      const pathMatch = existing.logo_url.match(/\/object\/public\/logos\/(.+)/);
      if (pathMatch) await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "png";
    const slug = ((name as string) || "logo").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const storagePath = `${slug}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { upsert: true, contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    updates.logo_url = publicUrl;
  }

  const { data, error } = await supabase
    .from("trusted_clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ client: data });
}

// DELETE — remove a trusted client and its logo
export async function DELETE(request: NextRequest) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get logo URL to clean up storage
  const { data: existing } = await supabase
    .from("trusted_clients")
    .select("logo_url")
    .eq("id", id)
    .single();

  if (existing?.logo_url) {
    const pathMatch = existing.logo_url.match(/\/object\/public\/logos\/(.+)/);
    if (pathMatch) await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
  }

  const { error } = await supabase
    .from("trusted_clients")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
