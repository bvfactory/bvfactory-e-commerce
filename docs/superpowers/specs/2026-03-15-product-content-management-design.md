# Product Content Management — Admin Back-Office

## Context

BVFactory sells Q-SYS plugins. Product data is currently hardcoded in `MOCK_PRODUCTS` (`/src/data/products.tsx`). The admin back-office already supports price/promo editing and plugin file uploads on `/admin/plugins`. The goal is to make **all** product fields editable from the back-office, and consolidate everything (content, pricing, promos, plugin files, manuals) into a single per-product page.

## Architecture: JSONB Overlay

Extend the existing `product_settings` table with a `content JSONB` column. This column stores **only overridden fields**. At runtime, the storefront merges `MOCK_PRODUCTS` defaults with DB overrides via a deep merge.

### Why overlay instead of full DB migration

- No data migration needed — existing MOCK_PRODUCTS serve as seed/fallback
- Consistent with the existing price/promo overlay pattern
- Schema-flexible — new fields require no ALTER TABLE
- Rollback is trivial — delete the DB row to restore defaults

## Database Changes

```sql
ALTER TABLE product_settings
  ADD COLUMN content JSONB DEFAULT '{}'::jsonb;
```

No other schema changes. The `content` JSONB can store any subset of `ProductType` fields:

```typescript
// Fields storable in content JSONB
{
  tagline?: string;
  description?: string;
  longDescription?: string;
  features?: string[];
  specs?: Record<string, string>;
  screenshots?: string[];          // Supabase Storage URLs
  versionHistory?: VersionHistory[];
  faq?: FaqItem[];
  manualUrl?: string;              // Supabase Storage URL
  videoUrl?: string;
  compatibility?: {
    minQsysVersion?: string;
    supportedCores?: string[];
    os?: string;
  };
  compatibleBrands?: CompatibleBrand[];
}
```

## Supabase Storage

### New bucket: `product-assets`

```
product-assets/
├── lightforge/
│   ├── screenshots/
│   │   ├── 1.webp
│   │   └── 2.webp
│   └── manual.pdf
├── showmind/
│   └── ...
```

Public bucket (screenshots and manuals need public URLs for storefront display). Files organized by `product.id`. Note: draft edits are visible immediately via URL if someone knows the path — acceptable since this is a small catalog, not user-generated content.

The existing `plugins` bucket remains unchanged for `.qplugx` files.

### Upload validation (server-side)

- **Screenshots**: max 5MB per file, MIME whitelist: `image/png`, `image/jpeg`, `image/webp`. No server-side resizing — admin is responsible for reasonable image sizes (documented in UI).
- **Manuals**: max 20MB, MIME: `application/pdf`.
- **Plugin files**: existing validation (`.qplugx` extension check) unchanged.

## Admin Pages

### `/admin/plugins` — Product List (replaces current page)

Grid of product cards showing:
- Product icon + name
- Current price (with promo indicator if active)
- Plugin upload status (uploaded / missing)
- Edit button → navigates to `/admin/plugins/[id]`

### `/admin/plugins/[id]` — Product Detail Page (new)

Single page with all product management, organized in collapsible sections:

#### Section 1: Prix & Promotions
- Base price (cents input, formatted as euros)
- Promo toggle, percent, label
- Effective price display with strikethrough
- Reset to default price button
- _Migrated from current `/admin/plugins` inline editing_

#### Section 2: Informations générales
- Tagline (text input)
- Short description (text input)
- Long description (textarea, multi-line)
- Video URL (text input)
- Each field shows current value (DB override or MOCK_PRODUCTS default)
- Reset to default button per field

#### Section 3: Fonctionnalités
- Editable list of feature strings
- Add / remove / reorder (drag or up/down buttons)
- Reset to defaults button

#### Section 4: Images & Screenshots
- Current screenshots displayed as thumbnail grid
- Upload new images (multi-file, accept image/*)
- Drag-and-drop zone
- Delete individual screenshots
- Images uploaded to `product-assets/{id}/screenshots/`
- Reset to default (Unsplash) images

#### Section 5: Spécifications techniques
- Dynamic key-value editor
- Add / remove spec rows
- Reset to defaults

#### Section 6: Compatibilité
- Q-SYS version minimum (text input)
- Supported cores (editable tag list)
- OS requirement (optional text input)
- Reset to defaults

#### Section 7: Manuel
- Current manual status (uploaded / not uploaded / placeholder URL)
- Upload PDF
- Delete manual
- Files stored in `product-assets/{id}/manual.pdf`

#### Section 8: Changelog
- List of versions, most recent first
- Add new version entry (version string, date, list of changes)
- Edit existing entries
- Delete entries
- Reset to defaults

#### Section 9: FAQ
- List of Q&A pairs
- Add / edit / delete entries
- Reset to defaults

#### Section 10: Fichier Plugin (.qplugx)
- Upload status + file size + last updated
- Upload / replace .qplugx file
- Delete file
- _Migrated from current `/admin/plugins` page_

### Save behavior

Each section saves independently via PATCH. The page does NOT have a single global save button — each section has its own save. This avoids losing work and keeps interactions focused.

## API Routes

### `GET /api/admin/products/[id]`
Returns the fully merged product (MOCK_PRODUCTS defaults + DB overrides for pricing and content).

### `PATCH /api/admin/products/[id]`
Updates `product_settings` row. Accepts:
```typescript
{
  price_cents?: number;
  promo_percent?: number | null;
  promo_active?: boolean;
  promo_label?: string | null;
  content?: Partial<ProductContentOverrides>;
}
```

**Write path (PATCH):** The `content` field from the request body is **shallow-merged** into the existing `content` JSONB column — only the keys present in the request are updated. To remove a field override (revert to MOCK_PRODUCTS default), send the key with value `null`; the server strips null keys from the JSONB before saving.

**Row creation:** Uses `upsert` with `onConflict: "product_id"` — creates the `product_settings` row if it does not exist (same pattern as the existing pricing PATCH).

### `POST /api/admin/products/[id]/assets`
Multipart form upload. Fields:
- `type`: `"screenshot"` | `"manual"`
- `file`: the file

Returns the public URL of the uploaded asset.

### `DELETE /api/admin/products/[id]/assets`
Body: `{ type: "screenshot" | "manual", fileName?: string }`

Deletes the specified asset from Supabase Storage and removes the URL from the content JSONB.

**Operation order for uploads:** Storage upload first, then DB update. If DB update fails, attempt best-effort storage cleanup (delete the just-uploaded file). An orphaned file in storage is acceptable (low risk, can be cleaned manually).

**Operation order for deletes:** DB update first (remove URL from JSONB), then storage delete. An orphaned file is preferable to a broken URL reference.

Plugin file upload/delete continues to use the existing `/api/admin/plugins` route (POST/DELETE).

## Storefront Integration

### Updated `product-settings.ts`

New function `getFullProduct(productId)`:
```typescript
export async function getFullProduct(productId: string): Promise<ProductType> {
  const mock = MOCK_PRODUCTS.find(p => p.id === productId);
  if (!mock) throw new Error(`Unknown product: ${productId}`);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("price_cents, promo_percent, promo_active, promo_label, content")
    .eq("product_id", productId)
    .maybeSingle(); // returns null if no row (not an error)

  if (!data) return mock;
  const merged = data.content ? deepMerge(mock, data.content) : { ...mock };
  if (data.price_cents != null) merged.price_cents = data.price_cents;
  return merged;
}
```

`getAllProducts()` returns all products with content overrides merged. The storefront pages (`/plugins`, `/plugins/[id]`) call these functions instead of reading `MOCK_PRODUCTS` directly.

`getEffectivePrice()` remains unchanged — it already reads from `product_settings`.

### Deep merge behavior

- Scalar fields (string, number, boolean): DB value replaces default
- Array fields (features, screenshots, versionHistory, faq): DB value **replaces** default entirely (not appended)
- Object fields (specs, compatibility): shallow merge (DB keys override, missing keys fall through to default)
- `null` value in JSONB: key is absent — merge falls through to MOCK_PRODUCTS default

## Sidebar Navigation

No changes to sidebar. `/admin/plugins` link already exists. The route just becomes a product list instead of the current inline editor.

## Files to Create/Modify

### New files
- `/src/app/admin/(dashboard)/plugins/[id]/page.tsx` — product detail admin page
- `/src/app/api/admin/products/[id]/route.ts` — GET + PATCH product
- `/src/app/api/admin/products/[id]/assets/route.ts` — POST + DELETE assets

### Modified files
- `/src/app/admin/(dashboard)/plugins/page.tsx` — rewrite as product list grid
- `/src/lib/product-settings.ts` — add `getFullProduct()`, `getAllProducts()`, deep merge utility
- `/src/app/plugins/page.tsx` — use `getAllProducts()` instead of `MOCK_PRODUCTS`
- `/src/app/plugins/[id]/page.tsx` — use `getFullProduct()` instead of `MOCK_PRODUCTS.find()`
- `/supabase/schema.sql` — add `content JSONB` column to `product_settings`

### Deprecated (to remove)
- `/src/app/api/admin/pricing/route.ts` — functionality moves entirely to `products/[id]`

### Unchanged
- `/src/data/products.tsx` — remains as seed/fallback data
- `/src/app/api/admin/plugins/route.ts` — continues handling .qplugx uploads

## Content safety

All text fields (tagline, description, longDescription, features, FAQ answers, changelog entries) are **plain text only**. They are rendered via React's default text rendering (no `dangerouslySetInnerHTML`). No HTML or Markdown is parsed — this eliminates stored XSS risk.

## Single admin

Concurrent editing protection is not needed — there is a single admin user. Last-write-wins is acceptable.

## `compatibleBrands` logos

Brand logos remain as static SVG files in `/public/brands/`. The admin UI for `compatibleBrands` only allows selecting from existing brands (dropdown) or entering a brand name with a logo path. Uploading new brand logos is out of scope — they are added by the developer when a new hardware integration is built.
