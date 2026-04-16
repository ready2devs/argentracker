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

  // Step 1: Search product catalog
  const searchResult = await mlFetch<MLProductSearchResult>(
    `/products/search?status=active&site_id=MLA&q=${encodeURIComponent(query)}&limit=10`,
    accessToken
  );

  if (!searchResult?.results?.length) {
    console.warn("[MLProducts] No products found in catalog");
    return { new: [], used: [] };
  }

  console.log(`[MLProducts] Found ${searchResult.results.length} products in catalog`);

  // Step 2: Fetch items + details for top 5 products IN PARALLEL
  const products = searchResult.results.slice(0, 5);
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
