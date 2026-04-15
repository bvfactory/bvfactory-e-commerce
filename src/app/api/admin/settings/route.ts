import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "site-assets";
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_POSTER_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_POSTER_TYPES = ["image/png", "image/jpeg", "image/webp"];

function extractStoragePath(publicUrl: string | null | undefined): string | null {
    if (!publicUrl) return null;
    const match = publicUrl.match(/\/object\/public\/site-assets\/(.+)$/);
    return match ? match[1] : null;
}

// GET — read current site settings
export async function GET(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("site_settings")
        .select("homepage_video_enabled, homepage_video_url, homepage_video_poster_url, updated_at")
        .eq("id", 1)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
}

// PATCH — update toggle and/or replace video / poster files
export async function PATCH(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const supabase = createAdminClient();

    const { data: existing, error: readError } = await supabase
        .from("site_settings")
        .select("homepage_video_url, homepage_video_poster_url")
        .eq("id", 1)
        .single();

    if (readError) {
        return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Toggle
    const enabledRaw = formData.get("homepage_video_enabled");
    if (enabledRaw !== null) {
        updates.homepage_video_enabled = enabledRaw === "true";
    }

    // Clear flags (explicit removal)
    if (formData.get("clear_video") === "true") {
        const oldPath = extractStoragePath(existing.homepage_video_url);
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
        updates.homepage_video_url = null;
    }
    if (formData.get("clear_poster") === "true") {
        const oldPath = extractStoragePath(existing.homepage_video_poster_url);
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
        updates.homepage_video_poster_url = null;
    }

    // Video upload
    const videoFile = formData.get("video") as File | null;
    if (videoFile && videoFile.size > 0) {
        if (videoFile.size > MAX_VIDEO_SIZE) {
            return NextResponse.json({ error: "Vidéo trop volumineuse (max 100 Mo)" }, { status: 400 });
        }
        if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
            return NextResponse.json({ error: "Format vidéo non supporté (MP4, WebM, MOV)" }, { status: 400 });
        }

        const oldPath = extractStoragePath(existing.homepage_video_url);
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);

        const buffer = Buffer.from(await videoFile.arrayBuffer());
        const ext = videoFile.name.split(".").pop() || "mp4";
        const storagePath = `homepage-video-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, { upsert: true, contentType: videoFile.type });

        if (uploadError) {
            console.error("Video upload error:", uploadError);
            return NextResponse.json({ error: "Erreur lors de l'upload de la vidéo" }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        updates.homepage_video_url = publicUrl;
    }

    // Poster upload
    const posterFile = formData.get("poster") as File | null;
    if (posterFile && posterFile.size > 0) {
        if (posterFile.size > MAX_POSTER_SIZE) {
            return NextResponse.json({ error: "Poster trop volumineux (max 5 Mo)" }, { status: 400 });
        }
        if (!ALLOWED_POSTER_TYPES.includes(posterFile.type)) {
            return NextResponse.json({ error: "Format poster non supporté (PNG, JPEG, WebP)" }, { status: 400 });
        }

        const oldPath = extractStoragePath(existing.homepage_video_poster_url);
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);

        const buffer = Buffer.from(await posterFile.arrayBuffer());
        const ext = posterFile.name.split(".").pop() || "jpg";
        const storagePath = `homepage-poster-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, buffer, { upsert: true, contentType: posterFile.type });

        if (uploadError) {
            console.error("Poster upload error:", uploadError);
            return NextResponse.json({ error: "Erreur lors de l'upload du poster" }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        updates.homepage_video_poster_url = publicUrl;
    }

    const { data, error } = await supabase
        .from("site_settings")
        .update(updates)
        .eq("id", 1)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
}
