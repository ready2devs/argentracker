import type { MLItem, MLSearchOptions, MLSearchResponse } from "@/types";

// ================================================
// MLConnector — Wrapper de la API pública de ML
// Independiente del frontend (puede usarse en CLI/workers)
// ================================================

const BASE_URL = "https://api.mercadolibre.com";
const SITE_ID = process.env.ML_SITE_ID || "MLA";

// Pool de User-Agents para rotación [Ref 15]
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getBrowserHeaders() {
  return {
    "User-Agent": randomUA(),
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    Origin: "https://www.mercadolibre.com.ar",
    Referer: "https://www.mercadolibre.com.ar/",
  };
}

// Delay humanizado [Ref 16]
function humanDelay(min = 300, max = 900): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MLConnector {
  // ----------------------------------------------------------------
  // Búsqueda principal — usa endpoint público sin autenticación.
  // Nota: El endpoint /sites/MLA/search es público.
  // El Client ID/Secret solo se usa para endpoints de usuario autenticado.
  // ----------------------------------------------------------------
  async search(options: MLSearchOptions): Promise<MLItem[]> {
    await humanDelay();

    const params = new URLSearchParams({
      q: options.query,
      limit: String(options.limit || 50),
      offset: String(options.offset || 0),
    });

    if (options.sort === "price_asc") params.append("sort", "price_asc");
    else if (options.sort === "price_desc") params.append("sort", "price_desc");

    if (options.condition) params.append("condition", options.condition);

    const url = `${BASE_URL}/sites/${SITE_ID}/search?${params.toString()}`;

    console.log("[MLConnector] Searching:", url);

    const response = await fetch(url, {
      headers: getBrowserHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[MLConnector] Error:", response.status, body.slice(0, 300));
      throw new Error(`ML API error ${response.status}`);
    }

    const data: MLSearchResponse = await response.json();
    console.log("[MLConnector] Got", data.results?.length, "results");
    return data.results || [];
  }

  // Búsqueda doble: nuevo + usado en paralelo
  async searchBothConditions(query: string): Promise<{
    new: MLItem[];
    used: MLItem[];
  }> {
    const [newItems, usedItems] = await Promise.all([
      this.search({ query, condition: "new", sort: "price_asc", limit: 50 }),
      this.search({ query, condition: "used", sort: "price_asc", limit: 50 }),
    ]);
    return { new: newItems, used: usedItems };
  }

  // Obtener detalle de un item específico
  async getItem(itemId: string): Promise<MLItem | null> {
    await humanDelay(200, 500);
    try {
      const response = await fetch(`${BASE_URL}/items/${itemId}`, {
        headers: getBrowserHeaders(),
        next: { revalidate: 3600 },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}

export const mlConnector = new MLConnector();
