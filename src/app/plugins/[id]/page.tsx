import type { Metadata } from "next";
import { MOCK_PRODUCTS } from "@/data/products";
import ProductPageClient from "./ProductPageClient";

interface Props {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const product = MOCK_PRODUCTS.find((p) => p.id === id);

    if (!product) {
        return { title: "Plugin Not Found" };
    }

    const price = product.price_cents === 0 ? "Free" : `€${(product.price_cents / 100).toFixed(2)}`;

    return {
        title: `${product.name} — Q-SYS Plugin for ${product.tagline.split("—")[0]?.trim() || "Show Control"}`,
        description: `${product.description} ${price} — Instant license activation for Q-SYS Designer. Compatible with ${product.compatibility.supportedCores.join(", ")}.`,
        keywords: [
            `${product.name} Q-SYS plugin`,
            `Q-SYS ${product.category}`,
            "Q-SYS Designer plugin",
            "Q-SYS show control",
            product.name,
            ...product.features.slice(0, 3).map(f => f.split("—")[0]?.trim() || ""),
        ],
        openGraph: {
            title: `${product.name} — Q-SYS Plugin | BVFactory`,
            description: product.description,
            url: `https://bvfactory.dev/plugins/${product.id}`,
            type: "website",
        },
        alternates: {
            canonical: `https://bvfactory.dev/plugins/${product.id}`,
        },
    };
}

export function generateStaticParams() {
    return MOCK_PRODUCTS.map((product) => ({
        id: product.id,
    }));
}

export default async function ProductPage({ params }: Props) {
    const { id } = await params;
    const product = MOCK_PRODUCTS.find((p) => p.id === id);

    const jsonLd = product ? {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: `${product.name} — Q-SYS Plugin`,
        description: product.description,
        url: `https://bvfactory.dev/plugins/${product.id}`,
        applicationCategory: "Multimedia",
        operatingSystem: "Q-SYS OS",
        offers: {
            "@type": "Offer",
            price: (product.price_cents / 100).toFixed(2),
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
        },
        author: {
            "@type": "Organization",
            name: "BVFactory",
            url: "https://bvfactory.dev",
        },
        softwareRequirements: `Q-SYS Designer ${product.compatibility.minQsysVersion} or later`,
    } : null;

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <ProductPageClient />
        </>
    );
}
