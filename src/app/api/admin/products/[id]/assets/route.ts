import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "product-assets";
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024;
const MAX_MANUAL_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const formData = await request.formData();
  const type = formData.get("type") as string;
  const file = formData.get("file") as File;

  if (!type || !file) {
    return NextResponse.json({ error: "type et file requis" }, { status: 400 });
  }

  if (type === "screenshot") {
    if (file.size > MAX_SCREENSHOT_SIZE) {
      return NextResponse.json({ error: "Image trop volumineuse (max 5 Mo)" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format image non supporté (PNG, JPEG, WebP)" }, { status: 400 });
    }
  } else if (type === "manual") {
    if (file.size > MAX_MANUAL_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Le manuel doit être un fichier PDF" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const ext = file.name.split(".").pop() || "bin";
  const storagePath = type === "screenshot"
    ? `${id}/screenshots/${Date.now()}.${ext}`
    : `${id}/manual.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data: existing } = await supabase
    .from("product_settings")
    .select("content")
    .eq("product_id", id)
    .maybeSingle();

  const content = (existing?.content as Record<string, unknown>) || {};

  if (type === "screenshot") {
    const screenshots = (content.screenshots as string[]) || [];
    screenshots.push(publicUrl);
    content.screenshots = screenshots;
  } else {
    content.manualUrl = publicUrl;
  }

  const { error: dbError } = await supabase
    .from("product_settings")
    .upsert({ product_id: id, content, updated_at: new Date().toISOString() }, { onConflict: "product_id" });

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    console.error("DB error:", dbError);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }

  revalidatePath("/plugins");
  revalidatePath(`/plugins/${id}`);

  return NextResponse.json({ url: publicUrl, storagePath });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { type, url } = await request.json();

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("product_settings")
    .select("content")
    .eq("product_id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Aucun paramètre trouvé" }, { status: 404 });
  }

  const content = (existing.content as Record<string, unknown>) || {};

  if (type === "screenshot" && url) {
    const screenshots = (content.screenshots as string[]) || [];
    content.screenshots = screenshots.filter((s) => s !== url);
  } else if (type === "manual") {
    delete content.manualUrl;
  }

  await supabase
    .from("product_settings")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("product_id", id);

  const urlObj = new URL(url);
  const pathMatch = urlObj.pathname.match(/\/object\/public\/product-assets\/(.+)/);
  if (pathMatch) {
    await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
  }

  revalidatePath("/plugins");
  revalidatePath(`/plugins/${id}`);

  return NextResponse.json({ success: true });
}
