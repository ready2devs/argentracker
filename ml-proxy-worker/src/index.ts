/**
 * ArgenTracker ML Proxy — Cloudflare Worker v4 (debug)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS });
      }

      const url = new URL(request.url);

      if (url.pathname === "/") {
        return jsonResponse({ status: "ok", worker: "ml-proxy-v4" });
      }

      if (url.pathname !== "/search") {
        return jsonResponse({ error: "not_found" }, 404);
      }

      const q = url.searchParams.get("q");
      if (!q) return jsonResponse({ error: "q_required" }, 400);

      // Paso 1: obtener token
      let token = "";
      try {
        const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "grant_type=client_credentials&client_id=3531144650908300&client_secret=FLFd4FLdvrNl4eMsSX2ETUqTBsYEsixN",
        });
        if (tokenRes.ok) {
          const td = await tokenRes.json() as Record<string, unknown>;
          token = String(td.access_token ?? "");
        } else {
          return jsonResponse({ step: "token", status: tokenRes.status, body: await tokenRes.text() }, 200);
        }
      } catch (e) {
        return jsonResponse({ step: "token_exception", error: String(e) }, 200);
      }

      // Paso 2: buscar en ML
      const mlUrl = `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(q)}&limit=5`;
      let searchRes: Response;
      try {
        searchRes = await fetch(mlUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Accept-Language": "es-AR,es;q=0.9",
          },
        });
      } catch (e) {
        return jsonResponse({ step: "search_exception", error: String(e) }, 200);
      }

      const body = await searchRes.text();
      // Siempre devolver 200 para poder leer el body
      return jsonResponse({
        step: "search_done",
        ml_status: searchRes.status,
        token_prefix: token.substring(0, 20),
        body: JSON.parse(body),
      }, 200);

    } catch (globalErr) {
      return new Response(JSON.stringify({ step: "global_crash", error: String(globalErr) }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
  },
};
