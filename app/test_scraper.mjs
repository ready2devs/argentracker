// Test polycard JSON parsing
const url = "https://listado.mercadolibre.com.ar/celular-iphone-15-pro-128gb_Nuevo_OrderId_PRICE_NoIndex_True";

function unescapeUrl(raw) {
  try { return JSON.parse(`"${raw}"`); } catch { return raw.replace(/\\u002F/g, '/'); }
}

async function test() {
  console.log("Fetching:", url);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36", "Accept-Language": "es-AR" },
    redirect: "follow"
  });
  const html = await res.text();
  console.log("HTML length:", html.length);
  
  // Parse polycards
  const polycardRegex = /"polycard":\{"unique_id":"[^"]+","metadata":\{"id":"(MLA\d+)","product_id":"(MLA\w+)","user_product_id":"[^"]*","url":"([^"]+)"/g;
  const seen = new Set();
  let match;
  let count = 0;
  
  while ((match = polycardRegex.exec(html)) !== null) {
    const itemId = match[1];
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    
    const rawUrl = match[3];
    const permalink = `https://${unescapeUrl(rawUrl)}`;
    
    const forward = html.substring(match.index, Math.min(html.length, match.index + 3000));
    
    const titleMatch = forward.match(/"type":"title"[^}]*"text":"([^"]+)"/);
    const title = titleMatch ? unescapeUrl(titleMatch[1]) : "NO TITLE";
    
    const priceMatch = forward.match(/"current_price":\{"value":(\d+)/);
    const price = priceMatch ? parseInt(priceMatch[1]) : 0;
    
    const picMatch = forward.match(/"pic_id":"([^"]+)"/);
    const thumb = picMatch ? `D_${picMatch[1]}-O.jpg` : "NO THUMB";
    
    count++;
    if (count <= 10) {
      console.log(`\n--- ${count}. ${title}`);
      console.log(`   MLA ID: ${itemId}`);
      console.log(`   Price: $${price.toLocaleString()} ARS`);
      console.log(`   URL: ${permalink.substring(0, 100)}`);
      console.log(`   Thumb: ${thumb.substring(0, 50)}`);
      console.log(`   Valid: ${title !== "NO TITLE" && price >= 100000 ? "✅" : "❌"}`);
    }
  }
  
  console.log(`\n\n🎯 Total polycards found: ${count}`);
}

test().catch(console.error);
