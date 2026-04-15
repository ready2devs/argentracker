// ================================================
// Normalizador de títulos de MercadoLibre [Ref 10]
// Agrupa publicaciones del mismo modelo exacto
// ================================================

// Tokens comunes a ignorar (stopwords en contexto de ML)
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "con", "sin", "para", "por",
  "y", "o", "e", "u", "a", "en", "al", "un", "una", "unos", "unas",
  "nuevo", "nuevo", "nueva", "nuevos", "sellado", "usado", "libre",
  "oferta", "envio", "gratis", "cuotas", "interes", "importado",
  "oficial", "garantia", "original", "generico", "local", "stock",
]);

// Alias de marcas conocidas
const BRAND_ALIASES: Record<string, string> = {
  "apple": "apple",
  "iphone": "apple",
  "macbook": "apple",
  "ipad": "apple",
  "samsung": "samsung",
  "galaxy": "samsung",
  "sony": "sony",
  "playstation": "sony",
  "ps5": "sony",
  "ps4": "sony",
  "microsoft": "microsoft",
  "xbox": "microsoft",
  "nintendo": "nintendo",
  "switch": "nintendo",
  "xiaomi": "xiaomi",
  "redmi": "xiaomi",
  "motorola": "motorola",
  "moto": "motorola",
  "lg": "lg",
  "lenovo": "lenovo",
  "asus": "asus",
  "hp": "hp",
  "dell": "dell",
  "nike": "nike",
  "adidas": "adidas",
};

// Normaliza capacidad/storage (256gb, 1tb, etc.)
function normalizeStorage(token: string): string {
  const gbMatch = token.match(/^(\d+)\s*gb$/i);
  if (gbMatch) return `${gbMatch[1]}GB`;
  const tbMatch = token.match(/^(\d+)\s*tb$/i);
  if (tbMatch) return `${parseInt(tbMatch[1]) * 1024}GB`;
  return token;
}

// Normaliza RAM (8gb, 16gb, etc.)
function normalizeRam(token: string): string {
  const ramMatch = token.match(/^(\d+)\s*gb\s*ram$/i);
  if (ramMatch) return `RAM${ramMatch[1]}GB`;
  return token;
}

export function normalizeTitle(title: string): string {
  // 1. Lowercase y limpiar caracteres especiales
  let normalized = title.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 2. Tokenizar
  const tokens = normalized.split(" ");

  // 3. Filtrar stopwords y procesar tokens
  const meaningful = tokens
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => {
      const storage = normalizeStorage(t);
      if (storage !== t) return storage;
      const ram = normalizeRam(t);
      if (ram !== t) return ram;
      return t.toUpperCase();
    });

  return meaningful.join("_");
}

// Detecta si un listing es probablemente un anuncio/promocionado
export function isAdvertisement(item: {
  tags?: string[];
  title?: string;
}): boolean {
  const adTags = [
    "best_seller_candidate",
    "deal_of_the_day",
    "good_quality_thumbnail",
    "immediate_payment",
    "cart_eligible",
  ];

  const promotedTags = ["promoted", "advertising", "sponsored"];

  const tags = item.tags || [];

  // Chequear tags de promoción explícita
  if (promotedTags.some((t) => tags.includes(t))) return true;

  // Heurística: más de 3 tags de "boost" = anuncio
  const boostTagCount = adTags.filter((t) => tags.includes(t)).length;
  if (boostTagCount >= 4) return true;

  return false;
}

// Extrae marca desde el título
export function extractBrand(title: string): string | null {
  const lower = title.toLowerCase();
  for (const [keyword, brand] of Object.entries(BRAND_ALIASES)) {
    if (lower.includes(keyword)) return brand;
  }
  return null;
}
