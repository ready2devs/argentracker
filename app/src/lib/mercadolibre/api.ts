import type { MLItem, MLSearchOptions, MLSearchResponse } from "@/types";

// ================================================
// MLConnector — MercadoLibre API Client
//
// Strategy:
// 1. Authenticated API (with token) → full search access
// 2. If token is empty/null → skip (caller handles fallback)
//
// ML requires user-level OAuth for /sites/MLA/search.
// The client_credentials (app token) does NOT work for search.
// ================================================

const BASE_URL = "https://api.mercadolibre.com";
const SITE_ID = process.env.ML_SITE_ID || "MLA";

// Rotating User-Agent pool for humanization [Ref 15]
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Human-like delay between requests [Ref 16]
function humanDelay(min = 300, max = 800): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min) + min)));
}

export class MLConnector {
  // ----- SEARCH (requires user token) -----

  async search(options: MLSearchOptions & { accessToken?: string }): Promise<MLItem[]> {
    const token = options.accessToken;
    if (!token) {
      throw new Error("ML search requires an access_token (user OAuth).");
    }

    await humanDelay();

    const params = new URLSearchParams({
      q: options.query,
      limit: String(options.limit || 50),
    });

    if (options.condition) params.append("condition", options.condition);
    if (options.sort === "price_asc") params.append("sort", "price_asc");
    if (options.categoryId) params.append("category", options.categoryId);

    const url = `${BASE_URL}/sites/${SITE_ID}/search?${params.toString()}`;
    console.log("[ML] GET", url.substring(0, 100));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Accept-Language": "es-AR,es;q=0.9",
        "User-Agent": randomUserAgent(),
      },
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      const body = await res.text().catch(() => "");
      console.error(`[ML] Auth error ${res.status}:`, body.slice(0, 200));
      throw new Error(`ML_AUTH_ERROR:${res.status}`);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ML ${res.status}: ${body.slice(0, 100)}`);
    }

    const data: MLSearchResponse = await res.json();
    console.log("[ML] Results:", data.results?.length, "| Total:", data.paging?.total);

    // Map ML response to our MLItem type, extracting permalink and thumbnail
    return (data.results || []).map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency_id: item.currency_id || "ARS",
      condition: item.condition,
      permalink: item.permalink,
      thumbnail: item.thumbnail || null,
      seller: item.seller
        ? {
            id: item.seller.id,
            nickname: item.seller.nickname,
            reputation: item.seller.reputation
              ? {
                  level_id: item.seller.reputation.level_id || null,
                  power_seller_status: item.seller.reputation.power_seller_status || null,
                }
              : null,
          }
        : null,
      shipping: item.shipping
        ? { free_shipping: item.shipping.free_shipping || false }
        : null,
      address: item.address
        ? {
            city_name: item.address.city_name || "",
            state_name: item.address.state_name || "",
          }
        : null,
      installments: item.installments
        ? {
            quantity: item.installments.quantity,
            amount: item.installments.amount,
            rate: item.installments.rate,
          }
        : null,
      tags: item.tags || [],
    }));
  }

  // Search both conditions in parallel
  async searchBothConditions(
    query: string,
    accessToken?: string
  ): Promise<{ new: MLItem[]; used: MLItem[] }> {
    if (!accessToken) {
      throw new Error("ML search requires an access_token.");
    }

    const [newItems, usedItems] = await Promise.all([
      this.search({ query, condition: "new", sort: "price_asc", limit: 50, accessToken }),
      this.search({ query, condition: "used", sort: "price_asc", limit: 50, accessToken }).catch(
        () => [] as MLItem[]
      ), // Used may have no results — that's OK
    ]);
    return { new: newItems, used: usedItems };
  }

  // ----- SINGLE ITEM -----

  async getItem(itemId: string, accessToken?: string): Promise<MLItem | null> {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`${BASE_URL}/items/${itemId}`, {
        headers,
        next: { revalidate: 3600 },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // ----- CATEGORY PREDICTION -----

  async predictCategory(query: string, accessToken?: string): Promise<string | null> {
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(
        `${BASE_URL}/sites/${SITE_ID}/domain_discovery/search?q=${encodeURIComponent(query)}&limit=1`,
        { headers }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.[0]?.category_id || null;
    } catch {
      return null;
    }
  }
}

export const mlConnector = new MLConnector();
