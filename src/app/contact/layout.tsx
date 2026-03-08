import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact BVFactory — Q-SYS Plugin Support & Inquiries",
    description: "Get in touch with BVFactory for Q-SYS plugin support, licensing questions, custom integration requests, or partnership inquiries.",
    alternates: {
        canonical: "https://bvfactory.dev/contact",
    },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
