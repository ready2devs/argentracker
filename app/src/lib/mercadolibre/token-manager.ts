import { cookies } from "next/headers";

// ================================================
// ML Token Manager — Lee y refresca el access token
// desde las cookies httpOnly del servidor
// ================================================

const CLIENT_ID = process.env.ML_CLIENT_ID!;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET!;

export interface MLTokenResult {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

// Lee el token actual del request
export async function getMLToken(): Promise<MLTokenResult> {
  const store = await cookies();
  const token = store.get("ml_access_token")?.value || null;
  const userId = store.get("ml_user_id")?.value || null;

  return {
    token,
    userId,
    isAuthenticated: !!token,
  };
}

// Refresca el token usando el refresh_token
export async function refreshMLToken(): Promise<string | null> {
  const store = await cookies();
  const refreshToken = store.get("ml_refresh_token")?.value;
  if (!refreshToken) return null;

  try {
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // No podemos set cookies desde aquí directamente (solo desde route handlers)
    // El caller deberá actualizar la cookie
    return data.access_token || null;
  } catch {
    return null;
  }
}
