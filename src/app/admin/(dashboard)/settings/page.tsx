"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Film, Loader2, Save, Settings as SettingsIcon, Trash2, Upload } from "lucide-react";

interface SettingsState {
    homepage_video_enabled: boolean;
    homepage_video_url: string | null;
    homepage_video_poster_url: string | null;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsState | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [posterFile, setPosterFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [posterPreview, setPosterPreview] = useState<string | null>(null);

    const videoInputRef = useRef<HTMLInputElement>(null);
    const posterInputRef = useRef<HTMLInputElement>(null);

    const fetchSettings = useCallback(async () => {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data.settings) {
            setSettings(data.settings);
            setVideoPreview(data.settings.homepage_video_url);
            setPosterPreview(data.settings.homepage_video_poster_url);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));
        }
    }

    function handlePosterChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setPosterFile(file);
            setPosterPreview(URL.createObjectURL(file));
        }
    }

    async function handleToggle(checked: boolean) {
        if (!settings) return;
        setSettings({ ...settings, homepage_video_enabled: checked });

        const fd = new FormData();
        fd.append("homepage_video_enabled", String(checked));
        const res = await fetch("/api/admin/settings", { method: "PATCH", body: fd });
        if (!res.ok) {
            // revert
            setSettings({ ...settings, homepage_video_enabled: !checked });
        }
    }

    async function handleSave() {
        if (!videoFile && !posterFile) return;
        setSaving(true);

        const fd = new FormData();
        if (videoFile) fd.append("video", videoFile);
        if (posterFile) fd.append("poster", posterFile);

        const res = await fetch("/api/admin/settings", { method: "PATCH", body: fd });
        const data = await res.json();
        if (res.ok && data.settings) {
            setSettings(data.settings);
            setVideoPreview(data.settings.homepage_video_url);
            setPosterPreview(data.settings.homepage_video_poster_url);
            setVideoFile(null);
            setPosterFile(null);
            if (videoInputRef.current) videoInputRef.current.value = "";
            if (posterInputRef.current) posterInputRef.current.value = "";
        } else {
            alert(data.error || "Erreur lors de la sauvegarde");
        }
        setSaving(false);
    }

    async function handleClearVideo() {
        if (!confirm("Supprimer la vidéo actuelle ?")) return;
        const fd = new FormData();
        fd.append("clear_video", "true");
        const res = await fetch("/api/admin/settings", { method: "PATCH", body: fd });
        const data = await res.json();
        if (res.ok && data.settings) {
            setSettings(data.settings);
            setVideoPreview(null);
            setVideoFile(null);
            if (videoInputRef.current) videoInputRef.current.value = "";
        }
    }

    async function handleClearPoster() {
        if (!confirm("Supprimer le poster actuel ?")) return;
        const fd = new FormData();
        fd.append("clear_poster", "true");
        const res = await fetch("/api/admin/settings", { method: "PATCH", body: fd });
        const data = await res.json();
        if (res.ok && data.settings) {
            setSettings(data.settings);
            setPosterPreview(null);
            setPosterFile(null);
            if (posterInputRef.current) posterInputRef.current.value = "";
        }
    }

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
            </div>
        );
    }

    const hasPendingUpload = !!videoFile || !!posterFile;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        <SettingsIcon className="w-5 h-5 text-teal-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Paramètres du site</h1>
                </div>
                <p className="text-sm text-slate-400">
                    Configuration de la page d&apos;accueil et des médias partagés.
                </p>
            </div>

            {/* Homepage video section */}
            <section className="glass-panel rounded-2xl p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <Film className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Vidéo d&apos;accueil</h2>
                            <p className="text-xs text-slate-400">Affichée dans la section &quot;See It In Action&quot; de la page d&apos;accueil.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-black/30 border border-white/5 rounded-xl px-4 py-2">
                        <Label htmlFor="video-enabled" className="text-xs font-mono uppercase tracking-wider text-slate-300">
                            {settings.homepage_video_enabled ? "Active" : "Désactivée"}
                        </Label>
                        <Switch
                            id="video-enabled"
                            checked={settings.homepage_video_enabled}
                            onCheckedChange={handleToggle}
                        />
                    </div>
                </div>

                {/* Video current / upload */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">Vidéo (MP4, WebM, MOV — max 100 Mo)</Label>
                        <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                            {videoPreview ? (
                                <video
                                    key={videoPreview}
                                    src={videoPreview}
                                    controls
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="text-center text-slate-600 text-xs font-mono uppercase tracking-widest">
                                    <Film className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    Aucune vidéo
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                ref={videoInputRef}
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime"
                                onChange={handleVideoChange}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => videoInputRef.current?.click()}
                                className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-mono text-xs uppercase"
                            >
                                <Upload className="w-3.5 h-3.5 mr-2" />
                                {videoFile ? videoFile.name.slice(0, 24) : "Choisir un fichier"}
                            </Button>
                            {settings.homepage_video_url && !videoFile && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClearVideo}
                                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-mono uppercase tracking-wider text-slate-400">Poster (PNG, JPEG, WebP — max 5 Mo)</Label>
                        <div className="bg-black/40 border border-white/10 rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                            {posterPreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={posterPreview} alt="Poster preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-slate-600 text-xs font-mono uppercase tracking-widest">
                                    <ImagePlus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                    Aucun poster
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                ref={posterInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handlePosterChange}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => posterInputRef.current?.click()}
                                className="flex-1 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-mono text-xs uppercase"
                            >
                                <Upload className="w-3.5 h-3.5 mr-2" />
                                {posterFile ? posterFile.name.slice(0, 24) : "Choisir un fichier"}
                            </Button>
                            {settings.homepage_video_poster_url && !posterFile && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleClearPoster}
                                    className="bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {hasPendingUpload && (
                    <div className="flex items-center justify-end pt-4 border-t border-white/5">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="cta-gradient text-white font-mono text-xs uppercase tracking-widest"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Upload en cours...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Enregistrer
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {!settings.homepage_video_url && settings.homepage_video_enabled && (
                    <div className="text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
                        La vidéo est activée mais aucun fichier n&apos;est uploadé — la section ne s&apos;affichera pas sur le site.
                    </div>
                )}
            </section>
        </div>
    );
}
