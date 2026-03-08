import { NextResponse } from "next/server";
import requestIp from "request-ip";
import { headers } from "next/headers";

// Very basic fallback rates since this is a demo.
// In a real app we would call an API like https://open.er-api.com/v6/latest/EUR
const FALLBACK_RATES: Record<string, number> = {
    EUR: 1,
    USD: 1.05,
    GBP: 0.85,
    CAD: 1.45,
    AUD: 1.65,
    JPY: 160.5,
};

// Map ISO country codes to currencies
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    US: "USD",
    GB: "GBP",
    CA: "CAD",
    AU: "AUD",
    JP: "JPY",
    // EU Zone
    FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
    BE: "EUR", AT: "EUR", GR: "EUR", PT: "EUR", FI: "EUR",
    IE: "EUR", LU: "EUR", CY: "EUR", MT: "EUR", SK: "EUR",
    EE: "EUR", LV: "EUR", LT: "EUR", SI: "EUR"
};

export async function GET() {
    try {
        // 1. Determine IP and Country
        const headersList = await headers();
        let countryCode = headersList.get("x-vercel-ip-country");

        // Fallback to IP lookup if not on Vercel
        if (!countryCode) {
            const clientIp = requestIp.getClientIp({ headers: Object.fromEntries(headersList) } as any);
            if (clientIp) {
                // In a real scenario we might use ip-api.com or similar here
                console.log("Client IP:", clientIp);
                // Defaulting to EUR for local dev if we can't get it from vercel headers
                countryCode = "FR";
            } else {
                countryCode = "FR";
            }
        }

        // 2. Determine target currency
        const targetCurrency = COUNTRY_CURRENCY_MAP[countryCode] || "EUR";

        // 3. Get rate
        // Mocking an external API call here
        // const rateRes = await fetch("https://open.er-api.com/v6/latest/EUR");
        // const rateData = await rateRes.json();
        // const rate = rateData.rates[targetCurrency];
        const rate = FALLBACK_RATES[targetCurrency] || 1;

        return NextResponse.json({
            country: countryCode,
            currency: targetCurrency,
            rate,
        });
    } catch (error) {
        console.error("Currency API error:", error);
        return NextResponse.json({ country: "FR", currency: "EUR", rate: 1 }, { status: 500 });
    }
}
