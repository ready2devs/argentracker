# 🛰️ Argentracker — Session State

## 📅 Última Sesión
- **Fecha**: 2026-04-17 01:29 (ART)
- **Fase**: ✅ FASE 3 COMPLETADA — Datos reales de MercadoLibre + validación de modelos
- **Estado**: Producción estable. Todos los issues críticos resueltos.

---

## ✅ Completado

### Fase 1 — Fundación
- [x] Proyecto Next.js 16 desplegado en Vercel
- [x] Design System "Argento Moderno" (40+ tokens)
- [x] 4 páginas: Landing, Results, History, Saved
- [x] Componentes: TopNavBar, BottomNavBar, SearchInput, ScreenshotUpload

### Fase 2 — Backend + Gemini Vision
- [x] `/api/search` — Motor de búsqueda
- [x] `/api/rank` — Rankeador de precios
- [x] `/api/vision` — Gemini Vision (identifica productos desde capturas)
  - Modelo: `gemini-2.5-flash-lite` (alto RPM)
  - Rotación automática de **5 API keys** (GEMINI_API_KEY a GEMINI_API_KEY_5)
  - Keys 4 y 5 verificadas funcionales (formato `AQ.Ab8...`, dan 429 no 401)
  - Auto-retry con countdown de 30s en el frontend

### Fase 3 — Motor de Búsqueda Real ✅ COMPLETADA
- [x] **ML Products Catalog API** como fuente principal:
  - `/products/search?q=...` → IDs de productos
  - `/products/{id}/items` → sellers + precios REALES
  - `/products/{id}` → imágenes/thumbnails
  - `/users?ids=...` → nombres + reputación (batch multi-get)
- [x] **Links directos al vendedor**: `articulo.mercadolibre.com.ar/MLA-{item_id}`
  - Fix: antes linkeaba al catálogo `/p/MLA...` (buy-box winner, precio diferente)
- [x] **Sellers reales + reputación**: OTECH2025 (platinum), PYMTECNO (gold), etc.
  - Mapeo ML: 5_green → green, power_seller → platinum/gold
- [x] **Items internacionales (CBT)**:
  - Detectados via tags `cbt_item`, `cbt_fulfillment_us/cn`
  - Marcados con badge 🌍 INTL en UI
  - Precio total = base + 35% impuestos estimados (compite justo con nacionales)
  - Desglose visible: "Base $X + imp. $Y"
- [x] **Score transparente**:
  - Fórmula visible: precio 50% + reputación 25% + envío 15% + cuotas 10%
  - Columna Score con tooltip de desglose por componente
- [x] **Validación de modelo** (v4 — FIX CRÍTICO):
  - `extractModelTokens()` extrae identificadores: "Galaxy S26", "iPhone 16", "Redmi Note 13"
  - `isProductMatch()` valida que productos del catálogo matcheen el modelo buscado
  - Filtra S25 cuando buscás S26, iPhone 15 cuando buscás iPhone 16
  - Fallback: si ningún producto matchea, muestra todos
- [x] **OAuth con cuenta del proyecto**: argentracker1@gmail.com (UserID: 3338201172)
- [x] **Orchestrator**: Products API → Scraper → Mock (cadena de fallback)
- [x] **Gemini keys 4 y 5 verificadas**: Formato `AQ.Ab8...` funcional (429=rate limit, no error auth)

### ✅ Verificado en producción
- Samsung Galaxy S26 Ultra → solo S26 (no S25) ✅
- Apple iPhone 16 128GB → solo iPhone 16 (no 11/15) ✅
- 66-71 items reales con precios de ML
- Links van al vendedor específico (precio exacto) ✅
- Sellers reales + reputación (platinum/gold/green) ✅
- ~1s (cache) / ~4s (fresco) respuesta

---

## ⚠️ Issues Conocidos

### 1. Impuestos CBT estimados (no exactos)
- No hay endpoint de ML que exponga impuestos de importación
- Se probaron 7 endpoints: `/items/{id}`, `/prices`, `/taxes_for_buyer`, multiget, `/cbt/taxes`, `/purchases/import_charges`, `/sites/MLA/cbt/tariffs` — todos bloqueados o inexistentes
- ML renderiza impuestos client-side via JavaScript (no en HTML)
- **Solución actual**: Estimado 35% (dato real observado: 34.65% para iPhone 16)
- **Impacto**: El precio total de internacionales puede variar ±5% del real

### 2. API Keys seguras
- Las keys están solo en `.env.local` (gitignored) y Vercel env vars
- **5 Gemini keys** para rotación: `GEMINI_API_KEY` a `GEMINI_API_KEY_5`
- **Regla**: NUNCA poner API keys en archivos que van a git

---

## 🔜 Fase 4 — Próximos pasos

### Alta prioridad
1. **Campo de Código Postal** — Input en la UI para filtrar envíos a la ubicación del usuario
2. **Mejorar resultados usados** — Products API solo retorna nuevos del catálogo

### Media prioridad
3. **OAuth por usuario** — Cada usuario vincula su cuenta ML para CP automático
4. **Filtro de envío por ubicación** — Usando `/items/{id}/shipping_options?zip_code=...` (funciona ✅)
5. **Cloudflare Worker** — Deprecar (ya no necesario con Products API)

### Baja prioridad
6. **Impuestos CBT exactos** — Si ML abre un endpoint, usarlo
7. **Ampliar patrones de modelo** — Agregar más marcas/formatos al matcher

---

## 📁 Archivos clave del proyecto

### Core
- `app/src/lib/mercadolibre/product-search.ts` — Connector Products API v4 (PRINCIPAL)
- `app/src/lib/agents/orchestrator.ts` — Coordinación del pipeline de búsqueda
- `app/src/lib/agents/price-ranker.ts` — Scoring + ranking + detección internacional
- `app/src/lib/mercadolibre/token-manager.ts` — Gestión de tokens ML (3 estrategias)

### API Routes
- `app/src/app/api/search/route.ts` — Endpoint principal de búsqueda
- `app/src/app/api/vision/route.ts` — Gemini Vision para capturas
- `app/src/app/api/auth/ml/callback/route.ts` — OAuth callback de ML

### Frontend
- `app/src/app/results/page.tsx` — Resultados con badges intl + score + reputación
- `app/src/app/page.tsx` — Landing con input de búsqueda y captura

### Tipos
- `app/src/types/index.ts` — RankedResult con score_breakdown, is_international, base_price, estimated_taxes

### Flujo de búsqueda
```
📸 Captura → 🤖 Gemini Vision (extrae nombre)
                    ↓
               🔑 Token argentracker1@gmail.com
                    ↓
               📡 ML Products API (3 llamadas paralelas)
                    ↓
               🔍 Validación de modelo (extractModelTokens)
                    ↓
               👥 Batch /users (nombres + rep)
                    ↓
               🌍 Detección CBT (+ impuestos estimados)
                    ↓
               📊 Score ranking → 🖥️ Resultados
```

### Datos OAuth del proyecto ML
- **Client ID**: 3531144650908300
- **Cuenta**: argentracker1@gmail.com (UserID: 3338201172)
- **Redirect URI**: https://argentracker.vercel.app/api/auth/ml/callback
- **App state**: Test mode

---

## 📊 Progreso General
```
[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░] 95% — Motor de búsqueda real completo y validado
```
