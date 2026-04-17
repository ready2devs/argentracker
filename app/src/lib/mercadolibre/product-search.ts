import type { MLItem } from "@/types";

// ================================================
// ML Product Catalog Connector v3
//
// Uses the ML Products API:
//   1. /products/search?q=... → product catalog IDs
//   2. /products/{id}/items   → sellers + prices
//   3. /products/{id}         → product images
//   4. /users?ids=...         → seller names + reputation (batch)
//
// International items (CBT):
//   - Marked with isInternational flag
//   - Price adjusted to include estimated import taxes (~35%)
//   - Compete fairly with national sellers on total cost
//
// [Ref 15] User-Agent rotation  [Ref 16] Human delays
// ================================================

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function humanDelay(min = 100, max = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min) + min)));
}

const ML_API = "https://api.mercadolibre.com";

// Estimated import tax rate for CBT items (electronics category)
// Based on real data: $1,035,040 base + $358,605 taxes = ~34.6%
// Includes: import duty + statistics fee (3%) + IVA (21%)
const CBT_ESTIMATED_TAX_RATE = 0.35;

// ---- Product Name Matching ----
// Extracts key model identifiers from a query to validate product results.
// Example: "Samsung Galaxy S26 Ultra 512gb" → ["galaxy s26", "s26 ultra"]
// This prevents showing S25 results when S26 was searched.

function extractModelTokens(text: string): string[] {
  const lower = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  // Common patterns: "iphone 16", "galaxy s26", "redmi note 13", "pixel 9"
  const modelPatterns = [
    /(?:iphone|ipad|macbook|airpods)\s*(?:pro|max|plus|mini|air|se)?\s*(\d+)/,
    /galaxy\s*[sazmf]\s*(\d+)/,
    /redmi\s*(?:note)?\s*(\d+)/,
    /pixel\s*(\d+)/,
    /moto\s*[gex]\s*(\d+)/,
    /xperia\s*(\d+)/,
    /(?:mi|poco)\s*[a-z]*\s*(\d+)/,
  ];

  const tokens: string[] = [];

  for (const pattern of modelPatterns) {
    const match = lower.match(pattern);
    if (match) {
      // Get the full match (e.g., "galaxy s26") and the model number (e.g., "26")
      tokens.push(match[0].trim());
      break;
    }
  }

  // Fallback: extract brand + number patterns like "s26", "a55"
  const alphaNumPatterns = lower.match(/\b[a-z]\d{1,3}\b/g);
  if (alphaNumPatterns) {
    for (const an of alphaNumPatterns) {
      if (!tokens.some((t) => t.includes(an))) {
        tokens.push(an);
      }
    }
  }

  return tokens;
}

function isProductMatch(productName: string, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return true; // no tokens extracted = accept all
  const lower = productName.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");
  // At least ONE model token must be present in the product name
  return queryTokens.some((token) => lower.includes(token));
}

// Build progressively shorter query variants for better product discovery.
// Long queries with specific specs (8gb, 256gb, Ssd, W11) often miss products
// in the ML catalog because products are listed under slightly different names.
function buildQueryVariants(query: string): string[] {
  const variants: string[] = [query]; // original first
  const words = query.split(/\s+/);
  
  if (words.length <= 4) return variants; // short queries don't need variants

  // Remove noise words: "ssd", "ram", "ddr", "w11", "win", "windows", "negro", "blanco", etc.
  const noiseWords = new Set([
    "ssd", "hdd", "nvme", "ram", "ddr4", "ddr5", "ddr",
    "w11", "w10", "win", "win11", "win10", "windows",
    "negro", "blanco", "azul", "rosa", "gris", "rojo", "verde", "plateado",
    "black", "white", "blue", "pink", "gray", "red", "silver",
    "nuevo", "new", "dual", "sim", "5g", "4g", "lte",
    "fhd", "uhd", "oled", "ips", "lcd",
  ]);

  // Remove size specs: "8gb", "256gb", "512gb", "12gb", etc.
  const specPattern = /^\d+\s*gb$/i;

  const filtered = words.filter((w) => {
    const lw = w.toLowerCase();
    if (noiseWords.has(lw)) return false;
    if (specPattern.test(lw)) return false;
    return true;
  });

  if (filtered.length < words.length && filtered.length >= 3) {
    variants.push(filtered.join(" "));
  }

  // Even shorter: remove "Notebook/Laptop" prefix + generic words like "Intel", "Core"
  const genericWords = new Set(["notebook", "laptop", "computadora", "portatil", "intel", "core", "amd", "ryzen", "i3", "i5", "i7", "i9"]);
  const essential = filtered.filter((w) => !genericWords.has(w.toLowerCase()));
  if (essential.length >= 2 && essential.length < filtered.length) {
    variants.push(essential.join(" "));
  }

  return variants;
}

async function mlFetch<T>(path: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(`${ML_API}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": randomUA(),
      },
    });
    if (!res.ok) {
      console.warn(`[MLProducts] ${res.status} for ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[MLProducts] Error fetching ${path}:`, String(err).slice(0, 100));
    return null;
  }
}

// ---- Types for ML responses ----

interface MLProductSearchResult {
  results: Array<{
    id: string;
    name: string;
    domain_id: string;
  }>;
  paging: { total: number };
}

interface MLProductItemsResult {
  results: Array<{
    item_id: string;
    seller_id: number;
    price: number;
    currency_id: string;
    condition: string;
    warranty: string;
    listing_type_id: string;
    international_delivery_mode: string;
    shipping?: {
      free_shipping?: boolean;
      tags?: string[];
    };
    seller_address?: {
      city?: { name: string };
      state?: { name: string };
    };
    tags?: string[];
  }>;
}

interface MLProductDetail {
  id: string;
  name: string;
  pictures?: Array<{ id: string; url: string; secure_url: string }>;
}

interface MLUserInfo {
  id: number;
  nickname: string;
  seller_reputation?: {
    level_id: string;
    power_seller_status: string | null;
    transactions?: {
      completed: number;
    };
  };
}

// Check if item is international (Cross-Border Trade)
function isInternationalItem(item: { tags?: string[]; shipping?: { tags?: string[] } }): boolean {
  const tags = item.tags || [];
  const shippingTags = item.shipping?.tags || [];
  return (
    tags.includes("cbt_item") ||
    tags.includes("cbt_fulfillment_us") ||
    tags.includes("cbt_fulfillment_cn") ||
    shippingTags.includes("cbt_fulfillment")
  );
}

// Batch fetch seller info (up to 20 per request)
async function fetchSellerInfo(
  sellerIds: number[],
  token: string
): Promise<Map<number, { nickname: string; reputation: string | null; powerSeller: string | null }>> {
  const map = new Map<number, { nickname: string; reputation: string | null; powerSeller: string | null }>();
  if (sellerIds.length === 0) return map;

  const uniqueIds = [...new Set(sellerIds)];
  const chunks: number[][] = [];
  for (let i = 0; i < uniqueIds.length; i += 20) {
    chunks.push(uniqueIds.slice(i, i + 20));
  }

  const promises = chunks.map(async (chunk) => {
    const idsStr = chunk.join(",");
    const data = await mlFetch<Array<{ body: MLUserInfo; code: number }>>(
      `/users?ids=${idsStr}`,
      token
    );
    if (data) {
      for (const entry of data) {
        if (entry.code === 200 && entry.body) {
          map.set(entry.body.id, {
            nickname: entry.body.nickname,
            reputation: entry.body.seller_reputation?.level_id || null,
            powerSeller: entry.body.seller_reputation?.power_seller_status || null,
          });
        }
      }
    }
  });

  await Promise.all(promises);
  console.log(`[MLProducts] Fetched info for ${map.size}/${uniqueIds.length} sellers`);
  return map;
}

// Map ML reputation level to our SellerReputation type
function mapReputation(levelId: string | null, powerSeller: string | null): string | null {
  if (powerSeller === "platinum") return "platinum";
  if (powerSeller === "gold") return "gold";
  if (!levelId) return null;
  if (levelId.includes("green")) return "green";
  if (levelId.includes("yellow")) return "yellow";
  if (levelId.includes("orange") || levelId.includes("red")) return "red";
  return null;
}

// ---- Main search function ----

export async function searchViaProducts(
  query: string,
  accessToken: string
): Promise<{ new: MLItem[]; used: MLItem[] }> {
  console.log(`[MLProducts] Searching products for: "${query}"`);

  // Step 1: Search product catalog with progressive query shortening
  // Long queries (e.g. "Notebook Asus Vivobook 14 Intel 5 120u 8gb 256gb Ssd W11")
  // often miss products. We try shorter queries as fallback.
  const queries = buildQueryVariants(query);
  let allProductIds = new Set<string>();
  let allProducts: Array<{ id: string; name: string; domain_id: string }> = [];

  for (const q of queries) {
    const searchResult = await mlFetch<MLProductSearchResult>(
      `/products/search?status=active&site_id=MLA&q=${encodeURIComponent(q)}&limit=10`,
      accessToken
    );
    if (searchResult?.results?.length) {
      for (const p of searchResult.results) {
        if (!allProductIds.has(p.id)) {
          allProductIds.add(p.id);
          allProducts.push(p);
        }
      }
      console.log(`[MLProducts] Query "${q}" (MLA) → ${searchResult.results.length} products (total unique: ${allProducts.length})`);
      if (allProducts.length >= 8) break;
    } else {
      console.log(`[MLProducts] Query "${q}" (MLA) → 0 products`);
    }
  }

  // Step 1a-CBT: Also search CBT catalog for international products
  // CBT products have separate catalog entries with items tagged cbt_item
  const cbtQuery = queries[0]; // use original query for CBT
  const cbtResult = await mlFetch<MLProductSearchResult>(
    `/products/search?status=active&site_id=CBT&q=${encodeURIComponent(cbtQuery)}&limit=5`,
    accessToken
  );
  if (cbtResult?.results?.length) {
    let cbtAdded = 0;
    for (const p of cbtResult.results) {
      // Convert CBT ID to MLA format and add both
      const mlaId = p.id.replace(/^CBT/, "MLA");
      if (!allProductIds.has(mlaId)) {
        allProductIds.add(mlaId);
        allProducts.push({ ...p, id: mlaId });
        cbtAdded++;
      }
    }
    console.log(`[MLProducts] CBT search → ${cbtResult.results.length} products, ${cbtAdded} new unique`);
  }

  if (!allProducts.length) {
    console.warn("[MLProducts] No products found in catalog after all query variants");
    return { new: [], used: [] };
  }

  // Step 1b: Validate product names match the search query [Ref 10]
  const queryTokens = extractModelTokens(query);
  console.log(`[MLProducts] Model tokens from query: [${queryTokens.join(", ")}]`);

  const matchedProducts = allProducts.filter((p) => {
    const matches = isProductMatch(p.name, queryTokens);
    if (!matches) {
      console.warn(`[MLProducts] ⚠ Filtered out non-matching product: "${p.name}"`);
    }
    return matches;
  });

  if (matchedProducts.length === 0) {
    console.warn(`[MLProducts] No products matched the query model. Using all results as fallback.`);
  }

  // Step 2: Fetch items + details for top 8 MATCHED products IN PARALLEL
  const products = (matchedProducts.length > 0 ? matchedProducts : allProducts).slice(0, 8);
  await humanDelay();

  const productDataPromises = products.map(async (product) => {
    const [itemsResult, detail] = await Promise.all([
      mlFetch<MLProductItemsResult>(
        `/products/${product.id}/items?status=active&limit=20`,
        accessToken
      ),
      mlFetch<MLProductDetail>(
        `/products/${product.id}`,
        accessToken
      ),
    ]);
    return { product, itemsResult, detail };
  });

  const productDataResults = await Promise.allSettled(productDataPromises);

  // Collect all items and seller IDs
  interface RawItem {
    item: MLProductItemsResult["results"][0];
    productName: string;
    thumbnail: string | null;
    isIntl: boolean;
  }
  const rawItems: RawItem[] = [];
  const sellerIds: number[] = [];
  let intlCount = 0;

  for (const result of productDataResults) {
    if (result.status !== "fulfilled") continue;
    const { product, itemsResult, detail } = result.value;
    if (!itemsResult?.results?.length) continue;

    const thumbnail = detail?.pictures?.[0]?.secure_url || detail?.pictures?.[0]?.url || null;
    const productName = product.name || detail?.name || query;

    for (const item of itemsResult.results) {
      if (item.price <= 0) continue;

      const isIntl = isInternationalItem(item);
      if (isIntl) intlCount++;

      rawItems.push({ item, productName, thumbnail, isIntl });
      sellerIds.push(item.seller_id);
    }
  }

  console.log(`[MLProducts] Found ${rawItems.length} items (${intlCount} international)`);

  // Step 3: Batch fetch seller names + reputation
  const sellerMap = await fetchSellerInfo(sellerIds, accessToken);

  // Step 4: Build final MLItem array
  const newItems: MLItem[] = [];
  const usedItems: MLItem[] = [];

  for (const { item, productName, thumbnail, isIntl } of rawItems) {
    const itemIdNumbers = item.item_id.replace(/^MLA/, "");
    const permalink = `https://articulo.mercadolibre.com.ar/MLA-${itemIdNumbers}`;
    const itemCondition = (item.condition === "used" ? "used" : "new") as "new" | "used";

    // Get real seller info
    const sellerInfo = sellerMap.get(item.seller_id);
    const sellerNickname = sellerInfo?.nickname || `Seller_${item.seller_id}`;
    const sellerRep = mapReputation(sellerInfo?.reputation || null, sellerInfo?.powerSeller || null);

    // For international items: the REAL price = base + estimated import taxes
    // This allows fair comparison with national sellers
    const basePrice = Math.round(item.price);
    const estimatedTaxes = isIntl ? Math.round(basePrice * CBT_ESTIMATED_TAX_RATE) : 0;
    const totalPrice = basePrice + estimatedTaxes;

    // Build tags array — add international marker if CBT
    const itemTags = [...(item.tags || [])];
    if (isIntl) {
      itemTags.push("_argentracker_international");
      itemTags.push(`_argentracker_base_price_${basePrice}`);
      itemTags.push(`_argentracker_estimated_taxes_${estimatedTaxes}`);
    }

    const mlItem: MLItem = {
      id: item.item_id,
      title: isIntl ? `${productName} (Internacional)` : productName,
      price: totalPrice, // For international: includes estimated taxes
      currency_id: item.currency_id || "ARS",
      condition: itemCondition,
      permalink,
      thumbnail,
      seller: {
        nickname: sellerNickname,
        reputation: sellerRep ? { level_id: sellerRep } : null,
      },
      shipping: {
        free_shipping: item.shipping?.free_shipping || false,
      },
      address: item.seller_address ? {
        city_name: item.seller_address.city?.name || "",
        state_name: item.seller_address.state?.name || "",
      } : null,
      installments: null,
      tags: itemTags,
    };

    if (itemCondition === "used") {
      usedItems.push(mlItem);
    } else {
      newItems.push(mlItem);
    }
  }

  // Sort by price ascending (international items now sorted by total price)
  newItems.sort((a, b) => a.price - b.price);
  usedItems.sort((a, b) => a.price - b.price);

  console.log(`[MLProducts] Final: ${newItems.length} new + ${usedItems.length} used (${intlCount} intl with tax adjustment)`);
  return { new: newItems, used: usedItems };
}
