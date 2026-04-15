import { NextResponse } from "next/server";
import { getMLToken } from "@/lib/mercadolibre/token-manager";

// GET /api/auth/ml/status — Devuelve si el usuario está autenticado con ML
export async function GET() {
  const { isAuthenticated, userId } = await getMLToken();
  return NextResponse.json({ isAuthenticated, userId });
}
