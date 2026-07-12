import { createHmac, randomBytes, createHash } from "crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LicenseResult {
    licenseKey: string;
    salt: string;
    keyHash: string;
    algorithmVersion: string;
}

/**
 * Per-product license algorithm.
 * generate() and verify() are paired on the same object so it is structurally
 * impossible to generate with algorithm A and verify with algorithm B.
 */
export interface LicenseAlgorithm {
    readonly name: string;
    readonly label: string;
    readonly description: string;
    generate(productId: string, coreId: string): LicenseResult;
    verify(licenseKey: string, productId: string, storedKeyHash: string): boolean;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function getMasterSecret(): string {
    const secret = process.env.LICENSE_MASTER_SECRET;
    if (!secret) {
        throw new Error("LICENSE_MASTER_SECRET environment variable is required.");
    }
    return secret;
}

function deriveProductSecret(productId: string): string {
    return createHmac("sha256", getMasterSecret())
        .update(`bvfactory:product-secret:${productId}`)
        .digest("hex");
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i]! ^ b[i]!;
    }
    return result === 0;
}

// ─── Algorithm: HMAC-SHA256 v1 (default) ────────────────────────────────────

export class HmacSha256Algorithm implements LicenseAlgorithm {
    readonly name = "hmac-sha256-v1";
    readonly label = "HMAC-SHA256 v1";
    readonly description = "Algorithme par défaut. Clé 32 caractères hex, préfixe BVFA.";

    generate(productId: string, coreId: string): LicenseResult {
        const salt = randomBytes(16).toString("hex");
        const productSecret = deriveProductSecret(productId);

        const rawHash = createHmac("sha256", productSecret)
            .update(`${coreId.toUpperCase()}:${salt}`)
            .digest("hex");

        const keyBody = rawHash.substring(0, 32).toUpperCase();
        const licenseKey = `BVFA-${keyBody.match(/.{4}/g)!.join("-")}`;

        const keyHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        return { licenseKey, salt, keyHash, algorithmVersion: this.name };
    }

    verify(licenseKey: string, productId: string, storedKeyHash: string): boolean {
        const productSecret = deriveProductSecret(productId);

        const computedHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        if (computedHash.length !== storedKeyHash.length) return false;

        const a = Buffer.from(computedHash, "hex");
        const b = Buffer.from(storedKeyHash, "hex");

        return timingSafeEqual(a, b);
    }
}

// ─── Algorithm: SHA-512 short key ───────────────────────────────────────────

export class Sha512ShortAlgorithm implements LicenseAlgorithm {
    readonly name = "sha512-short-v1";
    readonly label = "SHA-512 Court";
    readonly description = "Clé courte 16 caractères, idéale pour saisie manuelle. Préfixe BVF.";

    generate(productId: string, coreId: string): LicenseResult {
        const salt = randomBytes(16).toString("hex");
        const productSecret = deriveProductSecret(productId);

        const rawHash = createHash("sha512")
            .update(`${productSecret}:${coreId.toUpperCase()}:${salt}`)
            .digest("hex");

        const keyBody = rawHash.substring(0, 16).toUpperCase();
        const licenseKey = `BVF-${keyBody.match(/.{4}/g)!.join("-")}`;

        const keyHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        return { licenseKey, salt, keyHash, algorithmVersion: this.name };
    }

    verify(licenseKey: string, productId: string, storedKeyHash: string): boolean {
        const productSecret = deriveProductSecret(productId);

        const computedHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        if (computedHash.length !== storedKeyHash.length) return false;

        const a = Buffer.from(computedHash, "hex");
        const b = Buffer.from(storedKeyHash, "hex");

        return timingSafeEqual(a, b);
    }
}

// ─── Algorithm: Numeric key (for hardware input) ────────────────────────────

export class NumericKeyAlgorithm implements LicenseAlgorithm {
    readonly name = "numeric-v1";
    readonly label = "Numérique";
    readonly description = "Clé entièrement numérique (20 chiffres), pour saisie sur écrans tactiles.";

    generate(productId: string, coreId: string): LicenseResult {
        const salt = randomBytes(16).toString("hex");
        const productSecret = deriveProductSecret(productId);

        const rawHash = createHmac("sha256", productSecret)
            .update(`${coreId.toUpperCase()}:${salt}`)
            .digest("hex");

        // Convert hex to decimal digits by taking pairs and modding
        let digits = "";
        for (let i = 0; i < rawHash.length && digits.length < 20; i += 2) {
            const byte = parseInt(rawHash.substring(i, i + 2), 16);
            digits += (byte % 10).toString();
        }
        digits = digits.substring(0, 20);

        const licenseKey = `BVF-${digits.match(/.{4}/g)!.join("-")}`;

        const keyHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        return { licenseKey, salt, keyHash, algorithmVersion: this.name };
    }

    verify(licenseKey: string, productId: string, storedKeyHash: string): boolean {
        const productSecret = deriveProductSecret(productId);

        const computedHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        if (computedHash.length !== storedKeyHash.length) return false;

        const a = Buffer.from(computedHash, "hex");
        const b = Buffer.from(storedKeyHash, "hex");

        return timingSafeEqual(a, b);
    }
}

// ─── Algorithm: BV Factory two-round FNV-1a (deterministic, Q-SYS compat.) ──

/**
 * BV Factory two-round license engine, shared by LightForge, TimeForge and
 * RouteBridge: keyed FNV-1a over `secret|id|lengthHex|secret` with a second
 * avalanche round, then a 3-stage cascade. NOT the same scheme as the
 * single-round "Forge" module (PulseForge/SelectForge) further below.
 *
 * Matches the Lua reference implementation (licHash/formatLicKey) embedded in
 * the plugins byte-for-byte: only the key prefix and the salt vary.
 */
export class TwoRoundFnv1aAlgorithm implements LicenseAlgorithm {
    readonly name: string;
    readonly label: string;
    readonly description: string;

    private readonly keyPrefix: string;
    private readonly envVarName: string;

    constructor(opts: {
        name: string;
        label: string;
        keyPrefix: string;
        envVarName: string;
        pluginName: string;
    }) {
        this.name = opts.name;
        this.label = opts.label;
        this.keyPrefix = opts.keyPrefix;
        this.envVarName = opts.envVarName;
        this.description = `Algorithme déterministe compatible Q-SYS ${opts.pluginName}. Clé ${opts.keyPrefix}-XXXX-XXXX-XXXX.`;
    }

    /**
     * Separate secret from LICENSE_MASTER_SECRET because the Q-SYS plugin
     * uses this exact secret for offline validation — it must match byte-for-byte.
     */
    private getSecret(): string {
        const secret = process.env[this.envVarName];
        if (!secret) {
            throw new Error(
                `${this.envVarName} environment variable is required.`
            );
        }
        return secret;
    }

    /**
     * Safe 32-bit unsigned multiply using 16-bit decomposition.
     * Avoids floating-point overflow in JS (same as Lua version).
     */
    private mul32(a: number, b: number): number {
        const aLo = a % 65536;
        const aHi = (a - aLo) / 65536;
        const bLo = b % 65536;
        const bHi = (b - bLo) / 65536;
        const mid = (aHi * bLo + aLo * bHi) % 65536;
        return (mid * 65536 + aLo * bLo) % 4294967296;
    }

    /** XOR the low byte of h with byte b (bit-by-bit, Lua-compatible). */
    private xorLowByte(h: number, b: number): number {
        let hm = h % 256;
        let bm = b % 256;
        let xor8 = 0;
        let p = 1;
        for (let bit = 0; bit < 8; bit++) {
            const ha = hm % 2;
            const ba = bm % 2;
            if (ha !== ba) xor8 += p;
            hm = Math.floor(hm / 2);
            bm = Math.floor(bm / 2);
            p *= 2;
        }
        return (h - (h % 256)) + xor8;
    }

    /**
     * FNV-1a two-round keyed hash.
     * Input: secret|id|lengthHex|secret
     * Round 1: byte-by-byte XOR + FNV prime multiply
     * Round 2: fold hex of round-1 result back through itself (avalanche)
     */
    private licHash(id: string, secret: string): number {
        let h = 2166136261; // FNV-1a offset basis
        const data =
            secret +
            "|" +
            id +
            "|" +
            id.length.toString(16).toUpperCase().padStart(2, "0") +
            "|" +
            secret;

        // Round 1
        for (let i = 0; i < data.length; i++) {
            h = this.xorLowByte(h, data.charCodeAt(i));
            h = this.mul32(h, 16777619); // FNV-1a prime
        }

        // Round 2: avalanche — fold hex representation back through
        const r2 = (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
        for (let i = 0; i < r2.length; i++) {
            h = this.xorLowByte(h, r2.charCodeAt(i));
            h = this.mul32(h, 16777619);
        }

        return h >>> 0; // ensure unsigned
    }

    /**
     * 3-stage cascade key generation.
     * Each stage feeds into the next, preventing single-hash key recovery.
     */
    private formatLicKey(hash: number, secret: string): string {
        const h2 = this.licHash(
            (hash >>> 0).toString(16).toUpperCase().padStart(8, "0"),
            "s2:" + secret
        );
        const h3 = this.licHash(
            (h2 >>> 0).toString(16).toUpperCase().padStart(8, "0"),
            "s3:" + secret
        );
        const p1 = (hash % 65536).toString(16).toUpperCase().padStart(4, "0");
        const p2 = (h2 % 65536).toString(16).toUpperCase().padStart(4, "0");
        const p3 = (h3 % 65536).toString(16).toUpperCase().padStart(4, "0");
        return `${this.keyPrefix}-${p1}-${p2}-${p3}`;
    }

    generate(productId: string, coreId: string): LicenseResult {
        // coreId is NOT uppercased — the Lua plugin passes System.LockingId
        // as-is, and the key must match byte-for-byte.
        const secret = this.getSecret();
        const h1 = this.licHash(coreId, secret);
        const licenseKey = this.formatLicKey(h1, secret);

        // Store a keyHash for DB consistency (same pattern as other algorithms)
        const productSecret = deriveProductSecret(productId);
        const keyHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        return {
            licenseKey,
            salt: "", // deterministic algorithm — no salt needed
            keyHash,
            algorithmVersion: this.name,
        };
    }

    verify(
        licenseKey: string,
        productId: string,
        storedKeyHash: string
    ): boolean {
        const productSecret = deriveProductSecret(productId);

        const computedHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        if (computedHash.length !== storedKeyHash.length) return false;

        const a = Buffer.from(computedHash, "hex");
        const b = Buffer.from(storedKeyHash, "hex");

        return timingSafeEqual(a, b);
    }
}

// ─── Algorithm: BV Factory "Forge" FNV-1a (deterministic, Q-SYS compatible) ──

/**
 * BV Factory standard license module, shared by PulseForge, SelectForge and
 * future Forge plugins. Single-round FNV-1a with a 3-stage cascade — this is
 * NOT the same scheme as LightForge/TimeForge (two-round licHash with length
 * marker and avalanche fold).
 *
 * Matches the Lua 5.3 native bitwise reference implementation embedded in the
 * plugins (fnv1a/computeKey): only the key prefix and the salt vary.
 */
export class ForgeFnv1aAlgorithm implements LicenseAlgorithm {
    readonly name: string;
    readonly label: string;
    readonly description: string;

    private readonly keyPrefix: string;
    private readonly envVarName: string;

    constructor(opts: {
        name: string;
        label: string;
        keyPrefix: string;
        envVarName: string;
        pluginName: string;
    }) {
        this.name = opts.name;
        this.label = opts.label;
        this.keyPrefix = opts.keyPrefix;
        this.envVarName = opts.envVarName;
        this.description = `Algorithme déterministe compatible Q-SYS ${opts.pluginName}. Clé ${opts.keyPrefix}-XXXX-XXXX-XXXX.`;
    }

    /**
     * Separate secret from LICENSE_MASTER_SECRET because the Q-SYS plugin
     * uses this exact salt (LIC_SALT) for offline validation — it must
     * match byte-for-byte.
     */
    private getSecret(): string {
        const secret = process.env[this.envVarName];
        if (!secret) {
            throw new Error(
                `${this.envVarName} environment variable is required.`
            );
        }
        return secret;
    }

    private mul32(a: number, b: number): number {
        const aLo = a % 65536;
        const aHi = (a - aLo) / 65536;
        const bLo = b % 65536;
        const bHi = (b - bLo) / 65536;
        const mid = (aHi * bLo + aLo * bHi) % 65536;
        return (mid * 65536 + aLo * bLo) % 4294967296;
    }

    /**
     * Single-round FNV-1a, matching the plugins' fnv1a exactly
     * (Lua 5.3 native bitwise: h = (h ~ byte); h = (h * 16777619) & 0xFFFFFFFF).
     * Unlike LightForge/TimeForge there is no length marker and no second
     * avalanche round — the input string IS the whole message.
     */
    private fnv1a(data: string): number {
        let h = 2166136261;
        for (let i = 0; i < data.length; i++) {
            h = (h ^ data.charCodeAt(i)) >>> 0;
            h = this.mul32(h, 16777619);
        }
        return h >>> 0;
    }

    private hex8(n: number): string {
        return (n >>> 0).toString(16).toUpperCase().padStart(8, "0");
    }

    /**
     * 3-stage cascade (computeKey): each group depends on the previous
     * hash, so no single group leaks enough to reconstruct the key.
     */
    private computeKey(coreId: string, secret: string): string {
        const h1 = this.fnv1a(`${secret}|${coreId}|${secret}`);
        const h2 = this.fnv1a(`s2:${secret}${this.hex8(h1)}`);
        const h3 = this.fnv1a(`s3:${secret}${this.hex8(h2)}`);
        const p = (n: number) =>
            (n % 65536).toString(16).toUpperCase().padStart(4, "0");
        return `${this.keyPrefix}-${p(h1)}-${p(h2)}-${p(h3)}`;
    }

    generate(productId: string, coreId: string): LicenseResult {
        // coreId is NOT uppercased — the Lua plugin passes System.LockingId
        // as-is, and the key must match byte-for-byte.
        const secret = this.getSecret();
        const licenseKey = this.computeKey(coreId, secret);

        const productSecret = deriveProductSecret(productId);
        const keyHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        return {
            licenseKey,
            salt: "", // deterministic algorithm — no salt needed
            keyHash,
            algorithmVersion: this.name,
        };
    }

    verify(
        licenseKey: string,
        productId: string,
        storedKeyHash: string
    ): boolean {
        const productSecret = deriveProductSecret(productId);

        const computedHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        if (computedHash.length !== storedKeyHash.length) return false;

        const a = Buffer.from(computedHash, "hex");
        const b = Buffer.from(storedKeyHash, "hex");

        return timingSafeEqual(a, b);
    }
}

// ─── Algorithm: ScreenBridge keyed FNV-1a 48-bit (deterministic, Q-SYS) ─────

/**
 * ScreenBridge variant of the BV Factory license engine (LICENSE.* in
 * ScreenBridge.qplug): keyed FNV-1a 32-bit over `input|seed`, folded into a
 * 48-bit space, then a 3-stage cascade with three distinct seeds. Key format
 * SBRG-XXXX-XXXX-XXXX (12 hex chars of the final 48-bit hash).
 *
 * SCREENBRIDGE_LICENSE_SECRET holds the three seeds comma-separated, matching
 * the sealed seed tables in the plugin byte-for-byte.
 */
export class ScreenBridgeFnv1aAlgorithm implements LicenseAlgorithm {
    readonly name = "screenbridge-fnv1a-v1";
    readonly label = "ScreenBridge FNV-1a";
    readonly description =
        "Algorithme déterministe compatible Q-SYS ScreenBridge (3 seeds, 48 bits). Clé SBRG-XXXX-XXXX-XXXX.";

    private getSeeds(): [string, string, string] {
        const secret = process.env.SCREENBRIDGE_LICENSE_SECRET;
        if (!secret) {
            throw new Error(
                "SCREENBRIDGE_LICENSE_SECRET environment variable is required."
            );
        }
        const seeds = secret.split(",");
        if (seeds.length !== 3) {
            throw new Error(
                "SCREENBRIDGE_LICENSE_SECRET must contain 3 comma-separated seeds."
            );
        }
        return seeds as [string, string, string];
    }

    private mul32(a: number, b: number): number {
        const aLo = a % 65536;
        const aHi = (a - aLo) / 65536;
        const bLo = b % 65536;
        const bHi = (b - bLo) / 65536;
        const mid = (aHi * bLo + aLo * bHi) % 65536;
        return (mid * 65536 + aLo * bLo) % 4294967296;
    }

    /**
     * LICENSE.fnv1a_keyed: FNV-1a 32-bit over `input|key`, then fold into a
     * 48-bit space (rotate-13 mix + high-16 XOR). Returns a number < 2^48
     * (exact in JS doubles).
     */
    private fnv1aKeyed(input: string, key: string): number {
        const combined = `${input}|${key}`;
        let hash = 0x811c9dc5;
        for (let i = 0; i < combined.length; i++) {
            hash = (hash ^ combined.charCodeAt(i)) >>> 0;
            hash = this.mul32(hash, 0x01000193);
        }
        const rot = ((hash << 13) | (hash >>> 19)) >>> 0;
        const mix = (hash ^ rot) >>> 0;
        const hi = (((hash >>> 16) & 0xffff) ^ ((mix >>> 8) & 0xffff)) >>> 0;
        return hi * 4294967296 + mix; // (hi << 32) | mix, 48-bit
    }

    private hex12(n: number): string {
        return n.toString(16).toUpperCase().padStart(12, "0");
    }

    /** LICENSE.cascade + LICENSE.format_key */
    private computeKey(coreId: string): string {
        const [s1, s2, s3] = this.getSeeds();
        const h1 = this.fnv1aKeyed(coreId, s1);
        const h2 = this.fnv1aKeyed(this.hex12(h1), s2);
        const h3 = this.fnv1aKeyed(this.hex12(h2), s3);
        const body = this.hex12(h3);
        return `SBRG-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
    }

    generate(productId: string, coreId: string): LicenseResult {
        // coreId is NOT uppercased — the Lua plugin passes System.LockingId
        // as-is, and the key must match byte-for-byte.
        const licenseKey = this.computeKey(coreId);

        const productSecret = deriveProductSecret(productId);
        const keyHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        return {
            licenseKey,
            salt: "", // deterministic algorithm — no salt needed
            keyHash,
            algorithmVersion: this.name,
        };
    }

    verify(
        licenseKey: string,
        productId: string,
        storedKeyHash: string
    ): boolean {
        const productSecret = deriveProductSecret(productId);

        const computedHash = createHmac("sha256", productSecret)
            .update(`verify:${licenseKey}`)
            .digest("hex");

        if (computedHash.length !== storedKeyHash.length) return false;

        const a = Buffer.from(computedHash, "hex");
        const b = Buffer.from(storedKeyHash, "hex");

        return timingSafeEqual(a, b);
    }
}

// ─── Registry (by algorithm name) ───────────────────────────────────────────

const algorithmsByName = new Map<string, LicenseAlgorithm>();

function register(algo: LicenseAlgorithm) {
    algorithmsByName.set(algo.name, algo);
}

// Register all built-in algorithms
register(new HmacSha256Algorithm());
register(new Sha512ShortAlgorithm());
register(new NumericKeyAlgorithm());
register(
    new TwoRoundFnv1aAlgorithm({
        name: "lightforge-fnv1a-v1",
        label: "LightForge FNV-1a",
        keyPrefix: "DMXR",
        envVarName: "LIGHTFORGE_LICENSE_SECRET",
        pluginName: "LightForge",
    })
);
register(
    new TwoRoundFnv1aAlgorithm({
        name: "timeforge-fnv1a-v1",
        label: "TimeForge FNV-1a",
        keyPrefix: "TFGE",
        envVarName: "TIMEFORGE_LICENSE_SECRET",
        pluginName: "TimeForge",
    })
);
register(
    new TwoRoundFnv1aAlgorithm({
        name: "routebridge-fnv1a-v1",
        label: "RouteBridge FNV-1a",
        keyPrefix: "RB",
        envVarName: "ROUTEBRIDGE_LICENSE_SECRET",
        pluginName: "RouteBridge",
    })
);
register(
    new ForgeFnv1aAlgorithm({
        name: "pulseforge-fnv1a-v1",
        label: "PulseForge FNV-1a",
        keyPrefix: "PLF",
        envVarName: "PULSEFORGE_LICENSE_SECRET",
        pluginName: "PulseForge",
    })
);
register(
    new ForgeFnv1aAlgorithm({
        name: "selectforge-fnv1a-v1",
        label: "SelectForge FNV-1a",
        keyPrefix: "SLF",
        envVarName: "SELECTFORGE_LICENSE_SECRET",
        pluginName: "SelectForge",
    })
);
register(new ScreenBridgeFnv1aAlgorithm());

/** Default algorithm used when a product has no specific assignment. */
export const DEFAULT_ALGORITHM_NAME = "hmac-sha256-v1";

/**
 * Register a custom license algorithm by its name.
 * Call at module scope so registration happens before any generation/verification.
 */
export function registerAlgorithm(algorithm: LicenseAlgorithm): void {
    algorithmsByName.set(algorithm.name, algorithm);
}

/**
 * Get a license algorithm by its name.
 * Returns the default HMAC-SHA256 if the name is unknown.
 */
export function getAlgorithmByName(name: string): LicenseAlgorithm {
    return algorithmsByName.get(name) ?? algorithmsByName.get(DEFAULT_ALGORITHM_NAME)!;
}

/**
 * List all registered algorithms (for admin UI).
 */
export function listAlgorithms(): { name: string; label: string; description: string }[] {
    return Array.from(algorithmsByName.values()).map((a) => ({
        name: a.name,
        label: a.label,
        description: a.description,
    }));
}
