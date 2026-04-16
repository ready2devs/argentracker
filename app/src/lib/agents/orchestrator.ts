import { mlConnector } from "@/lib/mercadolibre/api";
import { generateMockResults } from "@/lib/mercadolibre/mock-data";
import { rankResults, calcAvgPrice } from "@/lib/agents/price-ranker";
import { dbManager } from "@/lib/agents/database-manager";
import { getMLToken } from "@/lib/mercadolibre/token-manager";
import type { RankedResult } from "@/types";

// ================================================
// Orchestrator — Coordinates the search pipeline
//
// Flow:
// 1. Check cache
// 2. Get ML token (user cookie → server → app)
// 3. Search ML API (real) or fall back to mock
// 4. Rank results
// 5. Save to cache + history
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
  // If the caller already has a token, pass it directly
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
  durationMs: number;
  authSource: string;
}

export async function orchestrateSearch(input: SearchInput): Promise<SearchOutput> {
  const start = Date.now();

  // 1. Check cache (always, unless skipped)
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
        authSource: "cache",
      };
    }
  }

  // 2. Resolve ML token
  let accessToken = input.mlAccessToken || null;
  let authSource = "provided";

  if (!accessToken) {
    const tokenResult = await getMLToken();
    accessToken = tokenResult.token;
    authSource = tokenResult.source;
    console.log("[Orchestrator] Token source:", tokenResult.source, "| authenticated:", tokenResult.isAuthenticated);
  }

  // 3. Search ML API
  let allItems;
  let isMock = false;

  if (accessToken) {
    try {
      console.log("[Orchestrator] 🔍 Searching ML with token (source:", authSource, ")");
      const { new: newItems, used: usedItems } = await mlConnector.searchBothConditions(
        input.query,
        accessToken
      );
      allItems = [...newItems, ...usedItems];

      if (!allItems.length) {
        console.warn("[Orchestrator] ML returned 0 results, falling back to mock");
        throw new Error("No results from ML API");
      }

      console.log(
        `[Orchestrator] ✅ ML real data: ${newItems.length} new + ${usedItems.length} used = ${allItems.length} total`
      );
    } catch (err) {
      const errMsg = String(err);
      console.warn("[Orchestrator] ML search failed:", errMsg.slice(0, 120));

      // If auth error, log it clearly
      if (errMsg.includes("ML_AUTH_ERROR")) {
        console.error("[Orchestrator] ⚠️ ML token is invalid/expired. Falling back to mock.");
      }

      isMock = true;
      allItems = generateMockResults(input.query);
    }
  } else {
    // No token at all → mock
    console.log("[Orchestrator] 🧪 No ML token available, using mock data");
    isMock = true;
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
      isMock,
      durationMs: Date.now() - start,
      authSource,
    };
  }

  // 4. Rank results
  const ranked = rankResults(allItems);
  const avgPrice = calcAvgPrice(allItems);
  const bestNew = ranked.find((r) => r.is_best_new) || null;
  const bestUsed = ranked.find((r) => r.is_best_used) || null;

  // 5. Save to cache + history (only for real data, fire-and-forget)
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
    durationMs: Date.now() - start,
    authSource,
  };
}
