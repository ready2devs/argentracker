import { NextResponse } from "next/server";
import { getUserToken, getServerToken } from "@/lib/mercadolibre/token-manager";

// GET /api/auth/ml/status — Returns ML authentication status
export async function GET() {
  // Check user-level cookie
  const userToken = await getUserToken();
  if (userToken.isAuthenticated) {
    return NextResponse.json({
      isAuthenticated: true,
      userId: userToken.userId,
      source: "user_oauth",
    });
  }

  // Check server-level token
  const serverToken = await getServerToken();
  if (serverToken.isAuthenticated) {
    return NextResponse.json({
      isAuthenticated: true,
      userId: serverToken.userId,
      source: "server_token",
    });
  }

  return NextResponse.json({
    isAuthenticated: false,
    userId: null,
    source: "none",
  });
}
