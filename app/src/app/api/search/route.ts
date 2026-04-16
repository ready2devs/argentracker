import { NextRequest, NextResponse } from "next/server";
import { orchestrateSearch } from "@/lib/agents/orchestrator";

// ================================================
// POST /api/search
// Unified search endpoint. The orchestrator handles
// ML token resolution internally (cookie → server → app).
// ================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, inputType = "url", inputValue, brand, model, category } = body;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "El término de búsqueda es requerido (mínimo 2 caracteres)." },
        { status: 400 }
      );
    }

    console.log("[/api/search] query:", query.trim());

    const result = await orchestrateSearch({
      query: query.trim(),
      inputType,
      inputValue,
      brand,
      model,
      category,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor.";
    console.error("[/api/search]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
