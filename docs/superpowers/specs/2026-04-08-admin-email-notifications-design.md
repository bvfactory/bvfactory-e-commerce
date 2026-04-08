# Admin Email Notifications via Resend

## Objectif

Notifier l'administrateur par email (via Resend) de chaque interaction importante sur le site : commandes validées, messages de contact, activations de licence, tentatives de connexion admin échouées, et utilisation de codes promo.

## Destinataires

- `contact@bvfactory.dev`
- `contact.bvfactory@gmail.com`

Les deux adresses reçoivent toutes les notifications, en dur dans le code (cohérent avec le pattern existant de `licences@bvfactory.dev`).

## Expéditeur

`BVFactory Alertes <noreply@bvfactory.dev>`

## Approche

Notification directe dans chaque route API concernée. Une fonction centralisée `sendAdminNotification(type, data)` dans `src/lib/email.ts` gère la construction du HTML et l'envoi aux 2 adresses.

## Les 6 événements

| Type | Label FR | Badge couleur | Déclenché dans |
|------|----------|---------------|----------------|
| `order_paid` | NOUVELLE COMMANDE | `#0f4a42` (vert) | Webhooks Stripe & Qonto, après confirmation paiement |
| `order_free` | LICENCE GRATUITE | `#14b8a6` (teal) | `/api/checkout`, après `handleFreeOrder()` |
| `contact_received` | NOUVEAU MESSAGE | `#1e40af` (bleu) | `/api/contact`, après envoi du message |
| `license_activated` | LICENCE ACTIVÉE | `#7c3aed` (violet) | `/api/license/verify`, première activation uniquement (`activated_at` passe de null à date) |
| `admin_login_failed` | ALERTE SÉCURITÉ | `#dc2626` (rouge) | `/api/admin/auth`, après échec d'authentification |
| `discount_used` | CODE PROMO UTILISÉ | `#ea580c` (orange) | `/api/checkout` (free) et webhook Stripe (paid) |

## Template HTML

Reprend le style des emails de confirmation existants :

- **Header** : fond noir `#0a0a0a`, titre "BVFactory", sous-titre teal "Show Control Division"
- **Badge** : bandeau coloré selon le type d'événement avec le label en majuscules
- **Corps** : tableau clé/valeur avec les détails de l'événement dans un cadre blanc bordé
- **Footer** : identique aux emails existants (lien bvfactory.dev)
- **Langue** : tout en français (labels, descriptions, formatage des prix)
- **Typo** : `'Courier New', monospace` (identique à l'existant)

## Sujets des emails

Format : `[BVFactory] {LABEL} — {résumé}`

| Type | Exemple de sujet |
|------|-----------------|
| `order_paid` | `[BVFactory] NOUVELLE COMMANDE — 150,00€ de client@example.com` |
| `order_free` | `[BVFactory] LICENCE GRATUITE — Plugin X pour client@example.com` |
| `contact_received` | `[BVFactory] NOUVEAU MESSAGE — Sujet du message` |
| `license_activated` | `[BVFactory] LICENCE ACTIVÉE — Plugin X sur Core ABC-123` |
| `admin_login_failed` | `[BVFactory] ALERTE SÉCURITÉ — Tentative échouée depuis 192.168.1.1` |
| `discount_used` | `[BVFactory] CODE PROMO UTILISÉ — SUMMER25 (3/10 utilisations)` |

## Données par événement

### order_paid
- Email client
- Montant total (formaté avec devise)
- Liste des produits + Core IDs
- Code promo utilisé (si applicable)
- ID de commande (format court)

### order_free
- Email client
- Liste des produits + Core IDs
- Code promo utilisé (si applicable)

### contact_received
- Nom de l'expéditeur
- Email
- Sujet
- Message (tronqué à 500 caractères)

### license_activated
- Nom du produit
- Core ID
- Email client (depuis la commande liée)
- Date/heure d'activation

### admin_login_failed
- Adresse IP
- Date/heure
- Nombre de tentatives récentes (si disponible)

### discount_used
- Code promo
- Pourcentage de réduction
- Utilisations actuelles / max
- Email du client qui l'a utilisé

## Points d'intégration

| Fichier | Événement | Position |
|---------|-----------|----------|
| `src/lib/email.ts` | — | Ajout de `sendAdminNotification()` + helpers HTML |
| `src/app/api/webhooks/stripe/route.ts` | `order_paid`, `discount_used` | Après mise à jour statut paid + envoi email client |
| `src/app/api/webhooks/qonto/route.ts` | `order_paid` | Après confirmation paiement |
| `src/app/api/checkout/route.ts` | `order_free`, `discount_used` | Après `handleFreeOrder()` |
| `src/app/api/contact/route.ts` | `contact_received` | Après envoi du message de contact |
| `src/app/api/license/verify/route.ts` | `license_activated` | Quand `activated_at` passe de null à une date |
| `src/app/api/admin/auth/route.ts` | `admin_login_failed` | Après échec d'authentification |

## Comportement

- **Fire-and-forget** : l'envoi est wrappé dans un `try/catch`, un échec n'impacte jamais le flow principal
- **Pas de blocage** : la notification ne doit pas ralentir la réponse au client
- **Resend batch** : un seul appel `resend.emails.send()` avec `to: [addr1, addr2]` pour envoyer aux 2 adresses
- **Pas de nouvelle dépendance** : utilise Resend déjà installé (v6.9.3)
