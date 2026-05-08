import type { MLItem } from "@/types";

// ================================================
// ML Proxy Scraper — Routes search through Cloudflare Worker
//
// The Cloudflare Worker runs from edge nodes with better
// geo-diversity than Vercel (US-only). This prevents ML
// from geo-redirecting to another country's site.
//
// Worker URL: https://ml-proxy.argentracker1.workers.dev
// ================================================

const PROXY_URL =
  process.env.ML_PROXY_URL || "https://ml-proxy.argentracker1.workers.dev";

interface ProxyScrapedItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  permalink: string;
  thumbnail: string | null;
  freeShipping: boolean;
  isCbt: boolean;
  sellerName: string;
}

interface ProxySearchResponse {
  success: boolean;
  query: string;
  new?: {
    items: ProxyScrapedItem[];
    count: number;
    htmlLength: number;
    redirected: boolean;
  };
  used?: {
    items: ProxyScrapedItem[];
    count: number;
    htmlLength: number;
    redirected: boolean;
  };
  items?: ProxyScrapedItem[];
  count?: number;
  totalItems?: number;
  error?: string;
}

function convertToMLItem(
  item: ProxyScrapedItem,
  condition: "new" | "used"
): MLItem {
  const isIntl = item.isCbt;

  // For international items, estimate taxes (same logic as direct scraper)
  const basePrice = item.price;
  const estimatedTaxRate = basePrice < 800000 ? 0.11 : 0.35;
  const estimatedTaxes = isIntl ? Math.round(basePrice * estimatedTaxRate) : 0;
  const totalPrice = basePrice + estimatedTaxes;

  const tags: string[] = [];
  if (isIntl) {
    tags.push("cbt_item");
    tags.push("_argentracker_international");
    tags.push(`_argentracker_base_price_${basePrice}`);
    tags.push(`_argentracker_estimated_taxes_${estimatedTaxes}`);
  }

  return {
    id: item.id,
    title: isIntl ? `${item.title} (Internacional)` : item.title,
    price: isIntl ? totalPrice : basePrice,
    currency_id: item.currency || "ARS",
    condition,
    permalink: item.permalink,
    thumbnail: item.thumbnail,
    seller: {
      nickname: item.sellerName || "Vendedor ML",
      reputation: null,
    },
    shipping: { free_shipping: item.freeShipping },
    address: null,
    installments: null,
    tags,
  };
}

/**
 * Search ML via the Cloudflare proxy worker.
 * Returns items for both conditions (new + used).
 *
 * Falls back gracefully: if the proxy is unreachable,
 * returns empty arrays so the orchestrator can try direct scraping.
 */
export async function scrapeViaProxy(
  query: string
): Promise<{ new: MLItem[]; used: MLItem[] }> {
  const url = `${PROXY_URL}/search?q=${encodeURIComponent(query)}&condition=both`;
  console.log(`[ProxyScraper] Fetching: ${url}`);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!res.ok) {
      console.error(
        `[ProxyScraper] HTTP ${res.status} from proxy worker`
      );
      return { new: [], used: [] };
    }

    const data: ProxySearchResponse = await res.json();

    if (!data.success) {
      console.error(`[ProxyScraper] Proxy error: ${data.error}`);
      return { new: [], used: [] };
    }

    // Check for redirections to non-Argentine sites
    if (data.new?.redirected) {
      console.warn(
        `[ProxyScraper] ⚠ New search was REDIRECTED — ML may have sent to another country`
      );
    }
    if (data.used?.redirected) {
      console.warn(
        `[ProxyScraper] ⚠ Used search was REDIRECTED — ML may have sent to another country`
      );
    }

    const newItems = (data.new?.items || [])
      .filter((i) => i.price >= 50000 && i.title)
      .map((i) => convertToMLItem(i, "new"));

    const usedItems = (data.used?.items || [])
      .filter((i) => i.price >= 50000 && i.title)
      .map((i) => convertToMLItem(i, "used"));

    // De-duplicate: remove from used any item already in new
    const newIds = new Set(newItems.map((i) => i.id));
    const uniqueUsed = usedItems.filter((i) => !newIds.has(i.id));

    const intlCount = [...newItems, ...uniqueUsed].filter((i) =>
      i.tags?.includes("_argentracker_international")
    ).length;

    console.log(
      `[ProxyScraper] Proxy returned ${newItems.length} new + ${uniqueUsed.length} used (${intlCount} intl)`
    );

    return { new: newItems, used: uniqueUsed };
  } catch (err) {
    console.error(
      "[ProxyScraper] Failed to reach proxy:",
      String(err).slice(0, 150)
    );
    return { new: [], used: [] };
  }
}
