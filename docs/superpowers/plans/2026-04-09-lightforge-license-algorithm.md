# LightForge License Algorithm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the LightForge FNV-1a license algorithm to the existing pluggable license system so that purchasing LightForge generates the correct `DMXR-XXXX-XXXX-XXXX` key compatible with the Q-SYS plugin's offline validation.

**Architecture:** A new `LightForgeFnv1aAlgorithm` class implementing the existing `LicenseAlgorithm` interface, registered alongside the 3 existing algorithms. The algorithm is a faithful TypeScript port of the Lua FNV-1a keyed hash with 3-stage cascade. Secret read from `LIGHTFORGE_LICENSE_SECRET` env var.

**Tech Stack:** TypeScript, Node.js crypto (HMAC for keyHash storage), Supabase migration

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/license-algorithms.ts` | Modify | Add `LightForgeFnv1aAlgorithm` class + register it |
| `supabase/migrations/20260409_lightforge_algorithm.sql` | Create | Set `algorithm_id = 'lightforge-fnv1a-v1'` on LightForge product_settings |
| `scripts/verify-lightforge-keygen.mjs` | Create | One-off verification script to validate output matches Lua reference |

---

### Task 1: Implement LightForgeFnv1aAlgorithm

**Files:**
- Modify: `src/lib/license-algorithms.ts`

- [ ] **Step 1: Add the LightForge algorithm class after NumericKeyAlgorithm**

Add this code in `src/lib/license-algorithms.ts` after the `NumericKeyAlgorithm` class (before the Registry section):

```typescript
// ─── Algorithm: LightForge FNV-1a (deterministic, Q-SYS compatible) ────────

export class LightForgeFnv1aAlgorithm implements LicenseAlgorithm {
    readonly name = "lightforge-fnv1a-v1";
    readonly label = "LightForge FNV-1a";
    readonly description =
        "Algorithme déterministe compatible Q-SYS LightForge. Clé DMXR-XXXX-XXXX-XXXX.";

    private getSecret(): string {
        const secret = process.env.LIGHTFORGE_LICENSE_SECRET;
        if (!secret) {
            throw new Error(
                "LIGHTFORGE_LICENSE_SECRET environment variable is required."
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
            const b = data.charCodeAt(i);
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
            h = h - (h % 256) + xor8;
            h = this.mul32(h, 16777619); // FNV-1a prime
        }

        // Round 2: avalanche — fold hex representation back through
        const r2 = (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
        for (let i = 0; i < r2.length; i++) {
            const b = r2.charCodeAt(i);
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
            h = h - (h % 256) + xor8;
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
        return `DMXR-${p1}-${p2}-${p3}`;
    }

    generate(productId: string, coreId: string): LicenseResult {
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
            salt: "",
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
```

- [ ] **Step 2: Register the algorithm**

In the same file, in the "Register all built-in algorithms" section, add this line after `register(new NumericKeyAlgorithm());`:

```typescript
register(new LightForgeFnv1aAlgorithm());
```

- [ ] **Step 3: Make `deriveProductSecret` accessible to the new class**

The `deriveProductSecret` function is already a module-level function in `license-algorithms.ts`. Verify it is accessible (not inside another class). It should be — it's used by all 3 existing algorithms at module scope. No change needed if so.

- [ ] **Step 4: Commit**

```bash
git add src/lib/license-algorithms.ts
git commit -m "feat: add LightForge FNV-1a license algorithm"
```

---

### Task 2: Verification script

**Files:**
- Create: `scripts/verify-lightforge-keygen.mjs`

- [ ] **Step 1: Create the verification script**

This script replicates the Lua standalone keygen from TECHNICAL_REFERENCE.md §12 in pure JS (no imports), then compares its output against the TypeScript implementation. Uses the known secret directly for testing.

```javascript
#!/usr/bin/env node
/**
 * Verify that the TypeScript LightForge keygen matches the Lua reference.
 * Run: node scripts/verify-lightforge-keygen.mjs
 */

// ── Pure-JS reference implementation (direct port of Lua §12) ──

const SECRET = "DMXRecPlay2026#Bz";

function mul32(a, b) {
    const aLo = a % 65536;
    const aHi = (a - aLo) / 65536;
    const bLo = b % 65536;
    const bHi = (b - bLo) / 65536;
    const mid = (aHi * bLo + aLo * bHi) % 65536;
    return (mid * 65536 + aLo * bLo) % 4294967296;
}

function licHash(id, secret) {
    let h = 2166136261;
    const salt = secret || SECRET;
    const lenHex = id.length.toString(16).toUpperCase().padStart(2, "0");
    const data = salt + "|" + id + "|" + lenHex + "|" + salt;

    for (let i = 0; i < data.length; i++) {
        const b = data.charCodeAt(i);
        let hm = h % 256, bm = b % 256;
        let xor8 = 0, p = 1;
        for (let bit = 0; bit < 8; bit++) {
            const ha = hm % 2, ba = bm % 2;
            if (ha !== ba) xor8 += p;
            hm = Math.floor(hm / 2);
            bm = Math.floor(bm / 2);
            p *= 2;
        }
        h = h - (h % 256) + xor8;
        h = mul32(h, 16777619);
    }

    const r2 = (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
    for (let i = 0; i < r2.length; i++) {
        const b = r2.charCodeAt(i);
        let hm = h % 256, bm = b % 256;
        let xor8 = 0, p = 1;
        for (let bit = 0; bit < 8; bit++) {
            const ha = hm % 2, ba = bm % 2;
            if (ha !== ba) xor8 += p;
            hm = Math.floor(hm / 2);
            bm = Math.floor(bm / 2);
            p *= 2;
        }
        h = h - (h % 256) + xor8;
        h = mul32(h, 16777619);
    }

    return h >>> 0;
}

function generateKey(coreID) {
    const h1 = licHash(coreID, SECRET);
    const h2 = licHash((h1 >>> 0).toString(16).toUpperCase().padStart(8, "0"), "s2:" + SECRET);
    const h3 = licHash((h2 >>> 0).toString(16).toUpperCase().padStart(8, "0"), "s3:" + SECRET);
    const p1 = (h1 % 65536).toString(16).toUpperCase().padStart(4, "0");
    const p2 = (h2 % 65536).toString(16).toUpperCase().padStart(4, "0");
    const p3 = (h3 % 65536).toString(16).toUpperCase().padStart(4, "0");
    return `DMXR-${p1}-${p2}-${p3}`;
}

// ── Test vectors ──

const testCases = [
    "EMULATION",
    "ABC123",
    "CORE-1234-5678-ABCD",
    "QSC-Q-SYS-CORE-110F",
    "X",
    "A".repeat(64),
];

console.log("LightForge Keygen Verification");
console.log("==============================\n");

let allPass = true;
for (const coreID of testCases) {
    const key = generateKey(coreID);
    const formatOk = /^DMXR-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(key);

    // Determinism check: same input → same output
    const key2 = generateKey(coreID);
    const deterministicOk = key === key2;

    const pass = formatOk && deterministicOk;
    if (!pass) allPass = false;

    console.log(`Core ID: ${coreID.length > 20 ? coreID.substring(0, 20) + "..." : coreID}`);
    console.log(`  Key:           ${key}`);
    console.log(`  Format OK:     ${formatOk ? "PASS" : "FAIL"}`);
    console.log(`  Deterministic: ${deterministicOk ? "PASS" : "FAIL"}`);
    console.log();
}

console.log(allPass ? "ALL TESTS PASSED" : "SOME TESTS FAILED");
process.exit(allPass ? 0 : 1);
```

- [ ] **Step 2: Run the verification script**

Run: `node scripts/verify-lightforge-keygen.mjs`
Expected: all test cases PASS with valid `DMXR-XXXX-XXXX-XXXX` format and deterministic output.

- [ ] **Step 3: Cross-validate with Lua if available**

If `lua` is installed, run the standalone keygen from TECHNICAL_REFERENCE.md §12 against the same Core IDs and compare outputs:

```bash
# Optional — only if lua is available
lua -e '
-- paste keygen from §12 here
' "ABC123"
```

Compare the output key with the JS reference output for `ABC123`. They must match exactly.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-lightforge-keygen.mjs
git commit -m "test: add LightForge keygen verification script"
```

---

### Task 3: Supabase migration

**Files:**
- Create: `supabase/migrations/20260409_lightforge_algorithm.sql`

- [ ] **Step 1: Find the LightForge product ID**

Query Supabase to get the LightForge product UUID:

```bash
# Use the Supabase MCP tool: execute_sql
# SELECT id, name FROM products WHERE name ILIKE '%lightforge%';
```

- [ ] **Step 2: Create the migration**

Using the product ID from step 1, create the migration file:

```sql
-- Assign the LightForge FNV-1a algorithm to the LightForge product
UPDATE product_settings
SET algorithm_id = 'lightforge-fnv1a-v1'
WHERE product_id = '<LIGHTFORGE_PRODUCT_UUID>';

-- If no product_settings row exists yet, insert one
INSERT INTO product_settings (product_id, algorithm_id)
SELECT '<LIGHTFORGE_PRODUCT_UUID>', 'lightforge-fnv1a-v1'
WHERE NOT EXISTS (
    SELECT 1 FROM product_settings WHERE product_id = '<LIGHTFORGE_PRODUCT_UUID>'
);
```

Replace `<LIGHTFORGE_PRODUCT_UUID>` with the actual UUID from step 1.

- [ ] **Step 3: Apply the migration**

Use the Supabase MCP tool `apply_migration` to run the SQL.

- [ ] **Step 4: Verify**

Query to confirm:

```sql
SELECT ps.algorithm_id, p.name
FROM product_settings ps
JOIN products p ON p.id = ps.product_id
WHERE p.name ILIKE '%lightforge%';
```

Expected: `algorithm_id = 'lightforge-fnv1a-v1'`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260409_lightforge_algorithm.sql
git commit -m "feat: assign LightForge FNV-1a algorithm to product"
```

---

### Task 4: Set environment variable

- [ ] **Step 1: Add LIGHTFORGE_LICENSE_SECRET to Vercel**

```bash
vercel env add LIGHTFORGE_LICENSE_SECRET production preview development
# When prompted, enter: DMXRecPlay2026#Bz
```

- [ ] **Step 2: Pull env to local**

```bash
vercel env pull .env.local
```

- [ ] **Step 3: Verify the build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Final commit (if any .env.example changes)**

No commit needed if there's no `.env.example` file (there isn't one in this project).
