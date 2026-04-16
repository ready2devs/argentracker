import { NextRequest, NextResponse } from "next/server";
import { getMLToken } from "@/lib/mercadolibre/token-manager";
import { searchViaProducts } from "@/lib/mercadolibre/product-search";

// GET /api/debug/search-test?q=iphone+15+pro
// Tests the ACTUAL searchViaProducts function that the orchestrator uses
export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q") || "iphone 15 pro 128gb";

  const start = Date.now();
  const { token, source } = await getMLToken();

  if (!token) {
    return NextResponse.json({ error: "no_token", source });
  }

  try {
    console.log("[debug/search-test] Calling searchViaProducts with token source:", source);
    const { new: newItems, used: usedItems } = await searchViaProducts(q, token);
    
    return NextResponse.json({
      success: true,
      query: q,
      tokenSource: source,
      durationMs: Date.now() - start,
      newCount: newItems.length,
      usedCount: usedItems.length,
      totalCount: newItems.length + usedItems.length,
      sampleNew: newItems.slice(0, 3).map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        permalink: i.permalink?.substring(0, 90),
        thumbnail: i.thumbnail ? "YES" : "NO",
        condition: i.condition,
      })),
      sampleUsed: usedItems.slice(0, 2).map((i) => ({
        id: i.id,
        title: i.title,
        price: i.price,
        condition: i.condition,
      })),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
      stack: err instanceof Error ? err.stack?.substring(0, 500) : undefined,
      durationMs: Date.now() - start,
    });
  }
}
