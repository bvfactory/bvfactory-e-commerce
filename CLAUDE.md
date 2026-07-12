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
- `PULSEFORGE_LICENSE_SECRET` — Secret pour l'algo PulseForge FNV-1a (seed: `BVF-PulseForge-2026`, doit correspondre à `PLF_LicSalt` dans le plugin Q-SYS)
- `SELECTFORGE_LICENSE_SECRET` — Secret pour l'algo SelectForge FNV-1a (seed: `BVF-SelectForge-2026`, doit correspondre à `LIC_SALT` dans le plugin Q-SYS)
- `ROUTEBRIDGE_LICENSE_SECRET` — Secret pour l'algo RouteBridge FNV-1a (seed: `BVF-RouteBridge-2026`, doit correspondre au sel obfusqué `_Kd()` dans le plugin Q-SYS)
- `SCREENBRIDGE_LICENSE_SECRET` — Les 3 seeds ScreenBridge séparés par des virgules (`SBrgScreenBridge2026!1,…!2,…!3`), doivent correspondre aux tables `LICENSE.SEALED_SEED_N` (XOR-chain) du plugin Q-SYS
- `RESEND_API_KEY` — Clé API Resend
- `RESEND_WEBHOOK_SECRET` — Signing secret (`whsec_…`) du webhook Resend `email.received` (vérifié via Svix, `resend.webhooks.verify`). À copier depuis Resend → Webhooks → l'endpoint inbound.
- `CONTACT_REPLY_DOMAIN` — Domaine avec Resend Inbound activé, utilisé pour le threading Reply-To (`reply+<token>@<domaine>`). Défaut: `bvfactory.dev` (le domaine racine a `receiving: enabled` + MX inbound vérifié).
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
- **Licences** (`src/lib/license-algorithms.ts`) : 9 algorithmes enregistrés (HMAC-SHA256, SHA-512 court, Numérique, + 6 FNV-1a déterministes par plugin). Assignés par produit via `product_settings.algorithm_id`. Les seeds FNV-1a doivent correspondre byte-for-byte aux plugins Q-SYS Lua (`~/Documents/DEV/PLUGINS QSYS/`). Trois familles :
  - `TwoRoundFnv1aAlgorithm` (deux passes + marqueur de longueur + avalanche) : LightForge (`DMXR-`), TimeForge (`TFGE-`), RouteBridge (`RB-`).
  - `ForgeFnv1aAlgorithm` (simple passe, bitwise natif Lua 5.3) : PulseForge (`PLF-`), SelectForge (`SLF-`).
  - `ScreenBridgeFnv1aAlgorithm` (FNV-1a 32 bits replié sur 48 bits, cascade à 3 seeds distincts, seeds scellés XOR-chain dans le Lua) : ScreenBridge (`SBRG-`).
  Pour un nouveau plugin : identifier la famille dans le .qplug (licHash avec marqueur de longueur = deux passes ; fnv1a simple boucle = simple passe ; fnv1a_keyed avec repli 48 bits = variante ScreenBridge), ajouter une instance au registre + la variable d'env du/des seed(s), et vérifier les clés en croisé avec le Lua.
- **Produits** : le site n'affiche que les produits présents dans `product_settings` (Supabase) ; `MOCK_PRODUCTS` (`src/data/products.tsx`) ne sert que de fallback de contenu. Pour publier un produit, il faut insérer sa ligne en base (le seed route `/api/admin/products/seed` insère TOUS les mocks manquants — à éviter si certains ne doivent pas être publiés).
- **Emails** (`src/lib/email.ts`) : confirmation commande + notifications admin via Resend.

## Webmail admin (contact threads)

- Les soumissions du formulaire `/contact` sont persistées dans `contact_threads` + `contact_messages` (Supabase).
- L'admin lit et répond via `/admin/messages`. Les réponses partent depuis `contact@bvfactory.dev` avec `Reply-To: reply+<token>@bvfactory.dev` (domaine racine, qui a Resend Inbound activé).
- Les replies des visiteurs arrivent via le webhook Resend `email.received` sur `/api/webhooks/resend/inbound`, matchés au thread par le token. Le payload est metadata-only : le corps et les pièces jointes sont récupérés via `resend.emails.receiving.get()` / `…attachments.list()`.
- Config requise (déjà en place) : `bvfactory.dev` avec `receiving: enabled` (MX `inbound-smtp.eu-west-1.amazonaws.com` vérifié) **+ un webhook Resend `email.received`** pointant vers l'endpoint (sinon Resend reçoit mais ne POSTe rien). Le `signing_secret` du webhook va dans `RESEND_WEBHOOK_SECRET`.
