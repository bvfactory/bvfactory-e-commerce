import { NextResponse } from "next/server";
import {
  verifyPassword,
  createSessionToken,
  COOKIE_NAME,
} from "@/lib/admin-auth";

const SESSION_DURATION_S = 24 * 60 * 60;

// Rate limiting: max 5 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export async function POST(request: Request) {
  const ip = getClientIP(request);

  if (isRateLimited(ip)) {
    const res = NextResponse.json(
      { error: "Trop de tentatives. R\u00e9essayez dans 15 minutes." },
      { status: 429 }
    );
    res.headers.set("Retry-After", "900");
    return securityHeaders(res);
  }

  try {
    const { password } = await request.json();

    if (!password || !(await verifyPassword(password))) {
      // Deliberate delay to slow brute force (200-500ms random)
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

      return securityHeaders(
        NextResponse.json({ error: "Mot de passe invalide" }, { status: 401 })
      );
    }

    // Reset attempts on successful login
    loginAttempts.delete(ip);

    const token = await createSessionToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_DURATION_S,
    });

    return securityHeaders(response);
  } catch (err) {
    console.error("Admin auth error:", err);
    return securityHeaders(
      NextResponse.json({ error: "Erreur interne" }, { status: 500 })
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return securityHeaders(response);
}
