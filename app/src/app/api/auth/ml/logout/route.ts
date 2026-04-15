import { NextRequest, NextResponse } from "next/server";

// ================================================
// GET /api/auth/ml/logout
// Limpia las cookies de sesión de ML
// ================================================

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete("ml_access_token");
  response.cookies.delete("ml_refresh_token");
  response.cookies.delete("ml_user_id");
  return response;
}
