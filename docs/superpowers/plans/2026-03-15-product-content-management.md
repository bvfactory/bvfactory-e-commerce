# Product Content Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all product fields editable from the admin back-office, consolidating pricing, promos, content, screenshots, manuals, changelogs, and plugin files into a single per-product page.

**Architecture:** JSONB overlay on `product_settings` table — a `content` column stores only overridden fields, merged at runtime with `MOCK_PRODUCTS` defaults. Assets stored in Supabase Storage `product-assets` bucket. The admin plugins page becomes a product list linking to per-product detail pages.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + Storage), Shadcn UI (Base UI primitives — NOT Radix), Lucide icons.

**Spec:** `docs/superpowers/specs/2026-03-15-product-content-management-design.md`

**Important codebase notes:**
- Shadcn components use `@base-ui/react` primitives — no `asChild` prop (use `render` instead), `onValueChange` passes `string | null`
- No test suite exists — verification is via `npx next build`
- Admin auth: all API routes must call `validateAdminRequest(request)` from `@/lib/admin-auth`
- Admin Supabase client: `createAdminClient()` from `@/lib/supabase/admin` (service role, bypasses RLS)
- All admin UI text must be in French
- The project uses Framer Motion for animations on storefront pages

---

## Chunk 1: Backend Foundation

### Task 1: Update database schema and product-settings library

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/lib/product-settings.ts`

- [ ] **Step 1: Add `content` JSONB column to schema.sql**

In `supabase/schema.sql`, add `content JSONB DEFAULT '{}'::jsonb` to the `product_settings` table definition (after `promo_label TEXT`):

```sql
CREATE TABLE product_settings (
  product_id TEXT PRIMARY KEY,
  price_cents INTEGER,
  promo_percent INTEGER CHECK (promo_percent IS NULL OR (promo_percent >= 0 AND promo_percent <= 100)),
  promo_active BOOLEAN DEFAULT false,
  promo_label TEXT,
  content JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Add deep merge utility and new functions to `product-settings.ts`**

Add to `src/lib/product-settings.ts`:

1. A `deepMergeProduct` function that merges MOCK_PRODUCTS defaults with DB content overlay:
   - Scalar fields (string, number, boolean): DB value replaces default
   - Array fields (`features`, `screenshots`, `versionHistory`, `faq`, `supportedCores`): DB value replaces default entirely
   - Object fields (`specs`, `compatibility`): shallow merge (DB keys override, missing keys fall through)
   - Absent keys: fall through to MOCK_PRODUCTS default

2. `getFullProduct(productId: string)` — returns a single product with all overrides merged. Uses `.maybeSingle()` (not `.single()`) to handle missing rows without error.

3. `getAllFullProducts()` — returns all products with content overrides merged. Fetches all `product_settings` rows in one query, merges each with its MOCK_PRODUCTS counterpart.

4. Update `ProductWithSettings` interface to include a `content` field.

**Implementation details for `getFullProduct`:**

```typescript
import { MOCK_PRODUCTS, ProductType } from "@/data/products";

function deepMergeProduct(base: ProductType, overrides: Record<string, unknown>): ProductType {
  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined) continue;
    if (key === "compatibility" && typeof value === "object") {
      result.compatibility = { ...base.compatibility, ...(value as Record<string, unknown>) } as ProductType["compatibility"];
    } else if (key === "specs" && typeof value === "object") {
      result.specs = { ...base.specs, ...(value as Record<string, string>) };
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export async function getFullProduct(productId: string): Promise<ProductType> {
  const mock = MOCK_PRODUCTS.find((p) => p.id === productId);
  if (!mock) throw new Error(`Unknown product: ${productId}`);

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("price_cents, promo_percent, promo_active, promo_label, content")
    .eq("product_id", productId)
    .maybeSingle();

  if (!data) return mock;
  const merged = data.content ? deepMergeProduct(mock, data.content as Record<string, unknown>) : { ...mock };
  if (data.price_cents != null) merged.price_cents = data.price_cents;
  return merged;
}

export async function getAllFullProducts(): Promise<ProductType[]> {
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("product_settings")
    .select("*");

  const settingsMap = new Map<string, Record<string, unknown>>();
  if (settings) {
    for (const s of settings) {
      settingsMap.set(s.product_id, s);
    }
  }

  return MOCK_PRODUCTS.map((product) => {
    const s = settingsMap.get(product.id);
    if (!s) return product;
    const merged = s.content ? deepMergeProduct(product, s.content as Record<string, unknown>) : { ...product };
    if (s.price_cents != null) merged.price_cents = s.price_cents as number;
    return merged;
  });
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql src/lib/product-settings.ts
git commit -m "feat: add content JSONB overlay and product merge utilities"
```

---

### Task 2: Create product API routes

**Files:**
- Create: `src/app/api/admin/products/[id]/route.ts`
- Create: `src/app/api/admin/products/[id]/assets/route.ts`

- [ ] **Step 1: Create `GET` + `PATCH` route for product data**

Create `src/app/api/admin/products/[id]/route.ts`:

- **GET**: Validates admin, finds product in MOCK_PRODUCTS by `id` param, fetches `product_settings` row via `.maybeSingle()`, returns merged product with pricing fields included at top level.

- **PATCH**: Validates admin, accepts JSON body with optional fields: `price_cents`, `promo_percent`, `promo_active`, `promo_label`, `content`. For `content`: reads existing content JSONB from DB, shallow-merges new keys into it, strips any keys set to `null`. Validates `price_cents >= 0` if present, `promo_percent` 0-100 if present. Uses `upsert` with `onConflict: "product_id"`.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_PRODUCTS } from "@/data/products";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const product = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_settings")
    .select("*")
    .eq("product_id", id)
    .maybeSingle();

  return NextResponse.json({
    product,
    settings: data || null,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const product = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const { price_cents, promo_percent, promo_active, promo_label, content } = body;

  // Validate pricing fields
  if (price_cents !== undefined && (typeof price_cents !== "number" || price_cents < 0)) {
    return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
  }
  if (promo_percent !== undefined && promo_percent !== null) {
    if (typeof promo_percent !== "number" || promo_percent < 0 || promo_percent > 100) {
      return NextResponse.json({ error: "Pourcentage promo invalide" }, { status: 400 });
    }
  }

  const supabase = createAdminClient();

  // Build update data
  const updateData: Record<string, unknown> = {
    product_id: id,
    updated_at: new Date().toISOString(),
  };

  if (price_cents !== undefined) updateData.price_cents = price_cents;
  if (promo_percent !== undefined) updateData.promo_percent = promo_percent;
  if (promo_active !== undefined) updateData.promo_active = promo_active;
  if (promo_label !== undefined) updateData.promo_label = promo_label;

  // Handle content JSONB merge
  if (content !== undefined) {
    // Read existing content
    const { data: existing } = await supabase
      .from("product_settings")
      .select("content")
      .eq("product_id", id)
      .maybeSingle();

    const existingContent = (existing?.content as Record<string, unknown>) || {};
    const merged = { ...existingContent };

    for (const [key, value] of Object.entries(content as Record<string, unknown>)) {
      if (value === null) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }
    updateData.content = merged;
  }

  const { data, error } = await supabase
    .from("product_settings")
    .upsert(updateData, { onConflict: "product_id" })
    .select()
    .single();

  if (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
```

- [ ] **Step 2: Create asset upload/delete route**

Create `src/app/api/admin/products/[id]/assets/route.ts`:

- **POST**: Multipart form upload. Fields: `type` ("screenshot" | "manual"), `file`. Validates file size (screenshots max 5MB, manuals max 20MB) and MIME type server-side. Uploads to `product-assets/{id}/screenshots/{timestamp}.{ext}` or `product-assets/{id}/manual.pdf`. After successful storage upload, updates the `content` JSONB: appends screenshot URL to `screenshots` array, or sets `manualUrl`. If DB update fails, attempts best-effort storage cleanup.

- **DELETE**: Body `{ type, fileName }`. For screenshots: removes URL from `content.screenshots` array and deletes file from storage. For manual: removes `manualUrl` from content and deletes file. DB update first, then storage delete.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_PRODUCTS } from "@/data/products";

const BUCKET = "product-assets";
const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_MANUAL_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  if (!MOCK_PRODUCTS.find((p) => p.id === id)) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  const formData = await request.formData();
  const type = formData.get("type") as string;
  const file = formData.get("file") as File;

  if (!type || !file) {
    return NextResponse.json({ error: "type et file requis" }, { status: 400 });
  }

  // Validate file
  if (type === "screenshot") {
    if (file.size > MAX_SCREENSHOT_SIZE) {
      return NextResponse.json({ error: "Image trop volumineuse (max 5 Mo)" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format image non supporté (PNG, JPEG, WebP)" }, { status: 400 });
    }
  } else if (type === "manual") {
    if (file.size > MAX_MANUAL_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Le manuel doit être un fichier PDF" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  // Determine storage path
  const ext = file.name.split(".").pop() || "bin";
  const storagePath = type === "screenshot"
    ? `${id}/screenshots/${Date.now()}.${ext}`
    : `${id}/manual.pdf`;

  // Upload to storage first
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  // Update content JSONB
  const { data: existing } = await supabase
    .from("product_settings")
    .select("content")
    .eq("product_id", id)
    .maybeSingle();

  const content = (existing?.content as Record<string, unknown>) || {};

  if (type === "screenshot") {
    const screenshots = (content.screenshots as string[]) || [];
    screenshots.push(publicUrl);
    content.screenshots = screenshots;
  } else {
    content.manualUrl = publicUrl;
  }

  const { error: dbError } = await supabase
    .from("product_settings")
    .upsert({ product_id: id, content, updated_at: new Date().toISOString() }, { onConflict: "product_id" });

  if (dbError) {
    // Best-effort cleanup
    await supabase.storage.from(BUCKET).remove([storagePath]);
    console.error("DB error:", dbError);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl, storagePath });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await validateAdminRequest(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { type, url } = await request.json();

  const supabase = createAdminClient();

  // Update DB first
  const { data: existing } = await supabase
    .from("product_settings")
    .select("content")
    .eq("product_id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Aucun paramètre trouvé" }, { status: 404 });
  }

  const content = (existing.content as Record<string, unknown>) || {};

  if (type === "screenshot" && url) {
    const screenshots = (content.screenshots as string[]) || [];
    content.screenshots = screenshots.filter((s) => s !== url);
  } else if (type === "manual") {
    delete content.manualUrl;
  }

  await supabase
    .from("product_settings")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("product_id", id);

  // Then delete from storage
  // Extract storage path from URL
  const urlObj = new URL(url);
  const pathMatch = urlObj.pathname.match(/\/object\/public\/product-assets\/(.+)/);
  if (pathMatch) {
    await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/products/
git commit -m "feat: add product content and asset management API routes"
```

---

## Chunk 2: Admin UI

### Task 3: Rewrite admin plugins list page

**Files:**
- Modify: `src/app/admin/(dashboard)/plugins/page.tsx` (currently 584 lines — full rewrite)

- [ ] **Step 1: Rewrite as product list grid**

Replace the entire content of `src/app/admin/(dashboard)/plugins/page.tsx` with a clean product list:

- Fetches from `GET /api/admin/plugins` (for upload status) and `GET /api/admin/pricing` (for pricing data)
- Displays a responsive grid (2 cols on desktop, 1 on mobile) of product cards
- Each card shows: product icon (from `getProductIcon` — import from data/products), name, category badge, current price (with promo strikethrough if active), plugin upload status indicator, "Gérer" button linking to `/admin/plugins/{id}`
- Page title: "Gestion des produits"
- Style: consistent with existing admin pages (border-border/50, bg-card/50, text-foreground, etc.)

**Card structure per product:**
```
┌──────────────────────────────────┐
│ [Icon]  PRODUCT NAME    [Badge] │
│ Prix: 350,00 € (~~450,00 €~~)  │
│ Plugin: ✓ Uploadé / ✗ Manquant  │
│                     [Gérer →]   │
└──────────────────────────────────┘
```

Use `getProductIcon` helper from `@/data/products` for icons. Format price with `(price / 100).toFixed(2).replace(".", ",") + " €"` pattern (existing pattern in the codebase).

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/(dashboard)/plugins/page.tsx
git commit -m "feat: rewrite admin plugins page as product list grid"
```

---

### Task 4: Create product detail admin page — Pricing & General Info sections

**Files:**
- Create: `src/app/admin/(dashboard)/plugins/[id]/page.tsx`

- [ ] **Step 1: Create page with pricing and general info sections**

Create `src/app/admin/(dashboard)/plugins/[id]/page.tsx` as a `"use client"` component.

**Page structure:**
- Back button (← Retour aux produits) linking to `/admin/plugins`
- Product name as page title with category badge
- Collapsible sections using a simple `useState<string[]>` for open section IDs, toggled with chevron icon

**Data fetching:**
- On mount, `GET /api/admin/products/{id}` to get `{ product, settings }`
- `product` = MOCK_PRODUCTS default, `settings` = DB overrides (may be null)
- Derive displayed values: `settings?.price_cents ?? product.price_cents`, `settings?.content?.tagline ?? product.tagline`, etc.

**Section 1: Prix & Promotions**
- Price input (number, in euros — divide by 100 for display, multiply by 100 for save)
- Promo toggle (Switch component)
- Promo percent input (number, 0-100) — shown only when promo active
- Promo label input (text) — shown only when promo active
- Effective price display: if promo active, show original strikethrough + discounted price
- "Réinitialiser le prix" button (sets `price_cents` to null via PATCH)
- "Enregistrer" button — PATCH `/api/admin/products/{id}` with `{ price_cents, promo_percent, promo_active, promo_label }`

**Section 2: Informations générales**
- Tagline input (text)
- Description courte input (text)
- Description longue (textarea, 6 rows min)
- URL vidéo input (text)
- Each field: show placeholder with MOCK_PRODUCTS default value
- "Réinitialiser" button per field (sends `content: { fieldName: null }`)
- "Enregistrer" button — PATCH with `{ content: { tagline, description, longDescription, videoUrl } }`

**Each section pattern:**
```tsx
<div className="border border-border/50 rounded-xl bg-card/50 overflow-hidden">
  <button onClick={toggle} className="w-full flex items-center justify-between p-4 hover:bg-muted/50">
    <h2 className="font-semibold text-foreground flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      Section Title
    </h2>
    <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
  </button>
  {isOpen && (
    <div className="p-4 pt-0 border-t border-border/50 space-y-4">
      {/* fields */}
    </div>
  )}
</div>
```

**Save pattern for each section:**
- Section-local state for modified fields
- `saving` boolean for loading state on button
- On save: PATCH request, then refetch product data
- Toast-style feedback: brief "Enregistré !" text next to button on success

- [ ] **Step 2: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/(dashboard)/plugins/[id]/page.tsx
git commit -m "feat: add product detail page with pricing and general info sections"
```

---

### Task 5: Add Features, Specs, Compatibility, and Compatible Brands sections

**Files:**
- Modify: `src/app/admin/(dashboard)/plugins/[id]/page.tsx`

- [ ] **Step 1: Add Section 3 — Fonctionnalités**

Editable list of feature strings:
- Display each feature as a row with text input + delete button (Trash2 icon)
- "Ajouter une fonctionnalité" button at bottom (Plus icon)
- Move up / move down buttons (ArrowUp, ArrowDown icons) per row
- "Réinitialiser" button (restores from MOCK_PRODUCTS)
- "Enregistrer" button — PATCH with `{ content: { features: [...] } }`

**Row pattern:**
```tsx
<div className="flex items-center gap-2">
  <div className="flex flex-col">
    <button onClick={moveUp}><ArrowUp className="w-3 h-3" /></button>
    <button onClick={moveDown}><ArrowDown className="w-3 h-3" /></button>
  </div>
  <Input value={feature} onChange={...} className="flex-1" />
  <Button variant="ghost" size="icon-xs" onClick={remove}><Trash2 className="w-3 h-3" /></Button>
</div>
```

- [ ] **Step 2: Add Section 5 — Spécifications techniques**

Dynamic key-value editor:
- Each row: key input + value input + delete button
- "Ajouter une spécification" button
- "Réinitialiser" button
- "Enregistrer" button — PATCH with `{ content: { specs: { key: value, ... } } }`

- [ ] **Step 3: Add Section 6 — Compatibilité**

Three fields:
- Version Q-SYS minimum (text input)
- Cores supportés (comma-separated text input, split into array on save)
- Système requis (optional text input)
- "Réinitialiser" button
- "Enregistrer" button — PATCH with `{ content: { compatibility: { minQsysVersion, supportedCores, os } } }`

- [ ] **Step 4: Add Brands compatibles section**

Editable list of compatible brands. Each entry has: name (text input), logo path (dropdown selecting from existing files in `/public/brands/`). The available logos are hardcoded: `iiyama.svg`, `philips.svg`, `resolume.svg`, `madmapper.svg`, `mitsubishi.svg`, `avaccess.svg`.

- Add / remove brand entries
- "Réinitialiser" button
- "Enregistrer" button — PATCH with `{ content: { compatibleBrands: [...] } }`

- [ ] **Step 5: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/(dashboard)/plugins/[id]/page.tsx
git commit -m "feat: add features, specs, compatibility, and brands sections"
```

---

### Task 6: Add Images, Manual, and Plugin File sections

**Files:**
- Modify: `src/app/admin/(dashboard)/plugins/[id]/page.tsx`

- [ ] **Step 1: Add Section 4 — Images & Screenshots**

- Display current screenshots as a thumbnail grid (4 cols)
- Each thumbnail: image preview + overlay delete button (X icon)
- Drop zone / file input for uploading new screenshots:
  ```tsx
  <label className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 transition-colors">
    <ImagePlus className="w-8 h-8 text-muted-foreground" />
    <span className="text-sm text-muted-foreground">Cliquer ou glisser des images ici</span>
    <span className="text-xs text-muted-foreground">PNG, JPEG, WebP — max 5 Mo par image</span>
    <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleUpload} />
  </label>
  ```
- Upload: POST to `/api/admin/products/{id}/assets` with `type=screenshot`
- Delete: DELETE to `/api/admin/products/{id}/assets` with `{ type: "screenshot", url }`
- "Réinitialiser" button: PATCH with `{ content: { screenshots: null } }` to restore Unsplash defaults
- Show uploading state per file (spinner overlay on thumbnail)

- [ ] **Step 2: Add Section 7 — Manuel**

- Show current manual status: "Aucun manuel" or filename/URL with download link
- Upload button: file input accept=".pdf"
- Delete button with confirmation
- Upload: POST to `/api/admin/products/{id}/assets` with `type=manual`
- Delete: DELETE with `{ type: "manual", url }`

- [ ] **Step 3: Add Section 10 — Fichier Plugin (.qplugx)**

- Show upload status, file size, last updated (from `/api/admin/plugins` GET data)
- Upload button: file input accept=".qplugx"
- Replace / Delete buttons
- Upload: POST to `/api/admin/plugins` (existing route) with FormData
- Delete: DELETE to `/api/admin/plugins` (existing route) with `{ productId }`
- Reuse the same patterns from the current plugins page

- [ ] **Step 4: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/(dashboard)/plugins/[id]/page.tsx
git commit -m "feat: add images, manual, and plugin file sections"
```

---

### Task 7: Add Changelog and FAQ sections

**Files:**
- Modify: `src/app/admin/(dashboard)/plugins/[id]/page.tsx`

- [ ] **Step 1: Add Section 8 — Changelog**

List of version entries, most recent first. Each entry is a card:
```
┌──────────────────────────────────────┐
│ v1.2.0    2026-03-15    [Supprimer] │
│ • Change 1                          │
│ • Change 2                [Éditer]  │
└──────────────────────────────────────┘
```

- "Ajouter une version" button opens inline form: version (text), date (date input), changes (textarea, one per line)
- Edit: toggle entry to edit mode (inputs replace text)
- Delete: remove entry from array
- "Réinitialiser" button
- "Enregistrer" button — PATCH with `{ content: { versionHistory: [...] } }`

Changes are entered as a textarea with one change per line, split into array on save.

- [ ] **Step 2: Add Section 9 — FAQ**

List of Q&A pairs:
```
┌──────────────────────────────────────┐
│ Q: How does it work?     [Supprimer]│
│ R: It works like this.    [Éditer]  │
└──────────────────────────────────────┘
```

- "Ajouter une question" button: inline form with question input + answer textarea
- Edit / delete per entry
- "Réinitialiser" button
- "Enregistrer" button — PATCH with `{ content: { faq: [...] } }`

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/(dashboard)/plugins/[id]/page.tsx
git commit -m "feat: add changelog and FAQ sections"
```

---

## Chunk 3: Storefront Integration & Cleanup

### Task 8: Update storefront to use DB-merged products

**Files:**
- Modify: `src/app/plugins/page.tsx` → convert to server component wrapper
- Create: `src/app/plugins/PluginsListClient.tsx` → client component extracted from page.tsx
- Modify: `src/app/plugins/[id]/page.tsx` → use `getFullProduct()`
- Modify: `src/app/plugins/[id]/ProductPageClient.tsx` → accept `product` prop instead of reading MOCK_PRODUCTS

- [ ] **Step 1: Split storefront listing into server + client components**

The current `src/app/plugins/page.tsx` is a `"use client"` component that imports `MOCK_PRODUCTS` directly. It needs to be split:

1. Create `src/app/plugins/PluginsListClient.tsx`: move all the existing client logic (state, filtering, grid, animations) into this component. Change it to accept a `products: ProductType[]` prop instead of importing `MOCK_PRODUCTS`. Keep `PRODUCT_CATEGORIES` and `getProductIcon` imported from `@/data/products` (these are static and don't change).

2. Rewrite `src/app/plugins/page.tsx` as a server component (remove `"use client"`):
```tsx
import { getAllFullProducts } from "@/lib/product-settings";
import PluginsListClient from "./PluginsListClient";

export default async function PluginsStorePage() {
  const products = await getAllFullProducts();
  return <PluginsListClient products={products} />;
}
```

- [ ] **Step 2: Update product detail components**

**`src/app/plugins/[id]/page.tsx` (server component):**
- Import `getFullProduct` and `getAllFullProducts` from `@/lib/product-settings`
- In `generateMetadata()`: replace `MOCK_PRODUCTS.find()` with `await getFullProduct(id)`
- In page component: replace `MOCK_PRODUCTS.find()` with `await getFullProduct(id)`
- Pass the product as a prop to `ProductPageClient`: `<ProductPageClient product={product} relatedProducts={relatedProducts} />`
- For related products: call `await getAllFullProducts()` and filter out current product, take 2
- Keep `generateStaticParams()` using `MOCK_PRODUCTS` (product IDs are static)

**`src/app/plugins/[id]/ProductPageClient.tsx` (client component):**
- Change signature from `export default function ProductPageClient()` to `export default function ProductPageClient({ product, relatedProducts }: { product: ProductType; relatedProducts: ProductType[] })`
- Remove `useParams()` import and usage
- Remove `MOCK_PRODUCTS` import
- Remove lines: `const product = MOCK_PRODUCTS.find(...)` and `const relatedProducts = MOCK_PRODUCTS.filter(...)`
- Keep `getProductIcon` import from `@/data/products` (used for rendering icons)
- Everything else stays the same — all rendering logic uses the `product` variable which now comes from props

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add src/app/plugins/
git commit -m "feat: storefront uses DB-merged product data"
```

---

### Task 9: Cleanup deprecated routes

**Files:**
- Delete: `src/app/api/admin/pricing/route.ts`

- [ ] **Step 1: Remove deprecated pricing route**

Delete `src/app/api/admin/pricing/route.ts` — all pricing functionality now lives in `/api/admin/products/[id]`.

- [ ] **Step 2: Remove any imports/references to the old pricing route**

Search codebase for `/api/admin/pricing` references. The only reference should be in the old `plugins/page.tsx` which was already rewritten in Task 3.

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated pricing API route"
```

---

### Task 10: Final build, verify, and deploy

- [ ] **Step 1: Full build verification**

Run: `npx next build`
Expected: All pages compile, no TypeScript errors

- [ ] **Step 2: Deploy to Vercel**

Run: `vercel --prod`
Expected: Successful deployment

- [ ] **Step 3: Commit any remaining changes**

If any fixes were needed during build verification.

---

## SQL to execute in Supabase Dashboard

Before testing, the user must run this in Supabase SQL Editor:

```sql
-- Add content column to product_settings (run only if table already exists)
ALTER TABLE product_settings
  ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}'::jsonb;

-- Create product-assets bucket (run in Storage settings or via SQL)
INSERT INTO storage.buckets (id, name, public) VALUES ('product-assets', 'product-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to product-assets
CREATE POLICY "Public read product-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-assets');

-- Allow service role full access to product-assets
CREATE POLICY "Service role manage product-assets" ON storage.objects
  FOR ALL USING (bucket_id = 'product-assets');
```
