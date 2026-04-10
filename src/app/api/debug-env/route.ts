import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        LIGHTFORGE_LICENSE_SECRET: !!process.env.LIGHTFORGE_LICENSE_SECRET,
        LICENSE_MASTER_SECRET: !!process.env.LICENSE_MASTER_SECRET,
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        RESEND_API_KEY: !!process.env.RESEND_API_KEY,
        NODE_ENV: process.env.NODE_ENV,
    });
}
