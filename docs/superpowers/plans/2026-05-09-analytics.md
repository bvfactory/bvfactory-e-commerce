# Analytics Backoffice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le suivi de 4 métriques (vues produit, téléchargements, checkouts, activations) stockées dans Supabase et visibles sur une page `/admin/analytics`.

**Architecture:** Table `analytics_events` écrite via une route Next.js publique (service_role côté serveur) et 3 points d'insertion server-side. Une route admin agrège les données en JS et les expose à la page analytics qui affiche un graphe SVG + tableau par produit.

**Tech Stack:** Next.js App Router, Supabase (service_role), TypeScript, Tailwind CSS, SVG inline (pas de lib de graphe)

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/20260509_add_analytics_events.sql` | Créé |
| `src/app/api/analytics/track/route.ts` | Créé |
| `src/app/api/admin/analytics/route.ts` | Créé |
| `src/hooks/useTrackPageView.ts` | Créé |
| `src/app/plugins/[id]/ProductPageClient.tsx` | Modifié — ajout du hook |
| `src/app/api/download-plugin/route.ts` | Modifié — insert event |
| `src/app/api/checkout/route.ts` | Modifié — insert event |
| `src/app/api/activation/route.ts` | Modifié — insert event |
| `src/components/admin/analytics/PeriodSelector.tsx` | Créé |
| `src/components/admin/analytics/GlobalChart.tsx` | Créé |
| `src/components/admin/analytics/ProductStatsTable.tsx` | Créé |
| `src/app/admin/(dashboard)/analytics/page.tsx` | Créé |
| `src/components/admin/AdminSidebar.tsx` | Modifié — ajout lien |

---

## Task 1 : Migration Supabase — table `analytics_events`

**Files:**
- Create: `supabase/migrations/20260509_add_analytics_events.sql`

- [ ] **Créer le fichier de migration**

```sql
-- supabase/migrations/20260509_add_analytics_events.sql

create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null
              check (event_type in ('page_view', 'plugin_download', 'checkout_initiated', 'license_activated')),
  product_id  text,
  created_at  timestamptz not null default now()
);

create index if not exists analytics_events_type_product_date_idx
  on public.analytics_events (event_type, product_id, created_at desc);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

alter table public.analytics_events enable row level security;
-- Pas de policy anon/authenticated : les insertions passent toujours par
-- une route Next.js qui utilise la clé service_role côté serveur.
```

- [ ] **Appliquer la migration**

```bash
npx supabase db push
```

Expected : migration appliquée sans erreur. Vérifier dans le dashboard Supabase que la table `analytics_events` apparaît.

- [ ] **Commit**

```bash
git add supabase/migrations/20260509_add_analytics_events.sql
git commit -m "feat(analytics): add analytics_events table"
```

---

## Task 2 : Route publique `POST /api/analytics/track`

**Files:**
- Create: `src/app/api/analytics/track/route.ts`

Cette route est accessible sans authentification (appelée depuis le navigateur pour les page views). Elle valide `event_type` contre une whitelist et insère via `createAdminClient()` (service_role).

- [ ] **Créer la route**

```typescript
// src/app/api/analytics/track/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EVENTS = ["page_view", "plugin_download", "checkout_initiated", "license_activated"] as const;

export async function POST(req: Request) {
    try {
        const { event_type, product_id } = await req.json();

        if (!ALLOWED_EVENTS.includes(event_type)) {
            return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
        }

        const supabase = createAdminClient();
        await supabase.from("analytics_events").insert({
            event_type,
            product_id: product_id ?? null,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
```

- [ ] **Tester manuellement**

```bash
curl -X POST http://localhost:3000/api/analytics/track \
  -H "Content-Type: application/json" \
  -d '{"event_type":"page_view","product_id":"lightforge"}'
```

Expected : `{"ok":true}`. Vérifier une ligne dans Supabase table `analytics_events`.

- [ ] **Commit**

```bash
git add src/app/api/analytics/track/route.ts
git commit -m "feat(analytics): add public track endpoint"
```

---

## Task 3 : Hook client `useTrackPageView` + intégration dans `ProductPageClient`

**Files:**
- Create: `src/hooks/useTrackPageView.ts`
- Modify: `src/app/plugins/[id]/ProductPageClient.tsx`

- [ ] **Créer le hook**

```typescript
// src/hooks/useTrackPageView.ts
"use client";

import { useEffect } from "react";

export function useTrackPageView(productId: string) {
    useEffect(() => {
        fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_type: "page_view", product_id: productId }),
        }).catch(() => { /* fire-and-forget, silent on error */ });
    }, [productId]);
}
```

- [ ] **Ajouter le hook dans `ProductPageClient.tsx`**

En haut du fichier, après les imports existants, ajouter :

```typescript
import { useTrackPageView } from "@/hooks/useTrackPageView";
```

Dans le corps du composant `ProductPageClient`, après les `useState` existants, ajouter :

```typescript
useTrackPageView(product.id);
```

- [ ] **Vérifier** que la page `/plugins/[id]` envoie un event en ouvrant l'onglet Network du navigateur : `POST /api/analytics/track` avec status 200.

- [ ] **Commit**

```bash
git add src/hooks/useTrackPageView.ts src/app/plugins/[id]/ProductPageClient.tsx
git commit -m "feat(analytics): track page_view on product pages"
```

---

## Task 4 : Tracking server-side (téléchargements, checkouts, activations)

**Files:**
- Modify: `src/app/api/download-plugin/route.ts`
- Modify: `src/app/api/checkout/route.ts`
- Modify: `src/app/api/activation/route.ts`

Les insertions sont fire-and-forget (pas d'`await`, erreur silencieuse) pour ne pas bloquer la réponse principale.

- [ ] **`download-plugin/route.ts`** — insérer après la génération de la signed URL réussie

`createAdminClient` est déjà importé. Après le bloc `if (storageError || !signedUrl) { ... }` (ligne ~39) et avant le `return NextResponse.redirect(...)`, ajouter :

```typescript
    // Fire-and-forget analytics
    createAdminClient()
        .from("analytics_events")
        .insert({ event_type: "plugin_download", product_id: productId })
        .then(() => {})
        .catch(() => {});
```

- [ ] **`checkout/route.ts`** — insérer après la création réussie de l'order en DB

Après le bloc `if (orderError) { ... }` (autour de la ligne 80), juste avant le commentaire `// 2. Server-side price verification`, ajouter :

```typescript
    // Fire-and-forget analytics
    supabase
        .from("analytics_events")
        .insert(
            items.map((item: { product: { id: string } }) => ({
                event_type: "checkout_initiated",
                product_id: item.product.id,
            }))
        )
        .then(() => {})
        .catch(() => {});
```

- [ ] **`activation/route.ts`** — insérer après récupération réussie de la commande

Après le bloc `if (orderError || !order)` (ligne ~26) et avant la requête licenses, ajouter :

```typescript
    // Fire-and-forget analytics — one event per item in the order
    const activationItems = (order.items as Array<{ product: { id: string } }>) || [];
    createAdminClient()
        .from("analytics_events")
        .insert(
            activationItems.map((item) => ({
                event_type: "license_activated",
                product_id: item.product.id,
            }))
        )
        .then(() => {})
        .catch(() => {});
```

`createAdminClient` est déjà importé dans ce fichier — aucun import à ajouter.

- [ ] **Commit**

```bash
git add src/app/api/download-plugin/route.ts src/app/api/checkout/route.ts src/app/api/activation/route.ts
git commit -m "feat(analytics): track downloads, checkouts, activations server-side"
```

---

## Task 5 : Route admin `GET /api/admin/analytics`

**Files:**
- Create: `src/app/api/admin/analytics/route.ts`

Cette route agrège les `analytics_events` en JS (volume faible). Elle retourne aussi les noms des produits issus de `product_settings`.

- [ ] **Créer la route**

```typescript
// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type EventType = "page_view" | "plugin_download" | "checkout_initiated" | "license_activated";

interface DayTotals {
    date: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface ProductTotals {
    product_id: string;
    product_name: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

const EVENT_FIELD: Record<EventType, keyof Omit<DayTotals, "date">> = {
    page_view: "page_views",
    plugin_download: "plugin_downloads",
    checkout_initiated: "checkout_initiated",
    license_activated: "license_activated",
};

export async function GET(request: NextRequest) {
    if (!(await validateAdminRequest(request))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const days = Math.min(
        parseInt(request.nextUrl.searchParams.get("days") ?? "30", 10) || 30,
        90
    );
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const supabase = createAdminClient();

    // Fetch events for the period
    const { data: events, error } = await supabase
        .from("analytics_events")
        .select("event_type, product_id, created_at")
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
    }

    // Fetch product names
    const { data: products } = await supabase
        .from("product_settings")
        .select("product_id, name");

    const nameByProductId: Record<string, string> = {};
    for (const p of products ?? []) {
        nameByProductId[p.product_id] = p.name;
    }

    // Aggregate: series (by day, all products combined)
    const seriesMap: Record<string, DayTotals> = {};
    // Aggregate: totals by product
    const productMap: Record<string, ProductTotals> = {};

    for (const ev of events ?? []) {
        const date = ev.created_at.slice(0, 10); // YYYY-MM-DD
        const field = EVENT_FIELD[ev.event_type as EventType];
        if (!field) continue;

        // Series
        if (!seriesMap[date]) {
            seriesMap[date] = { date, page_views: 0, plugin_downloads: 0, checkout_initiated: 0, license_activated: 0 };
        }
        seriesMap[date][field]++;

        // Product totals
        const pid = ev.product_id ?? "__unknown__";
        if (!productMap[pid]) {
            productMap[pid] = {
                product_id: pid,
                product_name: nameByProductId[pid] ?? pid,
                page_views: 0,
                plugin_downloads: 0,
                checkout_initiated: 0,
                license_activated: 0,
            };
        }
        productMap[pid][field]++;
    }

    // Fill missing days in series (so the chart has a continuous x-axis)
    const series: DayTotals[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        series.push(seriesMap[key] ?? { date: key, page_views: 0, plugin_downloads: 0, checkout_initiated: 0, license_activated: 0 });
    }

    return NextResponse.json({
        period: { days, from: from.toISOString(), to: new Date().toISOString() },
        totals: Object.values(productMap).filter((p) => p.product_id !== "__unknown__"),
        series,
    });
}
```

- [ ] **Tester** en démarrant le serveur et en appelant la route dans le navigateur (connecté en admin) :

```
http://localhost:3000/api/admin/analytics?days=30
```

Expected : JSON avec `period`, `totals` (tableau), `series` (tableau de 30 entrées).

- [ ] **Commit**

```bash
git add src/app/api/admin/analytics/route.ts
git commit -m "feat(analytics): add admin analytics API route"
```

---

## Task 6 : Composants UI analytics

**Files:**
- Create: `src/components/admin/analytics/PeriodSelector.tsx`
- Create: `src/components/admin/analytics/GlobalChart.tsx`
- Create: `src/components/admin/analytics/ProductStatsTable.tsx`

### PeriodSelector

```typescript
// src/components/admin/analytics/PeriodSelector.tsx
"use client";

interface Props {
    value: 7 | 30 | 90;
    onChange: (days: 7 | 30 | 90) => void;
}

const OPTIONS: Array<{ days: 7 | 30 | 90; label: string }> = [
    { days: 7, label: "7 j" },
    { days: 30, label: "30 j" },
    { days: 90, label: "90 j" },
];

export function PeriodSelector({ value, onChange }: Props) {
    return (
        <div className="inline-flex rounded-lg border border-white/10 overflow-hidden">
            {OPTIONS.map(({ days, label }) => (
                <button
                    key={days}
                    onClick={() => onChange(days)}
                    className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.15em] transition-colors ${
                        value === days
                            ? "bg-teal-500/20 text-teal-400 border-r border-white/10 last:border-r-0"
                            : "text-slate-400 hover:text-white hover:bg-white/5 border-r border-white/10 last:border-r-0"
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
```

### GlobalChart

Graphe SVG polyline, 4 courbes, pas de dépendance.

```typescript
// src/components/admin/analytics/GlobalChart.tsx
"use client";

interface DaySeries {
    date: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface Props {
    series: DaySeries[];
}

const LINES: Array<{ key: keyof Omit<DaySeries, "date">; color: string; label: string }> = [
    { key: "page_views",          color: "#14b8a6", label: "Vues" },
    { key: "plugin_downloads",    color: "#6366f1", label: "Téléchargements" },
    { key: "checkout_initiated",  color: "#f59e0b", label: "Checkouts" },
    { key: "license_activated",   color: "#22c55e", label: "Activations" },
];

const W = 600;
const H = 120;
const PAD_X = 4;
const PAD_Y = 8;

function toPolyline(values: number[], maxVal: number): string {
    if (values.length < 2) return "";
    return values
        .map((v, i) => {
            const x = PAD_X + (i / (values.length - 1)) * (W - 2 * PAD_X);
            const y = maxVal === 0
                ? H - PAD_Y
                : H - PAD_Y - ((v / maxVal) * (H - 2 * PAD_Y));
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
}

export function GlobalChart({ series }: Props) {
    if (series.length === 0) return null;

    const maxVal = Math.max(
        ...series.flatMap((d) => LINES.map((l) => d[l.key])),
        1
    );

    return (
        <div className="glass-panel rounded-2xl p-5">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-32"
                preserveAspectRatio="none"
            >
                {/* Horizontal guide lines */}
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = H - PAD_Y - ratio * (H - 2 * PAD_Y);
                    return (
                        <line
                            key={ratio}
                            x1={PAD_X} y1={y.toFixed(1)}
                            x2={W - PAD_X} y2={y.toFixed(1)}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="1"
                        />
                    );
                })}
                {LINES.map(({ key, color }) => (
                    <polyline
                        key={key}
                        points={toPolyline(series.map((d) => d[key]), maxVal)}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity="0.85"
                    />
                ))}
            </svg>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3">
                {LINES.map(({ key, color, label }) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span
                            className="inline-block w-3 h-0.5 rounded"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-[11px] font-mono text-slate-400">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

### ProductStatsTable

```typescript
// src/components/admin/analytics/ProductStatsTable.tsx
"use client";

interface ProductTotals {
    product_id: string;
    product_name: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface Props {
    totals: ProductTotals[];
}

const COLS: Array<{ key: keyof Omit<ProductTotals, "product_id" | "product_name">; label: string; color: string }> = [
    { key: "page_views",         label: "Vues",           color: "text-teal-400" },
    { key: "plugin_downloads",   label: "Télécharg.",     color: "text-indigo-400" },
    { key: "checkout_initiated", label: "Checkouts",      color: "text-amber-400" },
    { key: "license_activated",  label: "Activations",    color: "text-green-400" },
];

export function ProductStatsTable({ totals }: Props) {
    if (totals.length === 0) {
        return (
            <div className="glass-panel rounded-2xl p-8 text-center">
                <p className="text-sm text-slate-500 font-mono">Aucune donnée pour cette période</p>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-[0.15em]">
                            Produit
                        </th>
                        {COLS.map(({ key, label, color }) => (
                            <th
                                key={key}
                                className={`px-5 py-3 text-right text-[10px] font-mono font-semibold uppercase tracking-[0.15em] ${color}`}
                            >
                                {label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {totals.map((row) => (
                        <tr
                            key={row.product_id}
                            className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                        >
                            <td className="px-5 py-3 font-medium text-white">
                                {row.product_name}
                            </td>
                            {COLS.map(({ key, color }) => (
                                <td
                                    key={key}
                                    className={`px-5 py-3 text-right font-mono font-semibold ${color}`}
                                >
                                    {row[key].toLocaleString("fr-FR")}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Commit**

```bash
git add src/components/admin/analytics/
git commit -m "feat(analytics): add PeriodSelector, GlobalChart, ProductStatsTable components"
```

---

## Task 7 : Page `/admin/analytics`

**Files:**
- Create: `src/app/admin/(dashboard)/analytics/page.tsx`

- [ ] **Créer la page**

```typescript
// src/app/admin/(dashboard)/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import { BarChart2 } from "lucide-react";
import { PeriodSelector } from "@/components/admin/analytics/PeriodSelector";
import { GlobalChart } from "@/components/admin/analytics/GlobalChart";
import { ProductStatsTable } from "@/components/admin/analytics/ProductStatsTable";

interface DaySeries {
    date: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface ProductTotals {
    product_id: string;
    product_name: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
}

interface AnalyticsData {
    period: { days: number };
    totals: ProductTotals[];
    series: DaySeries[];
}

export default function AnalyticsPage() {
    const [days, setDays] = useState<7 | 30 | 90>(30);
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(`/api/admin/analytics?days=${days}`)
            .then(async (res) => {
                if (!res.ok) throw new Error("Impossible de charger les analytics");
                return res.json();
            })
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [days]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                        <BarChart2 className="h-6 w-6 text-teal-400" />
                        Analytics
                    </h1>
                    <p className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">
                        Trafic et usage par produit
                    </p>
                </div>
                <PeriodSelector value={days} onChange={setDays} />
            </div>

            {loading && (
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-teal-400" />
                </div>
            )}

            {error && (
                <div className="glass-panel rounded-xl px-6 py-4">
                    <p className="text-sm text-red-400 font-mono">{error}</p>
                </div>
            )}

            {data && !loading && (
                <>
                    {/* Global chart */}
                    <div>
                        <h2 className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Vue globale — {days} derniers jours
                        </h2>
                        <GlobalChart series={data.series} />
                    </div>

                    {/* Per-product table */}
                    <div>
                        <h2 className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Par produit
                        </h2>
                        <ProductStatsTable totals={data.totals} />
                    </div>
                </>
            )}
        </div>
    );
}
```

- [ ] **Vérifier** en naviguant sur `http://localhost:3000/admin/analytics` (connecté).  
  Expected : page avec spinner → données chargées → graphe + tableau visible.

- [ ] **Commit**

```bash
git add src/app/admin/(dashboard)/analytics/page.tsx
git commit -m "feat(analytics): add /admin/analytics page"
```

---

## Task 8 : Ajout du lien Analytics dans la sidebar

**Files:**
- Modify: `src/components/admin/AdminSidebar.tsx`

- [ ] **Ajouter l'import de l'icône**

Dans la liste d'imports lucide-react existante (ligne ~6), ajouter `BarChart2` :

```typescript
import {
  LayoutDashboard,
  ShoppingCart,
  KeyRound,
  Tags,
  HardDrive,
  Users,
  Rocket,
  Settings,
  LogOut,
  ChevronRight,
  Mail,
  BarChart2,
} from "lucide-react";
```

- [ ] **Ajouter l'entrée dans `navItems`**

Dans le tableau `navItems`, après l'entrée `"Tableau de bord"` (première entrée), ajouter :

```typescript
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
```

Le tableau doit ressembler à :

```typescript
const navItems: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingCart },
  // ... reste inchangé
];
```

- [ ] **Vérifier** que le lien "Analytics" apparaît dans la sidebar et navigue vers `/admin/analytics`.

- [ ] **Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(analytics): add Analytics link in admin sidebar"
```

---

## Checklist finale

- [ ] `npx next build` passe sans erreur TypeScript
- [ ] Naviguer sur une fiche produit → event `page_view` dans la table Supabase
- [ ] Appeler `/api/download-plugin?productId=<id>` → event `plugin_download`
- [ ] Soumettre un checkout → event `checkout_initiated`
- [ ] Utiliser un code d'activation → event `license_activated`
- [ ] Page `/admin/analytics` affiche graphe + tableau avec les bons totaux
- [ ] Sélecteur 7j / 30j / 90j recharge les données
