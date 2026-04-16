import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// ================================================
// ML Token Manager — Multi-strategy token management
//
// Strategy 1: User OAuth (cookies) — highest priority
// Strategy 2: Server token (Supabase) — app owner authorized once
// Strategy 3: Client credentials — app-level token (limited scope)
// ================================================

const CLIENT_ID = process.env.ML_CLIENT_ID!;
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET!;

export interface MLTokenResult {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  source: "user_oauth" | "server_token" | "client_credentials" | "none";
}

// In-memory cache for server token (avoids DB hit every request)
let serverTokenCache: {
  accessToken: string;
  expiresAt: number;
} | null = null;

// In-memory cache for app token (client_credentials)
let appTokenCache: {
  accessToken: string;
  expiresAt: number;
} | null = null;

// -----------------------------------------------
// Strategy 1: Read user's OAuth token from cookies
// -----------------------------------------------
export async function getUserToken(): Promise<MLTokenResult> {
  try {
    const store = await cookies();
    const token = store.get("ml_access_token")?.value || null;
    const userId = store.get("ml_user_id")?.value || null;

    if (token) {
      return { token, userId, isAuthenticated: true, source: "user_oauth" };
    }
  } catch {
    // cookies() not available (e.g. in middleware)
  }

  return { token: null, userId: null, isAuthenticated: false, source: "none" };
}

// -----------------------------------------------
// Strategy 2: Server-stored token (app owner auth)
// Stored in Supabase `ml_server_tokens` table
// -----------------------------------------------
export async function getServerToken(): Promise<MLTokenResult> {
  // Check in-memory cache first
  if (serverTokenCache && serverTokenCache.expiresAt > Date.now() + 60_000) {
    return {
      token: serverTokenCache.accessToken,
      userId: null,
      isAuthenticated: true,
      source: "server_token",
    };
  }

  try {
    const db = createAdminClient();
    const { data } = await db
      .from("ml_server_tokens")
      .select("access_token, refresh_token, expires_at, user_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!data) return { token: null, userId: null, isAuthenticated: false, source: "none" };

    const expiresAt = new Date(data.expires_at).getTime();

    // Token still valid (with 2-minute margin)
    if (expiresAt > Date.now() + 120_000) {
      serverTokenCache = { accessToken: data.access_token, expiresAt };
      return {
        token: data.access_token,
        userId: data.user_id,
        isAuthenticated: true,
        source: "server_token",
      };
    }

    // Token expired — refresh it
    if (data.refresh_token) {
      const refreshed = await refreshToken(data.refresh_token);
      if (refreshed) {
        // Update in Supabase
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        await db.from("ml_server_tokens").upsert({
          id: "primary",
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: newExpiresAt,
          user_id: String(refreshed.user_id),
          updated_at: new Date().toISOString(),
        });

        serverTokenCache = {
          accessToken: refreshed.access_token,
          expiresAt: Date.now() + refreshed.expires_in * 1000,
        };

        return {
          token: refreshed.access_token,
          userId: String(refreshed.user_id),
          isAuthenticated: true,
          source: "server_token",
        };
      }
    }
  } catch (err) {
    console.warn("[MLTokenManager] Server token error:", String(err).slice(0, 100));
  }

  return { token: null, userId: null, isAuthenticated: false, source: "none" };
}

// -----------------------------------------------
// Strategy 3: Client credentials (limited scope)
// -----------------------------------------------
export async function getAppToken(): Promise<MLTokenResult> {
  if (appTokenCache && appTokenCache.expiresAt > Date.now() + 60_000) {
    return {
      token: appTokenCache.accessToken,
      userId: null,
      isAuthenticated: true,
      source: "client_credentials",
    };
  }

  try {
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!res.ok) return { token: null, userId: null, isAuthenticated: false, source: "none" };

    const data = await res.json();
    appTokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 21600) * 1000,
    };

    return {
      token: data.access_token,
      userId: String(data.user_id),
      isAuthenticated: true,
      source: "client_credentials",
    };
  } catch {
    return { token: null, userId: null, isAuthenticated: false, source: "none" };
  }
}

// -----------------------------------------------
// Combined: try all strategies in priority order
// -----------------------------------------------
export async function getMLToken(): Promise<MLTokenResult> {
  // 1. User OAuth cookie
  const userToken = await getUserToken();
  if (userToken.isAuthenticated) return userToken;

  // 2. Server-stored token (app owner)
  const srvToken = await getServerToken();
  if (srvToken.isAuthenticated) return srvToken;

  // 3. Client credentials (limited)
  const appTk = await getAppToken();
  if (appTk.isAuthenticated) return appTk;

  return { token: null, userId: null, isAuthenticated: false, source: "none" };
}

// -----------------------------------------------
// Token refresh helper
// -----------------------------------------------
async function refreshToken(refreshTokenStr: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
} | null> {
  try {
    const res = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshTokenStr,
      }),
    });

    if (!res.ok) {
      console.error("[MLTokenManager] Refresh failed:", res.status);
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

// -----------------------------------------------
// Save server token (called from OAuth callback)
// -----------------------------------------------
export async function saveServerToken(tokenData: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
}): Promise<void> {
  const db = createAdminClient();
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await db.from("ml_server_tokens").upsert({
    id: "primary",
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: expiresAt,
    user_id: String(tokenData.user_id),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Update in-memory cache
  serverTokenCache = {
    accessToken: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };

  console.log("[MLTokenManager] ✅ Server token saved for user:", tokenData.user_id);
}
