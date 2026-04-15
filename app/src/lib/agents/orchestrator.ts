import { mlConnector } from "@/lib/mercadolibre/api";
import { generateMockResults, IS_MOCK_MODE } from "@/lib/mercadolibre/mock-data";
import { rankResults, calcAvgPrice } from "@/lib/agents/price-ranker";
import { dbManager } from "@/lib/agents/database-manager";
import type { RankedResult } from "@/types";

// ================================================
// Orchestrator — Coordina el flujo de búsqueda
// ================================================

export interface SearchInput {
  query: string;
  inputType: "url" | "screenshot";
  inputValue?: string;
  brand?: string;
  model?: string;
  category?: string;
  userId?: string;
  skipCache?: boolean;
}

export interface SearchOutput {
  searchId: string | null;
  productName: string;
  results: RankedResult[];
  bestNew: RankedResult | null;
  bestUsed: RankedResult | null;
  avgPrice: number;
  totalResults: number;
  fromCache: boolean;
  isMock: boolean;
  durationMs: number;
}

export async function orchestrateSearch(input: SearchInput): Promise<SearchOutput> {
  const start = Date.now();

  // 1. Verificar caché
  if (!input.skipCache) {
    const cached = await dbManager.getCached(input.query);
    if (cached?.length) {
      const bestNew = cached.find((r) => r.is_best_new) || null;
      const bestUsed = cached.find((r) => r.is_best_used) || null;
      const avgPrice = Math.round(cached.reduce((a, b) => a + b.price, 0) / cached.length);
      return {
        searchId: null,
        productName: input.query,
        results: cached,
        bestNew,
        bestUsed,
        avgPrice,
        totalResults: cached.length,
        fromCache: true,
        isMock: false,
        durationMs: Date.now() - start,
      };
    }
  }

  let allItems;
  let isMock = false;

  if (IS_MOCK_MODE) {
    // Modo desarrollo: usar datos mock
    console.log("[Orchestrator] 🧪 Using mock data (ML API not available from server)");
    isMock = true;
    allItems = generateMockResults(input.query);
  } else {
    // Producción: llamar a ML API (funciona en Vercel)
    try {
      const { new: newItems, used: usedItems } = await mlConnector.searchBothConditions(input.query);
      allItems = [...newItems, ...usedItems];
    } catch (err) {
      console.error("[Orchestrator] ML search failed:", err);
      throw new Error("No se pudo conectar con MercadoLibre. Intentá de nuevo.");
    }
  }

  if (!allItems.length) {
    return {
      searchId: null, productName: input.query, results: [],
      bestNew: null, bestUsed: null, avgPrice: 0, totalResults: 0,
      fromCache: false, isMock, durationMs: Date.now() - start,
    };
  }

  const ranked = rankResults(allItems);
  const avgPrice = calcAvgPrice(allItems);
  const bestNew = ranked.find((r) => r.is_best_new) || null;
  const bestUsed = ranked.find((r) => r.is_best_used) || null;

  // Guardar en caché solo si no es mock
  if (!isMock) {
    Promise.allSettled([
      dbManager.saveCache(input.query, ranked),
      dbManager.saveSearch({
        productName: input.query,
        brand: input.brand,
        model: input.model,
        category: input.category,
        inputType: input.inputType,
        inputValue: input.inputValue,
        results: ranked,
        avgPrice,
        userId: input.userId,
      }),
    ]).catch(console.error);
  }

  return {
    searchId: null, productName: input.query,
    results: ranked, bestNew, bestUsed, avgPrice,
    totalResults: ranked.length, fromCache: false, isMock,
    durationMs: Date.now() - start,
  };
}
