import type { MLItem } from "@/types";

// ================================================
// ML Web Scraper — Extracts real product data from
// ML's embedded polycard JSON in search HTML.
//
// ML renders React components with embedded JSON:
// { "polycard": { "metadata": { "id": "MLA...", "url": "..." },
//   "components": [{ "type": "title", "title": { "text": "..." }},
//                  { "type": "price", "price": { "current_price": { "value": 1234 }}}]}}
//
// [Ref 15] User-Agent rotation  [Ref 16] Human delays
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

function buildSearchUrl(query: string, condition?: "new" | "used"): string {
  const slug = query.trim().replace(/\s+/g, "-");
  let url = `https://listado.mercadolibre.com.ar/${encodeURIComponent(slug)}`;
  if (condition === "new") url += "_Nuevo";
  if (condition === "used") url += "_Usado";
  url += "_OrderId_PRICE_NoIndex_True";
  return url;
}

// Unescape \u002F → / and other Unicode escapes
function unescapeUrl(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw.replace(/\\u002F/g, "/");
  }
}

// Parse polycard JSON blocks from ML search HTML
function parsePolycards(html: string, condition: "new" | "used"): MLItem[] {
  const items: MLItem[] = [];
  const seen = new Set<string>();

  // Find all polycard metadata blocks  
  // Pattern: "polycard":{"unique_id":"...","metadata":{"id":"MLA...","url":"..."...},"components":[...]}
  const polycardRegex = /"polycard":\{"unique_id":"[^"]+","metadata":\{"id":"(MLA\d+)","product_id":"(MLA\w+)","user_product_id":"[^"]*","url":"([^"]+)"/g;

  let match;
  while ((match = polycardRegex.exec(html)) !== null) {
    const itemId = match[1];
    const productId = match[2];
    const rawUrl = match[3];

    // De-duplicate by item ID
    if (seen.has(itemId)) continue;
    seen.add(itemId);

    // Build full permalink
    const permalink = `https://${unescapeUrl(rawUrl)}`;

    // Scan forward from this position for title + price in the components array
    const forward = html.substring(match.index, Math.min(html.length, match.index + 3000));

    // Title
    const titleMatch = forward.match(/"type":"title"[^}]*"text":"([^"]+)"/);
    const title = titleMatch ? unescapeUrl(titleMatch[1]) : "";

    // Price (current_price value)
    const priceMatch = forward.match(/"current_price":\{"value":(\d+)/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 0;

    // Thumbnail — try pic_id, pic_url, or construct from item ID
    const picMatch = 
      forward.match(/"pic_id":"([^"]+)"/) ||
      forward.match(/"pic_url":"([^"]+)"/) ||
      forward.match(/"pictures?":\[?\{"id":"([^"]+)"/);
    
    let thumbnail: string | null = null;
    if (picMatch) {
      const picId = picMatch[1];
      if (picId.startsWith("http")) {
        thumbnail = picId;
      } else {
        thumbnail = `https://http2.mlstatic.com/D_${picId}-O.jpg`;
      }
    }
    // Fallback: try to find data-src img in the HTML near the product link
    if (!thumbnail) {
      const imgMatch = forward.match(/data-src="(https:\/\/http2\.mlstatic\.com\/D_[^"]+)"/);
      if (imgMatch) thumbnail = imgMatch[1];
    }

    // Shipping
    const freeShipMatch = forward.match(/"free_shipping":true/);
    const hasFreeShip = !!freeShipMatch || /gratis/i.test(forward.substring(0, 1500));

    // Skip items without title or price, and accessories (price < 100k)
    if (!title || price < 100000) continue;

    items.push({
      id: itemId,
      title,
      price,
      currency_id: "ARS",
      condition,
      permalink,
      thumbnail,
      seller: {
        nickname: "Vendedor ML",
        reputation: null,
      },
      shipping: { free_shipping: hasFreeShip },
      address: null,
      installments: null,
      tags: [],
    });
  }

  console.log(`[MLScraper] Parsed ${items.length} polycards (${condition})`);
  return items;
}

// Main scraper
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
      console.error(`[MLScraper] HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    console.log(`[MLScraper] Received ${html.length} bytes`);
    return parsePolycards(html, condition);
  } catch (err) {
    console.error("[MLScraper] Error:", String(err).slice(0, 150));
    return [];
  }
}

// Search both conditions
export async function scrapeMLBothConditions(
  query: string
): Promise<{ new: MLItem[]; used: MLItem[] }> {
  const [newItems, usedItems] = await Promise.all([
    scrapeMLSearch(query, "new"),
    scrapeMLSearch(query, "used").catch(() => [] as MLItem[]),
  ]);
  return { new: newItems, used: usedItems };
}
