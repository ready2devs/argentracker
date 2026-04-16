import { NextRequest, NextResponse } from "next/server";

// GET /api/debug/scraper?q=iphone+15+pro
// Diagnostic endpoint — test the ML scraper from Vercel
export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q") || "iphone 15 pro 128gb";
  const slug = q.trim().replace(/\s+/g, "-");
  const mlUrl = `https://listado.mercadolibre.com.ar/${encodeURIComponent(slug)}_Nuevo_OrderId_PRICE_NoIndex_True`;

  console.log("[debug/scraper] Fetching:", mlUrl);

  try {
    const res = await fetch(mlUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    const html = await res.text();
    const finalUrl = res.url;
    
    // Count polycards
    const polycardRegex = /"polycard":\{"unique_id":"[^"]+","metadata":\{"id":"(MLA\d+)","product_id":"(MLA\w+)","user_product_id":"[^"]*","url":"([^"]+)"/g;
    const polycards: { id: string; url: string; title: string; price: number }[] = [];
    const seen = new Set<string>();
    let match;
    
    while ((match = polycardRegex.exec(html)) !== null) {
      const itemId = match[1];
      if (seen.has(itemId)) continue;
      seen.add(itemId);
      
      const rawUrl = match[3].replace(/\\u002F/g, "/");
      const forward = html.substring(match.index, Math.min(html.length, match.index + 3000));
      const titleMatch = forward.match(/"type":"title"[^}]*"text":"([^"]+)"/);
      const priceMatch = forward.match(/"current_price":\{"value":(\d+)/);
      
      polycards.push({
        id: itemId,
        url: `https://${rawUrl}`,
        title: titleMatch ? titleMatch[1] : "NO TITLE",
        price: priceMatch ? parseInt(priceMatch[1]) : 0,
      });
    }
    
    // Check for alternative patterns
    const hasPolycard = html.includes('"polycard"');
    const hasSearchResults = html.includes('ui-search-results');
    const hasTitle = html.includes('"type":"title"');
    const hasFraction = html.includes('andes-money-amount__fraction');
    const htmlSnippet = html.substring(0, 500);

    return NextResponse.json({
      success: true,
      query: q,
      fetchUrl: mlUrl,
      finalUrl,
      httpStatus: res.status,
      htmlLength: html.length,
      hasPolycard,
      hasSearchResults,
      hasTitle,
      hasFraction,
      polycardCount: polycards.length,
      sample: polycards.slice(0, 5),
      htmlStart: htmlSnippet,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
    });
  }
}
