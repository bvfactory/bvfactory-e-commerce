import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Q-SYS Plugin Store — DMX, Show Control, Media Server, Audio & Video",
    description: "Browse professional Q-SYS plugins: DMX lighting with Art-Net & sACN, show control sequencing, MadMapper & Resolume integration, multitrack audio playback, AV-over-IP routing, and web-based UCI dashboards. Instant license activation.",
    keywords: [
        "Q-SYS plugin store", "buy Q-SYS plugins",
        "Q-SYS DMX plugin", "Q-SYS Art-Net", "Q-SYS sACN",
        "Q-SYS show control", "Q-SYS sequencer",
        "Q-SYS MadMapper plugin", "Q-SYS Resolume plugin",
        "Q-SYS audio playback", "Q-SYS multitrack player",
        "Q-SYS AV-over-IP", "Q-SYS video matrix",
        "Q-SYS web control", "Q-SYS UCI plugin",
        "Q-SYS Philips Hue", "Q-SYS iiyama control",
    ],
    alternates: {
        canonical: "https://bvfactory.dev/plugins",
    },
};

export default function PluginsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
