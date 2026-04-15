import type { MLItem } from "@/types";

// ================================================
// Mock Data para desarrollo local
// ML bloquea requests sin cookies de sesión desde IPs externas.
// En Vercel (producción) el endpoint real funciona.
// ================================================

const MOCK_ITEMS: Record<string, Partial<MLItem>[]> = {
  default: [
    {
      id: "MLA1001",
      title: "Apple iPhone 15 Pro 256GB Titanio Natural - Sellado",
      price: 2290000,
      currency_id: "ARS",
      condition: "new",
      thumbnail: "https://http2.mlstatic.com/D_NQ_NP_mock1.jpg",
      permalink: "https://articulo.mercadolibre.com.ar/MLA-mock1",
      shipping: { free_shipping: true },
      seller: { nickname: "FullCelularAR", reputation: { level_id: "platinum" } },
      installments: { quantity: 12, rate: 0 },
      address: { city_name: "Buenos Aires", state_name: "Capital Federal" },
    },
    {
      id: "MLA1002",
      title: "iPhone 15 Pro 256 GB Black Titanium Nuevo - Tienda Oficial",
      price: 2450000,
      currency_id: "ARS",
      condition: "new",
      thumbnail: "https://http2.mlstatic.com/D_NQ_NP_mock2.jpg",
      permalink: "https://articulo.mercadolibre.com.ar/MLA-mock2",
      shipping: { free_shipping: true },
      seller: { nickname: "AppStore_Oficial_AR", reputation: { level_id: "platinum" } },
      installments: { quantity: 18, rate: 0 },
      address: { city_name: "Córdoba", state_name: "Córdoba" },
    },
    {
      id: "MLA1003",
      title: "iPhone 15 Pro 128GB Como Nuevo - Solo 2 meses de uso",
      price: 1680000,
      currency_id: "ARS",
      condition: "used",
      thumbnail: "https://http2.mlstatic.com/D_NQ_NP_mock3.jpg",
      permalink: "https://articulo.mercadolibre.com.ar/MLA-mock3",
      shipping: { free_shipping: false },
      seller: { nickname: "TechUsados_MDP", reputation: { level_id: "green" } },
      installments: null,
      address: { city_name: "Mar del Plata", state_name: "Buenos Aires" },
    },
    {
      id: "MLA1004",
      title: "iPhone 15 Pro 256GB - En perfecto estado con accesorios",
      price: 1890000,
      currency_id: "ARS",
      condition: "used",
      thumbnail: "https://http2.mlstatic.com/D_NQ_NP_mock4.jpg",
      permalink: "https://articulo.mercadolibre.com.ar/MLA-mock4",
      shipping: { free_shipping: true },
      seller: { nickname: "Juan G.", reputation: { level_id: "gold" } },
      installments: null,
      address: { city_name: "Belgrano", state_name: "Capital Federal" },
    },
    {
      id: "MLA1005",
      title: "iPhone 15 Pro Max 512GB Natural Titanium - Importado",
      price: 3100000,
      currency_id: "ARS",
      condition: "new",
      thumbnail: "https://http2.mlstatic.com/D_NQ_NP_mock5.jpg",
      permalink: "https://articulo.mercadolibre.com.ar/MLA-mock5",
      shipping: { free_shipping: true },
      seller: { nickname: "ImportTechMX", reputation: { level_id: "gold" } },
      installments: { quantity: 12, rate: 2.5 },
      address: { city_name: "Palermo", state_name: "Capital Federal" },
    },
    {
      id: "MLA1006",
      title: "iPhone 15 Pro 256 Negro Titanio - Caja Abierta / Demo",
      price: 2100000,
      currency_id: "ARS",
      condition: "new",
      thumbnail: "https://http2.mlstatic.com/D_NQ_NP_mock6.jpg",
      permalink: "https://articulo.mercadolibre.com.ar/MLA-mock6",
      shipping: { free_shipping: true },
      seller: { nickname: "ElectroSaleAR", reputation: { level_id: "platinum" } },
      installments: { quantity: 24, rate: 0 },
      address: { city_name: "Rosario", state_name: "Santa Fe" },
    },
  ],
};

// Genera resultados mock adaptados al query
export function generateMockResults(query: string): MLItem[] {
  const q = query.toLowerCase();
  const base = MOCK_ITEMS.default;

  // Adaptar los títulos al query
  return base.map((item, i) => ({
    ...item,
    id: `MOCK_${i}`,
    title: item.title!.replace(/iphone 15 pro/gi, query),
    // Randomizar precio levemente para parecer más real
    price: Math.round((item.price! * (0.9 + Math.random() * 0.2)) / 1000) * 1000,
  })) as MLItem[];
}

export const IS_MOCK_MODE = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_FORCE_REAL_API !== "true";
