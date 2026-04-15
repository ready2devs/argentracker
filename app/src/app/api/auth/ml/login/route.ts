import { NextResponse } from "next/server";

// ================================================
// GET /api/auth/ml/login
// Redirige al usuario a la página de autorización de ML
// ================================================

const ML_AUTH_URL = "https://auth.mercadolibre.com.ar/authorization";
const CLIENT_ID = process.env.ML_CLIENT_ID!;
const REDIRECT_URI = process.env.ML_REDIRECT_URI!;

export async function GET() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: crypto.randomUUID(), // CSRF protection
  });

  const authUrl = `${ML_AUTH_URL}?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
