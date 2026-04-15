import type { MLItem, MLSearchOptions, MLSearchResponse } from "@/types";

const BASE_URL = "https://api.mercadolibre.com";
const SITE_ID = process.env.ML_SITE_ID || "MLA";

function humanDelay(min = 200, max = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min) + min)));
}

export class MLConnector {
  // Búsqueda autenticada — requiere access_token de usuario OAuth
  async search(options: MLSearchOptions & { accessToken: string }): Promise<MLItem[]> {
    await humanDelay();

    const params = new URLSearchParams({
      q: options.query,
      limit: String(options.limit || 50),
    });

    if (options.condition) params.append("condition", options.condition);
    if (options.sort === "price_asc") params.append("sort", "price_asc");

    const url = `${BASE_URL}/sites/${SITE_ID}/search?${params.toString()}`;
    console.log("[ML] GET", url.substring(0, 80));

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        Accept: "application/json",
        "Accept-Language": "es-AR,es;q=0.9",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ML ${res.status}: ${body.slice(0, 100)}`);
    }

    const data: MLSearchResponse = await res.json();
    console.log("[ML] Results:", data.results?.length, "| Total:", data.paging?.total);
    return data.results || [];
  }

  // Búsqueda doble nuevo + usado con token de usuario
  async searchBothConditions(query: string, accessToken: string): Promise<{ new: MLItem[]; used: MLItem[] }> {
    const [newItems, usedItems] = await Promise.all([
      this.search({ query, condition: "new", sort: "price_asc", limit: 50, accessToken }),
      this.search({ query, condition: "used", sort: "price_asc", limit: 50, accessToken }),
    ]);
    return { new: newItems, used: usedItems };
  }

  async getItem(itemId: string, accessToken: string): Promise<MLItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/items/${itemId}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }
}

export const mlConnector = new MLConnector();
