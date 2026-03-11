"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";

export function VideoShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: "-10%" });
  const [isLoaded, setIsLoaded] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);

  useEffect(() => {
    if (prefersReducedMotion || !videoRef.current) return;
    if (isInView) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isInView, prefersReducedMotion]);

  const handleToggle = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  return (
    <section ref={containerRef} className="relative z-10 py-16 md:py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-teal-500 mb-3">
            See It In Action
          </p>
        </motion.div>

        {/* Video container */}
        <motion.div
          style={prefersReducedMotion ? {} : { y, scale }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl overflow-hidden glass-panel p-[1px] group cursor-pointer"
          onClick={handleToggle}
          role="button"
          aria-label="Toggle video playback"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              handleToggle();
            }
          }}
        >
          {/* Gradient border glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-transparent to-blue-500/20 rounded-2xl opacity-50" />

          <div className="relative bg-[#050d1a] rounded-2xl overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-teal-500/40 to-transparent z-20" />

            {/* Video */}
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              preload="metadata"
              poster="/videos/showcase-poster.jpg"
              onLoadedData={() => setIsLoaded(true)}
              className={`w-full aspect-video object-cover transition-opacity duration-700 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
            >
              <source src="/videos/showcase.mp4" type="video/mp4" />
            </video>

            {/* Overlay effects */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,#050d1a_100%)] opacity-60" />
              {/* Bottom fade */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050d1a] to-transparent" />
              {/* Top fade */}
              <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#050d1a]/50 to-transparent" />
              {/* Noise overlay */}
              <div className="noise-overlay absolute inset-0" />
              {/* Scanline */}
              <div
                className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-[0.05]"
                style={{ animation: "scanline 6s linear infinite" }}
              />
            </div>

            {/* Loading skeleton */}
            {!isLoaded && (
              <div className="absolute inset-0 bg-[#0a1628] animate-pulse flex items-center justify-center aspect-video">
                <div className="w-12 h-12 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
              </div>
            )}

            {/* Corner accents */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l border-t border-teal-500/20 z-20" />
            <div className="absolute top-4 right-4 w-8 h-8 border-r border-t border-teal-500/20 z-20" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l border-b border-teal-500/20 z-20" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r border-b border-teal-500/20 z-20" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
