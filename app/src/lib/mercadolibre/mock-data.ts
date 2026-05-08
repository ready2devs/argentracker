import type { MLItem } from "@/types";

// ================================================
// Mock Data — precios calibrados con el mercado real de ML AR
// Links apuntan a búsquedas reales filtradas por condición + precio asc.
// ================================================

const MOCK_ITEMS: Partial<MLItem>[] = [
  {
    id: "MLA1001",
    title: "{QUERY} - Vendedor Destacado",
    price: 450000,
    currency_id: "ARS",
    condition: "new",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "VendedorML", reputation: { level_id: "platinum" } },
    installments: { quantity: 12, rate: 0 },
    address: { city_name: "Buenos Aires", state_name: "Capital Federal" },
  },
  {
    id: "MLA1002",
    title: "{QUERY} - Tienda Oficial",
    price: 520000,
    currency_id: "ARS",
    condition: "new",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "TiendaOficial_AR", reputation: { level_id: "platinum" } },
    installments: { quantity: 18, rate: 0 },
    address: { city_name: "Córdoba", state_name: "Córdoba" },
  },
  {
    id: "MLA1003",
    title: "{QUERY} - Usado en buen estado",
    price: 320000,
    currency_id: "ARS",
    condition: "used",
    thumbnail: null,
    shipping: { free_shipping: false },
    seller: { nickname: "UsadosTech", reputation: { level_id: "green" } },
    installments: null,
    address: { city_name: "Mar del Plata", state_name: "Buenos Aires" },
  },
  {
    id: "MLA1004",
    title: "{QUERY} - Excelente estado",
    price: 380000,
    currency_id: "ARS",
    condition: "used",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "VendedorML_2", reputation: { level_id: "gold" } },
    installments: null,
    address: { city_name: "Belgrano", state_name: "Capital Federal" },
  },
  {
    id: "MLA1005",
    title: "{QUERY} - Importado con garantía",
    price: 580000,
    currency_id: "ARS",
    condition: "new",
    thumbnail: null,
    shipping: { free_shipping: true },
    seller: { nickname: "ImportTechAR", reputation: { level_id: "gold" } },
    installments: { quantity: 12, rate: 2.5 },
    address: { city_name: "Palermo", state_name: "Capital Federal" },
  },
  {
    id: "MLA1006",
    title: "{QUERY} - Precio especial",
    price: 490000,
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
    title: item.title!.replace("{QUERY}", query),
    permalink: mlLink(query, item.condition as "new" | "used"),
    // Variación leve del precio para parecer más natural
    price: Math.round((item.price! * (0.95 + Math.random() * 0.1)) / 1000) * 1000,
  })) as MLItem[];
}

export const IS_MOCK_MODE =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FORCE_REAL_API !== "true";
