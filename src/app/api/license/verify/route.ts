import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyLicenseKey } from "@/lib/license";

// In-memory rate limiter (per-IP, resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per minute per IP

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

/**
 * POST /api/license/verify
 *
 * Called by Q-SYS plugins to validate a license key.
 * Body: { licenseKey: string, coreId: string, productId: string }
 *
 * Returns: { valid: boolean, status?: string }
 */
export async function POST(req: Request) {
    try {
        // Rate limiting
        const ip = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "unknown";

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { valid: false, error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const { licenseKey, coreId, productId } = await req.json();

        if (!licenseKey || !coreId || !productId) {
            return NextResponse.json(
                { valid: false, error: "Missing required fields." },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Look up the license by key and verify it matches the claimed core+product
        const { data: license, error } = await supabase
            .from("licenses")
            .select("key_hash, product_id, core_id, status, algorithm_version")
            .eq("license_key", licenseKey)
            .eq("product_id", productId)
            .eq("core_id", coreId.toUpperCase())
            .single();

        if (error || !license) {
            return NextResponse.json({ valid: false }, { status: 200 });
        }

        if (license.status !== "active") {
            return NextResponse.json(
                { valid: false, status: license.status },
                { status: 200 }
            );
        }

        // Cryptographic verification — use the algorithm that generated this license
        const isValid = verifyLicenseKey(licenseKey, productId, license.key_hash, license.algorithm_version);

        if (isValid) {
            // Mark first activation time
            await supabase
                .from("licenses")
                .update({ activated_at: new Date().toISOString() })
                .eq("license_key", licenseKey)
                .is("activated_at", null);
        }

        return NextResponse.json({ valid: isValid, status: license.status });
    } catch (error) {
        console.error("License verify error:", error);
        return NextResponse.json(
            { valid: false, error: "Internal server error." },
            { status: 500 }
        );
    }
}
