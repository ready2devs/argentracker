import { createAdminClient } from "@/lib/supabase/admin";
import type { RankedResult, SearchRecord } from "@/types";
import { createHash } from "crypto";

// ================================================
// DatabaseManager — Supabase CRUD + Caché
// ================================================

export class DatabaseManager {
  private db = createAdminClient();

  // --- CACHE ---

  private hashQuery(query: string): string {
    return createHash("sha256").update(query.toLowerCase().trim()).digest("hex");
  }

  async getCached(query: string): Promise<RankedResult[] | null> {
    const hash = this.hashQuery(query);

    const { data, error } = await this.db
      .from("price_cache")
      .select("results_json, expires_at")
      .eq("query_hash", hash)
      .single();

    if (error || !data) return null;

    // Verificar expiración
    if (new Date(data.expires_at) < new Date()) {
      // Limpiar caché expirado en background
      this.db.from("price_cache").delete().eq("query_hash", hash);
      return null;
    }

    return data.results_json as RankedResult[];
  }

  async saveCache(query: string, results: RankedResult[]): Promise<void> {
    const hash = this.hashQuery(query);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora

    await this.db.from("price_cache").upsert({
      query_hash: hash,
      query_text: query,
      results_json: results,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    });
  }

  // --- SEARCHES ---

  async saveSearch(data: {
    productName: string;
    brand?: string;
    model?: string;
    category?: string;
    inputType: "url" | "screenshot";
    inputValue?: string;
    results: RankedResult[];
    avgPrice: number;
    userId?: string;
  }): Promise<string | null> {
    const bestNew = data.results.find((r) => r.is_best_new);
    const bestUsed = data.results.find((r) => r.is_best_used);

    const { data: inserted, error } = await this.db
      .from("searches")
      .insert({
        user_id: data.userId || null,
        product_name: data.productName,
        brand: data.brand || null,
        model: data.model || null,
        category: data.category || null,
        input_type: data.inputType,
        input_value: data.inputValue || null,
        best_new_price: bestNew?.price || null,
        best_new_url: bestNew?.permalink || null,
        best_new_seller: bestNew?.seller_name || null,
        best_used_price: bestUsed?.price || null,
        best_used_url: bestUsed?.permalink || null,
        best_used_seller: bestUsed?.seller_name || null,
        avg_market_price: data.avgPrice,
        total_results: data.results.length,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("Error saving search:", error);
      return null;
    }

    // Guardar resultados individuales en background
    const searchId = inserted.id;
    const resultsToInsert = data.results.slice(0, 20).map((r) => ({
      search_id: searchId,
      ml_item_id: r.ml_item_id,
      title: r.title,
      price: r.price,
      currency: r.currency,
      condition: r.condition,
      seller_name: r.seller_name,
      seller_reputation: r.seller_reputation,
      free_shipping: r.free_shipping,
      location: r.location,
      permalink: r.permalink,
      thumbnail: r.thumbnail,
      rank_position: r.rank_position,
      is_ad: r.is_ad,
      is_best_new: r.is_best_new,
      is_best_used: r.is_best_used,
      normalized_model: r.normalized_model,
      score: r.score,
      installments_text: r.installments_text || null,
    }));

    this.db.from("search_results").insert(resultsToInsert).then(({ error: e }) => {
      if (e) console.error("Error saving results:", e);
    });

    return searchId;
  }

  async getRecentSearches(userId?: string, limit = 20): Promise<SearchRecord[]> {
    let query = this.db
      .from("searches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.is("user_id", null);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data as SearchRecord[]) || [];
  }

  // Limpiar caché expirado (llamar periódicamente)
  async cleanExpiredCache(): Promise<void> {
    await this.db
      .from("price_cache")
      .delete()
      .lt("expires_at", new Date().toISOString());
  }
}

export const dbManager = new DatabaseManager();
