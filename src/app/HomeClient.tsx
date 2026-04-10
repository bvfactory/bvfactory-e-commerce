"use client";

// React hooks
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { ArrowRight, ChevronDown, HelpCircle, Shield } from "lucide-react";
import { BVFactoryLogo } from "@/components/BVFactoryLogo";
import { useState, useEffect } from "react";
import { Footer } from "@/components/Footer";

import { ProductType, getProductIcon } from "@/data/products";
import { VideoShowcase } from "@/components/VideoShowcase";
import { TrustedBy, type TrustedClient } from "@/components/TrustedBy";

const HOMEPAGE_FAQ = [
  {
    question: "How does licensing work?",
    answer: "Each license is node-locked to your Q-SYS Core hardware ID. After purchase, you receive a unique activation code via email. Enter this code in our Activation Portal to retrieve your license keys. Licenses are perpetual — no subscriptions."
  },
  {
    question: "Can I evaluate a plugin before purchasing?",
    answer: "Yes. All plugins can be loaded in Q-SYS Designer in offline/emulation mode for evaluation. A license key is only required for deployment to a live Core."
  },
  {
    question: "How quickly will I receive my license after payment?",
    answer: "Instantly. After payment, you'll receive an activation code by email. Enter it in our Activation Portal to retrieve your license keys."
  },
  {
    question: "Can I transfer a license to a different Core?",
    answer: "No. Each license is permanently bound to the Core ID provided at the time of activation and cannot be transferred."
  },
  {
    question: "What Q-SYS versions are supported?",
    answer: "All plugins are tested on Q-SYS Designer 10.0 and above. They should be compatible with 9.0+, but we recommend running 10.0+ for the best experience."
  },
];

export default function HomeClient({ products, trustedClients = [] }: { products: ProductType[]; trustedClients?: TrustedClient[] }) {
  const { formatPrice, isLoading } = useCurrency();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const noMotion = prefersReducedMotion;

  const container: Variants = {
    hidden: noMotion ? {} : { opacity: 0 },
    show: {
      opacity: 1,
      transition: noMotion ? {} : { staggerChildren: 0.12, delayChildren: 0.3 }
    }
  };

  const item: Variants = {
    hidden: noMotion ? {} : { opacity: 0, y: 30 },
    show: noMotion ? {} : { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
  };


  return (
    <div className="flex min-h-screen flex-col font-sans selection:bg-teal-500/30 overflow-x-hidden bg-[#050d1a]">

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-teal-500 focus:text-slate-900 focus:rounded-lg focus:text-sm focus:font-bold"
      >
        Skip to main content
      </a>

      {/* === BACKGROUND SYSTEM === */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Primary orbs */}
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] rounded-full bg-blue-600/15 blur-[180px]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] rounded-full bg-teal-500/15 blur-[180px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 w-[30%] h-[30%] rounded-full bg-indigo-600/8 blur-[150px]" />

        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Noise */}
        <div className="noise-overlay absolute inset-0" />

        {/* Scanlines */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary scanline */}
          <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-[0.07]" style={{ animation: 'scanline 6s linear infinite' }} />
          {/* Wide glow band */}
          <div className="absolute w-full h-[60px] bg-gradient-to-r from-transparent via-teal-500/[0.03] to-transparent blur-sm" style={{ animation: 'scanline 6s linear infinite' }} />
        </div>

        {/* Horizontal accent lines (static, architectural) */}
        <div className="absolute top-[20%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
        <div className="absolute top-[55%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-400/[0.04] to-transparent" />

        {/* Corner accents */}
        <div className="absolute top-6 left-6 w-16 h-16 border-l border-t border-teal-500/10" />
        <div className="absolute top-6 right-6 w-16 h-16 border-r border-t border-teal-500/10" />
        <div className="absolute bottom-6 left-6 w-16 h-16 border-l border-b border-teal-500/10" />
        <div className="absolute bottom-6 right-6 w-16 h-16 border-r border-b border-teal-500/10" />

        {/* Floating particles */}
        <div className="absolute w-1 h-1 rounded-full bg-teal-400/30 top-[15%] left-[10%] animate-float" />
        <div className="absolute w-1 h-1 rounded-full bg-cyan-400/20 top-[40%] right-[15%] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute w-0.5 h-0.5 rounded-full bg-teal-300/25 top-[70%] left-[75%] animate-float" style={{ animationDelay: '4s' }} />
      </div>

      <Navbar />

      {/* === HERO SECTION === */}
      <section id="main-content" className="relative z-10 pt-20 pb-16 md:pt-32 md:pb-24 px-6">
        <div className="max-w-6xl mx-auto text-center">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 100 }}
            className="relative flex justify-center mb-8"
          >
            <div className="absolute inset-0 bg-teal-500/20 blur-[60px] rounded-full scale-150" />
            <BVFactoryLogo className="h-24 w-24 md:h-32 md:w-32 relative drop-shadow-[0_0_30px_rgba(20,184,166,0.3)]" />
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 80 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold font-mono tracking-tight text-white leading-[1.05] mb-6"
          >
            <span className="block">Professional</span>
            <span className="block bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Q-SYS Plugins
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed mb-12"
          >
            Lighting, video, show control, and third-party device integration
            — all running natively inside Q-SYS.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-16"
          >
            <Link href="/plugins">
              <Button className="h-14 px-8 cta-gradient text-white font-bold tracking-widest uppercase text-sm border-0 animate-glow-pulse group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a]">
                <span className="flex items-center gap-2">
                  Explore Modules
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </Link>
            <Link href="/activation">
              <Button variant="outline" className="h-14 px-8 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-mono text-xs uppercase tracking-widest cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a]">
                Activation Portal
              </Button>
            </Link>
          </motion.div>

        </div>
      </section>

      {/* === VIDEO SHOWCASE === */}
      <VideoShowcase />

      {/* === TRUSTED BY === */}
      <TrustedBy clients={trustedClients} />

      {/* === PLUGINS GRID === */}
      <section id="plugins" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-teal-500 mb-3">Module Library</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Our Modules
            </h2>
          </motion.div>

          {/* Product cards */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={item}>
                <Link href={`/plugins/${product.id}`} className="block group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a] rounded-2xl">
                  <div className="premium-card relative rounded-2xl overflow-hidden glass-panel p-[1px]">
                    {/* Gradient border on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-teal-500/30 group-hover:via-blue-500/20 group-hover:to-purple-500/30 transition-all duration-700 rounded-2xl" />

                    <div className="relative bg-[#0a1628] rounded-2xl p-8 h-full flex flex-col">
                      {/* Icon */}
                      <div className="relative mb-6 w-fit">
                        <div className="absolute inset-0 bg-teal-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <div className="relative inline-flex p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 group-hover:border-teal-500/30 transition-colors duration-500">
                          {getProductIcon(product.iconName, "w-8 h-8 text-teal-400 group-hover:text-teal-300 transition-colors")}
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-teal-50 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-[11px] font-mono text-teal-500/80 uppercase tracking-widest mb-4">
                        {product.tagline}
                      </p>
                      <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-1">
                        {product.description}
                      </p>

                      {/* Features preview */}
                      <div className="mb-8 space-y-2">
                        {product.features.slice(0, 3).map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="w-1 h-1 rounded-full bg-teal-500/50" />
                            <span className="truncate">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <div>
                          <p className={`text-2xl font-bold font-mono ${product.price_cents === 0 ? 'text-teal-400' : 'text-white'}`}>
                            {isLoading ? "..." : formatPrice(product.price_cents)}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{product.price_cents === 0 ? "Free License" : "Lifetime License"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-teal-500 text-xs font-mono uppercase tracking-wider opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          View <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* === VIEW ALL CTA === */}
      <section className="relative z-10 px-6 pb-8">
        <div className="max-w-6xl mx-auto text-center">
          <Link href="/plugins">
            <Button variant="outline" className="h-12 px-8 bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white font-mono text-xs uppercase tracking-widest group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a]">
              View All Modules
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* === TRUST SECTION === */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-panel rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
          >
            {/* Internal glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

            <div className="relative z-10">
              <div className="inline-flex p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 mb-6">
                <Shield className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
                Simple. No Subscription.
              </h3>
              <p className="text-slate-400 leading-relaxed max-w-xl mx-auto mb-8">
                Buy your plugin, activate your code in our portal, deploy to your Q-SYS Core. That&apos;s it.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                {["Secure Payment", "Lifetime License", "Instant Activation", "Free Updates"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* === FAQ SECTION === */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 mb-6">
              <HelpCircle className="w-6 h-6 text-teal-400" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Frequently Asked Questions
            </h3>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-3"
          >
            {HOMEPAGE_FAQ.map((faq, i) => (
              <div key={i} className="glass-panel rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  aria-expanded={openFaqIndex === i}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050d1a] rounded-xl"
                >
                  <span className="text-sm font-medium text-slate-200 pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaqIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-teal-500 flex-shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaqIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
