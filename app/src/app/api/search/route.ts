import { NextRequest, NextResponse } from "next/server";
import { orchestrateSearch } from "@/lib/agents/orchestrator";
import { getMLToken } from "@/lib/mercadolibre/token-manager";

// ================================================
// POST /api/search
// Lee el token ML del cookie httpOnly y lo pasa al orchestrator.
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

    // Leer token de usuario ML desde cookie httpOnly
    const { token: mlAccessToken, userId, isAuthenticated } = await getMLToken();

    console.log("[/api/search] query:", query.trim(), "| authenticated:", isAuthenticated);

    const result = await orchestrateSearch({
      query: query.trim(),
      inputType,
      inputValue,
      brand,
      model,
      category,
      userId: userId || undefined,
      mlAccessToken: mlAccessToken || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor.";
    console.error("[/api/search]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
