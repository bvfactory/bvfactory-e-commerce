import { Flame, Clapperboard, Monitor, Globe, Tv, Thermometer, Layers, Film, Music, Lightbulb } from "lucide-react";

export interface VersionHistory {
    version: string;
    date: string;
    changes: string[];
}

export interface FaqItem {
    question: string;
    answer: string;
}

export interface ProductType {
    id: string;
    name: string;
    tagline: string;
    description: string;
    longDescription: string;
    price_cents: number;
    iconName: "Flame" | "Clapperboard" | "Monitor" | "Globe" | "Tv" | "Thermometer" | "Layers" | "Film" | "Music" | "Lightbulb";
    category: "lighting" | "routing" | "show-control" | "control";
    features: string[];
    specs: Record<string, string>;
    compatibility: {
        minQsysVersion: string;
        supportedCores: string[];
        os?: string;
    };
    versionHistory: VersionHistory[];
    manualUrl?: string;
    videoUrl?: string;
    screenshots?: string[];
    faq: FaqItem[];
}

export const PRODUCT_CATEGORIES = [
    { id: "all", label: "All Modules" },
    { id: "lighting", label: "Lighting & DMX" },
    { id: "routing", label: "Routing & Network" },
    { id: "show-control", label: "Show Control" },
    { id: "control", label: "AV Control" },
] as const;

export const MOCK_PRODUCTS: ProductType[] = [
    {
        id: "lightforge",
        name: "LIGHTFORGE",
        tagline: "Forge your light, master every universe.",
        description: "Record and play back up to 32 universes of DMX — Art-Net and sACN — directly inside Q-SYS. One plugin, instant save, instant load.",
        longDescription: "LightForge captures live DMX data from your lighting console or any Art-Net/sACN source, and plays it back on demand. Up to 32 independent tracks, each with its own universe, protocol, and destination. Record a full show once, replay it forever.\n\nTraditional DMX recording solutions cost thousands and require dedicated hardware. LightForge runs natively on your Q-SYS Core — the same platform already handling your audio, video, and control. Add an Art-Net or sACN node to convert to physical DMX, and you're done. No dedicated PC, no rack-mount recorder, no additional maintenance contract.\n\nPair it with any affordable Art-Net/sACN node and you have the most cost-effective DMX recording solution on the market. And it lives where your show control already does.",
        price_cents: 49900,
        iconName: "Flame",
        category: "lighting",
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
            "https://images.unsplash.com/photo-1504501650895-2441b2e52940?auto=format&fit=crop&q=80&w=2070",
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
        name: "SHOWMIND",
        tagline: "Professional show control engine for Q-SYS.",
        description: "Cue-based automation, multi-protocol actions, timecode sync, and a built-in web dashboard — all inside a single plugin.",
        longDescription: "ShowMind turns your Q-SYS Core into a full show control system. Build cue sequences with up to 8 actions per cue — each targeting a different protocol, device, or internal function. Fire cues manually, chase them against timecode, schedule them by time of day, or trigger them from incoming OSC, UDP, MIDI, RS-232, or webhooks.\n\nEvery device connection is managed through a resilient Device Abstraction Layer with automatic failover, heartbeat monitoring, and latency tracking. If a primary link goes down, ShowMind switches to the backup path and retries — no operator intervention needed.\n\nThe plugin ships with a built-in web dashboard accessible from any browser on the network. Full transport control, cue editing, device status, variable monitoring, and live timecode display — all rendered in a responsive dark interface with real-time SSE updates. No external software required.",
        price_cents: 79900,
        iconName: "Clapperboard",
        category: "show-control",
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
        name: "IIYAMABRIDGE",
        tagline: "Iiyama IP control for Q-SYS — simple, reliable, free.",
        description: "Control Iiyama ProLite displays directly from Q-SYS over TCP/SICP. Power, input selection, volume, and status polling — no extra hardware, no extra software.",
        longDescription: "IiyamaBridge gives your Q-SYS system native IP control over Iiyama ProLite professional displays. Power on/off, input source selection, volume control, and continuous status polling — all through a single lightweight plugin.\n\nThe plugin communicates via Iiyama's SICP protocol over TCP port 5000. Every command is queued and retried automatically. If the connection drops, IiyamaBridge reconnects with exponential backoff. Wake-on-LAN support sends multi-packet WOL bursts to wake sleeping displays from the network.\n\nAll errors are wrapped in pcall for maximum reliability — a single unresponsive display never crashes the plugin or affects other instances. Status feedback integrates directly with Q-SYS Notifications, so your monitoring dashboard stays informed without any extra wiring.",
        price_cents: 0,
        iconName: "Monitor",
        category: "control",
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
        name: "WEBBRIDGE",
        tagline: "Control your Q-SYS Named Controls from any browser.",
        description: "Turn your Q-SYS Core into a lightweight web server. Open a URL from any device on the network and get instant access to your Named Controls — faders, buttons, text fields — all synced in real time.",
        longDescription: "WebBridge is a fully self-contained Q-SYS plugin that turns your Core into a lightweight web server. Open http://<core-ip>:8234 from any device on the network and get instant access to your Named Controls through a clean, responsive interface.\n\nDrop the plugin into your design, deploy, and open the URL. The embedded web app connects automatically over WebSocket for real-time, bidirectional sync. Faders, buttons, text fields — everything updates live across all connected clients. No app to install, no external server to run.\n\nHTML, CSS, and JavaScript are embedded directly in the plugin — zero external dependencies. The BV Factory dark UI includes search, grouping, and grid/list views for quick navigation across large control sets. A read-only prefix lets you expose monitoring controls without risk of accidental changes.",
        price_cents: 5000,
        iconName: "Globe",
        category: "control",
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
        name: "AVACCESSBRIDGE",
        tagline: "AV-over-IP matrix control for Q-SYS — route, discover, display.",
        description: "Take full control of your AV Access 4KIP200 encoder/decoder system directly from Q-SYS. Matrix routing, auto-discovery, display control, video walls, and OSD overlays — all from a single plugin.",
        longDescription: "AVAccessBridge connects to AV Access 4KIP200E encoders and 4KIP200D decoders over Telnet and lets you route any source to any display — all from a single Q-SYS plugin. No external control software needed.\n\nThe plugin features automatic device discovery via UDP broadcast. Plug in your devices and they appear automatically — encoder and decoder slots fill in as units come online. Matrix routing gives you one-click source selection per decoder with instant visual feedback, so you see at a glance which encoder feeds which decoder.\n\nBeyond routing, AVAccessBridge handles display power via CEC or RS232, video wall configuration with per-decoder positioning and rotation, OSD text overlays, RS232 pass-through in ASCII or hex mode, and full per-device management including HDCP, resolution, color space, firmware readback, reboot, and factory reset. Every control is exposed as a UserPin for integration with Q-SYS UCI, GPIO, scripting, and BV Factory's ShowMind. The Telnet engine features IAC negotiation stripping, a login state machine, command queuing with timeout protection, automatic reconnection, and shell injection prevention — designed to run unattended 24/7.",
        price_cents: 1000,
        iconName: "Tv",
        category: "routing",
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
        name: "MELCLOUDBRIDGE",
        tagline: "Mitsubishi HVAC control for Q-SYS — cloud-connected, zero hardware.",
        description: "Control up to 64 Mitsubishi Electric air conditioning units directly from Q-SYS via the MELCloud platform. Power, mode, temperature, fan speed, vane position — all per unit, all as Control Pins.",
        longDescription: "MelCloudBridge connects to Mitsubishi's MELCloud REST API and brings full control of your air-to-air heat pumps into Q-SYS Designer. Drop the plugin, enter your MELCloud credentials, and your HVAC units show up automatically. No extra hardware, no gateway.\n\nPower on/off, operation mode (heat, cool, dry, fan, auto), target temperature (16–31°C), fan speed (auto + 5 levels), and both horizontal and vertical vane positions — all controllable per unit, all exposed as Control Pins for integration with any Q-SYS workflow. Room temperature and outdoor temperature monitoring are included for each unit.\n\nThe plugin supports up to 64 units across 8 paginated pages with automatic device discovery from your MELCloud account. Rate-limited polling (configurable 30–300s) keeps you within MELCloud API limits. A card-based UI with color-coded mode buttons gives operators instant visual feedback.\n\nMelCloudBridge uses Mitsubishi's unofficial REST API — the same one used by the MELCloud app and third-party integrations like Home Assistant. Tested on live installations but not affiliated with or endorsed by Mitsubishi Electric.",
        price_cents: 3000,
        iconName: "Thermometer",
        category: "control",
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
            "https://images.unsplash.com/photo-1631545806609-35ffa7734532?auto=format&fit=crop&q=80&w=2070"
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
        name: "MADBRIDGE",
        tagline: "MadMapper control for Q-SYS — surfaces, scenes, cues, all via OSC.",
        description: "Control MadMapper directly from Q-SYS over OSC. Surfaces, scenes, cues, master controls, and preset store/recall — up to 4 instances from a single plugin.",
        longDescription: "MadBridge talks to MadMapper over the network using OSC (UDP). You get hands-on control of surface visibility, opacity, and media selection. Trigger scenes and cues from a grid, navigate columns, and manage master intensity, fade to black, and BPM — without leaving Q-SYS Designer or your UCI.\n\nUp to 32 surfaces are available, each with opacity, visibility, media number, and solo controls. The scene and cue grid supports up to 32 columns and 16 rows. Logical cues let you name a cue, assign it a column/row, and fire it with a single GO.\n\nPreset store/recall snapshots and restores your entire state. Bidirectional feedback from MadMapper keeps Q-SYS controls in sync at all times. The plugin supports up to 4 independent MadMapper instances, so you can control multiple projection mapping rigs from one Core. All controls are exposed as UserPins for integration with ShowMind, UCI, GPIO, or any Q-SYS control workflow.",
        price_cents: 1500,
        iconName: "Layers",
        category: "show-control",
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
        name: "RESOLUMEBRIDGE",
        tagline: "Resolume Arena control for Q-SYS — clean REST API, no middleware.",
        description: "Control Resolume Arena directly from Q-SYS over its built-in REST API. Layers, clips, columns, composition master — real-time bidirectional sync with auto-reconnect.",
        longDescription: "ResolumeBridge polls your Arena instance over its built-in REST API and maps the composition state to Q-SYS controls in real time. Trigger clips, manage layers, adjust opacity and volume, fire columns — all from native Q-SYS controls that integrate seamlessly with your show control workflow.\n\nLayer controls include opacity, volume, solo, bypass, clear, and blend mode readback. Clip triggering includes connection state feedback (Empty, Disconnected, Connected, Previewing). Column triggers enable scene-based workflows. Thumbnail URLs are exposed per clip for external display.\n\nComposition-level controls cover master fader, speed, and crossfader, plus undo/redo. Logical cues simplify show programming, and preset store/recall lets you snapshot and restore state. The plugin supports up to 4 Arena servers with auto-reconnect watchdog, latency tracking, and error monitoring.\n\nUses Resolume Arena's REST API (port 8080 by default). Requires Arena 7.x or later. Audio volume is normalized from Resolume's native dB scale to a 0–1 knob range. Configurable polling rate (100–5000 ms). No additional software or network configuration needed beyond IP connectivity.",
        price_cents: 1500,
        iconName: "Film",
        category: "show-control",
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
        name: "SOUNDFORGE",
        tagline: "64-track audio playback engine for Q-SYS — shows, themes, immersion.",
        description: "Multitrack audio playback with scene management, crossfades, ducking, condition engine, and timecode sync. Built for themed entertainment, immersive experiences, and live shows.",
        longDescription: "SoundForge is a powerful multitrack audio playback plugin for Q-SYS Designer. Built for themed entertainment, immersive experiences, and live shows, it gives you up to 64 independent audio tracks with full transport control, scene management, and adaptive playback — all inside a single plugin block.\n\nEach track gets Play, Stop, Pause, Loop, Volume, Mute, and Solo. Attack and release fades provide automatic fade-in on Play and fade-out on Stop/Pause (0–60s per track). Per-track ducking with independent attack/release and trim level lets background audio step aside when foreground audio plays. Loop gap adds a configurable delay before loop restart — up to 24 hours.\n\nThe condition engine triggers playback based on variables, time of day, or track states with AND/OR/NOT logic. Crossfades smooth transitions between tracks or scenes with 6 fade curves: Linear, −3dB, −6dB, Log, S-Curve, and Equal Power. The scene system stores and recalls up to 64 snapshots with crossfade transitions.\n\nSoundForge is the audio pillar of the BV Factory ecosystem. It connects natively to ShowMind (variable sync) and LightForge (transport sync). A TCP API on port 9910 provides full remote control via simple text commands. JSON show file save/load, paginated UI, track grouping, and pin-level access to every control round out the feature set.",
        price_cents: 5000,
        iconName: "Music",
        category: "show-control",
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
            "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=2032",
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
        name: "HUEBRIDGE",
        tagline: "Philips Hue control for Q-SYS — local, reliable, simple.",
        description: "Control your Philips Hue lights and scenes straight from Q-SYS. Per-light brightness, scene recall, master controls, and auto-discovery — all via the local Hue Bridge API.",
        longDescription: "HueBridge connects to your Philips Hue Bridge via its local REST API and gives you direct control over every light and scene. Toggle lights on/off, adjust brightness per fixture, recall any Hue scene with a custom intensity level — all from within your Q-SYS design. A master section lets you turn everything on or off and set a global brightness in one click.\n\nThe plugin auto-discovers all lights and scenes from your bridge. Each light shows a reachability indicator so you know instantly if a fixture is offline. An adjustable poll rate with automatic reconnection on timeout keeps the system reliable for permanent installations.\n\nSetup takes 30 seconds: the plugin includes a step-by-step guide right in the layout. Open your bridge's debug page, press the link button, POST one line, and paste the username. Toggle Connect and your lights appear. No cloud, no middleware, no complexity — just reliable local HTTP control.\n\nAll controls are exposed as UserPins for integration with ShowMind, UCI, GPIO, Show Controller, or any Q-SYS workflow. Local HTTP only — no internet required after initial pairing.",
        price_cents: 1000,
        iconName: "Lightbulb",
        category: "lighting",
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
            "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&q=80&w=2032",
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
    }
];

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
        default:
            return <Lightbulb className={className} />;
    }
};
