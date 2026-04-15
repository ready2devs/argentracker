import { NextRequest, NextResponse } from "next/server";

// ================================================
// POST /api/vision
// Recibe una imagen (base64) y extrae el nombre del producto
// usando Gemini 2.0 Flash via native fetch (v1 API — soporta Gemini 2.x).
// ================================================

// Rotación automática: si una key da 429, prueba la siguiente
const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-04-17";
const GEMINI_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `Sos un experto en identificar productos electrónicos y artículos de consumo.
Tu tarea: analizar la imagen y extraer el nombre exacto del producto para buscar en Mercado Libre Argentina.

Reglas:
- Devolvé SOLO el nombre del producto como si lo fuera a buscar en ML (ej: "iPhone 15 Pro 256GB", "Samsung Galaxy S24 Ultra", "AirPods Pro 2da generación")
- Si hay precio visible en la imagen, incluyelo en el campo "price"
- Si no podés identificar el producto, devolvé productName: null
- Nunca devuelvas texto extra fuera del JSON

Formato de respuesta (JSON puro, sin markdown):
{
  "productName": "nombre del producto para buscar",
  "brand": "marca si es identificable",
  "model": "modelo exacto si es identificable",
  "price": 12345,
  "confidence": 0.95
}`;

export async function POST(request: NextRequest) {
  try {
    if (GEMINI_KEYS.length === 0) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada. Agregala en Vercel → Settings → Environment Variables." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 requerido" }, { status: 400 });
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: SYSTEM_PROMPT },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
    };

    // Rotación: prueba cada key hasta obtener respuesta no-429
    let geminiResponse: { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null = null;
    for (const key of GEMINI_KEYS) {
      const res = await fetch(`${GEMINI_BASE}?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 429) {
        continue; // prueba la siguiente key
      }
      if (!res.ok) {
        const errText = await res.text();
        console.error("[/api/vision] Gemini error:", res.status, errText);
        return NextResponse.json(
          { error: `Error Gemini API ${res.status}: ${errText.slice(0, 200)}` },
          { status: 502 }
        );
      }
      geminiResponse = await res.json();
      break;
    }

    if (!geminiResponse) {
      return NextResponse.json(
        { error: "Todas las keys de Gemini están en quota límite. Intentá en unos segundos." },
        { status: 429 }
      );
    }
    const raw = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!raw) {
      return NextResponse.json(
        { error: "Gemini no devolvió contenido." },
        { status: 422 }
      );
    }

    let parsed: {
      productName: string | null;
      brand?: string;
      model?: string;
      price?: number | null;
      confidence?: number;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Gemini no devolvió JSON válido");
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.productName) {
      return NextResponse.json(
        { error: "No se pudo identificar el producto en la imagen." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      productName: parsed.productName,
      brand: parsed.brand || null,
      model: parsed.model || null,
      price: parsed.price || null,
      confidence: parsed.confidence || 0.8,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error procesando imagen";
    console.error("[/api/vision]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
