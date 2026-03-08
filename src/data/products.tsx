import { ReactNode } from "react";
import { SlidersHorizontal, Share2, Activity } from "lucide-react";

export interface VersionHistory {
    version: string;
    date: string;
    changes: string[];
}

export interface ProductType {
    id: string;
    name: string;
    tagline: string;
    description: string;
    longDescription: string;
    price_cents: number;
    iconName: "SlidersHorizontal" | "Share2" | "Activity"; // For serialization if needed, or we just map it
    features: string[];
    specs: Record<string, string>;
    versionHistory: VersionHistory[];
    manualUrl?: string; // Mock URL
    screenshots?: string[];
}

export const MOCK_PRODUCTS: ProductType[] = [
    {
        id: "prod-1",
        name: "DSP MASTER",
        tagline: "The Ultimate Audio Processing Hub",
        description: "Powerful digital signal processing tool with real-time spectrum analysis and auto-mixing algorithms.",
        longDescription: "DSP Master revolutionizes how you handle audio within the Q-SYS ecosystem. By offloading complex calculations to our optimized algorithms, it provides zero-latency auto-mixing, multi-band dynamic compression, and a stunning real-time spectrum analyzer directly accessible from your UCI. Perfect for large-scale corporate deployments and live performance venues where pristine audio is mission-critical.",
        price_cents: 29900,
        iconName: "SlidersHorizontal",
        features: [
            "Zero-latency 64-channel Auto-Mixer",
            "Real-time FFT Spectrum Analyzer (UCI compatible)",
            "Multi-band Dynamic Equalization",
            "Automated Feedback Suppression (AFS)",
            "Native AES67 & Dante stream optimization"
        ],
        specs: {
            "Supported Cores": "Core 110f, Core 510i, Core 5200",
            "Max Channels": "128x128",
            "Latency": "< 0.5ms",
            "DSP Usage": "~15% on Core 110f",
            "License Type": "Node-locked (Core ID)"
        },
        versionHistory: [
            {
                version: "v2.1.0",
                date: "2023-11-15",
                changes: ["Added WebRTC compatibility", "Reduced DSP footprint by 4%"]
            },
            {
                version: "v2.0.0",
                date: "2023-08-01",
                changes: ["Complete UI overhaul for UCI", "Introduced Multi-band EQ"]
            }
        ],
        manualUrl: "#",
        screenshots: [
            "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1516280440502-861c28c61ca8?auto=format&fit=crop&q=80&w=2070"
        ]
    },
    {
        id: "prod-2",
        name: "NODE ROUTER",
        tagline: "Intelligent Network Matrix",
        description: "Advanced Dante/AES67 audio matrix routing with preset management and external OSC control.",
        longDescription: "Node Router is the definitive solution for complex AV-over-IP architectures. It allows dynamic, preset-driven routing of Dante, AES67, and Q-LAN streams without dropping a single packet. With full OSC and JSON-RPC API integration, you can control the entire matrix from external show controllers like GrandMA3, Resolume, or custom Node.js servers.",
        price_cents: 44900,
        iconName: "Share2",
        features: [
            "Dynamic 256x256 Audio Matrix",
            "Instant Preset Recall (sub 10ms)",
            "OSC (Open Sound Control) bidirectional API",
            "JSON-RPC integration for web dashboards",
            "Automated failover routing"
        ],
        specs: {
            "Supported Protocols": "Dante, AES67, Q-LAN, AES3",
            "Max Crosspoints": "65,536",
            "API": "OSC, JSON-RPC, TCP/UDP",
            "Failover Time": "< 50ms",
            "License Type": "Node-locked (Core ID)"
        },
        versionHistory: [
            {
                version: "v1.5.2",
                date: "2023-12-05",
                changes: ["Fixed OSC string parsing issue", "Added AES67 discovery improvements"]
            },
            {
                version: "v1.5.0",
                date: "2023-09-20",
                changes: ["Introduced Automated Failover", "Expanded API endpoints"]
            }
        ],
        manualUrl: "#",
        screenshots: [
            "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=2034",
            "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=2070"
        ]
    },
    {
        id: "prod-3",
        name: "Q-SYNC ENGINE",
        tagline: "Frame-Accurate Show Automation",
        description: "Frame-accurate synchronization module for lighting and video, bringing SMPTE timecode native to Q-SYS.",
        longDescription: "Q-Sync Engine is the missing link between audio, video, and lighting. By natively bridging SMPTE LTC/MTC timecode into the Q-SYS timeline, it allows frame-accurate triggering of AV events. Generate DMX (Art-Net/sACN) directly from the Core based on audio analysis, or sync entire playback systems with external lighting desks effortlessly.",
        price_cents: 59900,
        iconName: "Activity",
        features: [
            "Native SMPTE LTC/MTC parsing and generation",
            "Art-Net & sACN (DMX) output directly from Q-SYS",
            "Audio-to-Lighting algorithmic reactivity",
            "Frame-accurate event sequencer",
            "Integration with Watchout & Disguise media servers"
        ],
        specs: {
            "Timecode Formats": "23.976, 24, 25, 29.97DF, 30",
            "DMX Universes": "Up to 64 (sACN/Art-Net)",
            "Jitter": "< 1 frame",
            "Compatibility": "GrandMA, ChamSys, Resolume",
            "License Type": "Node-locked (Core ID)"
        },
        versionHistory: [
            {
                version: "v3.0.0",
                date: "2024-01-10",
                changes: ["Added sACN output support", "Rewrote timing engine for 0 jitter"]
            },
            {
                version: "v2.8.5",
                date: "2023-10-12",
                changes: ["Added Watchout specific presets", "UI improvements"]
            }
        ],
        manualUrl: "#",
        screenshots: [
            "https://images.unsplash.com/photo-1585862205566-5e5881a70519?auto=format&fit=crop&q=80&w=2071",
            "https://images.unsplash.com/photo-1516280440502-861c28c61ca8?auto=format&fit=crop&q=80&w=2070"
        ]
    }
];

// Helper to get the correct icon component based on the string name
export const getProductIcon = (iconName: string, className: string = "") => {
    switch (iconName) {
        case "SlidersHorizontal":
            return <SlidersHorizontal className={className} />;
        case "Share2":
            return <Share2 className={className} />;
        case "Activity":
            return <Activity className={className} />;
        default:
            return <Activity className={className} />;
    }
};
