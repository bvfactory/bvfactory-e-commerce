# LightForge License Algorithm — Design Spec

## Summary

Add a new `LightForgeFnv1aAlgorithm` to the existing pluggable license system in `src/lib/license-algorithms.ts`. This algorithm is a faithful TypeScript port of the FNV-1a keyed hash with 3-stage cascade used by the LightForge Q-SYS plugin (documented in `TECHNICAL_REFERENCE.md` §6).

The algorithm is **deterministic** — a given Core ID always produces the same license key `DMXR-XXXX-XXXX-XXXX`. This differs from the existing algorithms which use random salts.

## Scope

- **In scope:** New algorithm class, registration, env var for secret, Supabase migration to assign algorithm to LightForge product
- **Out of scope:** Changes to checkout flow, activation UI, admin dashboard, email templates — all of these already work with any registered algorithm via the existing pluggable architecture

## Algorithm: `lightforge-fnv1a-v1`

### Secret

- Stored in `process.env.LIGHTFORGE_LICENSE_SECRET`
- Value: the same secret used by the Lua plugin (`DMXRecPlay2026#Bz`)
- Never hardcoded in source

### Core Functions (TypeScript ports of Lua originals)

#### `mul32(a, b)` — Safe 32-bit multiply

Multiplies two numbers modulo 2^32 using 16-bit decomposition to avoid floating-point overflow. Direct port of the Lua version.

#### `licHash(id, secret)` — FNV-1a two-round hash

1. Construct input: `secret|id|lengthHex|secret`
2. Round 1: byte-by-byte XOR with FNV offset basis (2166136261), multiply by FNV prime (16777619)
3. Round 2: fold hex representation of round-1 result back through the same process (avalanche)
4. Returns 32-bit unsigned integer

#### `formatLicKey(hash, secret)` — 3-stage cascade

1. `h1 = hash` (from licHash) → lower 16 bits → part 1
2. `h2 = licHash(hex(h1), "s2:" + secret)` → lower 16 bits → part 2
3. `h3 = licHash(hex(h2), "s3:" + secret)` → lower 16 bits → part 3
4. Returns `DMXR-{p1}-{p2}-{p3}` (4-char uppercase hex per part)

#### `generate(productId, coreId)` → `LicenseResult`

1. Read secret from env
2. `h1 = licHash(coreId, secret)`
3. `key = formatLicKey(h1, secret)`
4. `keyHash = HMAC-SHA256(productSecret, "verify:" + key)` — for DB storage consistency
5. Return `{ licenseKey: key, salt: "", keyHash, algorithmVersion: "lightforge-fnv1a-v1" }`

Note: `salt` is empty string because the algorithm is deterministic, but the field is required by `LicenseResult`.

#### `verify(licenseKey, productId, storedKeyHash)` → `boolean`

Recompute HMAC-SHA256 of `"verify:" + licenseKey` with the product secret and compare in constant-time against `storedKeyHash`. Same pattern as existing algorithms.

### Key Format

```
DMXR-XXXX-XXXX-XXXX
```

Prefix `DMXR` + 3 groups of 4 uppercase hex digits. Example: `DMXR-A3F1-7B2C-E409`

## Files Modified

| File | Change |
|------|--------|
| `src/lib/license-algorithms.ts` | Add `LightForgeFnv1aAlgorithm` class + register it |
| `supabase/migrations/XXXXXX_lightforge_algorithm.sql` | Update `product_settings` row for LightForge to set `algorithm_id = 'lightforge-fnv1a-v1'` |
| `.env.example` (if exists) | Add `LIGHTFORGE_LICENSE_SECRET` placeholder |

## Verification

- Unit test: generate a key for a known Core ID and compare against the Lua keygen output
- The Lua standalone keygen (§12 of TECHNICAL_REFERENCE.md) can be used as reference oracle
- Constant-time comparison must be used for all key comparisons

## Environment Variable

```
LIGHTFORGE_LICENSE_SECRET=DMXRecPlay2026#Bz
```

Must be set in Vercel environment variables for production and preview deployments.
