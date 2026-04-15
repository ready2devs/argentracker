import type { MLItem, MLSearchOptions, MLSearchResponse } from "@/types";

// ================================================
// MLConnector — Wrapper de la API pública de ML
// ================================================

const BASE_URL = "https://api.mercadolibre.com";
const SITE_ID = process.env.ML_SITE_ID || "MLA";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function humanDelay(min = 300, max = 700): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min);
  return new Promise((r) => setTimeout(r, ms));
}

export class MLConnector {
  // Búsqueda SIMPLE — sin condition ni sort (causan 403).
  // La condición se filtra client-side desde los resultados.
  async search(query: string, limit = 50): Promise<MLItem[]> {
    await humanDelay();

    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
    });

    const url = `${BASE_URL}/sites/${SITE_ID}/search?${params.toString()}`;
    console.log("[ML] GET", url);

    const res = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        Accept: "application/json",
        "Accept-Language": "es-AR,es;q=0.9",
        Referer: "https://www.mercadolibre.com.ar/",
        Origin: "https://www.mercadolibre.com.ar",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ML ${res.status}: ${body.slice(0, 100)}`);
    }

    const data: MLSearchResponse = await res.json();
    console.log("[ML] Got", data.results?.length, "results (total:", data.paging?.total, ")");
    return data.results || [];
  }

  // Búsqueda doble: busca una vez y separa por condición
  async searchBothConditions(query: string): Promise<{ new: MLItem[]; used: MLItem[] }> {
    const all = await this.search(query, 50);
    return {
      new: all.filter((i) => i.condition === "new"),
      used: all.filter((i) => i.condition === "used"),
    };
  }

  async getItem(itemId: string): Promise<MLItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/items/${itemId}`, {
        headers: { "User-Agent": randomUA(), Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

export const mlConnector = new MLConnector();
