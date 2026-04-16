import { NextRequest, NextResponse } from "next/server";
import { scrapeMLSearch } from "@/lib/mercadolibre/scraper";

// GET /api/debug/scraper?q=iphone+15+pro
// Diagnostic endpoint — test the ML scraper from Vercel
export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q") || "iphone 15 pro 128gb";

  console.log("[debug/scraper] Testing scraper for:", q);

  try {
    const items = await scrapeMLSearch(q, "new");

    return NextResponse.json({
      success: true,
      query: q,
      totalItems: items.length,
      sample: items.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        permalink: item.permalink,
        thumbnail: item.thumbnail,
        seller: item.seller?.nickname,
      })),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
    });
  }
}
