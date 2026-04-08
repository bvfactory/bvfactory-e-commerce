import { randomBytes } from "crypto";
import {
    getAlgorithmByName,
    DEFAULT_ALGORITHM_NAME,
} from "./license-algorithms";
import { createAdminClient } from "@/lib/supabase/admin";

export type { LicenseResult, LicenseAlgorithm } from "./license-algorithms";
export { registerAlgorithm, getAlgorithmByName, listAlgorithms, DEFAULT_ALGORITHM_NAME } from "./license-algorithms";

/**
 * Resolve the algorithm name assigned to a product in product_settings.
 * Falls back to the default algorithm if not set.
 */
export async function getProductAlgorithmName(productId: string): Promise<string> {
    const supabase = createAdminClient();
    const { data } = await supabase
        .from("product_settings")
        .select("algorithm_id")
        .eq("product_id", productId)
        .maybeSingle();

    return data?.algorithm_id || DEFAULT_ALGORITHM_NAME;
}

/**
 * Generate a cryptographically secure license key for a product + Core ID.
 * Resolves the per-product algorithm from DB (async).
 */
export async function generateLicenseKey(productId: string, coreId: string) {
    const algorithmName = await getProductAlgorithmName(productId);
    return getAlgorithmByName(algorithmName).generate(productId, coreId);
}

/**
 * Verify a license key server-side.
 * Uses the algorithm_version stored on the license record (not the current product config)
 * to ensure backward compatibility when algorithms change.
 */
export function verifyLicenseKey(
    licenseKey: string,
    productId: string,
    storedKeyHash: string,
    algorithmVersion?: string
): boolean {
    const algoName = algorithmVersion || DEFAULT_ALGORITHM_NAME;
    return getAlgorithmByName(algoName).verify(licenseKey, productId, storedKeyHash);
}

/**
 * Generate a unique activation code for an order.
 */
export function generateActivationCode(): string {
    const part1 = randomBytes(3).toString("hex").toUpperCase();
    const part2 = randomBytes(3).toString("hex").toUpperCase();
    return `BVFA-${part1}-${part2}`;
}
