import { NextRequest, NextResponse } from "next/server";
import { getMLToken } from "@/lib/mercadolibre/token-manager";

// GET /api/debug/products?q=iphone+15+pro
// Tests the Products API directly
export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get("q") || "iphone 15 pro 128gb";

  // Get token
  const { token, source } = await getMLToken();
  if (!token) {
    return NextResponse.json({ error: "no_token", source });
  }

  const results: Record<string, unknown> = {
    query: q,
    tokenSource: source,
    tokenPrefix: token.substring(0, 30) + "...",
  };

  // Step 1: Product search
  try {
    const searchUrl = `https://api.mercadolibre.com/products/search?status=active&site_id=MLA&q=${encodeURIComponent(q)}&limit=5`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    
    if (!searchRes.ok) {
      const errBody = await searchRes.text();
      results.searchError = { status: searchRes.status, body: errBody.substring(0, 200) };
      return NextResponse.json(results);
    }

    const searchData = await searchRes.json();
    results.searchTotal = searchData.paging?.total || 0;
    results.products = (searchData.results || []).map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
    }));

    // Step 2: Get items for first product
    if (searchData.results?.length > 0) {
      const productId = searchData.results[0].id;
      const itemsUrl = `https://api.mercadolibre.com/products/${productId}/items?status=active&limit=5`;
      const itemsRes = await fetch(itemsUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        results.itemsCount = itemsData.results?.length || 0;
        results.items = (itemsData.results || []).slice(0, 3).map((i: { item_id: string; price: number; condition: string; currency_id: string }) => ({
          item_id: i.item_id,
          price: i.price,
          condition: i.condition,
          currency: i.currency_id,
        }));
      } else {
        const errBody = await itemsRes.text();
        results.itemsError = { status: itemsRes.status, body: errBody.substring(0, 200) };
      }

      // Step 3: Get product details (thumbnails)
      const detailRes = await fetch(`https://api.mercadolibre.com/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (detailRes.ok) {
        const detail = await detailRes.json();
        results.productDetail = {
          name: detail.name,
          pictures: (detail.pictures || []).length,
          firstPic: detail.pictures?.[0]?.url || null,
        };
      }
    }
  } catch (err) {
    results.error = String(err);
  }

  return NextResponse.json(results);
}
