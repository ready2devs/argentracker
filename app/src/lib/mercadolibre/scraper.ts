import type { MLItem } from "@/types";

// ================================================
// ML Web Scraper — Extracts real product data from ML's
// public website when the API is blocked (app in test mode).
//
// Strategy: fetch ML search HTML, parse poly-card elements
// to extract direct product permalinks, prices, thumbnails.
//
// [Ref 15] User-Agent rotation
// [Ref 16] Human delays
// ================================================

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function humanDelay(min = 500, max = 1500): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min) + min)));
}

// Build ML search URL sorted by price ascending
function buildSearchUrl(query: string, condition?: "new" | "used"): string {
  const slug = query.trim().replace(/\s+/g, "-");
  let url = `https://listado.mercadolibre.com.ar/${encodeURIComponent(slug)}`;
  if (condition === "new") url += "_Nuevo";
  if (condition === "used") url += "_Usado";
  url += "_OrderId_PRICE_NoIndex_True";
  return url;
}

// Parse price string "1.200.000" → 1200000
function parsePrice(priceStr: string): number {
  const cleaned = priceStr.replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

// Extract items from ML search HTML using section-based splitting
function parseMLSearchHTML(html: string, condition: "new" | "used"): MLItem[] {
  const items: MLItem[] = [];

  // Split by product link anchors — each product has an <a> with href to mercadolibre.com.ar
  // We look for <a> tags with product links, then extract data around them
  const productLinkRegex = /href="(https:\/\/(?:www\.)?mercadolibre\.com\.ar\/[^"]*(?:\/p\/MLA|MLA-|\/MLA|\?)[^"]*)"[^>]*>/g;
  const positions: { url: string; pos: number }[] = [];

  let match;
  while ((match = productLinkRegex.exec(html)) !== null) {
    const url = match[1].split("#")[0]; // Remove fragment
    // Skip duplicate URLs and non-product URLs
    if (url.includes("/noindex") || url.includes("policy")) continue;
    // De-dupe
    if (positions.some((p) => p.url === url)) continue;
    positions.push({ url, pos: match.index });
  }

  // For each product link, extract a context window (4000 chars around it)
  for (let i = 0; i < Math.min(positions.length, 50); i++) {
    const { url, pos } = positions[i];
    const start = Math.max(0, pos - 2000);
    const end = Math.min(html.length, pos + 2000);
    const context = html.substring(start, end);

    // Extract title from the context
    const titleMatch =
      context.match(/poly-component__title[^>]*>([^<]+)/) ||
      context.match(/ui-search-item__title[^>]*>([^<]+)/) ||
      context.match(/title="([^"]+)".*?MLA/);
    
    // Extract price
    const priceMatch = context.match(/andes-money-amount__fraction"[^>]*>([0-9.]+)</);

    // Extract thumbnail
    const thumbMatch =
      context.match(/(?:data-src|src)="(https:\/\/http2\.mlstatic\.com\/D_[^"]+)"/) ||
      context.match(/(?:data-src|src)="(https:\/\/[^"]*mlstatic\.com\/[^"]+\.(?:jpg|webp|png)[^"]*)"/);

    // Extract seller name
    const sellerMatch =
      context.match(/poly-component__seller[^>]*>([^<]+)/) ||
      context.match(/ui-search-official-store-label[^>]*>([^<]+)/);

    // Free shipping detection
    const hasFreeShip = /envío gratis|free.shipping/i.test(context);

    const price = priceMatch ? parsePrice(priceMatch[1]) : 0;
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Only add if we have both title and price and they look real
    if (price > 10000 && title.length > 5) {
      items.push({
        id: `SCRAPE_${condition}_${i}`,
        title,
        price,
        currency_id: "ARS",
        condition,
        permalink: url,
        thumbnail: thumbMatch ? thumbMatch[1] : null,
        seller: {
          nickname: sellerMatch ? sellerMatch[1].trim() : "Vendedor ML",
          reputation: null,
        },
        shipping: { free_shipping: hasFreeShip },
        address: null,
        installments: null,
        tags: [],
      });
    }
  }

  // De-duplicate by permalink (some items appear in multiple card formats)
  const unique = new Map<string, MLItem>();
  for (const item of items) {
    if (!unique.has(item.permalink)) {
      unique.set(item.permalink, item);
    }
  }

  const result = Array.from(unique.values());
  console.log(`[MLScraper] Parsed ${result.length} unique items from HTML (${condition})`);
  return result;
}

// Main scraper function
export async function scrapeMLSearch(
  query: string,
  condition: "new" | "used"
): Promise<MLItem[]> {
  const url = buildSearchUrl(query, condition);
  console.log(`[MLScraper] Fetching: ${url}`);

  await humanDelay();

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      console.error(`[MLScraper] HTTP ${res.status} from ${url}`);
      return [];
    }

    const html = await res.text();
    console.log(`[MLScraper] Received ${html.length} bytes`);
    return parseMLSearchHTML(html, condition);
  } catch (err) {
    console.error("[MLScraper] Fetch error:", String(err).slice(0, 150));
    return [];
  }
}

// Search both conditions in parallel
export async function scrapeMLBothConditions(
  query: string
): Promise<{ new: MLItem[]; used: MLItem[] }> {
  const [newItems, usedItems] = await Promise.all([
    scrapeMLSearch(query, "new"),
    scrapeMLSearch(query, "used").catch(() => [] as MLItem[]),
  ]);
  return { new: newItems, used: usedItems };
}
