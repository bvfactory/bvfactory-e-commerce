# Analytics Backoffice — Design Spec

**Date :** 2026-05-09  
**Statut :** Approuvé

---

## Objectif

Ajouter une page `/admin/analytics` affichant les métriques de trafic et d'usage par produit : vues de page, téléchargements de plugin, checkouts initiés, activations de licence. Les données sont stockées dans Supabase et visualisées avec courbes temporelles.

---

## Base de données

### Table `analytics_events`

```sql
create table analytics_events (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,  -- 'page_view' | 'plugin_download' | 'checkout_initiated' | 'license_activated'
  product_id  text,           -- nullable (ex: checkout multi-produits sans product_id unique)
  created_at  timestamptz not null default now()
);

-- Index pour les requêtes par type+produit+date (les seules faites en pratique)
create index analytics_events_type_product_date
  on analytics_events (event_type, product_id, created_at desc);

-- RLS
alter table analytics_events enable row level security;

-- Écriture publique (tracking côté client pour les page_views)
create policy "anon insert" on analytics_events
  for insert to anon with check (true);

-- Lecture service_role uniquement
create policy "service_role select" on analytics_events
  for select to service_role using (true);
```

**Volume estimé :** quelques centaines à quelques milliers de lignes/mois — pas de rotation nécessaire.

---

## Tracking — Points d'insertion

| Événement | Où | Comment |
|---|---|---|
| `page_view` | Pages produit côté client | Hook `useTrackPageView(productId)` → `POST /api/analytics/track` (fire-and-forget) |
| `plugin_download` | `/api/download-plugin/route.ts` | Insert direct via `createAdminClient()` après génération de la signed URL |
| `checkout_initiated` | `/api/checkout/route.ts` | Insert après création de la commande en base (order créé avec succès) |
| `license_activated` | `/api/activation/route.ts` | Insert après récupération réussie de l'activation code |

### Route publique de tracking

`POST /api/analytics/track`  
Body : `{ event_type: string, product_id?: string }`  
- Valide que `event_type` est dans la liste autorisée (whitelist)
- Insert sans auth (accessible anon pour les page_views client)
- Retourne `{ ok: true }` — pas de donnée sensible exposée
- Aucune donnée personnelle collectée (pas d'IP, pas d'user-agent)

---

## API admin

`GET /api/admin/analytics?days=30`  
Auth : `validateAdminRequest()` requis.

Réponse :

```typescript
{
  period: { days: number; from: string; to: string };
  totals: Array<{
    product_id: string;
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
  }>;
  series: Array<{
    date: string;           // YYYY-MM-DD
    page_views: number;
    plugin_downloads: number;
    checkout_initiated: number;
    license_activated: number;
  }>;
}
```

La requête SQL agrège les événements sur la période demandée. Les `series` sont la somme toutes lignes confondues (vue globale, pas par produit) pour le graphique principal.

Périodes supportées : `days=7`, `days=30` (défaut), `days=90`.

---

## Page `/admin/analytics`

### Structure

```
/admin/analytics
├── Header + sélecteur de période (7j / 30j / 90j)
├── Graphique global (courbe multi-métriques sur la période)
└── Tableau par produit
    └── Une ligne par product_id connu
        ├── Nom du produit (résolu depuis product_settings)
        ├── Vues
        ├── Téléchargements
        ├── Checkouts
        └── Activations
```

### Composants

- `AnalyticsPage` (page.tsx, client component) — fetch + state période
- `PeriodSelector` — boutons 7j / 30j / 90j
- `GlobalChart` — courbe temporelle (recharts `LineChart` ou SVG minimaliste si recharts absent)
- `ProductStatsTable` — tableau avec totaux par produit

### Graphique

Si `recharts` est déjà dans `package.json` : utiliser `LineChart` + `Line` par event_type.  
Sinon : SVG minimaliste inline (pas d'ajout de dépendance pour un seul graphique) — courbe normalisée sur la hauteur disponible.

> **Décision à la lecture de `package.json` :** adopter l'existant, ne pas ajouter de lib si absente.

### Navigation

Ajouter "Analytics" dans `AdminSidebar` (icône `BarChart2` de lucide-react, déjà disponible).

---

## Ce qui n'est PAS inclus (YAGNI)

- Filtrage par pays / device / user-agent
- Déduplication des bots
- Alertes ou seuils
- Export CSV
- Rétention / purge automatique des events

---

## Fichiers créés / modifiés

| Fichier | Action |
|---|---|
| `supabase/migrations/YYYYMMDD_add_analytics_events.sql` | Nouveau |
| `src/app/api/analytics/track/route.ts` | Nouveau |
| `src/app/api/admin/analytics/route.ts` | Nouveau |
| `src/app/admin/(dashboard)/analytics/page.tsx` | Nouveau |
| `src/components/admin/analytics/PeriodSelector.tsx` | Nouveau |
| `src/components/admin/analytics/GlobalChart.tsx` | Nouveau |
| `src/components/admin/analytics/ProductStatsTable.tsx` | Nouveau |
| `src/components/admin/AdminSidebar.tsx` | Modifié — ajout lien Analytics |
| `src/app/api/download-plugin/route.ts` | Modifié — insert event |
| `src/app/api/checkout/route.ts` | Modifié — insert event |
| `src/app/api/activation/route.ts` | Modifié — insert event |
| `src/hooks/useTrackPageView.ts` | Nouveau — hook client |
