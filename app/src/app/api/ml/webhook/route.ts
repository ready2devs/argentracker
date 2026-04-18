import { NextRequest, NextResponse } from "next/server";

// ================================================
// ML Webhook Endpoint — Required for app certification
//
// MercadoLibre sends notifications via POST and validates
// the endpoint is alive via GET. We must respond 200 quickly.
//
// Notification topics:
// - orders_v2: Order updates
// - orders_feedback: Order feedback
// - items: Item changes
// ================================================

// GET — ML health check / verification ping
export async function GET() {
  return NextResponse.json(
    { status: "ok", app: "ArgenTracker", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}

// POST — ML sends webhook notifications here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the notification for debugging
    console.log("[ML Webhook] Received notification:", JSON.stringify({
      topic: body.topic,
      resource: body.resource,
      user_id: body.user_id,
      application_id: body.application_id,
      sent: body.sent,
      attempts: body.attempts,
    }));

    // Acknowledge immediately — ML requires fast 200 response
    // In a full implementation, you'd process the notification async
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    // Even on parse errors, return 200 to avoid ML marking us as unhealthy
    console.error("[ML Webhook] Parse error:", String(err).slice(0, 100));
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
