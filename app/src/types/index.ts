// ===================================
// Argentracker — Core Type Definitions
// ===================================

/** Input type for a search request */
export type SearchInputType = "url" | "screenshot";

/** Product condition */
export type ProductCondition = "new" | "used";

/** Price trend direction */
export type PriceTrend = "up" | "down" | "stable";

/** Seller reputation level */
export type SellerReputation =
  | "platinum"
  | "gold"
  | "green"
  | "yellow"
  | "red"
  | "unknown";

// -----------------------------------
// Vision Extractor Types
// -----------------------------------

export interface VisionExtractionResult {
  product_name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  visible_price: number | null;
  confidence: number;
}

// -----------------------------------
// MercadoLibre API Types
// -----------------------------------

export interface MLSearchOptions {
  query: string;
  condition?: ProductCondition;
  sort?: "price_asc" | "price_desc" | "relevance";
  limit?: number;
  offset?: number;
}

export interface MLItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  condition: ProductCondition;
  permalink: string;
  thumbnail: string | null;
  seller?: {
    id?: number;
    nickname?: string;
    reputation?: {
      level_id?: string | null;
      power_seller_status?: string | null;
    } | null;
  } | null;
  shipping?: {
    free_shipping: boolean;
  } | null;
  address?: {
    city_name: string;
    state_name: string;
  } | null;
  installments?: {
    quantity: number;
    amount?: number;
    rate: number;
  } | null;
  tags?: string[];
}

export interface MLSearchResponse {
  results: MLItem[];
  paging: {
    total: number;
    offset: number;
    limit: number;
  };
}

// -----------------------------------
// Ranked Results
// -----------------------------------

export interface RankedResult {
  ml_item_id: string;
  title: string;
  price: number;
  currency: string;
  condition: ProductCondition;
  seller_name: string;
  seller_reputation: SellerReputation;
  free_shipping: boolean;
  location: string;
  permalink: string;
  thumbnail: string;
  rank_position: number;
  is_ad: boolean;
  is_best_new: boolean;
  is_best_used: boolean;
  normalized_model: string;
  score: number;
  installments_text?: string;
}

// -----------------------------------
// Search & History
// -----------------------------------

export interface SearchRecord {
  id: string;
  product_name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  input_type: SearchInputType;
  best_new_price: number | null;
  best_new_url: string | null;
  best_new_seller: string | null;
  best_used_price: number | null;
  best_used_url: string | null;
  best_used_seller: string | null;
  avg_market_price: number | null;
  total_results: number;
  created_at: string;
}

// -----------------------------------
// Saved Products
// -----------------------------------

export interface SavedProduct {
  id: string;
  product_name: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  thumbnail: string | null;
  last_new_price: number | null;
  last_used_price: number | null;
  alert_enabled: boolean;
  alert_target_price: number | null;
  price_trend: PriceTrend;
  price_change_pct: number | null;
  last_checked_at: string | null;
  created_at: string;
}

// -----------------------------------
// UI State
// -----------------------------------

export interface SearchState {
  status: "idle" | "extracting" | "searching" | "ranking" | "done" | "error";
  product_name?: string;
  results?: RankedResult[];
  best_new?: RankedResult;
  best_used?: RankedResult;
  avg_price?: number;
  error?: string;
}
