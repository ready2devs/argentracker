import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ================================================
// POST /api/vision
// Recibe una imagen (base64) y extrae el nombre del producto
// usando Gemini 2.5 Flash (visión multimodal).
// ================================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
  "price": 12345 o null,
  "confidence": 0.0 a 1.0
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 requerido" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.1,        // Baja temperatura para respuestas precisas
        maxOutputTokens: 256,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      {
        inlineData: {
          data: imageBase64,
          mimeType,
        },
      },
    ]);

    const raw = result.response.text().trim();

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
      // Intentar extraer JSON si hay texto extra
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
