import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About BVFactory — Q-SYS Plugin Development for AV Integrators",
    description: "BVFactory builds professional Q-SYS plugins for show control and AV system integration. Created by AV integrators for integrators — connecting lighting, audio, video, and automation systems inside Q-SYS Designer.",
    alternates: {
        canonical: "https://bvfactory.dev/about",
    },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return children;
}
