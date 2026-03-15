import { randomBytes } from "crypto";
import { getAlgorithm } from "./license-algorithms";

export type { LicenseResult, LicenseAlgorithm } from "./license-algorithms";
export { registerAlgorithm, getAlgorithm } from "./license-algorithms";

/**
 * Generate a cryptographically secure license key for a product + Core ID.
 * Delegates to the per-product algorithm (or the default HMAC-SHA256).
 */
export function generateLicenseKey(productId: string, coreId: string) {
    return getAlgorithm(productId).generate(productId, coreId);
}

/**
 * Verify a license key server-side.
 * Delegates to the per-product algorithm (or the default HMAC-SHA256).
 */
export function verifyLicenseKey(
    licenseKey: string,
    productId: string,
    storedKeyHash: string
): boolean {
    return getAlgorithm(productId).verify(licenseKey, productId, storedKeyHash);
}

/**
 * Generate a unique activation code for an order.
 */
export function generateActivationCode(): string {
    const part1 = randomBytes(3).toString("hex").toUpperCase();
    const part2 = randomBytes(3).toString("hex").toUpperCase();
    return `BVFA-${part1}-${part2}`;
}
