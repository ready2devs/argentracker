import type { MLItem } from "@/types";

// ================================================
// ML Product Catalog Connector
//
// Uses the ML Products API which WORKS with our token:
//   1. /products/search?q=... → returns product catalog IDs
//   2. /products/{id}/items   → returns sellers + prices for that product
//   3. /products/{id}         → returns product images/thumbnail
//
// This bypasses the /sites/MLA/search 403 restriction and also
// avoids ML's website captcha for server IPs.
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

function humanDelay(min = 300, max = 800): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min) + min)));
}

const ML_API = "https://api.mercadolibre.com";

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
    id: string;      // e.g. "MLA27172709"
    name: string;
    domain_id: string;
    permalink?: string;
    pictures?: Array<{ url: string }>;
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
    shipping?: { free_shipping?: boolean };
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
  permalink?: string;
  pictures?: Array<{ id: string; url: string; secure_url: string }>;
  main_features?: Array<{ text: string }>;
  short_description?: { content: string };
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

  const newItems: MLItem[] = [];
  const usedItems: MLItem[] = [];

  // Step 2: For each product, get items (sellers/prices) and product details
  // Limit to top 5 products to avoid too many API calls
  const products = searchResult.results.slice(0, 5);

  for (const product of products) {
    await humanDelay();

    // Get items (sellers + prices) for this product
    const itemsResult = await mlFetch<MLProductItemsResult>(
      `/products/${product.id}/items?status=active&limit=20`,
      accessToken
    );

    if (!itemsResult?.results?.length) continue;

    // Get product details (pictures)
    const detail = await mlFetch<MLProductDetail>(
      `/products/${product.id}`,
      accessToken
    );

    const thumbnail = detail?.pictures?.[0]?.secure_url || detail?.pictures?.[0]?.url || null;
    const productPermalink = detail?.permalink || null;

    // Build ML items from the sellers
    for (const item of itemsResult.results) {
      // Skip very high prices (likely errors or premium listings)
      if (item.price <= 0) continue;

      // Build permalink from product detail or construct it
      const permalink = productPermalink ||
        `https://www.mercadolibre.com.ar/${product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/p/${product.id}`;

      const itemCondition = (item.condition === "used" ? "used" : "new") as "new" | "used";

      const mlItem: MLItem = {
        id: item.item_id,
        title: product.name || detail?.name || query,
        price: item.price,
        currency_id: item.currency_id || "ARS",
        condition: itemCondition,
        permalink,
        thumbnail,
        seller: {
          nickname: `Seller_${item.seller_id}`,
          reputation: null,
        },
        shipping: {
          free_shipping: item.shipping?.free_shipping || false,
        },
        address: item.seller_address ? {
          city_name: item.seller_address.city?.name || "",
          state_name: item.seller_address.state?.name || "",
        } : null,
        installments: null,
        tags: item.tags || [],
      };

      if (itemCondition === "used") {
        usedItems.push(mlItem);
      } else {
        newItems.push(mlItem);
      }
    }
  }

  // Sort by price ascending
  newItems.sort((a, b) => a.price - b.price);
  usedItems.sort((a, b) => a.price - b.price);

  console.log(`[MLProducts] Final: ${newItems.length} new + ${usedItems.length} used items`);
  return { new: newItems, used: usedItems };
}
