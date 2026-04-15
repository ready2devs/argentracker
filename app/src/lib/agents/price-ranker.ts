import type { MLItem, RankedResult, SellerReputation } from "@/types";
import { normalizeTitle, isAdvertisement } from "@/lib/mercadolibre/normalizer";

// ================================================
// PriceRanker — Normalización y Scoring [Ref 1, 2, 10]
// ================================================

// Scoring weights (debe sumar 100)
const WEIGHTS = {
  price: 50,
  reputation: 25,
  freeShipping: 15,
  installments: 10,
};

// Mapeo de reputación a score
const REPUTATION_SCORES: Record<string, number> = {
  platinum: 100,
  gold: 80,
  green: 60,
  yellow: 40,
  red: 20,
  unknown: 10,
};

function mapReputation(levelId: string | undefined | null): SellerReputation {
  if (!levelId) return "unknown";
  const lower = levelId.toLowerCase();
  if (lower.includes("platinum")) return "platinum";
  if (lower.includes("gold") || lower.includes("oro")) return "gold";
  if (lower.includes("green") || lower.includes("verde")) return "green";
  if (lower.includes("yellow") || lower.includes("amarillo")) return "yellow";
  if (lower.includes("red") || lower.includes("rojo")) return "red";
  return "unknown";
}

function formatInstallments(item: MLItem): string | undefined {
  if (!item.installments) return undefined;
  const { quantity, rate } = item.installments;
  if (rate === 0) return `${quantity} cuotas sin interés`;
  return `${quantity} cuotas`;
}

// Calcula precio mínimo del set para normalizar el score de precio
function calcPriceScore(price: number, minPrice: number, maxPrice: number): number {
  if (maxPrice === minPrice) return 100;
  // Menor precio = mayor score
  return ((maxPrice - price) / (maxPrice - minPrice)) * 100;
}

export function rankResults(items: MLItem[]): RankedResult[] {
  if (!items.length) return [];

  // Filtrar anuncios detectados
  const filtered = items.filter((item) => !isAdvertisement(item));

  if (!filtered.length) return [];

  const prices = filtered.map((i) => i.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Calcular scores
  const scored = filtered.map((item) => {
    const reputation = mapReputation(item.seller?.reputation?.level_id);
    const reputationScore = REPUTATION_SCORES[reputation] || 10;
    const priceScore = calcPriceScore(item.price, minPrice, maxPrice);
    const shippingScore = item.shipping?.free_shipping ? 100 : 0;
    const installmentsScore = item.installments?.rate === 0 ? 100 : 0;

    const totalScore =
      (priceScore * WEIGHTS.price +
        reputationScore * WEIGHTS.reputation +
        shippingScore * WEIGHTS.freeShipping +
        installmentsScore * WEIGHTS.installments) /
      100;

    const result: RankedResult = {
      ml_item_id: item.id,
      title: item.title,
      price: item.price,
      currency: item.currency_id,
      condition: item.condition,
      seller_name: item.seller?.nickname || "Vendedor",
      seller_reputation: reputation,
      free_shipping: item.shipping?.free_shipping || false,
      location: item.address
        ? `${item.address.city_name}, ${item.address.state_name}`
        : "Argentina",
      permalink: item.permalink,
      thumbnail: item.thumbnail || "",
      rank_position: 0, // se asigna después de ordenar
      is_ad: false,
      is_best_new: false,
      is_best_used: false,
      normalized_model: normalizeTitle(item.title),
      score: Math.round(totalScore * 10) / 10,
      installments_text: formatInstallments(item),
    };

    return result;
  });

  // Ordenar por score descendente
  scored.sort((a, b) => b.score - a.score);

  // Asignar posiciones
  scored.forEach((item, i) => {
    item.rank_position = i + 1;
  });

  // Marcar el mejor nuevo y usado
  const bestNew = scored.find((r) => r.condition === "new");
  const bestUsed = scored.find((r) => r.condition === "used");

  if (bestNew) bestNew.is_best_new = true;
  if (bestUsed) bestUsed.is_best_used = true;

  return scored;
}

// Calcula precio promedio de mercado
export function calcAvgPrice(items: MLItem[]): number {
  if (!items.length) return 0;
  const prices = items.map((i) => i.price);
  const sum = prices.reduce((a, b) => a + b, 0);
  return Math.round(sum / prices.length);
}
