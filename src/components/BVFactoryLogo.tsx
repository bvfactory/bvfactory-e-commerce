export function BVFactoryLogo({ className = "h-8 w-8" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Outer rounded square */}
            <rect
                x="1"
                y="1"
                width="38"
                height="38"
                rx="10"
                fill="url(#bvf-bg)"
                stroke="url(#bvf-border)"
                strokeWidth="1.5"
            />

            {/* Diamond motif (from the ◆ used in the plugin) */}
            <path
                d="M20 6L28 20L20 34L12 20Z"
                fill="url(#bvf-diamond)"
                opacity="0.15"
            />

            {/* B V letters stylized */}
            <text
                x="20"
                y="24"
                textAnchor="middle"
                fontFamily="monospace"
                fontWeight="900"
                fontSize="16"
                fill="url(#bvf-text)"
                letterSpacing="-1"
            >
                BV
            </text>

            {/* Bottom accent line */}
            <line
                x1="12"
                y1="30"
                x2="28"
                y2="30"
                stroke="url(#bvf-accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
            />

            {/* Small diamond dot */}
            <rect
                x="18.5"
                y="32"
                width="3"
                height="3"
                rx="0.5"
                transform="rotate(45 20 33.5)"
                fill="#14b8a6"
                opacity="0.8"
            />

            <defs>
                <linearGradient id="bvf-bg" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#0a1628" />
                    <stop offset="100%" stopColor="#0f1f35" />
                </linearGradient>
                <linearGradient id="bvf-border" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="bvf-diamond" x1="20" y1="6" x2="20" y2="34">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id="bvf-text" x1="12" y1="10" x2="28" y2="28">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
                <linearGradient id="bvf-accent" x1="12" y1="30" x2="28" y2="30">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="50%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
            </defs>
        </svg>
    );
}
