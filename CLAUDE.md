# BVFactory E-Commerce

E-commerce Next.js (App Router) pour vendre des plugins Q-SYS sous licence.

## Infrastructure — comptes de production

| Service | Identifiant | Notes |
|---------|------------|-------|
| **Vercel** (production) | Team: `contactbvfactory-2806s-projects` / Project: `bvfactory-e-commerce` (`prj_9QdIPrWRxSnnmb7p6XelFuu3Hzv4`) | Domaine: `bvfactory.dev`. **Toujours utiliser `--scope contactbvfactory-2806s-projects`** si le CLI n'est pas linké. |
| **Vercel** (perso/ancien) | Team: `benjamins-projects-203d1eab` | NE PAS déployer ici. Ce n'est pas le projet de production. |
| **Supabase** | Project: `wmpnxnnhxvskojpujauv` (region `eu-west-3`) | Base de données principale (orders, licenses, discount_codes, product_settings). |
| **Stripe** | Mode test (`sk_test_*`) | Checkout sessions pour les commandes payantes. |
| **Resend** | Clé `re_cbCLhB…` | Emails transactionnels (confirmation commande, notifications admin). Domaine d'envoi: `bvfactory.dev`. |

## Variables d'environnement requises

Toutes ces variables doivent exister sur le projet Vercel **contactbvfactory** (Production + Preview + Development) :

- `NEXT_PUBLIC_SUPABASE_URL` — URL Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Clé anon Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — Clé service role (server-side uniquement)
- `STRIPE_SECRET_KEY` — Clé secrète Stripe
- `STRIPE_WEBHOOK_SECRET` — Secret webhook Stripe
- `LICENSE_MASTER_SECRET` — Secret pour la génération de licences (HMAC-SHA256)
- `LIGHTFORGE_LICENSE_SECRET` — Secret pour l'algo LightForge FNV-1a (seed: `DMXRecPlay2026#Bz`, doit correspondre au plugin Q-SYS)
- `TIMEFORGE_LICENSE_SECRET` — Secret pour l'algo TimeForge FNV-1a (seed: `TFrgTimeForge2026!X`, doit correspondre au plugin Q-SYS)
- `RESEND_API_KEY` — Clé API Resend
- `ADMIN_PASSWORD` — Mot de passe admin
- `ADMIN_SESSION_SECRET` — Secret session admin
- `NEXT_PUBLIC_SITE_URL` — `https://bvfactory.dev`

## Déploiement

```bash
# S'assurer d'être linké au bon projet
vercel link --scope contactbvfactory-2806s-projects

# Déployer en production
vercel --prod
```

Le projet est aussi connecté via Git (push sur `main` = déploiement auto).

## Architecture clé

- **Checkout** (`src/app/api/checkout/route.ts`) : commandes gratuites (100% discount) génèrent les licences immédiatement ; commandes payantes passent par Stripe.
- **Licences** (`src/lib/license-algorithms.ts`) : 5 algorithmes disponibles (HMAC-SHA256, SHA-512 court, Numérique, LightForge FNV-1a, TimeForge FNV-1a). Assignés par produit via `product_settings.algorithm_id`. Les algos FNV-1a sont déterministes et les seeds doivent correspondre byte-for-byte aux plugins Q-SYS Lua (`PLUGINS QSYS/`).
- **Emails** (`src/lib/email.ts`) : confirmation commande + notifications admin via Resend.
