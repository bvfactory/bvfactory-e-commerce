import { createHmac, randomBytes } from "crypto";

/**
 * BVFactory License Engine — Server-side only
 *
 * Each product has its own derived HMAC secret key.
 * Each license includes a random salt, making keys non-deterministic.
 * Verification is only possible server-side via API.
 */

/**
 * Get the master secret — throws at runtime (not build time) if missing in production.
 */
function getMasterSecret(): string {
    const secret = process.env.LICENSE_MASTER_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
        throw new Error("LICENSE_MASTER_SECRET environment variable is required in production.");
    }
    return secret || "dev-fallback-secret-not-for-production";
}

/**
 * Derive a unique HMAC secret for a specific product.
 * Even if one product's key leaks, others remain safe.
 */
function deriveProductSecret(productId: string): string {
    return createHmac("sha256", getMasterSecret())
        .update(`bvfactory:product-secret:${productId}`)
        .digest("hex");
}

/**
 * Generate a cryptographically secure license key.
 *
 * key = HMAC-SHA256(productSecret, coreId + ":" + salt)
 * Formatted as: BVFA-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
 *
 * The salt is stored alongside the key in the database,
 * enabling re-verification without exposing the algorithm.
 */
export function generateLicenseKey(productId: string, coreId: string): {
    licenseKey: string;
    salt: string;
    keyHash: string;
} {
    const salt = randomBytes(16).toString("hex");
    const productSecret = deriveProductSecret(productId);

    const rawHash = createHmac("sha256", productSecret)
        .update(`${coreId.toUpperCase()}:${salt}`)
        .digest("hex");

    // Format: BVFA-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (32 hex chars)
    const keyBody = rawHash.substring(0, 32).toUpperCase();
    const licenseKey = `BVFA-${keyBody.match(/.{4}/g)!.join("-")}`;

    // Store a separate verification hash (double-HMAC) so we never
    // need to recompute from coreId+salt during verify — we compare hashes.
    const keyHash = createHmac("sha256", productSecret)
        .update(`verify:${licenseKey}`)
        .digest("hex");

    return { licenseKey, salt, keyHash };
}

/**
 * Verify a license key server-side.
 * Recomputes the verification hash and compares with stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyLicenseKey(
    licenseKey: string,
    productId: string,
    storedKeyHash: string
): boolean {
    const productSecret = deriveProductSecret(productId);

    const computedHash = createHmac("sha256", productSecret)
        .update(`verify:${licenseKey}`)
        .digest("hex");

    // Timing-safe comparison to prevent timing attacks
    if (computedHash.length !== storedKeyHash.length) return false;

    const a = Buffer.from(computedHash, "hex");
    const b = Buffer.from(storedKeyHash, "hex");

    return timingSafeEqual(a, b);
}

/**
 * Constant-time string comparison.
 * Prevents timing attacks that could leak information about valid keys.
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i]! ^ b[i]!;
    }
    return result === 0;
}

/**
 * Generate a unique activation code for an order.
 */
export function generateActivationCode(): string {
    const part1 = randomBytes(3).toString("hex").toUpperCase();
    const part2 = randomBytes(3).toString("hex").toUpperCase();
    return `BVFA-${part1}-${part2}`;
}
