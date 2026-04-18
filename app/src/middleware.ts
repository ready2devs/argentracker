import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ================================================
// Security Middleware — Required for ML App Certification
//
// ML audits that Redirect URIs and Webhook URLs respond
// with proper security headers. Missing headers penalize
// the security score heavily.
//
// Headers implemented:
// - Strict-Transport-Security (HSTS)
// - Content-Security-Policy (CSP)
// - X-Content-Type-Options
// - X-Frame-Options
// - X-XSS-Protection
// - Referrer-Policy
// - Permissions-Policy
// ================================================

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // HSTS — Forces HTTPS for 1 year, includes subdomains
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // CSP — Prevents XSS, only allows trusted sources
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: http:",
      "connect-src 'self' https://api.mercadolibre.com https://*.supabase.co https://*.mercadolibre.com.ar",
      "frame-src 'self' https://www.google.com",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // XSS Protection (legacy browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy — Don't leak full URL to external sites
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy — Disable unnecessary browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

// Apply to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
