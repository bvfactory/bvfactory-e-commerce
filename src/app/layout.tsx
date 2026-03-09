import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const siteUrl = "https://bvfactory.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BVFactory — Professional Q-SYS Plugins for Show Control & AV Integration",
    template: "%s | BVFactory",
  },
  description: "Professional Q-SYS plugins for show control, DMX lighting, media server integration, audio playback, and AV-over-IP routing. Built for Q-SYS Designer by AV integrators. Node-locked licenses with instant activation.",
  keywords: [
    "Q-SYS plugins", "Q-SYS Designer plugins", "Q-SYS show control",
    "Q-SYS DMX", "Q-SYS Art-Net", "Q-SYS sACN", "Q-SYS lighting control",
    "Q-SYS media server", "Q-SYS MadMapper", "Q-SYS Resolume",
    "Q-SYS audio playback", "Q-SYS multitrack",
    "Q-SYS AV-over-IP", "Q-SYS video routing",
    "Q-SYS UCI", "Q-SYS web control",
    "Q-SYS automation", "Q-SYS integration",
    "QSC Q-SYS", "show control software", "AV control plugin",
    "BVFactory", "DMX recording Q-SYS", "Philips Hue Q-SYS",
  ],
  authors: [{ name: "BVFactory", url: siteUrl }],
  creator: "BVFactory",
  publisher: "BVFactory",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "BVFactory — Professional Q-SYS Plugins",
    description: "Professional Q-SYS plugins for show control, lighting, media servers, audio, and AV routing. Built for integrators by integrators.",
    url: siteUrl,
    siteName: "BVFactory",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BVFactory — Professional Q-SYS Plugins",
    description: "Q-SYS plugins for show control, DMX, media servers, audio playback, and AV-over-IP routing.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BVFactory",
  url: siteUrl,
  description: "Professional Q-SYS plugins for show control and AV system integration.",
  brand: {
    "@type": "Brand",
    name: "BVFactory",
    slogan: "We build tools for integrators, by integrators.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <CartProvider>
          <CurrencyProvider>
            {children}
            <CartDrawer />
            <Toaster richColors />
          </CurrencyProvider>
        </CartProvider>
      </body>
    </html>
  );
}
