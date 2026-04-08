# Admin Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notifier l'admin par email (Resend) pour chaque interaction importante : commandes, messages contact, activations licence, echecs login admin, utilisation codes promo.

**Architecture:** Fonction centralisee `sendAdminNotification()` dans `src/lib/email.ts` avec template HTML style BVFactory. Appels fire-and-forget dans chaque route API concernee.

**Tech Stack:** Next.js 16, Resend 6.9.3, TypeScript

---

### Task 1: Ajouter `sendAdminNotification()` dans email.ts

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Definir les types pour les notifications admin**

Ajouter apres l'interface `OrderEmailParams` (ligne 18) :

```typescript
type AdminNotificationType =
    | "order_paid"
    | "order_free"
    | "contact_received"
    | "license_activated"
    | "admin_login_failed"
    | "discount_used";

interface AdminNotificationConfig {
    label: string;
    color: string;
}

const NOTIFICATION_CONFIG: Record<AdminNotificationType, AdminNotificationConfig> = {
    order_paid: { label: "NOUVELLE COMMANDE", color: "#0f4a42" },
    order_free: { label: "LICENCE GRATUITE", color: "#14b8a6" },
    contact_received: { label: "NOUVEAU MESSAGE", color: "#1e40af" },
    license_activated: { label: "LICENCE ACTIVEE", color: "#7c3aed" },
    admin_login_failed: { label: "ALERTE SECURITE", color: "#dc2626" },
    discount_used: { label: "CODE PROMO UTILISE", color: "#ea580c" },
};

const ADMIN_EMAILS = ["contact@bvfactory.dev", "contact.bvfactory@gmail.com"];
```

- [ ] **Step 2: Ajouter la fonction de construction du HTML admin**

Ajouter apres le bloc `ADMIN_EMAILS` :

```typescript
function buildAdminNotificationHtml(
    type: AdminNotificationType,
    subject: string,
    details: Record<string, string>
): string {
    const config = NOTIFICATION_CONFIG[type];
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const detailRows = Object.entries(details)
        .map(
            ([key, value]) => `
        <tr>
            <td style="padding: 8px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 1px solid #e5e5e5; width: 140px; vertical-align: top;">${key}</td>
            <td style="padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #e5e5e5; word-break: break-word;">${value}</td>
        </tr>`
        )
        .join("");

    return `
    <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; color: #111; background-color: #fafafa; padding: 0;">

        <!-- Header -->
        <div style="background-color: #0a0a0a; padding: 30px 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 18px; letter-spacing: 2px; text-transform: uppercase;">BVFactory</h1>
            <p style="color: #14b8a6; margin: 8px 0 0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Show Control Division</p>
        </div>

        <!-- Badge -->
        <div style="background-color: ${config.color}; padding: 12px 24px; text-align: center;">
            <p style="color: #fff; margin: 0; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">${config.label}</p>
        </div>

        <div style="padding: 24px;">

            <!-- Date -->
            <p style="font-size: 11px; color: #888; margin: 0 0 16px 0;">${dateStr}</p>

            <!-- Details -->
            <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 4px; padding: 0; margin: 0 0 20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    ${detailRows}
                </table>
            </div>

            <!-- Footer -->
            <p style="font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 16px; margin-top: 24px; line-height: 1.6;">
                BVFactory &mdash; Show Control Division<br/>
                <a href="https://bvfactory.dev" style="color: #888;">bvfactory.dev</a><br/>
                Notification automatique &mdash; ne pas repondre a cet email.
            </p>
        </div>
    </div>`;
}
```

- [ ] **Step 3: Ajouter la fonction publique `sendAdminNotification()`**

Ajouter apres `buildAdminNotificationHtml` :

```typescript
export async function sendAdminNotification(
    type: AdminNotificationType,
    subject: string,
    details: Record<string, string>
): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const resend = new Resend(apiKey);
    const config = NOTIFICATION_CONFIG[type];
    const fullSubject = `[BVFactory] ${config.label} — ${subject}`;

    try {
        await resend.emails.send({
            from: "BVFactory Alertes <noreply@bvfactory.dev>",
            to: ADMIN_EMAILS,
            subject: fullSubject,
            html: buildAdminNotificationHtml(type, subject, details),
        });
    } catch (error) {
        console.error(`Failed to send admin notification (${type}):`, error);
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add sendAdminNotification() with styled HTML template"
```

---

### Task 2: Notification pour commande payee (Stripe)

**Files:**
- Modify: `src/app/api/webhooks/stripe/route.ts:4` (ajouter import)
- Modify: `src/app/api/webhooks/stripe/route.ts:126` (ajouter appel apres sendOrderConfirmation)

- [ ] **Step 1: Ajouter l'import**

A la ligne 4, modifier :

```typescript
import { sendOrderConfirmation } from "@/lib/email";
```

en :

```typescript
import { sendOrderConfirmation, sendAdminNotification } from "@/lib/email";
```

- [ ] **Step 2: Ajouter la notification apres l'envoi de l'email client**

Apres le bloc `await sendOrderConfirmation({...});` (ligne 125), ajouter :

```typescript
            // Notify admin
            const totalCents = itemsWithLicenses.reduce((sum, i) => sum + (i.product?.price_cents || 0), 0);
            const discountCents = order.discount_percent ? Math.round((totalCents * order.discount_percent) / 100) : 0;
            const finalCents = totalCents - discountCents;
            sendAdminNotification("order_paid", `${(finalCents / 100).toFixed(2)}EUR de ${order.customer_email}`, {
                "Commande": order.id.substring(0, 8) + "...",
                "Client": order.customer_email,
                "Montant": `${(finalCents / 100).toFixed(2)} EUR`,
                "Produits": itemsWithLicenses.map(i => `${i.product.name} (${i.coreId})`).join(", "),
                ...(order.discount_code ? { "Code promo": `${order.discount_code} (-${order.discount_percent}%)` } : {}),
            });
```

- [ ] **Step 3: Ajouter la notification discount_used si applicable**

Apres le bloc `await supabase.rpc('try_use_discount', ...)` (ligne 109), ajouter :

```typescript
                sendAdminNotification("discount_used", `${order.discount_code}`, {
                    "Code": order.discount_code,
                    "Reduction": `${order.discount_percent}%`,
                    "Client": order.customer_email,
                });
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat: add admin notifications for paid orders (Stripe)"
```

---

### Task 3: Notification pour commande payee (Qonto)

**Files:**
- Modify: `src/app/api/webhooks/qonto/route.ts:5` (ajouter import)
- Modify: `src/app/api/webhooks/qonto/route.ts:116` (ajouter appel apres email)

- [ ] **Step 1: Ajouter l'import**

A la ligne 5, remplacer :

```typescript
import { Resend } from "resend";
```

par :

```typescript
import { Resend } from "resend";
import { sendAdminNotification } from "@/lib/email";
```

- [ ] **Step 2: Ajouter la notification apres l'envoi de l'email Qonto**

Apres le bloc `}` qui ferme le `if (process.env.RESEND_API_KEY)` (ligne 116), ajouter :

```typescript
            // Notify admin
            sendAdminNotification("order_paid", `Qonto — ${order.customer_email}`, {
                "Commande": order.id.substring(0, 8) + "...",
                "Client": order.customer_email,
                "Core ID": order.core_id || "N/A",
                "Paiement": "Qonto (virement)",
            });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/qonto/route.ts
git commit -m "feat: add admin notification for paid orders (Qonto)"
```

---

### Task 4: Notification pour commande gratuite + discount

**Files:**
- Modify: `src/app/api/checkout/route.ts:4` (ajouter import)
- Modify: `src/app/api/checkout/route.ts:98` (ajouter appel dans handleFreeOrder path)

- [ ] **Step 1: Ajouter l'import**

A la ligne 4, modifier :

```typescript
import { sendOrderConfirmation } from "@/lib/email";
```

en :

```typescript
import { sendOrderConfirmation, sendAdminNotification } from "@/lib/email";
```

- [ ] **Step 2: Ajouter la notification order_free apres handleFreeOrder**

Dans le bloc `if (effectivelyFree)` (ligne 88), juste avant le `return await handleFreeOrder(...)` (ligne 98), ajouter :

```typescript
            // Notify admin of free order
            sendAdminNotification("order_free", `${verifiedItems.map(i => i.product.name).join(", ")} pour ${email}`, {
                "Client": email,
                "Produits": verifiedItems.map(i => `${i.product.name} (${i.coreId})`).join(", "),
                ...(appliedDiscountPercent > 0 ? { "Code promo": `${discountCode?.toUpperCase()} (-${appliedDiscountPercent}%)` } : {}),
            });
```

- [ ] **Step 3: Ajouter la notification discount_used apres try_use_discount**

Dans le bloc `if (appliedDiscountPercent > 0 && discountCode)` (ligne 91), apres la verification `if (!used...)` (ligne 95), ajouter :

```typescript
                sendAdminNotification("discount_used", `${discountCode.toUpperCase()} (commande gratuite)`, {
                    "Code": discountCode.toUpperCase().trim(),
                    "Reduction": `${appliedDiscountPercent}%`,
                    "Client": email,
                });
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/checkout/route.ts
git commit -m "feat: add admin notifications for free orders and discount usage"
```

---

### Task 5: Notification pour message de contact

**Files:**
- Modify: `src/app/api/contact/route.ts:45` (ajouter apres envoi email)

- [ ] **Step 1: Ajouter l'import en haut du fichier**

Apres la ligne 1 (`import { NextResponse } from "next/server";`), ajouter :

```typescript
import { sendAdminNotification } from "@/lib/email";
```

- [ ] **Step 2: Ajouter la notification apres l'envoi du message de contact**

Apres le bloc `} else {` / `console.log(...)` / `}` (ligne 49), juste avant le `return NextResponse.json({ success: true });` (ligne 51), ajouter :

```typescript
        // Notify admin
        sendAdminNotification("contact_received", subject, {
            "Nom": name,
            "Email": email,
            "Sujet": subject,
            "Message": message.length > 500 ? message.substring(0, 500) + "..." : message,
        });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "feat: add admin notification for contact form submissions"
```

---

### Task 6: Notification pour premiere activation de licence

**Files:**
- Modify: `src/app/api/license/verify/route.ts:2` (ajouter import)
- Modify: `src/app/api/license/verify/route.ts:80-85` (ajouter notification dans bloc first activation)

- [ ] **Step 1: Ajouter les imports**

Apres la ligne 2 (`import { createClient } from "@/lib/supabase/server";`), ajouter :

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminNotification } from "@/lib/email";
```

Note : `createAdminClient` est necessaire car le RLS de la table `orders` ne permet la lecture qu'au `service_role`.

- [ ] **Step 2: Modifier le bloc de premiere activation pour detecter et notifier**

Remplacer le bloc lignes 79-85 :

```typescript
        if (isValid) {
            // Mark first activation time
            await supabase
                .from("licenses")
                .update({ activated_at: new Date().toISOString() })
                .eq("license_key", licenseKey)
                .is("activated_at", null);
        }
```

par :

```typescript
        if (isValid) {
            // Mark first activation time
            const { data: activatedRows } = await supabase
                .from("licenses")
                .update({ activated_at: new Date().toISOString() })
                .eq("license_key", licenseKey)
                .is("activated_at", null)
                .select("product_id, core_id, order_id");

            // Notify admin on first activation only
            if (activatedRows && activatedRows.length > 0) {
                const activated = activatedRows[0];

                // Use admin client to read order (RLS: service_role only)
                const adminSupabase = createAdminClient();
                const { data: order } = await adminSupabase
                    .from("orders")
                    .select("customer_email")
                    .eq("id", activated.order_id)
                    .single();

                sendAdminNotification("license_activated", `${productId} sur ${coreId}`, {
                    "Produit": productId,
                    "Core ID": coreId,
                    ...(order?.customer_email ? { "Client": order.customer_email } : {}),
                    "Date": new Date().toLocaleDateString("fr-FR", {
                        year: "numeric", month: "long", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                    }),
                });
            }
        }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/license/verify/route.ts
git commit -m "feat: add admin notification for first license activation"
```

---

### Task 7: Notification pour echec de connexion admin

**Files:**
- Modify: `src/app/api/admin/auth/route.ts:7` (ajouter import)
- Modify: `src/app/api/admin/auth/route.ts:63` (ajouter notification apres echec)

- [ ] **Step 1: Ajouter l'import**

Apres la ligne 6 (`} from "@/lib/admin-auth";`), ajouter :

```typescript
import { sendAdminNotification } from "@/lib/email";
```

- [ ] **Step 2: Ajouter la notification apres l'echec d'authentification**

Apres le `await new Promise(...)` (ligne 63), juste avant le `return securityHeaders(...)` (ligne 65), ajouter :

```typescript
      // Notify admin of failed login attempt
      sendAdminNotification("admin_login_failed", `Tentative echouee depuis ${ip}`, {
          "Adresse IP": ip,
          "Date": new Date().toLocaleDateString("fr-FR", {
              year: "numeric", month: "long", day: "numeric",
              hour: "2-digit", minute: "2-digit",
          }),
      });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/auth/route.ts
git commit -m "feat: add admin notification for failed login attempts"
```

---

### Task 8: Test manuel et commit final

- [ ] **Step 1: Verifier que le build passe**

```bash
npm run build
```

Expected: Build reussi sans erreur TypeScript.

- [ ] **Step 2: Verifier les imports**

Verifier que chaque fichier modifie importe bien `sendAdminNotification` depuis `@/lib/email`.

Run:
```bash
grep -r "sendAdminNotification" src/ --include="*.ts"
```

Expected: 8 resultats — 1 export dans email.ts + 7 appels dans les routes.

- [ ] **Step 3: Commit final si ajustements necessaires**

```bash
git add -A
git commit -m "feat: complete admin email notification system"
```
