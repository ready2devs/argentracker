# 🛰️ Argentracker — Session State

## 📅 Sesión Actual
- **Fecha**: 2026-04-16 01:38 (ART)
- **Fase**: 🔧 FASE 3 EN PROGRESO — Motor de búsqueda real
- **Estado**: Backend refactorizado, deploy en Vercel, esperando OAuth ML

---

## ✅ Completado

### Fase 1 — Fundación
- [x] Proyecto Next.js 16 desplegado en Vercel
- [x] Design System "Argento Moderno" (40+ tokens)
- [x] 4 páginas: Landing, Results, History, Saved
- [x] Componentes: TopNavBar, BottomNavBar, SearchInput, ScreenshotUpload

### Fase 2 — Backend + Gemini Vision
- [x] `/api/search` — Motor de búsqueda con mock data
- [x] `/api/rank` — Rankeador de precios
- [x] `/api/vision` — Gemini Vision (identifica productos desde captura de pantalla)
  - Modelo: `gemini-2.5-flash-lite` (alto RPM)
  - Rotación automática de **5 API keys** (GEMINI_API_KEY a GEMINI_API_KEY_5)
  - Auto-retry con countdown de 30s en el frontend
- [x] ML OAuth flow (`/api/auth/ml/*`) — implementado
- [x] Mock data calibrada con precios reales ARS

### Fase 3 — Motor de Búsqueda Real (EN PROGRESO)
- [x] **Descubrimiento clave**: ML Search API requiere user-level OAuth (403 sin token)
- [x] `client_credentials` app token funciona solo para `/users/me`, NO para search
- [x] Nuevo `token-manager.ts` con 3 estrategias: cookie → server → app
- [x] Tabla `ml_server_tokens` creada en Supabase (almacena token de servidor)
- [x] OAuth callback guarda token en cookies Y en Supabase para reutilización server-side
- [x] `api.ts` reescrito con User-Agent rotation [Ref 15] + delays [Ref 16]
- [x] Orchestrator refactorizado para resolver tokens automáticamente
- [x] Build pasa ✅ + deployed a Vercel
- [x] Bug fix: `ML_CLIENT_SECRET` variable duplicada en `.env.local`
- [ ] **PENDIENTE**: Autorizar ML OAuth (login del app owner)
- [ ] **PENDIENTE**: Verificar búsqueda real con datos de ML
- [ ] **PENDIENTE**: Verificar que links apuntan a publicaciones reales (permalinks)
- [ ] **PENDIENTE**: Thumbnails reales de ML en resultados

### ✅ Verificado en producción
- Gemini Vision detectó correctamente "Celular iPhone 15 Pro 128 GB" desde una captura
- Status endpoint funciona: `argentracker.vercel.app/api/auth/ml/status` → `{"isAuthenticated":false,"source":"none"}`

---

## ⚠️ Issues Conocidos

### 1. ML OAuth → Requiere autorización manual del owner
- La API de búsqueda de ML ahora requiere token de usuario
- El `client_credentials` token (app-level) NO sirve para `/sites/MLA/search`
- **Solución implementada**: El owner autoriza una vez vía OAuth, el token se guarda en Supabase y se auto-refresca
- **URL de autorización**: `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=3531144650908300&redirect_uri=https://argentracker.vercel.app/api/auth/ml/callback`

### 2. API Keys — Seguras
- Las keys están solo en `.env.local` (gitignored) y Vercel env vars
- **5 Gemini keys** para rotación: `GEMINI_API_KEY` a `GEMINI_API_KEY_5`
- **Regla**: NUNCA poner API keys en archivos que van a git

### 3. Gemini Keys 4 y 5 — Formato diferente
- Keys 1-3: prefijo `AIza...` (Google AI Studio)
- Keys 4-5: prefijo `AQ.Ab8RN6...` (formato diferente, verificar si funcionan)
- Si dan error, pueden necesitar ser de Google AI Studio

---

## 🔜 Pasos Inmediatos

1. **Autorizar ML OAuth** — Login en la URL de autorización
2. **Verificar búsqueda real** — Probar con "iPhone 15 Pro" en argentracker.vercel.app
3. **Validar resultados** — Confirmar que:
   - Precios son reales y actuales
   - Links "Ir a la oferta" van a la publicación real de ML (no búsqueda genérica)
   - Thumbnails de productos se muestran
4. **Actualizar frontend** — Mostrar estado de autenticación ML y si los datos son reales/mock

---

## 📊 Progreso General
```
[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░] 75% — Fase 3 en progreso, backend listo para datos reales
```
