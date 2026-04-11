import { Resend } from "resend";

interface InvoiceItem {
    productName: string;
    coreId: string;
    priceCents: number;
}

interface OrderEmailParams {
    to: string;
    orderId: string;
    activationCode: string;
    items: InvoiceItem[];
    currency: string;
    discountCode?: string | null;
    discountPercent?: number | null;
    paidAt?: string;
}

type AdminNotificationType =
    | "order_paid"
    | "order_free"
    | "contact_received"
    | "license_activated"
    | "admin_login_failed"
    | "discount_used"
    | "order_refunded";

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
    order_refunded: { label: "REMBOURSEMENT", color: "#0369a1" },
};

const ADMIN_EMAILS = ["contact@bvfactory.dev", "contact.bvfactory@gmail.com"];

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

function formatPrice(cents: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
    }).format(cents / 100);
}

function generateInvoiceNumber(orderId: string, date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const short = orderId.substring(0, 8).toUpperCase();
    return `BVF-${y}${m}-${short}`;
}

function buildEmailHtml(params: OrderEmailParams): string {
    const {
        orderId,
        activationCode,
        items,
        currency,
        discountCode,
        discountPercent,
        paidAt,
    } = params;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const activationLink = `${baseUrl}/activation?code=${activationCode}`;
    const now = paidAt ? new Date(paidAt) : new Date();
    const invoiceNumber = generateInvoiceNumber(orderId, now);
    const dateStr = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const subtotalCents = items.reduce((sum, i) => sum + i.priceCents, 0);
    const discountCents =
        discountPercent && discountPercent > 0
            ? Math.round((subtotalCents * discountPercent) / 100)
            : 0;
    const totalCents = subtotalCents - discountCents;
    const isFree = totalCents === 0;

    const itemRows = items
        .map(
            (item) => `
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; font-size: 13px;">
                ${item.productName}<br/>
                <span style="color: #888; font-size: 11px;">Core ID: ${item.coreId}</span>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right; font-size: 13px; white-space: nowrap;">
                ${item.priceCents === 0 ? "FREE" : formatPrice(item.priceCents, currency)}
            </td>
        </tr>`
        )
        .join("");

    const discountRow = discountCents > 0
        ? `<tr>
            <td style="padding: 6px 0; font-size: 13px; color: #0f4a42;">Discount (${discountCode || ""} &mdash; ${discountPercent}%)</td>
            <td style="padding: 6px 0; text-align: right; font-size: 13px; color: #0f4a42;">-${formatPrice(discountCents, currency)}</td>
        </tr>`
        : "";

    return `
    <div style="font-family: 'Courier New', monospace; max-width: 600px; margin: 0 auto; color: #111; background-color: #fafafa; padding: 0;">

        <!-- Header -->
        <div style="background-color: #0a0a0a; padding: 30px 24px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 18px; letter-spacing: 2px; text-transform: uppercase;">BVFactory</h1>
            <p style="color: #14b8a6; margin: 8px 0 0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">Show Control Division</p>
        </div>

        <div style="padding: 24px;">

            <!-- Confirmation -->
            <h2 style="text-transform: uppercase; border-bottom: 2px solid #333; padding-bottom: 10px; font-size: 16px; margin-top: 0;">
                ${isFree ? "License Compiled Successfully" : "Order Confirmed"}
            </h2>
            <p style="font-size: 13px; line-height: 1.6; color: #444;">
                ${isFree
                    ? "Your free Q-SYS plugin license has been compiled and is ready for deployment."
                    : "Your payment has been processed. Your Q-SYS plugin licenses have been compiled for your custom Core IDs."
                }
            </p>

            <!-- Invoice -->
            <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 4px; padding: 16px; margin: 20px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 8px;">
                    <tr>
                        <td style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Invoice</td>
                        <td style="text-align: right; font-size: 11px; color: #888;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="font-size: 13px; font-weight: bold; padding-top: 2px;">${invoiceNumber}</td>
                        <td style="text-align: right; font-size: 11px; color: #888;">Order ${orderId.substring(0, 8)}...</td>
                    </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
                    <tr style="border-bottom: 2px solid #333;">
                        <td style="padding: 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 2px solid #333;">Item</td>
                        <td style="padding: 6px 0; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 2px solid #333;">Price</td>
                    </tr>
                    ${itemRows}
                    <tr>
                        <td style="padding: 6px 0; font-size: 13px;">Subtotal</td>
                        <td style="padding: 6px 0; text-align: right; font-size: 13px;">${formatPrice(subtotalCents, currency)}</td>
                    </tr>
                    ${discountRow}
                    <tr>
                        <td style="padding: 10px 0 4px; font-size: 15px; font-weight: bold; border-top: 2px solid #333;">Total</td>
                        <td style="padding: 10px 0 4px; text-align: right; font-size: 15px; font-weight: bold; border-top: 2px solid #333;">
                            ${totalCents === 0 ? "FREE" : formatPrice(totalCents, currency)}
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Activation CTA -->
            <div style="background-color: #0a0a0a; text-align: center; padding: 30px 20px; border-radius: 4px; margin: 24px 0; border: 1px solid #333;">
                <p style="color: #0f0; margin: 0 0 16px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Ready for uplink</p>
                <a href="${activationLink}" style="display: inline-block; background-color: #0f4a42; color: #fff; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 4px; border: 1px solid #14b8a6; text-transform: uppercase; letter-spacing: 1px;">
                    Access Activation Portal
                </a>
            </div>

            <p style="font-size: 13px; line-height: 1.6;">Your Activation Code:</p>
            <p style="font-family: monospace; background: #eee; padding: 10px; text-align: center; font-weight: bold; font-size: 20px; color: #0f4a42; border-radius: 4px;">${activationCode}</p>

            <!-- Plugin Download -->
            <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 4px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #0f4a42; text-transform: uppercase; letter-spacing: 1px;">&#x2193; Download Your Plugins</p>
                <p style="margin: 0 0 12px; font-size: 12px; color: #555; line-height: 1.5;">
                    Access the Activation Portal to download your .qplugx plugin files and retrieve your license keys at any time.
                </p>
                <a href="${activationLink}" style="display: inline-block; background-color: #0f4a42; color: #fff; text-decoration: none; font-family: sans-serif; font-weight: bold; font-size: 12px; padding: 10px 20px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                    Download Plugins
                </a>
            </div>

            <!-- Footer -->
            <p style="font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 16px; margin-top: 24px; line-height: 1.6;">
                BVFactory &mdash; Show Control Division<br/>
                <a href="https://bvfactory.dev" style="color: #888;">bvfactory.dev</a><br/>
                This email serves as your receipt. Please keep it for your records.
            </p>
        </div>
    </div>`;
}

export async function sendOrderConfirmation(params: OrderEmailParams): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;

    const resend = new Resend(apiKey);
    const isFree = params.items.every((i) => i.priceCents === 0) ||
        params.discountPercent === 100;

    const result = await resend.emails.send({
        from: "BVFactory <licences@bvfactory.dev>",
        to: params.to,
        subject: isFree
            ? "Your Free Q-SYS Plugin License - BVFactory"
            : `Order Confirmed - Invoice ${generateInvoiceNumber(params.orderId, new Date())} - BVFactory`,
        html: buildEmailHtml(params),
    });
    console.log("[email] Resend response:", JSON.stringify(result));
    if (result.error) {
        throw new Error(`Resend error: ${result.error.message}`);
    }
}
