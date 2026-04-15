import { createAdminClient } from "@/lib/supabase/admin";

export type SiteSettings = {
    homepageVideoEnabled: boolean;
    homepageVideoUrl: string | null;
    homepageVideoPosterUrl: string | null;
};

const DEFAULT_SETTINGS: SiteSettings = {
    homepageVideoEnabled: false,
    homepageVideoUrl: null,
    homepageVideoPosterUrl: null,
};

export async function getSiteSettings(): Promise<SiteSettings> {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("site_settings")
            .select("homepage_video_enabled, homepage_video_url, homepage_video_poster_url")
            .eq("id", 1)
            .single();

        if (error || !data) return DEFAULT_SETTINGS;

        return {
            homepageVideoEnabled: !!data.homepage_video_enabled,
            homepageVideoUrl: data.homepage_video_url ?? null,
            homepageVideoPosterUrl: data.homepage_video_poster_url ?? null,
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}
