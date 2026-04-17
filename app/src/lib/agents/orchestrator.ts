import { searchViaProducts } from "@/lib/mercadolibre/product-search";
import { scrapeMLBothConditions } from "@/lib/mercadolibre/scraper";
import { generateMockResults } from "@/lib/mercadolibre/mock-data";
import { rankResults, calcAvgPrice } from "@/lib/agents/price-ranker";
import { dbManager } from "@/lib/agents/database-manager";
import { getMLToken } from "@/lib/mercadolibre/token-manager";
import type { RankedResult, MLItem } from "@/types";

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

  // 2. Run Products API + Scraper IN PARALLEL for best coverage
  // Products API is best for catalog items (national sellers with reputation)
  // Scraper is best for items NOT in catalog (international/CBT sellers)
  const apiPromise = accessToken
    ? searchViaProducts(input.query, accessToken).catch((err) => {
        console.warn("[Orchestrator] Products API failed:", String(err).slice(0, 120));
        return { new: [] as MLItem[], used: [] as MLItem[] };
      })
    : Promise.resolve({ new: [] as MLItem[], used: [] as MLItem[] });

  const scraperPromise = scrapeMLBothConditions(input.query).catch((err) => {
    console.warn("[Orchestrator] Scraper failed:", String(err).slice(0, 120));
    return { new: [] as MLItem[], used: [] as MLItem[] };
  });

  const [apiResult, scraperResult] = await Promise.all([apiPromise, scraperPromise]);

  // Merge: API items take priority (have reputation), then add scraper items (have CBT)
  const seenIds = new Set<string>();
  const mergedItems: MLItem[] = [];

  // Add API items first (higher quality data: reputation, thumbnails)
  for (const item of [...apiResult.new, ...apiResult.used]) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      mergedItems.push(item);
    }
  }

  // Add scraper items that aren't duplicates (captures CBT/international)
  for (const item of [...scraperResult.new, ...scraperResult.used]) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      mergedItems.push(item);
    }
  }

  const apiCount = apiResult.new.length + apiResult.used.length;
  const scraperCount = scraperResult.new.length + scraperResult.used.length;
  console.log(`[Orchestrator] API: ${apiCount} items | Scraper: ${scraperCount} items | Merged: ${mergedItems.length} unique`);

  if (mergedItems.length > 0) {
    allItems = mergedItems;
    dataSource = apiCount > 0 ? "api" : "scraper";
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
