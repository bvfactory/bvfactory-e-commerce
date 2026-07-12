import { Flame, Clapperboard, Monitor, Globe, Tv, Thermometer, Layers, Film, Music, Lightbulb, Timer, Zap, ArrowLeftRight, Route, Cable, Cpu, Brain } from "lucide-react";

export interface VersionHistory {
    version: string;
    date: string;
    changes: string[];
}

export interface FaqItem {
    question: string;
    answer: string;
}

export interface CompatibleBrand {
    name: string;
    logo: string; // path relative to /public/brands/
}

export type ProductTier = "bridge" | "forge" | "mind";

export interface ReplaceInfo {
    device: string;
    estimatedCost: string;
}

export interface ProductType {
    id: string;
    name: string;
    tagline: string;
    description: string;
    longDescription: string;
    price_cents: number;
    iconName: "Flame" | "Clapperboard" | "Monitor" | "Globe" | "Tv" | "Thermometer" | "Layers" | "Film" | "Music" | "Lightbulb" | "Timer" | "Zap" | "ArrowLeftRight" | "Route";
    category: "lighting" | "routing" | "show-control" | "control" | "audio" | "video" | "uci";
    tier: ProductTier;
    replaces?: ReplaceInfo;
    compatibleBrands?: CompatibleBrand[];
    features: string[];
    specs: Record<string, string>;
    compatibility: {
        minQsysVersion: string;
        supportedCores: string[];
        os?: string;
    };
    versionHistory: VersionHistory[];
    pluginFileName?: string;
    manualUrl?: string;
    videoUrl?: string;
    screenshots?: string[];
    faq: FaqItem[];
}

export const PRODUCT_TIERS = [
    {
        id: "bridge" as ProductTier,
        label: "Bridge",
        tagline: "Connect the physical world",
        description: "Translators that let Q-SYS talk to third-party devices. One plugin, one integration, zero custom Lua.",
        icon: Cable,
        color: "blue",
    },
    {
        id: "forge" as ProductTier,
        label: "Forge",
        tagline: "Create something new",
        description: "Creative engines that generate content Q-SYS can't do natively — DMX, timecode, audio, dashboards. Replaces external hardware entirely.",
        icon: Cpu,
        color: "teal",
    },
    {
        id: "mind" as ProductTier,
        label: "Mind",
        tagline: "Orchestrate everything",
        description: "The brain of the ecosystem. Decides which scene to launch, when, and why. Sequences transitions, handles failover, reacts to events.",
        icon: Brain,
        color: "purple",
    },
] as const;

export const PRODUCT_CATEGORIES = [
    { id: "all", label: "All Modules" },
    { id: "audio", label: "Audio" },
    { id: "video", label: "Video" },
    { id: "lighting", label: "Lighting & DMX" },
    { id: "routing", label: "Routing & Network" },
    { id: "show-control", label: "Show Control" },
    { id: "control", label: "AV Control" },
    { id: "uci", label: "UCI / Dashboard" },
] as const;

export const ROADMAP_PLUGINS = [
    { name: "LightBridge", tier: "bridge" as ProductTier, description: "Connected lighting control (Hue, LIFX, WLED…) natively from Q-SYS" },
    { name: "ScreenBridge", tier: "bridge" as ProductTier, description: "Multi-brand display control (Samsung, LG, Sony, iiyama, NEC, Philips, BenQ, Panasonic, PJLink)" },
    { name: "NetBridge", tier: "bridge" as ProductTier, description: "Swiss-army-knife network client: TCP, UDP, HTTP, OSC, WebSocket from a single plugin" },
    { name: "MediaBridge", tier: "bridge" as ProductTier, description: "Control external media servers and video playout devices (BrightSign, CasparCG, EVP380)" },
    { name: "SensorBridge", tier: "bridge" as ProductTier, description: "GPIO, serial sensors, presence detection for interactive installations" },
    { name: "SoundForge", tier: "forge" as ProductTier, description: "Multitrack audio player with cue management and transport control inside Q-SYS" },
    { name: "ViewForge", tier: "forge" as ProductTier, description: "Modern web dashboard served from Q-SYS Core — free, replaces native UCIs" },
    { name: "ShowMind", tier: "mind" as ProductTier, description: "Full show control orchestration — cue lists, rules engine, timeline editor. Replaces Medialon Manager" },
] as const;

export const MOCK_PRODUCTS: ProductType[] = [
    {
        id: "lightforge",
        pluginFileName: "lightforge.qplugx",
        name: "LIGHTFORGE",
        tagline: "Forge your light, master every universe.",
        description: "Record and play back up to 32 universes of DMX — Art-Net and sACN — directly inside Q-SYS. One plugin, instant save, instant load.",
        longDescription: "LightForge captures live DMX data from your lighting console or any Art-Net/sACN source, and plays it back on demand. Up to 32 independent tracks, each with its own universe, protocol, and destination. Record a full show once, replay it forever.\n\nTraditional DMX recording solutions cost thousands and require dedicated hardware. LightForge runs natively on your Q-SYS Core — the same platform already handling your audio, video, and control. Add an Art-Net or sACN node to convert to physical DMX, and you're done. No dedicated PC, no rack-mount recorder, no additional maintenance contract.\n\nPair it with any affordable Art-Net/sACN node and you have the most cost-effective DMX recording solution on the market. And it lives where your show control already does.",
        price_cents: 35000,
        iconName: "Flame",
        category: "lighting",
        tier: "forge",
        replaces: { device: "ENTTEC S-Play SP1 / CueCore3", estimatedCost: "~1 500–2 300 $" },
        features: [
            "Record — Arm a track, select your input universe, hit record. Captures every DMX frame in real time at 44fps.",
            "Play — Load a file, press play. Output goes straight to Art-Net or sACN, unicast or broadcast. Loop, scrub, pause.",
            "Trigger — Every transport control is a Q-SYS pin. Wire to GPIO, UCI buttons, Show Controller cues, or any third-party system.",
            "Layer — Run multiple tracks simultaneously. Each track has its own input/output universe and protocol. Mix Art-Net and sACN freely.",
            "Filter — Channel mask lets you record or play only the addresses you need. Ranges, individual channels, or combinations."
        ],
        specs: {
            "Tracks": "32 simultaneous record/play",
            "Protocols": "Art-Net and sACN (E1.31), input & output",
            "Capture Rate": "44fps",
            "File Format": "Binary V3 — instant save & load",
            "Compression": "Skip-frame compression for static scenes",
            "Filtering": "Per-track channel mask (ranges, individual, combos)",
            "Trigger Modes": "Manual, threshold, or any-change",
            "Integration": "Full Q-SYS pin (UCI, GPIO, Show Controller)",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-03-01",
                changes: [
                    "Initial release",
                    "32-track Art-Net & sACN record/play",
                    "Binary V3 format with skip-frame compression",
                    "Per-track channel mask filtering",
                    "Full Q-SYS pin integration"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Do I need dedicated hardware to output physical DMX?",
                answer: "No dedicated recorder hardware is needed — LightForge runs natively on your Q-SYS Core. To convert Art-Net/sACN to physical DMX, pair it with any affordable Art-Net or sACN-to-DMX node."
            },
            {
                question: "How long does it take to save a 30-minute show?",
                answer: "Under one second. LightForge uses a binary V3 format with skip-frame compression for static scenes, making save and load virtually instant regardless of show length."
            },
            {
                question: "Can I mix Art-Net and sACN across different tracks?",
                answer: "Yes. Each of the 32 tracks has its own independent protocol, universe, and destination settings. You can freely mix Art-Net and sACN inputs and outputs across tracks."
            },
            {
                question: "How do I trigger playback from my show controller?",
                answer: "Every transport control (play, stop, record, scrub, etc.) is exposed as a Q-SYS pin. Wire them to UCI buttons, GPIO, Show Controller cues, or any third-party system via the Q-SYS control API."
            },
            {
                question: "Can I record only specific DMX channels?",
                answer: "Yes. The per-track channel mask filter lets you specify ranges, individual channels, or any combination — e.g. 1-50, 32,33,45, 1-10,20,30-40."
            }
        ]
    },
    {
        id: "showmind",
        pluginFileName: "showmind.qplugx",
        name: "SHOWMIND",
        tagline: "Professional show control engine for Q-SYS.",
        description: "Cue-based automation, multi-protocol actions, timecode sync, and a built-in web dashboard — all inside a single plugin.",
        longDescription: "ShowMind turns your Q-SYS Core into a full show control system. Build cue sequences with up to 8 actions per cue — each targeting a different protocol, device, or internal function. Fire cues manually, chase them against timecode, schedule them by time of day, or trigger them from incoming OSC, UDP, MIDI, RS-232, or webhooks.\n\nEvery device connection is managed through a resilient Device Abstraction Layer with automatic failover, heartbeat monitoring, and latency tracking. If a primary link goes down, ShowMind switches to the backup path and retries — no operator intervention needed.\n\nThe plugin ships with a built-in web dashboard accessible from any browser on the network. Full transport control, cue editing, device status, variable monitoring, and live timecode display — all rendered in a responsive dark interface with real-time SSE updates. No external software required.",
        price_cents: 45000,
        iconName: "Clapperboard",
        category: "show-control",
        tier: "mind",
        replaces: { device: "Medialon Manager", estimatedCost: "~3 000–5 000 €" },
        features: [
            "5 Timecode Modes — Manual, Internal (100Hz), External input, Time of Day, and SMPTE LTC Reader. Chase cues with frame-accurate sync.",
            "20 Action Types — Q-SYS, OSC, Resolume, MadMapper, Millumin, GrandMA3, ChamSys, UDP, TCP, HTTP, MIDI, PJLink, ArtNet, WoL, RS-232, GPIO, LightForge, Script, Variables, GoTo.",
            "Device Abstraction Layer — Primary + backup IP per device. Heartbeat checks, auto-failover, latency tracking, and exponential backoff retries.",
            "Web Dashboard — 10-tab responsive interface served over HTTP + SSE. Live transport, cue editor, device monitor, scheduler, log viewer, and LightForge bridge.",
            "Bidirectional Receivers — Listen for incoming OSC, UDP, MIDI, RS-232, and webhook messages. Map received values to variables and use them as cue conditions.",
            "LightForge Integration — Native bridge to BV Factory's LightForge DMX engine. Auto-discovers instances. Control tracks, transport, and scenes from cue actions.",
            "Scheduler & Events — Time-based rules with weekday, holiday, and calendar awareness. Event listeners that fire cues on variable conditions.",
            "Lock Mode & Dry Run — Lock prevents accidental edits during live shows. Dry Run traces cue execution without sending to devices."
        ],
        specs: {
            "Cues": "64 (configurable)",
            "Actions per Cue": "8",
            "Action Types": "20",
            "Timecode Modes": "5 (Manual, Internal 100Hz, External, ToD, SMPTE LTC)",
            "Dashboard Tabs": "10",
            "Internal TC Clock": "100Hz",
            "Receiver Protocols": "5 (OSC, UDP, MIDI, RS-232, Webhooks)",
            "Control Watcher Slots": "8",
            "Supported Targets": "Q-SYS, OSC, Resolume, MadMapper, Millumin, GrandMA3, ChamSys, UDP, TCP, HTTP, MIDI, PJLink, ArtNet, WoL, RS-232, GPIO, LightForge, Webhooks",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.7.0",
                date: "2025-03-01",
                changes: [
                    "Added LightForge native bridge with auto-discovery",
                    "New Scheduler with weekday/holiday/calendar rules",
                    "Event listeners with rising/falling edge and threshold conditions",
                    "Lock Mode and Dry Run for safe live operations"
                ]
            },
            {
                version: "v1.5.0",
                date: "2025-01-15",
                changes: [
                    "Web Dashboard expanded to 10 tabs with SSE real-time updates",
                    "Added MadMapper, Millumin, and ChamSys action types",
                    "Bidirectional receivers for MIDI and RS-232",
                    "Device Abstraction Layer with exponential backoff retries"
                ]
            },
            {
                version: "v1.0.0",
                date: "2024-10-01",
                changes: [
                    "Initial release",
                    "64-cue engine with 8 actions per cue",
                    "OSC, UDP, TCP, HTTP, Q-SYS, Resolume, GrandMA3 targets",
                    "Built-in web dashboard with live transport control",
                    "SMPTE LTC Reader and 5 timecode modes"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=2034"
        ],
        faq: [
            {
                question: "Do I need external software to use the web dashboard?",
                answer: "No. ShowMind serves the dashboard directly from the Q-SYS Core over HTTP with real-time SSE updates. Open any browser on the network, type the Core's IP, and you're in. Works on tablets, laptops, and phones."
            },
            {
                question: "How does the Device Abstraction Layer handle failures?",
                answer: "Each device can have a primary and backup IP. ShowMind performs continuous heartbeat checks, and if the primary link goes down, it automatically fails over to the backup path with exponential backoff retries. No operator intervention needed."
            },
            {
                question: "Can ShowMind control LightForge directly?",
                answer: "Yes. ShowMind includes a native LightForge bridge that auto-discovers LightForge instances in the Q-SYS design. You can control tracks, transport, and scenes directly from cue actions."
            },
            {
                question: "What is Dry Run mode?",
                answer: "Dry Run traces cue execution without actually sending commands to devices. It's designed for safe rehearsal — you can verify your cue sequence logic, timing, and conditions without any risk to connected equipment."
            },
            {
                question: "How many protocols and targets are supported?",
                answer: "ShowMind supports 20 action types including Q-SYS Controls, OSC, Resolume Arena, MadMapper, Millumin, GrandMA3, ChamSys, UDP, TCP, HTTP/REST, MIDI, PJLink, ArtNet, Wake-on-LAN, RS-232, GPIO, SMPTE LTC, LightForge DMX, Webhooks, and scripted variables."
            },
            {
                question: "Can I trigger cues from external systems?",
                answer: "Yes. ShowMind includes bidirectional receivers for OSC, UDP, MIDI, RS-232, and webhooks. Incoming messages can be mapped to variables and used as cue conditions or direct event triggers."
            }
        ]
    },
    {
        id: "iiyamabridge",
        pluginFileName: "iiyamabridge.qplugx",
        name: "IIYAMABRIDGE",
        tagline: "Iiyama IP control for Q-SYS — simple, reliable, free.",
        description: "Control Iiyama ProLite displays directly from Q-SYS over TCP/SICP. Power, input selection, volume, and status polling — no extra hardware, no extra software.",
        longDescription: "IiyamaBridge gives your Q-SYS system native IP control over Iiyama ProLite professional displays. Power on/off, input source selection, volume control, and continuous status polling — all through a single lightweight plugin.\n\nThe plugin communicates via Iiyama's SICP protocol over TCP port 5000. Every command is queued and retried automatically. If the connection drops, IiyamaBridge reconnects with exponential backoff. Wake-on-LAN support sends multi-packet WOL bursts to wake sleeping displays from the network.\n\nAll errors are wrapped in pcall for maximum reliability — a single unresponsive display never crashes the plugin or affects other instances. Status feedback integrates directly with Q-SYS Notifications, so your monitoring dashboard stays informed without any extra wiring.",
        price_cents: 0,
        iconName: "Monitor",
        category: "control",
        tier: "bridge",
        replaces: { device: "External display controller", estimatedCost: "~300–500 €" },
        compatibleBrands: [
            { name: "iiyama", logo: "/brands/iiyama.svg" },
        ],
        features: [
            "Wake-on-LAN — Multi-packet WOL bursts to reliably wake displays from standby, even across VLANs with directed broadcast.",
            "Power Control — Power on and off via SICP commands. Status feedback confirms actual power state.",
            "Source Selection — Switch between HDMI, DisplayPort, VGA, and other inputs with a single command.",
            "Status Polling — Continuous polling reports power state, current input, volume, and mute status back to Q-SYS.",
            "System Integration — All controls exposed as Q-SYS pins. Errors and warnings feed directly into Q-SYS Notifications."
        ],
        specs: {
            "Protocol": "SICP over TCP (port 5000)",
            "Wake-on-LAN": "Multi-packet UDP burst (port 9)",
            "Reconnection": "Exponential backoff with automatic retry",
            "Error Handling": "pcall wrapping — fault-isolated per instance",
            "Configuration": "IP Address, MAC Address, NIC Address (optional)",
            "Supported Displays": "Iiyama ProLite series with SICP support",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-06-01",
                changes: [
                    "Initial release",
                    "SICP power, input, and volume control",
                    "Wake-on-LAN with multi-packet burst",
                    "Status polling with Q-SYS Notifications integration",
                    "Exponential backoff reconnection"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Which Iiyama models are supported?",
                answer: "IiyamaBridge works with any Iiyama ProLite display that supports the SICP protocol over TCP (port 5000). This includes most professional-grade ProLite models. Check your display's documentation for SICP/LAN control support."
            },
            {
                question: "How does Wake-on-LAN work across VLANs?",
                answer: "IiyamaBridge sends multi-packet WOL bursts via UDP port 9. For cross-VLAN wake, configure a directed broadcast on your network switch or specify the NIC Address in the plugin configuration to target the correct subnet."
            },
            {
                question: "What happens if a display goes offline?",
                answer: "The plugin automatically detects lost connections and reconnects with exponential backoff. All errors are pcall-wrapped, so one unresponsive display never affects other instances or the Q-SYS Core."
            },
            {
                question: "Why does a free plugin still require a license?",
                answer: "The license ensures your plugin version is registered and tied to a specific Core for support tracking and update notifications. The license is free — just enter your Core ID and you'll receive your activation code instantly."
            },
            {
                question: "Can I control multiple displays from one Core?",
                answer: "Yes. Add one IiyamaBridge instance per display in your Q-SYS design. Each instance is independently configured with its own IP, MAC, and fault isolation."
            }
        ]
    },
    {
        id: "webbridge",
        pluginFileName: "webbridge.qplugx",
        name: "WEBBRIDGE",
        tagline: "Control your Q-SYS Named Controls from any browser.",
        description: "Turn your Q-SYS Core into a lightweight web server. Open a URL from any device on the network and get instant access to your Named Controls — faders, buttons, text fields — all synced in real time.",
        longDescription: "WebBridge is a fully self-contained Q-SYS plugin that turns your Core into a lightweight web server. Open http://<core-ip>:8234 from any device on the network and get instant access to your Named Controls through a clean, responsive interface.\n\nDrop the plugin into your design, deploy, and open the URL. The embedded web app connects automatically over WebSocket for real-time, bidirectional sync. Faders, buttons, text fields — everything updates live across all connected clients. No app to install, no external server to run.\n\nHTML, CSS, and JavaScript are embedded directly in the plugin — zero external dependencies. The BV Factory dark UI includes search, grouping, and grid/list views for quick navigation across large control sets. A read-only prefix lets you expose monitoring controls without risk of accidental changes.",
        price_cents: 5000,
        iconName: "Globe",
        category: "uci",
        tier: "bridge",
        features: [
            "Zero Dependencies — HTML, CSS, and JS are embedded directly in the plugin. No external server, no app to install, no configuration files.",
            "Real-Time WebSocket — Bidirectional sync on a single port. Every fader move, button press, and text change updates live across all connected clients.",
            "Auto-Discovery — Named Controls are discovered automatically via pin wiring or a comma-separated list in plugin properties.",
            "Multi-Control Types — Supports faders, toggles, text inputs, and triggers out of the box. Controls render automatically based on their Q-SYS type.",
            "Read-Only Prefix — Protect sensitive controls from accidental changes by adding a prefix. Read-only controls are visible but not editable.",
            "Multi-Client — Up to 20 simultaneous browser connections. Each client sees the same state in real time.",
            "BV Factory Dark UI — Clean, responsive interface with search, grouping, and grid/list views. Works on phones, tablets, and laptops.",
            "30-Second Setup — Add the plugin, wire your controls, push to Core, open the URL. Done."
        ],
        specs: {
            "Protocol": "HTTP + WebSocket (port 8234)",
            "Max Clients": "20 simultaneous connections",
            "Control Types": "Faders, toggles, text inputs, triggers",
            "Discovery": "Pin wiring or comma-separated Named Control list",
            "Access Control": "Read-only prefix for protected controls",
            "UI": "Dark theme — search, grouping, grid/list views",
            "Dependencies": "None — fully self-contained",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-06-01",
                changes: [
                    "Initial release",
                    "Embedded HTTP + WebSocket server",
                    "Auto-discovery of Named Controls",
                    "Fader, toggle, text input, and trigger support",
                    "Read-only prefix, search, grouping, grid/list views",
                    "Up to 20 simultaneous clients"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2015"
        ],
        faq: [
            {
                question: "Do I need to install anything on client devices?",
                answer: "No. WebBridge serves a fully embedded web app directly from the Q-SYS Core. Just open http://<core-ip>:8234 in any modern browser — Chrome, Safari, Firefox, Edge — on any device. Nothing to install."
            },
            {
                question: "How are Named Controls discovered?",
                answer: "Two options: wire Named Controls directly to the plugin's input pins in Q-SYS Designer, or list them as a comma-separated string in the plugin properties. Both methods auto-populate the web interface."
            },
            {
                question: "Can I prevent users from changing certain controls?",
                answer: "Yes. Any Named Control with the read-only prefix (configurable in plugin properties) will appear in the web interface but cannot be modified. Ideal for monitoring values like levels, status, or temperatures."
            },
            {
                question: "How many clients can connect at the same time?",
                answer: "Up to 20 simultaneous browser connections. All clients see the same real-time state — a fader moved on one device updates instantly on all others via WebSocket."
            },
            {
                question: "Does it work on mobile?",
                answer: "Yes. The interface is fully responsive with touch-friendly faders and buttons. Works on any modern mobile browser — iOS Safari, Android Chrome, etc."
            }
        ]
    },
    {
        id: "avaccessbridge",
        pluginFileName: "avaccessbridge.qplugx",
        name: "AVACCESSBRIDGE",
        tagline: "AV-over-IP matrix control for Q-SYS — route, discover, display.",
        description: "Take full control of your AV Access 4KIP200 encoder/decoder system directly from Q-SYS. Matrix routing, auto-discovery, display control, video walls, and OSD overlays — all from a single plugin.",
        longDescription: "AVAccessBridge connects to AV Access 4KIP200E encoders and 4KIP200D decoders over Telnet and lets you route any source to any display — all from a single Q-SYS plugin. No external control software needed.\n\nThe plugin features automatic device discovery via UDP broadcast. Plug in your devices and they appear automatically — encoder and decoder slots fill in as units come online. Matrix routing gives you one-click source selection per decoder with instant visual feedback, so you see at a glance which encoder feeds which decoder.\n\nBeyond routing, AVAccessBridge handles display power via CEC or RS232, video wall configuration with per-decoder positioning and rotation, OSD text overlays, RS232 pass-through in ASCII or hex mode, and full per-device management including HDCP, resolution, color space, firmware readback, reboot, and factory reset. Every control is exposed as a UserPin for integration with Q-SYS UCI, GPIO, scripting, and BV Factory's ShowMind. The Telnet engine features IAC negotiation stripping, a login state machine, command queuing with timeout protection, automatic reconnection, and shell injection prevention — designed to run unattended 24/7.",
        price_cents: 1000,
        iconName: "Tv",
        category: "video",
        tier: "bridge",
        replaces: { device: "AV Access control software", estimatedCost: "~500 €" },
        compatibleBrands: [
            { name: "AV Access", logo: "/brands/avaccess.svg" },
        ],
        features: [
            "Matrix Routing — One-click source selection per decoder with instant visual feedback. See at a glance which encoder feeds which decoder.",
            "Auto-Discovery — UDP broadcast discovery on ports 3335/3336. Plug in devices and they appear automatically in encoder/decoder slots.",
            "Display Control — Power displays on/off via CEC or RS232 with configurable presets per decoder. Send custom CEC commands for full integration.",
            "Video Wall — Standard grid video walls with per-decoder row/column position. Supports rotation (0°/90°/180°/270°) and custom video cropping for mosaic layouts.",
            "RS232 Pass-Through — Send serial commands to any device connected to a decoder's RS232 port. Supports ASCII and hex modes.",
            "OSD Overlay — Display translucent text overlays on any decoder output. Useful for room labels, source identification, or dynamic signage.",
            "Per-Device Management — Alias, HDCP toggle, forced resolution, color space selection, firmware readback, reboot, and factory reset — all per unit.",
            "Built for Reliability — Telnet engine with IAC negotiation, login state machine, command queuing, timeout protection, auto-reconnect, and shell injection prevention. Runs 24/7."
        ],
        specs: {
            "Protocol": "Telnet (port 24) + UDP discovery (3335/3336)",
            "Supported Hardware": "4KIP200E, 4KIP200D, 4KIP204E, 4KIP200M, HDIP100E, HDIP100D",
            "Display Control": "CEC + RS232 with configurable presets",
            "Video Wall": "Grid layout with rotation (0°/90°/180°/270°) and cropping",
            "RS232": "ASCII and hex modes via decoder pass-through",
            "OSD": "Translucent text overlay per decoder output",
            "Integration": "Q-SYS UserPin (UCI, GPIO, scripting, ShowMind)",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-06-01",
                changes: [
                    "Initial release",
                    "Matrix routing with visual feedback",
                    "UDP auto-discovery for encoders and decoders",
                    "CEC and RS232 display control",
                    "Video wall with rotation and cropping",
                    "OSD overlay, RS232 pass-through, per-device management"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=2059"
        ],
        faq: [
            {
                question: "Which AV Access models are supported?",
                answer: "AVAccessBridge supports the 4KIP200E encoder, 4KIP200D decoder, 4KIP204E, 4KIP200M, HDIP100E, and HDIP100D. Any AV Access device using the same Telnet command set should work."
            },
            {
                question: "How does auto-discovery work?",
                answer: "The plugin sends UDP broadcast packets on ports 3335 and 3336. AV Access devices on the network respond with their identity, and the plugin automatically fills in encoder and decoder slots as units come online."
            },
            {
                question: "Can I control displays through the decoders?",
                answer: "Yes. AVAccessBridge supports display power on/off via CEC or RS232 with configurable presets per decoder. You can also send custom CEC commands for advanced display integration."
            },
            {
                question: "Does it support video walls?",
                answer: "Yes. Set up standard grid video walls with per-decoder row/column position. Each decoder supports rotation (0°, 90°, 180°, 270°) and custom video cropping for mosaic layouts."
            },
            {
                question: "How reliable is it for permanent installations?",
                answer: "Very. The Telnet engine includes IAC negotiation stripping, a login state machine, command queuing with timeout protection, automatic reconnection, and shell injection prevention. It's designed to run unattended 24/7 without intervention."
            }
        ]
    },
    {
        id: "melcloudbridge",
        pluginFileName: "melcloudbridge.qplugx",
        name: "MELCLOUDBRIDGE",
        tagline: "Mitsubishi HVAC control for Q-SYS — cloud-connected, zero hardware.",
        description: "Control up to 64 Mitsubishi Electric air conditioning units directly from Q-SYS via the MELCloud platform. Power, mode, temperature, fan speed, vane position — all per unit, all as Control Pins.",
        longDescription: "MelCloudBridge connects to Mitsubishi's MELCloud REST API and brings full control of your air-to-air heat pumps into Q-SYS Designer. Drop the plugin, enter your MELCloud credentials, and your HVAC units show up automatically. No extra hardware, no gateway.\n\nPower on/off, operation mode (heat, cool, dry, fan, auto), target temperature (16–31°C), fan speed (auto + 5 levels), and both horizontal and vertical vane positions — all controllable per unit, all exposed as Control Pins for integration with any Q-SYS workflow. Room temperature and outdoor temperature monitoring are included for each unit.\n\nThe plugin supports up to 64 units across 8 paginated pages with automatic device discovery from your MELCloud account. Rate-limited polling (configurable 30–300s) keeps you within MELCloud API limits. A card-based UI with color-coded mode buttons gives operators instant visual feedback.\n\nMelCloudBridge uses Mitsubishi's unofficial REST API — the same one used by the MELCloud app and third-party integrations like Home Assistant. Tested on live installations but not affiliated with or endorsed by Mitsubishi Electric.",
        price_cents: 3000,
        iconName: "Thermometer",
        category: "control",
        tier: "bridge",
        replaces: { device: "MELCloud web interface + custom scripts", estimatedCost: "~200–400 €" },
        compatibleBrands: [
            { name: "Mitsubishi Electric", logo: "/brands/mitsubishi.svg" },
        ],
        features: [
            "64-Unit Capacity — Up to 64 units across 8 paginated pages, with automatic device discovery from your MELCloud account.",
            "Full Per-Unit Control — Power on/off, operation mode (heat, cool, dry, fan, auto), target temperature (16–31°C), fan speed (auto + 5 levels), vane direction.",
            "Temperature Monitoring — Room temperature and outdoor temperature readback per unit, updated on every polling cycle.",
            "Q-SYS Pin Integration — All controls exposed as UserPins for Show Controller, GPIO, UCI, scripting, and BV Factory ShowMind integration.",
            "Rate-Limited Polling — Configurable polling interval (30–300s) to stay within MELCloud API limits. Prevents account lockout.",
            "Card-Based UI — Color-coded mode buttons and per-unit status cards for instant visual feedback in Q-SYS Designer.",
            "Auto-Discovery — Enter your MELCloud credentials and the plugin discovers all registered units automatically. No manual IP configuration.",
            "Cloud-Connected — Works over standard HTTPS. No gateway hardware, no local API, no port forwarding. Just internet access from the Core."
        ],
        specs: {
            "Protocol": "MELCloud REST API over HTTPS",
            "Max Units": "64 (8 pages × 8 units)",
            "Control": "Power, mode, temperature (16–31°C), fan speed, vane H/V",
            "Monitoring": "Room temperature, outdoor temperature per unit",
            "Polling": "Configurable 30–300s with rate limiting",
            "Compatibility": "MELCloud-compatible Mitsubishi Electric indoor units with Wi-Fi adapter",
            "Integration": "Q-SYS UserPin (UCI, GPIO, Show Controller, scripting, ShowMind)",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-06-01",
                changes: [
                    "Initial release",
                    "MELCloud REST API integration with auto-discovery",
                    "Full HVAC control: power, mode, temperature, fan, vanes",
                    "Room and outdoor temperature monitoring",
                    "Rate-limited polling (30–300s configurable)",
                    "Card-based UI with color-coded mode buttons"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Do I need a gateway or additional hardware?",
                answer: "No. MelCloudBridge connects directly to the MELCloud cloud platform over HTTPS. All you need is a Q-SYS Core with internet access and a MELCloud account with registered Wi-Fi-enabled units."
            },
            {
                question: "Which Mitsubishi units are supported?",
                answer: "Any Mitsubishi Electric indoor unit registered on MELCloud with a Wi-Fi adapter. This includes the full range of air-to-air heat pumps compatible with the MELCloud platform."
            },
            {
                question: "Is this an official Mitsubishi integration?",
                answer: "No. MelCloudBridge uses Mitsubishi's unofficial REST API — the same one used by the MELCloud mobile app and third-party integrations like Home Assistant. It has been tested on live installations but is not affiliated with or endorsed by Mitsubishi Electric."
            },
            {
                question: "How often does the plugin poll for updates?",
                answer: "Polling interval is configurable between 30 and 300 seconds. Rate limiting is built in to prevent exceeding MELCloud API limits and avoid account lockout."
            },
            {
                question: "Can I integrate HVAC control with my show control system?",
                answer: "Yes. All controls are exposed as Q-SYS UserPins. Wire them to Show Controller, GPIO, UCI buttons, scripting, or BV Factory's ShowMind for automated HVAC scheduling based on events, time of day, or occupancy."
            }
        ]
    },
    {
        id: "madbridge",
        pluginFileName: "madbridge.qplugx",
        name: "MADBRIDGE",
        tagline: "MadMapper control for Q-SYS — surfaces, scenes, cues, all via OSC.",
        description: "Control MadMapper directly from Q-SYS over OSC. Surfaces, scenes, cues, master controls, and preset store/recall — up to 4 instances from a single plugin.",
        longDescription: "MadBridge talks to MadMapper over the network using OSC (UDP). You get hands-on control of surface visibility, opacity, and media selection. Trigger scenes and cues from a grid, navigate columns, and manage master intensity, fade to black, and BPM — without leaving Q-SYS Designer or your UCI.\n\nUp to 32 surfaces are available, each with opacity, visibility, media number, and solo controls. The scene and cue grid supports up to 32 columns and 16 rows. Logical cues let you name a cue, assign it a column/row, and fire it with a single GO.\n\nPreset store/recall snapshots and restores your entire state. Bidirectional feedback from MadMapper keeps Q-SYS controls in sync at all times. The plugin supports up to 4 independent MadMapper instances, so you can control multiple projection mapping rigs from one Core. All controls are exposed as UserPins for integration with ShowMind, UCI, GPIO, or any Q-SYS control workflow.",
        price_cents: 1500,
        iconName: "Layers",
        category: "video",
        tier: "bridge",
        compatibleBrands: [
            { name: "MadMapper", logo: "/brands/madmapper.svg" },
        ],
        features: [
            "32 Surfaces — Opacity, visibility, media number, and solo per surface. Full control over your MadMapper surface stack.",
            "Scene & Cue Grid — Up to 32 columns and 16 rows. Navigate, trigger, and sequence scenes from Q-SYS.",
            "Logical Cues — Name a cue, assign it a column/row, and fire it with a single GO command. Simple show programming.",
            "Master Controls — Master intensity, fade to black (knob + one-touch button), and BPM control.",
            "Preset Store/Recall — Snapshot and restore your entire MadMapper state from Q-SYS. Recall presets from Show Controller cues.",
            "Bidirectional Feedback — MadMapper state is reflected in Q-SYS controls in real time. What you see is what MadMapper sees.",
            "Multi-Instance — Up to 4 independent MadMapper instances from one plugin. Control multiple projection rigs from one Core.",
            "Full Pin Integration — All controls exposed as UserPins for ShowMind, UCI, GPIO, scripting, or any Q-SYS workflow."
        ],
        specs: {
            "Protocol": "OSC over UDP (default ports 8010/8011)",
            "Surfaces": "32 with opacity, visibility, media, solo",
            "Cue Grid": "32 columns × 16 rows",
            "Instances": "Up to 4 independent MadMapper connections",
            "Master": "Intensity, fade to black, BPM",
            "Presets": "Store/recall full state snapshots",
            "Feedback": "Bidirectional OSC sync",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-06-01",
                changes: [
                    "Initial release",
                    "32 surfaces with full OSC control",
                    "Scene/cue grid (32×16) with logical cues",
                    "Master intensity, fade to black, BPM",
                    "Preset store/recall",
                    "Up to 4 MadMapper instances"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1550305080-4e029753abcf?auto=format&fit=crop&q=80&w=2071",
            "https://images.unsplash.com/photo-1618609378039-b572f64c5b42?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Does MadBridge require a specific MadMapper version?",
                answer: "MadBridge works with any version of MadMapper that supports OSC control. OSC is enabled by default on ports 8010 (send) and 8011 (receive). No additional MadMapper configuration is needed."
            },
            {
                question: "Can I control multiple MadMapper machines?",
                answer: "Yes. MadBridge supports up to 4 independent MadMapper instances from a single plugin. Each instance has its own IP, port, and full set of controls."
            },
            {
                question: "How do logical cues work?",
                answer: "You name a cue, assign it a column and row in the MadMapper scene/cue grid, and fire it with a single GO command. This simplifies show programming — your operators see cue names instead of grid coordinates."
            },
            {
                question: "Is the feedback real-time?",
                answer: "Yes. MadBridge maintains bidirectional OSC communication. When something changes in MadMapper (a scene triggers, opacity changes, etc.), the Q-SYS controls update immediately."
            },
            {
                question: "Can I integrate MadBridge with ShowMind?",
                answer: "Yes. All MadBridge controls are exposed as UserPins, and ShowMind includes a native MadMapper action type. You can trigger surfaces, scenes, and presets directly from ShowMind cue actions."
            }
        ]
    },
    {
        id: "resolumebridge",
        pluginFileName: "resolumebridge.qplugx",
        name: "RESOLUMEBRIDGE",
        tagline: "Resolume Arena control for Q-SYS — clean REST API, no middleware.",
        description: "Control Resolume Arena directly from Q-SYS over its built-in REST API. Layers, clips, columns, composition master — real-time bidirectional sync with auto-reconnect.",
        longDescription: "ResolumeBridge polls your Arena instance over its built-in REST API and maps the composition state to Q-SYS controls in real time. Trigger clips, manage layers, adjust opacity and volume, fire columns — all from native Q-SYS controls that integrate seamlessly with your show control workflow.\n\nLayer controls include opacity, volume, solo, bypass, clear, and blend mode readback. Clip triggering includes connection state feedback (Empty, Disconnected, Connected, Previewing). Column triggers enable scene-based workflows. Thumbnail URLs are exposed per clip for external display.\n\nComposition-level controls cover master fader, speed, and crossfader, plus undo/redo. Logical cues simplify show programming, and preset store/recall lets you snapshot and restore state. The plugin supports up to 4 Arena servers with auto-reconnect watchdog, latency tracking, and error monitoring.\n\nUses Resolume Arena's REST API (port 8080 by default). Requires Arena 7.x or later. Audio volume is normalized from Resolume's native dB scale to a 0–1 knob range. Configurable polling rate (100–5000 ms). No additional software or network configuration needed beyond IP connectivity.",
        price_cents: 1500,
        iconName: "Film",
        category: "video",
        tier: "bridge",
        compatibleBrands: [
            { name: "Resolume Arena", logo: "/brands/resolume.svg" },
        ],
        features: [
            "Layer Control — Opacity, volume, solo, bypass, clear, and blend mode readback per layer. Full hands-on layer management.",
            "Clip Triggering — Trigger clips with connection state feedback: Empty, Disconnected, Connected, Previewing. Thumbnail URLs per clip.",
            "Column Triggers — Fire entire columns for scene-based workflows. One-click scene changes from Q-SYS.",
            "Composition Master — Master fader, speed, crossfader, undo/redo. Top-level composition control from your Core.",
            "Logical Cues — Name-based cue system for simple show programming. Map cues to clips, columns, or any control action.",
            "Preset Store/Recall — Snapshot and restore your Resolume state. Recall presets from ShowMind or Show Controller.",
            "Multi-Instance — Up to 4 Arena servers from one plugin. Auto-reconnect watchdog with latency and error monitoring.",
            "REST API — Clean HTTP communication, no OSC, no middleware. Configurable polling (100–5000 ms). Arena 7.x+."
        ],
        specs: {
            "Protocol": "Resolume Arena REST API (HTTP, port 8080)",
            "Polling": "Configurable 100–5000 ms",
            "Instances": "Up to 4 Arena servers",
            "Layer Controls": "Opacity, volume, solo, bypass, clear, blend mode",
            "Clip States": "Empty, Disconnected, Connected, Previewing",
            "Composition": "Master fader, speed, crossfader, undo/redo",
            "Volume Normalization": "dB (−192..0) → 0–1 knob range",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-06-01",
                changes: [
                    "Initial release",
                    "Layer control with opacity, volume, solo, bypass, clear",
                    "Clip triggering with state feedback and thumbnails",
                    "Column triggers for scene-based workflows",
                    "Composition master, crossfader, undo/redo",
                    "Up to 4 Arena instances with auto-reconnect"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Why REST API instead of OSC?",
                answer: "Resolume Arena's REST API provides richer state feedback than OSC — including clip connection states, thumbnail URLs, blend modes, and full composition structure. It requires no additional configuration beyond enabling the web server in Arena."
            },
            {
                question: "Which Resolume versions are supported?",
                answer: "ResolumeBridge requires Resolume Arena 7.x or later with the REST API (web server) enabled. The default port is 8080."
            },
            {
                question: "How fast is the polling?",
                answer: "Configurable from 100 ms to 5000 ms. At 100 ms you get near-real-time feedback. Higher intervals reduce network traffic for less time-critical installations."
            },
            {
                question: "Can I control multiple Arena servers?",
                answer: "Yes. ResolumeBridge supports up to 4 independent Arena instances. Each has its own IP, polling rate, auto-reconnect watchdog, and full set of controls."
            },
            {
                question: "How does volume normalization work?",
                answer: "Resolume uses a dB scale (−192 to 0 dB) for audio volume. ResolumeBridge normalizes this to a 0–1 knob range for Q-SYS, so you can wire it directly to faders and UCI sliders without conversion."
            }
        ]
    },
    {
        id: "soundforge",
        pluginFileName: "soundforge.qplugx",
        name: "SOUNDFORGE",
        tagline: "64-track audio playback engine for Q-SYS — shows, themes, immersion.",
        description: "Multitrack audio playback with scene management, crossfades, ducking, condition engine, and timecode sync. Built for themed entertainment, immersive experiences, and live shows.",
        longDescription: "SoundForge is a powerful multitrack audio playback plugin for Q-SYS Designer. Built for themed entertainment, immersive experiences, and live shows, it gives you up to 64 independent audio tracks with full transport control, scene management, and adaptive playback — all inside a single plugin block.\n\nEach track gets Play, Stop, Pause, Loop, Volume, Mute, and Solo. Attack and release fades provide automatic fade-in on Play and fade-out on Stop/Pause (0–60s per track). Per-track ducking with independent attack/release and trim level lets background audio step aside when foreground audio plays. Loop gap adds a configurable delay before loop restart — up to 24 hours.\n\nThe condition engine triggers playback based on variables, time of day, or track states with AND/OR/NOT logic. Crossfades smooth transitions between tracks or scenes with 6 fade curves: Linear, −3dB, −6dB, Log, S-Curve, and Equal Power. The scene system stores and recalls up to 64 snapshots with crossfade transitions.\n\nSoundForge is the audio pillar of the BV Factory ecosystem. It connects natively to ShowMind (variable sync) and LightForge (transport sync). A TCP API on port 9910 provides full remote control via simple text commands. JSON show file save/load, paginated UI, track grouping, and pin-level access to every control round out the feature set.",
        price_cents: 5000,
        iconName: "Music",
        category: "audio",
        tier: "forge",
        replaces: { device: "Dedicated multitrack player", estimatedCost: "~800–1 500 €" },
        features: [
            "64 Tracks — Per-track Play, Stop, Pause, Loop, Volume, Mute & Solo. Configurable audio outputs (1–64 channels per track), fully routable in Q-SYS.",
            "Scene System — Store & recall up to 64 snapshots with crossfade transitions. JSON show file save/load for portable scene management.",
            "Attack & Release Fades — Automatic fade-in on Play, fade-out on Stop/Pause per track (0–60s). Smooth, professional transitions without scripting.",
            "Ducking — Per-track volume ducking with independent attack/release timing and trim level. Background audio steps aside automatically.",
            "Condition Engine — Trigger playback based on variables, time of day, or track states. AND/OR/NOT logic for complex automation scenarios.",
            "Crossfades — 6 fade curves: Linear, −3dB, −6dB, Log, S-Curve, Equal Power. Smooth transitions between tracks or scenes.",
            "Timecode Support — Internal, External, LTC, MTC, and Time of Day modes. Sync audio playback to your show timeline.",
            "Ecosystem Integration — Native bridge to ShowMind (variable sync) and LightForge (transport sync). TCP API on port 9910 for external control."
        ],
        specs: {
            "Tracks": "64 independent audio tracks",
            "Scenes": "64 snapshots with crossfade transitions",
            "Fade Curves": "6 (Linear, −3dB, −6dB, Log, S-Curve, Equal Power)",
            "Attack/Release": "0–60s per track",
            "Loop Gap": "0–24h configurable delay",
            "Timecode": "Internal, External, LTC, MTC, Time of Day",
            "TCP API": "Port 9910 — full remote control via text commands",
            "Audio Outputs": "1–64 channels per track, routable in Q-SYS",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-06-01",
                changes: [
                    "Initial release",
                    "64-track audio playback with full transport control",
                    "Scene system with 64 snapshots and crossfade transitions",
                    "Attack/release fades, ducking, loop gap",
                    "Condition engine with AND/OR/NOT logic",
                    "6 crossfade curves, timecode support (5 modes)",
                    "ShowMind and LightForge native integration",
                    "TCP API on port 9910"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "How many audio tracks can I run simultaneously?",
                answer: "Up to 64 independent tracks, each with its own transport controls, volume, fades, ducking, and audio output routing. Actual simultaneous playback depends on your Core's processing capacity and audio file complexity."
            },
            {
                question: "How do crossfades work between scenes?",
                answer: "When you recall a scene, SoundForge crossfades from the current state to the new snapshot using your selected fade curve. Six curves are available: Linear, −3dB, −6dB, Log, S-Curve, and Equal Power. Crossfade duration is configurable per transition."
            },
            {
                question: "What is the condition engine?",
                answer: "The condition engine lets you trigger playback based on variables, time of day, or the state of other tracks. Conditions support AND/OR/NOT logic, so you can build complex automation scenarios — e.g., play track 5 when track 1 is stopped AND it's after 18:00."
            },
            {
                question: "How does SoundForge integrate with ShowMind and LightForge?",
                answer: "SoundForge connects natively to ShowMind via variable sync — ShowMind can read track states and trigger cues based on audio events. LightForge integration provides transport sync, so DMX playback follows audio playback timing."
            },
            {
                question: "Can I control SoundForge from external systems?",
                answer: "Yes. The TCP API on port 9910 accepts simple text commands for full remote control. Additionally, every control is exposed as a Q-SYS pin for integration with UCI, GPIO, scripting, or any external control system."
            },
            {
                question: "What audio formats are supported?",
                answer: "SoundForge uses Q-SYS native audio file support. WAV files are recommended for professional use. Files are loaded from the Core's media storage and played back through the Q-SYS audio routing matrix."
            }
        ]
    },
    {
        id: "huebridge",
        pluginFileName: "huebridge.qplugx",
        name: "HUEBRIDGE",
        tagline: "Philips Hue control for Q-SYS — local, reliable, simple.",
        description: "Control your Philips Hue lights and scenes straight from Q-SYS. Per-light brightness, scene recall, master controls, and auto-discovery — all via the local Hue Bridge API.",
        longDescription: "HueBridge connects to your Philips Hue Bridge via its local REST API and gives you direct control over every light and scene. Toggle lights on/off, adjust brightness per fixture, recall any Hue scene with a custom intensity level — all from within your Q-SYS design. A master section lets you turn everything on or off and set a global brightness in one click.\n\nThe plugin auto-discovers all lights and scenes from your bridge. Each light shows a reachability indicator so you know instantly if a fixture is offline. An adjustable poll rate with automatic reconnection on timeout keeps the system reliable for permanent installations.\n\nSetup takes 30 seconds: the plugin includes a step-by-step guide right in the layout. Open your bridge's debug page, press the link button, POST one line, and paste the username. Toggle Connect and your lights appear. No cloud, no middleware, no complexity — just reliable local HTTP control.\n\nAll controls are exposed as UserPins for integration with ShowMind, UCI, GPIO, Show Controller, or any Q-SYS workflow. Local HTTP only — no internet required after initial pairing.",
        price_cents: 1000,
        iconName: "Lightbulb",
        category: "lighting",
        tier: "bridge",
        replaces: { device: "IoT lighting gateway", estimatedCost: "~200–400 €" },
        compatibleBrands: [
            { name: "Philips Hue", logo: "/brands/philips.svg" },
        ],
        features: [
            "Per-Light Control — On/off toggle and brightness fader per light. Direct control over every Hue fixture from Q-SYS.",
            "Scene Recall — Trigger any Hue scene with adjustable intensity at recall time. Smooth scene transitions.",
            "Master Controls — All-on, all-off, and global brightness in one click. Quick top-level control for operators.",
            "Auto-Discovery — Lights and scenes are discovered automatically from the Hue Bridge. No manual fixture listing.",
            "Reachability Indicator — Per-light status shows whether each fixture is online and reachable. Instant awareness of offline lights.",
            "Watchdog & Reconnect — Adjustable poll rate with automatic reconnection on timeout. Designed for always-on installations.",
            "Built-In Setup Guide — Step-by-step pairing instructions right in the plugin layout. Bridge pairing in 30 seconds.",
            "Full Pin Integration — All controls exposed as UserPins for ShowMind, UCI, GPIO, Show Controller, and scripting."
        ],
        specs: {
            "Protocol": "Philips Hue local REST API (HTTP)",
            "Lights": "Up to 63 (configurable via properties)",
            "Scenes": "Up to 64 (configurable via properties)",
            "Network": "Local HTTP only — no internet required after pairing",
            "Reconnection": "Watchdog with automatic reconnect on timeout",
            "Format": "Lua 5.1 / .qplug — single file, no dependencies",
            "Integration": "Q-SYS UserPin (UCI, GPIO, Show Controller, ShowMind)",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2025-06-01",
                changes: [
                    "Initial release",
                    "Per-light on/off and brightness control",
                    "Scene recall with adjustable intensity",
                    "Master all-on/all-off and global brightness",
                    "Auto-discovery of lights and scenes",
                    "Watchdog with auto-reconnect",
                    "Built-in setup guide"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Does it require internet access?",
                answer: "Only for initial pairing with the Hue Bridge. After that, HueBridge communicates entirely over your local network via the Hue Bridge's REST API. No cloud, no internet required."
            },
            {
                question: "How do I pair with my Hue Bridge?",
                answer: "The plugin includes a built-in setup guide. In short: open your bridge's debug page, press the physical link button on the bridge, POST a single line to create a username, and paste it into the plugin. Toggle Connect and your lights appear."
            },
            {
                question: "How many lights and scenes can it handle?",
                answer: "Up to 63 lights and 64 scenes, configurable in the plugin properties. These limits cover the maximum capacity of a standard Philips Hue Bridge."
            },
            {
                question: "Can I trigger Hue scenes from ShowMind?",
                answer: "Yes. All controls — including scene triggers with adjustable intensity — are exposed as UserPins. ShowMind can fire scene recalls directly from cue actions."
            },
            {
                question: "What happens if a light goes offline?",
                answer: "Each light has a reachability indicator. If a fixture is unreachable, the indicator updates on the next poll cycle. The plugin continues controlling all other lights without interruption."
            }
        ]
    },
    {
        id: "timeforge",
        pluginFileName: "timeforge.qplugx",
        name: "TIMEFORGE",
        tagline: "Master time — timecode, timers, scheduling, astronomy.",
        description: "Professional timecode generator, astronomical clock, multi-mode timers, and event scheduler for Q-SYS. Art-Net TC, MTC, LTC output — all in one plugin.",
        longDescription: "TimeForge is a professional time management plugin for Q-SYS that combines four essential modules in a single component: a frame-accurate timecode generator, an astronomical clock, multi-mode timers, and an event scheduler.\n\nThe timecode generator supports all standard frame rates (23.976 to 30 fps) plus non-standard rates up to 1000 fps on the internal bus. Output simultaneously via Art-Net Timecode, MTC (RTP-MIDI/AppleMIDI), and LTC audio — with up to 16 cue points positioned on the timeline for frame-accurate triggering.\n\nThe astronomical clock computes sunrise, sunset, civil/nautical/astronomical dawn and dusk using NOAA solar algorithms. Configure your latitude, longitude, UTC offset, and DST mode — then trigger events on solar positions with per-event offsets up to ±120 minutes.\n\nSixteen independent timers run in countdown, countup, or recurring mode at 10 Hz update rate. The scheduler adds 16 daily, weekly, or date-specific event slots with anti-double-trigger protection. Every control is exposed as a Q-SYS pin for integration with ShowMind, UCI, GPIO, or any external system.\n\nAll timing is anchored to a monotonic high-resolution clock (Timer.Now) with automatic fallback — zero drift, no accumulated errors, frame-accurate precision across all modules.",
        price_cents: 25000,
        iconName: "Timer",
        category: "show-control",
        tier: "forge",
        replaces: { device: "Dedicated timecode server", estimatedCost: "~1 000–2 000 €" },
        features: [
            "Timecode Generator — Frame-accurate SMPTE timecode with full transport (play, pause, stop, loop, seek). Supports 23.976 to 30 fps standard rates plus 50–1000 fps on internal bus.",
            "Multi-Protocol Output — Simultaneous Art-Net Timecode (UDP 6454), LTC audio via Q-SYS SMPTE LTC Encoder, and MTC via RTP-MIDI/AppleMIDI (beta — currently in active development, not guaranteed on all systems/networks). Unicast or broadcast.",
            "Cue Points — 16 configurable cue points positioned at HH:MM:SS:FF on the timecode timeline. Momentary trigger on traversal with 30-event history.",
            "Astronomical Clock — Real-time solar position calculations (NOAA/Jean Meeus). Sunrise, sunset, civil/nautical/astronomical dawn & dusk, solar noon, day length.",
            "Solar Triggers — 5 programmable astronomical events (sunrise, sunset, civil dawn/dusk, solar noon) with ±120 minute offsets. Configurable lat/lon, UTC, and DST.",
            "Timers — 16 independent timers in countdown, countup, or recurring mode. 10 Hz refresh, lap tracking, next-trigger wall-clock display.",
            "Scheduler — 16 daily, weekly, or date-specific event slots. Per-event enable, anti-double-trigger protection, 50-event history.",
            "Export/Import — Full JSON configuration backup (.tfconfig). Auto-restore after reboot with preserved playback state."
        ],
        specs: {
            "Modules": "4 (Timecode, Astronomical Clock, Timers, Scheduler)",
            "Frame Rates": "23.976, 24, 25, 29.97 DF, 30 (standard) — 50, 59.94, 60, 100, 120, 240, 1000 fps (internal bus)",
            "Protocols": "Art-Net Timecode (UDP 6454), MTC (RTP-MIDI, ports 5004-5005), LTC (SMPTE audio)",
            "Cue Points": "16 with HH:MM:SS:FF positioning",
            "Timers": "16 independent (Countdown / Countup / Recurring)",
            "Scheduler Slots": "16 (Daily / Weekly / Date)",
            "Solar Algorithm": "NOAA (Jean Meeus) with atmospheric refraction",
            "UI Refresh": "5 Hz (timecode), 10 Hz (timers), 1 Hz (clock/scheduler)",
            "Precision": "Monotonic Timer.Now() — microsecond resolution, zero drift",
            "File Size": "~4,800 lines, single Lua file, no dependencies",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2026-04-10",
                changes: [
                    "Initial release",
                    "Timecode generator with Art-Net TC, MTC, and LTC output",
                    "16 cue points with frame-accurate triggering",
                    "Astronomical clock with NOAA solar calculations",
                    "5 solar event triggers with ±120 min offsets",
                    "16 independent multi-mode timers at 10 Hz",
                    "16-slot scheduler (daily, weekly, date)",
                    "JSON export/import with auto-restore"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1501139083538-0139583c060f?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1495364141860-b0d03eccd065?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Can I output Art-Net Timecode, MTC, and LTC simultaneously?",
                answer: "Yes. Art-Net TC and LTC run in parallel from the same timecode source and are fully stable. MTC (RTP-MIDI/AppleMIDI) is currently in beta — we are actively working on it and cannot yet guarantee reliable operation on all systems and network configurations."
            },
            {
                question: "Do I need a license to test in Q-SYS Designer emulation?",
                answer: "No. TimeForge runs with full functionality in emulation mode. A license is only required when deployed to a physical Q-SYS Core."
            },
            {
                question: "How accurate is the timecode?",
                answer: "Frame-accurate. TimeForge uses a monotonic high-resolution clock (Timer.Now) with temporal anchoring — no drift, no accumulated errors, microsecond precision."
            },
            {
                question: "What are non-standard frame rates (50, 60, 100+ fps)?",
                answer: "These rates are available on the internal TC bus for synchronization between BV Factory plugins. Standard Art-Net TC, MTC, and LTC protocols only support rates up to 30 fps per their specifications."
            },
            {
                question: "How does the astronomical clock work without internet?",
                answer: "All solar calculations are performed locally using the NOAA algorithm (Jean Meeus). You configure latitude, longitude, and UTC offset — no internet or GPS required."
            },
            {
                question: "Can I trigger ShowMind cues from TimeForge events?",
                answer: "Yes. Every trigger output (cue points, solar events, timer expirations, scheduler events) is exposed as a Q-SYS pin. Wire them directly to ShowMind or any other control system."
            },
            {
                question: "Is MTC (MIDI Time Code) output stable?",
                answer: "MTC via RTP-MIDI/AppleMIDI is currently in beta. We are working hard to deliver a fully reliable implementation, but at this stage we cannot guarantee proper operation on all systems and network configurations. Art-Net Timecode and LTC are fully stable."
            }
        ]
    },
    {
        id: "pulseforge",
        pluginFileName: "pulseforge.qplugx",
        name: "PULSEFORGE",
        tagline: "Forge pulses — random trigger sequencer for Q-SYS.",
        description: "Fire up to 32 outputs in sequence or at random — with adjustable interval, timing jitter, simultaneous bursts, and pulse width. The randomness engine your ambient scenes and immersive effects are missing.",
        longDescription: "PulseForge is a random trigger sequencer for Q-SYS. Configure 2 to 32 outputs, set an interval, press Start — and PulseForge fires them one after another, or at random, forever or for a fixed duration. Every output is a momentary pulse pin ready to drive Show Controller cues, GPIO, audio players, lighting scenes, or any other Q-SYS logic.\n\nThe engine is built around controlled randomness. Random Order sets the probability that the next fire is drawn at random instead of following the sequence — with immediate-repeat protection, so the same output never fires twice in a row. Random Time adds symmetric jitter around the base interval, breaking mechanical regularity. Max Simultaneous lets a single tick fire a burst of several outputs at once. All four knobs are live: changes apply on the very next fire, no restart needed.\n\nThat makes PulseForge the ideal randomness engine for themed entertainment: scare zones triggering random sound effects, museum ambiences that never loop the same way, retail installations with organic-feeling animations, or endurance testing of downstream systems. Pair it with SoundForge to fire random audio tracks or LightForge to launch DMX scenes — every transport and settings control is exposed as a Q-SYS pin, ShowMind-ready.",
        price_cents: 3000,
        iconName: "Zap",
        category: "show-control",
        tier: "forge",
        replaces: { device: "Custom Lua random-cue scripting", estimatedCost: "hours of development" },
        features: [
            "32 Outputs — Configure 2 to 32 momentary pulse outputs, each with LED feedback. Every output drives Trigger, Toggle, or Momentary inputs downstream.",
            "Sequential or Random — Random Order (0–100%) sets the probability of random selection vs. sequential order, with immediate-repeat protection built in.",
            "Timing Jitter — Random Time (0–100%) adds symmetric variation around the base interval (0.05–10 s). Organic rhythms instead of mechanical loops.",
            "Simultaneous Bursts — Max Simultaneous fires 1 to N outputs on the same tick, at the same moment. Perfect for layered effects.",
            "Adjustable Pulse Width — 20 to 2000 ms per pulse, with guaranteed no-overlap: a pulse always releases before the next fire.",
            "Timed Runs — Set a duration in seconds or MM:SS for auto-stop with live remaining-time display, or leave it empty to run forever.",
            "Live Settings — All knobs are read on every fire. Adjust interval, randomness, and bursts during the show without stopping the sequence.",
            "Full Pin Integration — Start, Stop, Running, and every setting exposed as Q-SYS pins for UCI, GPIO, Show Controller, and ShowMind."
        ],
        specs: {
            "Outputs": "2–32 (configurable via properties)",
            "Interval": "0.05–10 s between fires",
            "Random Order": "0–100% probability, no immediate repeat",
            "Random Time": "0–100% symmetric jitter around interval",
            "Max Simultaneous": "1–N outputs per burst",
            "Pulse Width": "20–2000 ms, overlap-free",
            "Duration": "Seconds or MM:SS, empty = infinite",
            "Engine": "2 timers, GC-safe globals, deterministic release",
            "Integration": "Q-SYS UserPin (UCI, GPIO, Show Controller, ShowMind)",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2026-07-12",
                changes: [
                    "Initial release",
                    "2–32 momentary pulse outputs with LED feedback",
                    "Sequential / random firing with immediate-repeat protection",
                    "Timing jitter, simultaneous bursts, adjustable pulse width",
                    "Timed or infinite runs with remaining-time display",
                    "Full Q-SYS pin integration"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1504509546545-e000b4a62425?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "What can I trigger with PulseForge?",
                answer: "Anything in Q-SYS. Each output is a momentary pulse pin that drives Trigger, Toggle, or Momentary inputs — Show Controller cues, GPIO outputs, audio player transports, snapshot recalls, SoundForge tracks, LightForge scenes, or any custom logic."
            },
            {
                question: "How does random mode avoid repeating the same output?",
                answer: "When a random fire is drawn, the previously fired output is excluded from the pool (as long as there is room to spare). The same output never fires twice in a row, which keeps random ambiences feeling natural."
            },
            {
                question: "Can I change the interval or randomness while it's running?",
                answer: "Yes. All settings — Interval, Random Order, Random Time, Max Simultaneous, and Pulse Width — are re-read on every fire. Changes take effect on the next tick without stopping the sequence."
            },
            {
                question: "Can two pulses overlap on the same output?",
                answer: "No. PulseForge guarantees that every pulse is released before the next fire. At Max Simultaneous = 1, exactly one output is ever high at a time — the pulse width is automatically capped by the next fire."
            },
            {
                question: "Do I need a license to test in Q-SYS Designer emulation?",
                answer: "No. PulseForge runs with full functionality in emulation mode. A license is only required when deployed to a physical Q-SYS Core."
            }
        ]
    },
    {
        id: "selectforge",
        pluginFileName: "selectforge.qplugx",
        name: "SELECTFORGE",
        tagline: "Select, play, return — interlocked selectors with auto-return.",
        description: "An interlocked selector bank with per-slot countdown and automatic return to the previous selection. Trigger a punctual scenario — fanfare, announcement, special cue — and let the base scenario reclaim control by itself.",
        longDescription: "SelectForge is an advanced interlocked selector for Q-SYS: up to 128 selectors, one active at a time, each with its own label and an optional countdown duration. Activate a timed selector and SelectForge runs the countdown, then automatically returns to the previously active selection. That one behavior removes an entire class of show-control scripting: interrupt scenes, temporary overrides, punctual announcements — they all come back home on their own.\n\nEvery activation path funnels through the same engine, whether it comes from the panel buttons, a UCI, or the ActiveIndex pin. Re-selecting the active selector re-arms its countdown from full duration and re-emits the output — with a forced pulse through zero so downstream logic always sees the transition, even when the value doesn't change. Deselection is deliberate: clicking the active selector never turns it off; only Clear All or driving ActiveIndex to 0 clears the state.\n\nThe panel gives operators full visibility: active and previous selection by index and name, per-slot remaining time, and a state column (ACTIVE / PREVIOUS / RETURNING). Labels are editable live and every control is exposed as a Q-SYS pin — wire it to ShowMind, GPIO, Show Controller, or any UCI. Battle-tested in the field on permanent installations.",
        price_cents: 3000,
        iconName: "ArrowLeftRight",
        category: "show-control",
        tier: "forge",
        replaces: { device: "Custom interlock + auto-return scripting", estimatedCost: "hours of development" },
        features: [
            "128 Selectors — Configure 1 to 128 interlocked selectors, one active at a time, each with an editable label and its own countdown duration.",
            "Auto-Return — Give a selector a duration and it returns to the previous selection at expiry. Punctual scenarios hand control back by themselves.",
            "Per-Slot Countdown — 0 to 3600 s per selector, with live remaining-time display. Duration 0 means permanent selection, no countdown.",
            "Re-Select to Re-Arm — Activating the current selector restarts its countdown from full duration and re-emits the output pulse.",
            "Guaranteed Transitions — Re-emission dips ActiveIndex through 0 so downstream Q-SYS logic always sees a change, even on re-selection.",
            "Full State Feedback — Active and previous index/name outputs, per-slot state column (ACTIVE / PREVIOUS / RETURNING), and global status.",
            "External Control — Drive everything from the ActiveIndex pin: 1–N selects with countdown, 0 clears all. Plus a ClearAll trigger pin.",
            "Full Pin Integration — Buttons, labels, durations, and outputs exposed as Q-SYS pins for UCI, GPIO, Show Controller, and ShowMind."
        ],
        specs: {
            "Selectors": "1–128 (configurable via properties)",
            "Countdown": "0–3600 s per selector, 1 s resolution",
            "Auto-Return": "To previous selection at countdown expiry",
            "Master I/O": "ActiveIndex pin (Both) — 1–N select, 0 clear",
            "Feedback": "Active/previous index & name, per-slot remaining and state",
            "Engine": "Single 1 s timer, event-guarded control writes",
            "Integration": "Q-SYS UserPin (UCI, GPIO, Show Controller, ShowMind)",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.2.0",
                date: "2026-07-12",
                changes: [
                    "Initial public release",
                    "1–128 interlocked selectors with editable labels",
                    "Per-slot countdown (0–3600 s) with auto-return to previous selection",
                    "Re-select re-arms the countdown and re-emits the output",
                    "ActiveIndex master pin and ClearAll trigger",
                    "Full Q-SYS pin integration"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "What happens when a countdown expires?",
                answer: "SelectForge automatically re-activates the previously active selector — without re-triggering that selector's own countdown. If nothing was active before, it simply clears to the Ready state. The selector that just expired becomes the new 'previous'."
            },
            {
                question: "Can I interrupt a countdown manually?",
                answer: "Yes. Activating any other selector stops the running countdown and starts the new selection normally. Clear All (button or pin) or driving ActiveIndex to 0 stops the countdown and clears everything."
            },
            {
                question: "What if I click the selector that is already active?",
                answer: "It never turns off. Re-selecting the active selector re-arms its countdown from full duration and re-emits the output pulse — ideal for restarting a timed scenario. The only ways to deselect are Clear All or ActiveIndex = 0."
            },
            {
                question: "How do downstream systems see a re-selection if the value doesn't change?",
                answer: "Q-SYS only notifies pins on a value change, so SelectForge forces a transition: on re-selection, ActiveIndex dips through 0 and back to the selector index. Downstream logic always receives the pulse."
            },
            {
                question: "Can I control SelectForge from an external system or UCI?",
                answer: "Yes. The ActiveIndex pin accepts 1–N to select (with countdown, exactly like a button press) and 0 to clear. Labels, durations, buttons, and all feedback are exposed as Q-SYS pins for UCI, GPIO, Show Controller, and ShowMind."
            },
            {
                question: "Do I need a license to test in Q-SYS Designer emulation?",
                answer: "No. SelectForge runs with full functionality in emulation mode. A license is only required when deployed to a physical Q-SYS Core."
            }
        ]
    },
    {
        id: "routebridge",
        pluginFileName: "routebridge.qplugx",
        name: "ROUTEBRIDGE",
        tagline: "One plugin, every matrix — multi-brand video routing for Q-SYS.",
        description: "Control AV Access and MuxLab video routing hardware from a single Q-SYS plugin. Pick your device model in Properties — AVoIP system or HDMI matrix — and route sources to displays natively from Q-SYS. One license per Core, unlimited instances.",
        longDescription: "RouteBridge unifies BV Factory's video routing drivers into one multi-brand plugin. Select the device model in Properties and the plugin becomes the right driver: AV Access 4KIP200 AV-over-IP systems, AV Access 4KMX44-H2 4x4 HDMI matrix, MuxLab 500444 (HDMI 4x4 4K/60), or MuxLab 500412 (HDMI 4x4 HDBT PoC). One instance drives one device or one AVoIP system; multi-device sites simply add instances — a single license per Core covers them all.\n\nEach driver is the proven protocol code from its source plugin, byte-identical on the wire. The 4KIP200 family brings the full AVoIP feature set: matrix routing with visual feedback, UDP auto-discovery, display power via CEC or RS232, video walls with rotation and cropping, OSD text overlays, RS232 pass-through, and per-device management. The matrix families deliver instant one-click routing on a 4x4 grid with status polling and reconnection handled for you.\n\nControl names are preserved verbatim from the source plugins, so existing designs, user scripts, snapshots, and control pins migrate without rewiring. The Telnet engines are built for permanent installations: command queuing with timeout protection, automatic reconnection, and fault-isolated error handling. Every control is exposed as a Q-SYS pin for UCI, GPIO, Show Controller, and ShowMind integration.",
        price_cents: 3000,
        iconName: "Route",
        category: "video",
        tier: "bridge",
        replaces: { device: "Vendor control software / separate plugins", estimatedCost: "~500 €" },
        compatibleBrands: [
            { name: "AV Access", logo: "/brands/avaccess.svg" },
            { name: "MuxLab", logo: "/brands/muxlab.svg" },
        ],
        features: [
            "4 Device Families — AV Access 4KIP200 (AV over IP), AV Access 4KMX44-H2 (4x4 matrix), MuxLab 500444 (HDMI 4x4 4K/60), MuxLab 500412 (HDMI 4x4 HDBT PoC). Pick the model in Properties.",
            "Matrix Routing — Route any source to any display with instant visual feedback, from the plugin panel, a UCI, or control pins.",
            "Auto-Discovery — 4KIP200 encoders and decoders are discovered via UDP broadcast and fill their slots automatically as units come online.",
            "Display Control — Power displays on/off via CEC or RS232 with per-decoder presets, plus custom CEC commands (4KIP200 family).",
            "Video Wall & OSD — Grid video walls with per-decoder position, rotation (0°/90°/180°/270°) and cropping, plus translucent OSD text overlays (4KIP200 family).",
            "Drop-In Migration — Control names preserved verbatim from AVAccessBridge and MuxBridge: existing scripts, snapshots, and pins keep working.",
            "One License, Unlimited Instances — A single Core license activates every instance and every device family on that Core.",
            "Built for 24/7 — Telnet engines with command queuing, timeout protection, automatic reconnection, and fault-isolated error handling."
        ],
        specs: {
            "Device Families": "4 (AV Access 4KIP200 / 4KMX44-H2, MuxLab 500444 / 500412)",
            "Transports": "Telnet (24 / 23 / 4001) + UDP discovery (3335/3336)",
            "Routing": "AVoIP matrix (up to 16 discovered devices) or 4x4 HDMI matrix",
            "Display Control": "CEC + RS232 with per-decoder presets (4KIP200)",
            "Video Wall": "Grid layout, rotation (0°/90°/180°/270°), cropping (4KIP200)",
            "Extras": "OSD overlay, RS232 pass-through, per-device management (4KIP200)",
            "Licensing": "1 license per Core — unlimited instances and families",
            "Integration": "Q-SYS UserPin (UCI, GPIO, Show Controller, ShowMind)",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2026-07-12",
                changes: [
                    "Initial release — merge of AVAccessBridge and MuxBridge",
                    "4 device families selectable in Properties",
                    "AVoIP matrix routing, discovery, CEC/RS232, video walls, OSD (4KIP200)",
                    "4x4 HDMI matrix routing for 4KMX44-H2, MuxLab 500444 and 500412",
                    "Control names preserved — drop-in migration from source plugins",
                    "One Core license activates unlimited instances"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1617802690992-15d93263d3a9?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Which devices does RouteBridge support?",
                answer: "Four families: AV Access 4KIP200 encoders/decoders (AV over IP, including 4KIP204E, 4KIP200M, HDIP100E/D), the AV Access 4KMX44-H2 4x4 HDMI matrix, the MuxLab 500444 (HDMI 4x4 4K/60), and the MuxLab 500412 (HDMI 4x4 HDBT PoC). You select the model in the plugin Properties."
            },
            {
                question: "How many licenses do I need for a multi-device site?",
                answer: "One per Q-SYS Core. A single RouteBridge license activates unlimited plugin instances on that Core, across all device families — an AVoIP system plus several matrices on the same Core costs one license."
            },
            {
                question: "I already use AVAccessBridge or MuxBridge — is migration painful?",
                answer: "No. RouteBridge preserves every control name verbatim from the source plugins. Replace the plugin block, select your model in Properties, and your existing scripts, snapshots, UCIs, and control pins keep working. See the included migration notes."
            },
            {
                question: "What happens on a hardware Core without a license?",
                answer: "RouteBridge stays connected: polling and status feedback remain live so you can see the device and your Core ID. Only device writes (routing, power, configuration) are blocked until a license is entered. In Q-SYS Designer emulation, everything is unlocked for free."
            },
            {
                question: "Where do I enter the license key?",
                answer: "In the plugin Properties (design-time), not in a runtime control. Enter the RB- key you receive after purchase, push the design to the Core, and the license strip shows LICENSED with your Core ID."
            },
            {
                question: "Does the 4KIP200 family keep all AVAccessBridge features?",
                answer: "Yes — the protocol code is ported verbatim: matrix routing with visual feedback, UDP auto-discovery, CEC/RS232 display control, video walls with rotation and cropping, OSD overlays, RS232 pass-through, and per-device management (HDCP, resolution, reboot, factory reset)."
            }
        ]
    },
    {
        id: "screenbridge",
        pluginFileName: "screenbridge.qplugx",
        name: "SCREENBRIDGE",
        tagline: "Professional display control for Q-SYS — multi-brand, one plugin.",
        description: "Drive Iiyama professional displays (SICP) and NovaStar LED processors natively from Q-SYS: power with Wake-on-LAN, inputs, volume, picture settings, temperature monitoring. Pick the model, enter the IP, done. Try it free for 10 minutes on any Core.",
        longDescription: "ScreenBridge puts professional display control inside your Q-SYS design. Select the display model in Properties and the plugin becomes the right driver — no external control processor, no custom scripting.\n\nFor Iiyama ProLite displays (LHxx60, LHxx64, LHxx75 series over SICP/TCP), ScreenBridge covers the full operating surface: power on/off with multi-packet Wake-on-LAN, input selection, volume and audio-out with mute, brightness/contrast/sharpness, screen mute, freeze, and live temperature readback. For NovaStar VX400 LED processors, it handles brightness and input source switching (HDMI1, HDMI2, DVI, SDI) over TCP.\n\nThe engine is built for permanent installations: continuous status polling keeps Q-SYS in sync with the real device state, continuous controls are debounced so faders never flood the device, and connections recover automatically. Every control is exposed as a Q-SYS pin for UCI, GPIO, Show Controller, and ShowMind integration.\n\nScreenBridge is also built to grow: LG, Sony, and PJLink Class 1/2 drivers are already in the codebase on standby, and will be enabled in future releases. And you can evaluate it risk-free — without a license, the plugin runs fully featured for 10 minutes on a physical Core (unlimited in Designer emulation).",
        price_cents: 3000,
        iconName: "Monitor",
        category: "control",
        tier: "bridge",
        replaces: { device: "External display control processor", estimatedCost: "~300–500 €" },
        compatibleBrands: [
            { name: "iiyama", logo: "/brands/iiyama.svg" },
            { name: "NovaStar", logo: "/brands/novastar.svg" },
        ],
        features: [
            "Multi-Brand Drivers — Iiyama LHxx60/LHxx64/LHxx75 (SICP over TCP) and NovaStar VX400 (TCP). Select the model in Properties; one instance per device.",
            "Power & Wake-on-LAN — Power off via SICP, power on via multi-packet WOL bursts that reliably wake displays from standby.",
            "Full Picture Control — Input selection, volume, audio output, mute, brightness, contrast, sharpness, screen mute, and freeze (Iiyama).",
            "LED Processor Control — Brightness and input source switching (HDMI1/HDMI2/DVI/SDI) on NovaStar VX400.",
            "Temperature Monitoring — Live display temperature readback for supervision and preventive maintenance (Iiyama).",
            "10-Minute Free Demo — Without a license the plugin runs fully featured for 10 minutes on a real Core, with a live countdown. Unlimited in emulation.",
            "Built for 24/7 — Continuous status polling, debounced continuous controls, automatic reconnection, fault-isolated error handling.",
            "Full Pin Integration — Every control exposed as a Q-SYS pin for UCI, GPIO, Show Controller, and ShowMind."
        ],
        specs: {
            "Supported Displays": "Iiyama LHxx60 / LHxx64 / LHxx75 (SICP), NovaStar VX400",
            "Protocols": "SICP over TCP + Wake-on-LAN (Iiyama), TCP (NovaStar)",
            "Iiyama Control": "Power, input, volume, audio out, mute, brightness/contrast/sharpness, screen mute, freeze, temperature",
            "NovaStar Control": "Brightness, input source (HDMI1/HDMI2/DVI/SDI)",
            "Monitor ID": "1–255 (per-display addressing)",
            "Polling": "Continuous status round-robin (10 s)",
            "Demo Mode": "10 minutes full-featured without license (physical Core)",
            "Roadmap Drivers": "LG, Sony (Simple IP + REST), PJLink Class 1 & 2 (standby)",
            "Integration": "Q-SYS UserPin (UCI, GPIO, Show Controller, ShowMind)",
            "License Type": "Node-locked (Core ID)"
        },
        compatibility: {
            minQsysVersion: "9.0",
            supportedCores: ["Any Q-SYS Core"],
            os: "Q-SYS Designer 9.x+"
        },
        versionHistory: [
            {
                version: "v1.0.0",
                date: "2026-07-12",
                changes: [
                    "Initial release",
                    "Iiyama LHxx60/LHxx64/LHxx75 driver (SICP over TCP) with Wake-on-LAN",
                    "NovaStar VX400 driver (brightness, input switching)",
                    "Full picture control, temperature monitoring",
                    "10-minute free demo mode on physical Cores",
                    "LG, Sony, and PJLink drivers on standby for future releases"
                ]
            }
        ],
        manualUrl: "#",
        videoUrl: undefined,
        screenshots: [
            "https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=2070"
        ],
        faq: [
            {
                question: "Which displays are supported?",
                answer: "Iiyama ProLite LHxx60, LHxx64, and LHxx75 series over SICP/TCP, and the NovaStar VX400 LED processor over TCP. LG, Sony (Simple IP + REST), and PJLink Class 1/2 drivers are already built into the plugin on standby and will be enabled in future releases."
            },
            {
                question: "Can I try ScreenBridge before buying?",
                answer: "Yes, twice over: in Q-SYS Designer emulation everything is unlocked for free, and on a physical Core the plugin runs fully featured for 10 minutes without a license, with a live countdown. After the demo it freezes until a valid key is entered."
            },
            {
                question: "How does power-on work if the display is in standby?",
                answer: "ScreenBridge sends multi-packet Wake-on-LAN bursts to the display's MAC address, then confirms the power state via SICP once the display is back on the network. Power off goes through the SICP protocol directly."
            },
            {
                question: "How many displays can I control from one Core?",
                answer: "One ScreenBridge instance drives one device. Add as many instances as you need in your design — each with its own IP, model, and Monitor ID (1–255). Each instance is independently fault-isolated."
            },
            {
                question: "Where do I enter the license key?",
                answer: "In the plugin Properties (design-time). Enter the SBRG- key you receive after purchase, push the design to the Core, and the license panel shows LICENSED with your Core ID."
            },
            {
                question: "Won't the faders flood my display with commands?",
                answer: "No. Continuous controls (brightness, contrast, sharpness, volume) are debounced: intermediate fader values are coalesced and a single consolidated command is sent to the device. Status polling keeps Q-SYS in sync with reality."
            }
        ]
    }
];

export const TIER_STYLES: Record<ProductTier, { bg: string; border: string; text: string; badgeBg: string; glow: string }> = {
    bridge: {
        bg: "from-blue-500/10 to-blue-600/5",
        border: "border-blue-500/20",
        text: "text-blue-400",
        badgeBg: "bg-blue-500/10",
        glow: "bg-blue-500/20",
    },
    forge: {
        bg: "from-teal-500/10 to-emerald-600/5",
        border: "border-teal-500/20",
        text: "text-teal-400",
        badgeBg: "bg-teal-500/10",
        glow: "bg-teal-500/20",
    },
    mind: {
        bg: "from-purple-500/10 to-violet-600/5",
        border: "border-purple-500/20",
        text: "text-purple-400",
        badgeBg: "bg-purple-500/10",
        glow: "bg-purple-500/20",
    },
};

// Helper to get the correct icon component based on the string name
export const getProductIcon = (iconName: string, className: string = "") => {
    switch (iconName) {
        case "Flame":
            return <Flame className={className} />;
        case "Clapperboard":
            return <Clapperboard className={className} />;
        case "Monitor":
            return <Monitor className={className} />;
        case "Globe":
            return <Globe className={className} />;
        case "Tv":
            return <Tv className={className} />;
        case "Thermometer":
            return <Thermometer className={className} />;
        case "Layers":
            return <Layers className={className} />;
        case "Film":
            return <Film className={className} />;
        case "Music":
            return <Music className={className} />;
        case "Lightbulb":
            return <Lightbulb className={className} />;
        case "Timer":
            return <Timer className={className} />;
        case "Zap":
            return <Zap className={className} />;
        case "ArrowLeftRight":
            return <ArrowLeftRight className={className} />;
        case "Route":
            return <Route className={className} />;
        default:
            return <Lightbulb className={className} />;
    }
};
