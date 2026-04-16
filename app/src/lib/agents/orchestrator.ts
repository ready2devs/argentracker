import { searchViaProducts } from "@/lib/mercadolibre/product-search";
import { scrapeMLBothConditions } from "@/lib/mercadolibre/scraper";
import { generateMockResults } from "@/lib/mercadolibre/mock-data";
import { rankResults, calcAvgPrice } from "@/lib/agents/price-ranker";
import { dbManager } from "@/lib/agents/database-manager";
import { getMLToken } from "@/lib/mercadolibre/token-manager";
import type { RankedResult } from "@/types";

// ================================================
// Orchestrator — Coordinates the search pipeline
//
// Strategy priority:
// 1. Cache (if valid)
// 2. ML Product Catalog API (works with our token!)
// 3. ML Web Scraper (fallback, works from non-blocked IPs)
// 4. Mock data (last resort)
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
  mlAccessToken?: string;
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
  dataSource: "api" | "scraper" | "mock" | "cache";
  durationMs: number;
  authSource: string;
}

export async function orchestrateSearch(input: SearchInput): Promise<SearchOutput> {
  const start = Date.now();

  // 1. Check cache
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
        dataSource: "cache",
        durationMs: Date.now() - start,
        authSource: "cache",
      };
    }
  }

  // 2. Try ML API with token
  let allItems;
  let isMock = false;
  let dataSource: "api" | "scraper" | "mock" = "mock";

  // Resolve token
  let accessToken = input.mlAccessToken || null;
  let authSource = "provided";

  if (!accessToken) {
    const tokenResult = await getMLToken();
    accessToken = tokenResult.token;
    authSource = tokenResult.source;
  }

  // 2. Try ML Product Catalog API (primary — works with our token)
  if (accessToken) {
    try {
      console.log("[Orchestrator] 🔍 Trying ML Product Catalog API (source:", authSource, ")");
      const { new: newItems, used: usedItems } = await searchViaProducts(
        input.query,
        accessToken
      );
      allItems = [...newItems, ...usedItems];

      if (allItems.length > 0) {
        dataSource = "api";
        console.log(
          `[Orchestrator] ✅ Products API: ${newItems.length} new + ${usedItems.length} used`
        );
      } else {
        throw new Error("No results from Products API");
      }
    } catch (err) {
      console.warn("[Orchestrator] Products API failed:", String(err).slice(0, 120));
      allItems = null;
    }
  }

  // 3. Fallback: ML Web Scraper (works from non-blocked IPs)
  if (!allItems || allItems.length === 0) {
    try {
      console.log("[Orchestrator] 🌐 Trying web scraper...");
      const { new: newItems, used: usedItems } = await scrapeMLBothConditions(input.query);
      allItems = [...newItems, ...usedItems];

      if (allItems.length > 0) {
        dataSource = "scraper";
        console.log(
          `[Orchestrator] ✅ Scraper: ${newItems.length} new + ${usedItems.length} used`
        );
      } else {
        throw new Error("Scraper returned 0 results");
      }
    } catch (err) {
      console.warn("[Orchestrator] Scraper failed:", String(err).slice(0, 120));
    }
  }

  // 4. Last resort: Mock data
  if (!allItems || allItems.length === 0) {
    console.log("[Orchestrator] 🧪 Using mock data (all sources failed)");
    isMock = true;
    dataSource = "mock";
    allItems = generateMockResults(input.query);
  }

  if (!allItems.length) {
    return {
      searchId: null,
      productName: input.query,
      results: [],
      bestNew: null,
      bestUsed: null,
      avgPrice: 0,
      totalResults: 0,
      fromCache: false,
      isMock: true,
      dataSource: "mock",
      durationMs: Date.now() - start,
      authSource,
    };
  }

  // 5. Rank results
  const ranked = rankResults(allItems);
  const avgPrice = calcAvgPrice(allItems);
  const bestNew = ranked.find((r) => r.is_best_new) || null;
  const bestUsed = ranked.find((r) => r.is_best_used) || null;

  // 6. Cache real data
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
    searchId: null,
    productName: input.query,
    results: ranked,
    bestNew,
    bestUsed,
    avgPrice,
    totalResults: ranked.length,
    fromCache: false,
    isMock,
    dataSource,
    durationMs: Date.now() - start,
    authSource,
  };
}
