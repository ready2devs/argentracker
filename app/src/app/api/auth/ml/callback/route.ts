import { NextRequest, NextResponse } from "next/server";

// ================================================
// GET /api/auth/ml/callback
// ML redirige acá con ?code=... tras el login del usuario.
// Intercambia el code por access_token + refresh_token.
// ================================================

const CLIENT_ID = process.env.ML_CLIENT_ID!;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET!;
const REDIRECT_URI = process.env.ML_REDIRECT_URI!;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error("[ML OAuth] Error:", error);
    return NextResponse.redirect(new URL("/?ml_auth=error", request.url));
  }

  // Intercambiar code → access_token
  let tokenData: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user_id: number;
    token_type: string;
  };

  try {
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[ML OAuth] Token exchange failed:", res.status, body);
      return NextResponse.redirect(new URL("/?ml_auth=error", request.url));
    }

    tokenData = await res.json();
  } catch (err) {
    console.error("[ML OAuth] Exception:", err);
    return NextResponse.redirect(new URL("/?ml_auth=error", request.url));
  }

  // Guardar tokens en cookies httpOnly
  const response = NextResponse.redirect(new URL("/?ml_auth=success", request.url));

  // Access token (expira según ML, normalmente 6 horas)
  response.cookies.set("ml_access_token", tokenData.access_token, {
    ...COOKIE_OPTS,
    maxAge: tokenData.expires_in - 60, // margen de 1 minuto
  });

  // Refresh token (larga duración)
  response.cookies.set("ml_refresh_token", tokenData.refresh_token, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });

  // User ID para identificar al usuario
  response.cookies.set("ml_user_id", String(tokenData.user_id), {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 30,
  });

  console.log("[ML OAuth] ✅ Token for user:", tokenData.user_id, "| expires_in:", tokenData.expires_in);

  return response;
}
