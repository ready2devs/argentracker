import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// ================================================
// GET /api/auth/ml/login
// Redirige al usuario a la página de autorización de ML
// Incluye PKCE (code_challenge + code_verifier) requerido por ML.
// ================================================

const ML_AUTH_URL = "https://auth.mercadolibre.com.ar/authorization";
const CLIENT_ID = process.env.ML_CLIENT_ID!;
const REDIRECT_URI = process.env.ML_REDIRECT_URI!;

// Generate a random code_verifier (43-128 chars, URL-safe)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// SHA-256 hash then base64url encode for code_challenge
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64URLEncode(new Uint8Array(hash));
}

function base64URLEncode(buffer: Uint8Array): string {
  let str = "";
  for (const byte of buffer) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET() {
  // Generate PKCE pair
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code_verifier in a cookie so callback can retrieve it
  const cookieStore = await cookies();
  cookieStore.set("ml_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes — enough for OAuth flow
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: crypto.randomUUID(), // CSRF protection
  });

  const authUrl = `${ML_AUTH_URL}?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
