import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { CartProvider } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BVFactory — Professional Q-SYS Plugins",
  description: "Enterprise-grade audio processing, intelligent routing, and show automation modules for the Q-SYS ecosystem. Node-locked licenses with instant activation.",
  keywords: ["Q-SYS", "plugins", "audio", "DSP", "Dante", "AES67", "show control", "BVFactory"],
  openGraph: {
    title: "BVFactory — Professional Q-SYS Plugins",
    description: "Enterprise-grade Q-SYS plugins for audio processing, routing, and show automation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
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
