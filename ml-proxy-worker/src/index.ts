/**
 * ArgenTracker ML Proxy — Cloudflare Worker v5
 * 
 * Scrapes MercadoLibre search HTML from Cloudflare's edge network
 * (bypasses ML's captcha/verification for datacenter IPs like Vercel).
 * 
 * Parses embedded polycard JSON to extract:
 * - Direct product permalinks (/p/MLA...)
 * - Real prices
 * - Titles
 * - Thumbnails
 * 
 * Endpoints:
 *   GET /search?q=iphone+15+pro&condition=new  → JSON results
 *   GET /health → status check
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// Unescape \u002F → /
function unesc(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw.replace(/\\u002F/g, "/");
  }
}

interface ScrapedItem {
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

function parsePolycards(html: string, condition: string): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const seen = new Set<string>();

  const regex = /"polycard":\{"unique_id":"[^"]+","metadata":\{"id":"(MLA\d+)","product_id":"(MLA\w+)","user_product_id":"[^"]*","url":"([^"]+)"/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const itemId = match[1];
    if (seen.has(itemId)) continue;
    seen.add(itemId);

    const rawUrl = match[3];
    const permalink = `https://${unesc(rawUrl)}`;
    const forward = html.substring(match.index, Math.min(html.length, match.index + 3000));

    // Title
    const titleMatch = forward.match(/"type":"title"[^}]*"text":"([^"]+)"/);
    const title = titleMatch ? unesc(titleMatch[1]) : "";

    // Price
    const priceMatch = forward.match(/"current_price":\{"value":(\d+)/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 0;

    // Currency
    const currMatch = forward.match(/"currency":"(\w+)"/);
    const currency = currMatch ? currMatch[1] : "ARS";

    // Thumbnail
    const picMatch =
      forward.match(/"pic_id":"([^"]+)"/) ||
      forward.match(/"pic_url":"([^"]+)"/);
    let thumbnail: string | null = null;
    if (picMatch) {
      const pic = picMatch[1];
      thumbnail = pic.startsWith("http")
        ? pic
        : `https://http2.mlstatic.com/D_${pic}-O.jpg`;
    }
    if (!thumbnail) {
      const imgMatch = forward.match(/data-src="(https:\/\/http2\.mlstatic\.com\/D_[^"]+)"/);
      if (imgMatch) thumbnail = imgMatch[1];
    }

    // Shipping
    const freeShipping = /gratis|free_shipping":true/i.test(forward.substring(0, 1500));

    // CBT (international) detection
    const isCbt = /"type":"cbt"/.test(forward);

    // Seller name
    const sellerMatch = forward.match(/"official_store_text":"([^"]+)"/) ||
                        forward.match(/"seller_name":"([^"]+)"/);
    const sellerName = sellerMatch ? unesc(sellerMatch[1]) : (isCbt ? "Vendedor Internacional" : "Vendedor ML");

    // Skip items without title or very low price (accessories)
    if (!title || price < 50000) continue;

    items.push({
      id: itemId,
      productId: match[2],
      title,
      price,
      currency,
      condition,
      permalink,
      thumbnail,
      freeShipping,
      isCbt,
      sellerName,
    });
  }

  return items;
}

async function fetchMLSearch(query: string, condition: string): Promise<{ items: ScrapedItem[]; htmlLength: number; redirected: boolean; finalUrl: string }> {
  const slug = query.trim().replace(/\s+/g, "-");
  const condSuffix = condition === "used" ? "_Usado" : "";
  const mlUrl = `https://listado.mercadolibre.com.ar/${slug}${condSuffix}`;

  const res = await fetch(mlUrl, {
    headers: {
      "User-Agent": randomUA(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
    redirect: "follow",
  });

  const html = await res.text();
  const redirected = res.url !== mlUrl;
  const items = parsePolycards(html, condition);

  return { items, htmlLength: html.length, redirected, finalUrl: res.url };
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }

      const url = new URL(request.url);

      // Health check
      if (url.pathname === "/" || url.pathname === "/health") {
        return jsonResponse({ status: "ok", worker: "ml-proxy-v5-scraper", timestamp: new Date().toISOString() });
      }

      if (url.pathname !== "/search") {
        return jsonResponse({ error: "not_found", hint: "Use /search?q=..." }, 404);
      }

      const q = url.searchParams.get("q");
      if (!q) return jsonResponse({ error: "q_required" }, 400);

      const condition = url.searchParams.get("condition") || "both";
      
      if (condition === "both") {
        // Fetch both conditions in parallel
        const [newRes, usedRes] = await Promise.all([
          fetchMLSearch(q, "new"),
          fetchMLSearch(q, "used").catch(() => ({ items: [], htmlLength: 0, redirected: false, finalUrl: "" })),
        ]);

        return jsonResponse({
          success: true,
          query: q,
          new: {
            items: newRes.items,
            count: newRes.items.length,
            htmlLength: newRes.htmlLength,
            redirected: newRes.redirected,
          },
          used: {
            items: usedRes.items,
            count: usedRes.items.length,
            htmlLength: usedRes.htmlLength,
            redirected: usedRes.redirected,
          },
          totalItems: newRes.items.length + usedRes.items.length,
        });
      }

      // Single condition
      const result = await fetchMLSearch(q, condition);
      return jsonResponse({
        success: true,
        query: q,
        condition,
        items: result.items,
        count: result.items.length,
        htmlLength: result.htmlLength,
        redirected: result.redirected,
        finalUrl: result.finalUrl,
      });

    } catch (err) {
      return jsonResponse({
        success: false,
        error: String(err),
        worker: "ml-proxy-v5-scraper",
      }, 500);
    }
  },
};
