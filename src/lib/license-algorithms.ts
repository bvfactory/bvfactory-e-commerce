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

// ─── Registry (by algorithm name) ───────────────────────────────────────────

const algorithmsByName = new Map<string, LicenseAlgorithm>();

function register(algo: LicenseAlgorithm) {
    algorithmsByName.set(algo.name, algo);
}

// Register all built-in algorithms
register(new HmacSha256Algorithm());
register(new Sha512ShortAlgorithm());
register(new NumericKeyAlgorithm());

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
