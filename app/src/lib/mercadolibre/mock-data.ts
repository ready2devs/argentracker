import type { MLItem } from "@/types";

// ================================================
// Mock Data — precios calibrados con el mercado real de ML AR
// Links apuntan a búsquedas reales filtradas por condición + precio asc.
// ================================================

const MOCK_ITEMS: Partial<MLItem>[] = [
  {
    id: "MLA1001",
    title: "Apple iPhone 15 Pro 256GB Titanio Natural - Sellado",
    price: 1850000,
    currency_id: "ARS",
    condition: "new",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "FullCelularAR", reputation: { level_id: "platinum" } },
    installments: { quantity: 12, rate: 0 },
    address: { city_name: "Buenos Aires", state_name: "Capital Federal" },
  },
  {
    id: "MLA1002",
    title: "iPhone 15 Pro 256 GB Black Titanium - Tienda Oficial Apple",
    price: 2100000,
    currency_id: "ARS",
    condition: "new",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "AppStore_Oficial_AR", reputation: { level_id: "platinum" } },
    installments: { quantity: 18, rate: 0 },
    address: { city_name: "Córdoba", state_name: "Córdoba" },
  },
  {
    id: "MLA1003",
    title: "iPhone 15 Pro 128GB Como Nuevo - 2 meses de uso",
    price: 1120000,
    currency_id: "ARS",
    condition: "used",
    thumbnail: null,
    shipping: { free_shipping: false },
    seller: { nickname: "TechUsados_MDP", reputation: { level_id: "green" } },
    installments: null,
    address: { city_name: "Mar del Plata", state_name: "Buenos Aires" },
  },
  {
    id: "MLA1004",
    title: "iPhone 15 Pro 256GB - Perfecto estado con accesorios",
    price: 1380000,
    currency_id: "ARS",
    condition: "used",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "Juan G.", reputation: { level_id: "gold" } },
    installments: null,
    address: { city_name: "Belgrano", state_name: "Capital Federal" },
  },
  {
    id: "MLA1005",
    title: "iPhone 15 Pro Max 512GB Natural Titanium - Importado FULL",
    price: 2450000,
    currency_id: "ARS",
    condition: "new",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "ImportTechMX", reputation: { level_id: "gold" } },
    installments: { quantity: 12, rate: 2.5 },
    address: { city_name: "Palermo", state_name: "Capital Federal" },
  },
  {
    id: "MLA1006",
    title: "iPhone 15 Pro 256 Negro Titanio - Caja Abierta / Exhibición",
    price: 1650000,
    currency_id: "ARS",
    condition: "new",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "ElectroSaleAR", reputation: { level_id: "platinum" } },
    installments: { quantity: 24, rate: 0 },
    address: { city_name: "Rosario", state_name: "Santa Fe" },
  },
];

// Links filtrados por condición y ordenados por precio ascendente en ML
function mlLink(query: string, condition: "new" | "used"): string {
  const slug = query.trim().replace(/\s+/g, "-").toLowerCase();
  const condSuffix = condition === "new" ? "_Nuevo" : "_Usado";
  return `https://listado.mercadolibre.com.ar/${slug}${condSuffix}#D_SORD=price`;
}

export function generateMockResults(query: string): MLItem[] {
  return MOCK_ITEMS.map((item, i) => ({
    ...item,
    id: `MOCK_${i}`,
    title: item.title!.replace(/iphone 15 pro/gi, query),
    permalink: mlLink(query, item.condition as "new" | "used"),
    // Variación leve del precio para parecer más natural
    price: Math.round((item.price! * (0.95 + Math.random() * 0.1)) / 1000) * 1000,
  })) as MLItem[];
}

export const IS_MOCK_MODE =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FORCE_REAL_API !== "true";
