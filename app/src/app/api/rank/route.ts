import { NextRequest, NextResponse } from "next/server";
import { rankResults, calcAvgPrice } from "@/lib/agents/price-ranker";
import { dbManager } from "@/lib/agents/database-manager";
import type { MLItem } from "@/types";

// ================================================
// POST /api/rank
// Recibe items crudos de ML (fetched desde el cliente),
// aplica ranking, guarda en caché y devuelve resultados.
// ================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, newItems, usedItems, inputType = "url" } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "El campo 'query' es requerido." },
        { status: 400 }
      );
    }

    const allItems: MLItem[] = [
      ...(Array.isArray(newItems) ? newItems : []),
      ...(Array.isArray(usedItems) ? usedItems : []),
    ];

    // Chequear caché antes de re-rankear
    const cached = await dbManager.getCached(query);
    if (cached?.length) {
      return NextResponse.json({
        success: true,
        data: {
          productName: query,
          results: cached,
          bestNew: cached.find((r) => r.is_best_new) || null,
          bestUsed: cached.find((r) => r.is_best_used) || null,
          avgPrice: Math.round(cached.reduce((a, b) => a + b.price, 0) / cached.length),
          totalResults: cached.length,
          fromCache: true,
        },
      });
    }

    if (!allItems.length) {
      return NextResponse.json({
        success: true,
        data: {
          productName: query,
          results: [],
          bestNew: null,
          bestUsed: null,
          avgPrice: 0,
          totalResults: 0,
          fromCache: false,
        },
      });
    }

    // Rankear resultados
    const ranked = rankResults(allItems);
    const avgPrice = calcAvgPrice(allItems);
    const bestNew = ranked.find((r) => r.is_best_new) || null;
    const bestUsed = ranked.find((r) => r.is_best_used) || null;

    // Guardar en caché y en historial en background
    Promise.allSettled([
      dbManager.saveCache(query, ranked),
      dbManager.saveSearch({
        productName: query,
        inputType,
        results: ranked,
        avgPrice,
      }),
    ]).catch(console.error);

    return NextResponse.json({
      success: true,
      data: {
        productName: query,
        results: ranked,
        bestNew,
        bestUsed,
        avgPrice,
        totalResults: ranked.length,
        fromCache: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno.";
    console.error("[/api/rank]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
