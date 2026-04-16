# 🛰️ Argentracker — Session State

## 📅 Última Sesión
- **Fecha**: 2026-04-16 04:40 (ART)
- **Fase**: ✅ FASE 3 COMPLETADA — Datos reales de MercadoLibre
- **Estado**: Producción con datos reales. Pendientes menores para fase 4.

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
  - Auto-retry con countdown de 30s en el frontend
- [x] ML OAuth flow (`/api/auth/ml/*`) — implementado
- [x] Mock data calibrada con precios reales ARS

### Fase 3 — Motor de Búsqueda Real ✅ COMPLETADA
- [x] **Descubrimiento clave**: ML Search API (`/sites/MLA/search`) retorna 403 para apps en test mode
- [x] **ML website captcha**: Bloquea IPs de Vercel y Cloudflare Workers
- [x] **SOLUCIÓN**: ML Products Catalog API funciona con nuestro token:
  - `/products/search?q=...` → IDs de productos del catálogo
  - `/products/{id}/items` → sellers + precios REALES
  - `/products/{id}` → imágenes/thumbnails del producto
  - `/users?ids=...` → nombres + reputación de vendedores (batch)
- [x] `product-search.ts` — Connector Products API v3 con:
  - Fetch paralelo (Promise.allSettled) para caber en timeout de 10s de Vercel
  - Detección de items internacionales (tags `cbt_item`, `cbt_fulfillment`)
  - Precio total para internacionales = base + 35% impuestos estimados
  - Batch fetch de sellers via `/users?ids=` multi-get
  - Mapeo de reputación ML (5_green, power_seller platinum/gold)
- [x] **Links directos al vendedor**: `articulo.mercadolibre.com.ar/MLA-{item_id}`
  - Antes: `/p/MLA...` (catálogo) → mostraba buy-box winner a OTRO precio
  - Ahora: Item específico del vendedor al precio exacto mostrado
- [x] **Orchestrator**: Products API → Scraper → Mock (cadena de fallback)
- [x] **Score transparente en UI**:
  - Fórmula visible: precio 50% + reputación 25% + envío 15% + cuotas 10%
  - Columna Score con tooltip de desglose por componente
  - `score_breakdown` en cada `RankedResult`
- [x] **Badge de items internacionales**: 🌍 INTL con desglose (Base + imp.)
- [x] **Sellers reales**: OTECH2025 (platinum), PYMTECNO (gold), etc.
- [x] **Token manager**: 3 estrategias (cookie → server → client_credentials)
- [x] **Tabla `ml_server_tokens`** en Supabase
- [x] Build pasa ✅ + deployed a Vercel

### ✅ Verificado en producción
- 71+ items reales con precios de ML
- Links van directo a la publicación del vendedor (precio correcto)
- Thumbnails reales de ML CDN
- Sellers con nombre real y reputación
- ~1s (cache) / ~4s (fresco) respuesta
- Gemini Vision detecta productos correctamente desde capturas

---

## ⚠️ Issues Conocidos

### 1. Server token — Actualmente con cuenta PERSONAL
- El token actual en Supabase es de la cuenta `CIANO_S` (10830594) — cuenta personal
- **ACCIÓN REQUERIDA**: Re-autorizar con `argentracker1@gmail.com` (cuenta del proyecto)
- **URL para re-autorizar** (logear primero en ML con argentracker1@gmail.com):
  ```
  https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=3531144650908300&redirect_uri=https://argentracker.vercel.app/api/auth/ml/callback
  ```

### 2. Productos muy nuevos no están en catálogo
- Samsung S26 Ultra: Existe en el catálogo pero la búsqueda puede devolver S25 por similaridad
- **Pendiente**: Validar que el nombre del producto encontrado matchea con la búsqueda original

### 3. API Keys — Seguras
- Las keys están solo en `.env.local` (gitignored) y Vercel env vars
- **5 Gemini keys** para rotación: `GEMINI_API_KEY` a `GEMINI_API_KEY_5`
- **Regla**: NUNCA poner API keys en archivos que van a git

### 4. Gemini Keys 4 y 5 — Formato diferente
- Keys 1-3: prefijo `AIza...` (Google AI Studio)
- Keys 4-5: prefijo `AQ.Ab8RN6...` (formato diferente, verificar si funcionan)

### 5. Impuestos CBT estimados
- Los impuestos de items internacionales se estiman al 35% (basado en datos reales)
- Dato real observado: $1,035,040 base + $358,605 impuestos = 34.6%
- Los impuestos reales varían por categoría y no son accesibles via API

---

## 🔜 Fase 4 — Próximos pasos (por prioridad)

### Alta prioridad
1. **Campo de Código Postal** — Input en la UI para que el usuario ingrese su CP
2. **Re-autorizar OAuth con argentracker1@gmail.com** — Reemplazar token personal
3. **Validar match de productos** — Verificar que el producto encontrado coincide con la búsqueda

### Media prioridad
4. **OAuth por usuario** — Cada usuario vincula su cuenta ML para:
   - CP automático
   - Envíos filtrados a su ubicación
5. **Filtro de envío por ubicación** — Usando `/items/{id}/shipping_options?zip_code=...`
6. **Mejorar resultados usados** — Products API solo retorna nuevos del catálogo

### Baja prioridad
7. **Impuestos CBT exactos** — Varían por categoría, actualmente estimados al 35%
8. **Cloudflare Worker** — Actualizar o deprecar (ya no se necesita con Products API)

---

## 📁 Archivos clave del proyecto

### Core
- `app/src/lib/mercadolibre/product-search.ts` — Connector Products API v3 (PRINCIPAL)
- `app/src/lib/agents/orchestrator.ts` — Coordinación del pipeline de búsqueda
- `app/src/lib/agents/price-ranker.ts` — Scoring + ranking + detección internacional
- `app/src/lib/mercadolibre/token-manager.ts` — Gestión de tokens ML (3 estrategias)

### API Routes
- `app/src/app/api/search/route.ts` — Endpoint principal de búsqueda
- `app/src/app/api/vision/route.ts` — Gemini Vision para capturas
- `app/src/app/api/auth/ml/callback/route.ts` — OAuth callback de ML

### Frontend
- `app/src/app/results/page.tsx` — Página de resultados con badges intl + score
- `app/src/app/page.tsx` — Landing con input de búsqueda y captura

### Tipos
- `app/src/types/index.ts` — RankedResult, MLItem, etc.

### Datos OAuth del proyecto ML
- **Client ID**: 3531144650908300
- **Redirect URI**: https://argentracker.vercel.app/api/auth/ml/callback
- **App state**: Test mode (no aprobada para producción)

---

## 📊 Progreso General
```
[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░] 90% — Fase 3 completada, datos reales funcionando
```
