-- =============================================
-- ARGENTRACKER — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

-- 1. SEARCHES (historial de búsquedas)
CREATE TABLE IF NOT EXISTS searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    category TEXT,
    input_type TEXT NOT NULL CHECK (input_type IN ('url', 'screenshot')),
    input_value TEXT,
    best_new_price NUMERIC(12,2),
    best_new_url TEXT,
    best_new_seller TEXT,
    best_used_price NUMERIC(12,2),
    best_used_url TEXT,
    best_used_seller TEXT,
    avg_market_price NUMERIC(12,2),
    total_results INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_searches_user ON searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_searches_product ON searches(product_name);

-- 2. SEARCH_RESULTS (resultados por búsqueda)
CREATE TABLE IF NOT EXISTS search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID REFERENCES searches(id) ON DELETE CASCADE,
    ml_item_id TEXT NOT NULL,
    title TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'ARS',
    condition TEXT CHECK (condition IN ('new', 'used')),
    seller_name TEXT,
    seller_reputation TEXT,
    seller_id TEXT,
    free_shipping BOOLEAN DEFAULT false,
    location TEXT,
    permalink TEXT NOT NULL,
    thumbnail TEXT,
    rank_position INT,
    is_ad BOOLEAN DEFAULT false,
    is_best_new BOOLEAN DEFAULT false,
    is_best_used BOOLEAN DEFAULT false,
    normalized_model TEXT,
    score NUMERIC(5,2),
    installments_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_results_search ON search_results(search_id);
CREATE INDEX IF NOT EXISTS idx_results_item ON search_results(ml_item_id);

-- 3. SAVED_PRODUCTS (productos guardados)
CREATE TABLE IF NOT EXISTS saved_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    category TEXT,
    thumbnail TEXT,
    last_new_price NUMERIC(12,2),
    last_used_price NUMERIC(12,2),
    alert_enabled BOOLEAN DEFAULT false,
    alert_target_price NUMERIC(12,2),
    price_trend TEXT CHECK (price_trend IN ('up', 'down', 'stable')),
    price_change_pct NUMERIC(5,2),
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_products(user_id, updated_at DESC);

-- 4. PRICE_CACHE (caché de búsquedas, TTL 1 hora)
CREATE TABLE IF NOT EXISTS price_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash TEXT NOT NULL UNIQUE,
    query_text TEXT NOT NULL,
    results_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_cache_hash ON price_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_cache_expiry ON price_cache(expires_at);

-- 5. PRICE_SNAPSHOTS (historial de precios para tendencias)
CREATE TABLE IF NOT EXISTS price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_product_id UUID REFERENCES saved_products(id) ON DELETE CASCADE,
    new_price NUMERIC(12,2),
    used_price NUMERIC(12,2),
    captured_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_product ON price_snapshots(saved_product_id, captured_at DESC);

-- 6. ML_SERVER_TOKENS (server-side ML OAuth token storage)
-- Stores the app owner's ML token for server-side API access
-- Only one "primary" row — upserted on each OAuth callback
CREATE TABLE IF NOT EXISTS ml_server_tokens (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_server_tokens ENABLE ROW LEVEL SECURITY;

-- Búsquedas anónimas (sin user_id) son públicas, las del usuario son propias
CREATE POLICY "searches_select" ON searches FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "searches_insert" ON searches FOR INSERT
    WITH CHECK (true);

CREATE POLICY "searches_update" ON searches FOR UPDATE
    USING (user_id IS NULL OR auth.uid() = user_id);

-- Resultados: visibles si la búsqueda es visible
CREATE POLICY "results_select" ON search_results FOR SELECT
    USING (
        search_id IN (
            SELECT id FROM searches
            WHERE user_id IS NULL OR user_id = auth.uid()
        )
    );

CREATE POLICY "results_insert" ON search_results FOR INSERT
    WITH CHECK (true);

-- Productos guardados: solo el dueño
CREATE POLICY "saved_select" ON saved_products FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "saved_insert" ON saved_products FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_update" ON saved_products FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "saved_delete" ON saved_products FOR DELETE
    USING (auth.uid() = user_id);

-- Cache: acceso libre (lo maneja service_role desde el server)
CREATE POLICY "cache_all" ON price_cache FOR ALL
    USING (true) WITH CHECK (true);

-- Snapshots: sigue al producto guardado
CREATE POLICY "snapshots_select" ON price_snapshots FOR SELECT
    USING (
        saved_product_id IN (
            SELECT id FROM saved_products WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "snapshots_insert" ON price_snapshots FOR INSERT
    WITH CHECK (true);
