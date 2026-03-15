import { createHmac, randomBytes } from "crypto";

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
    generate(productId: string, coreId: string): LicenseResult;
    verify(licenseKey: string, productId: string, storedKeyHash: string): boolean;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function getMasterSecret(): string {
    const secret = process.env.LICENSE_MASTER_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
        throw new Error("LICENSE_MASTER_SECRET environment variable is required in production.");
    }
    return secret || "dev-fallback-secret-not-for-production";
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

// ─── Default algorithm (current HMAC-SHA256) ─────────────────────────────────

export class HmacSha256Algorithm implements LicenseAlgorithm {
    readonly name = "hmac-sha256-v1";

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

// ─── Registry ────────────────────────────────────────────────────────────────

const DEFAULT_ALGORITHM: LicenseAlgorithm = new HmacSha256Algorithm();

const algorithmRegistry = new Map<string, LicenseAlgorithm>();

/**
 * Register a custom license algorithm for a specific product.
 * Call at module scope so registration happens before any generation/verification.
 */
export function registerAlgorithm(productId: string, algorithm: LicenseAlgorithm): void {
    algorithmRegistry.set(productId, algorithm);
}

/**
 * Get the license algorithm for a product.
 * Returns the registered algorithm or the default HMAC-SHA256.
 */
export function getAlgorithm(productId: string): LicenseAlgorithm {
    return algorithmRegistry.get(productId) ?? DEFAULT_ALGORITHM;
}
