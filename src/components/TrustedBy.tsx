"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export interface TrustedClient {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
}

export function TrustedBy({ clients }: { clients: TrustedClient[] }) {
  if (clients.length === 0) return null;

  // Duplicate the list to create seamless loop
  const logos = [...clients, ...clients];

  return (
    <section className="relative z-10 py-16 px-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-6xl mx-auto"
      >
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-teal-500 text-center mb-10">
          Trusted by industry leaders
        </p>

        {/* Marquee container */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#050d1a] to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#050d1a] to-transparent pointer-events-none" />

          {/* Scrolling track */}
          <div className="flex items-center gap-16 w-max animate-marquee">
            {logos.map((client, i) => {
              const logo = (
                <div
                  key={`${client.id}-${i}`}
                  className="flex-shrink-0 flex items-center justify-center h-12 w-32 opacity-40 hover:opacity-80 transition-opacity duration-300 grayscale hover:grayscale-0"
                >
                  <Image
                    src={client.logo_url}
                    alt={client.name}
                    width={128}
                    height={48}
                    className="object-contain max-h-12 w-auto"
                  />
                </div>
              );

              if (client.website_url) {
                return (
                  <a
                    key={`${client.id}-${i}`}
                    href={client.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={client.name}
                  >
                    {logo}
                  </a>
                );
              }
              return logo;
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
