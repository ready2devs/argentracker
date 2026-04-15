# 🛰️ Argentracker — Session State

## 📅 Sesión Actual
- **Fecha**: 2026-04-15 03:46 (ART)
- **Fase**: ✅ FASE 2 COMPLETADA → En Fase 3 (Gemini Vision)
- **Estado**: Backend ML + Gemini Vision implementados. Deploy activo en Vercel.

---

## ✅ Completado Esta Sesión

### Fase 1 — Fundación (sesión anterior)
- [x] Proyecto Next.js 16 inicializado y desplegado en Vercel
- [x] Design System "Argento Moderno" (40+ tokens)
- [x] 4 páginas: Landing, Results, History, Saved
- [x] Componentes: TopNavBar, BottomNavBar, SearchInput, ScreenshotUpload

### Fase 2 — Backend ML
- [x] `/api/search` — Motor de búsqueda con fallback a mock data
- [x] `/api/rank` — Rankeador de precios
- [x] Mock data calibrada con precios reales ARS (iPhone 15 Pro ~$1.1M-2.1M)
- [x] Links de "Ir a la oferta" → búsquedas reales en ML filtradas por condición + precio asc
- [x] ML OAuth Authorization Code flow (`/api/auth/ml/*`)
  - ⚠️ **BLOQUEADO**: App en modo "test" en ML Developers. Solo cuentas whitelisteadas pueden autorizarse.
  - Solución pendiente: Solicitar certificación en ML Developers Portal

### Fase 3 — Gemini Vision (NUEVA)
- [x] `/api/vision` — Endpoint que recibe imagen base64 y devuelve producto detectado
- [x] `ScreenshotUpload` reescrito con estados: idle / analyzing / done / error
- [x] Modelo: `gemini-2.0-flash` via v1 API (native fetch — SDK atado a v1beta)
- [x] Rotación automática de 3 API keys (429 → siguiente key)
- [x] Variables agregadas a `.env.local`:
  - `GEMINI_API_KEY` = AIzaSyDFLllLUismgB1w2pJ-eFTTFPpZgpi3lCM
  - `GEMINI_API_KEY_2` = AIzaSyArONj58rjdlmdDuQ0OneSLBhuk5VWur0M
  - `GEMINI_API_KEY_3` = AIzaSyAAYWPDZPwCigpc66Z5P3BOzjbDxX75sVs
- [x] **En Vercel**: agregar las 3 keys en Settings → Environment Variables

---

## 🔑 Variables de Entorno en Vercel (verificar todas presentes)

| Variable | Estado |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `ML_CLIENT_ID` | ✅ |
| `ML_CLIENT_SECRET` | ✅ |
| `ML_REDIRECT_URI` | ✅ |
| `GEMINI_API_KEY` | ✅ |
| `GEMINI_API_KEY_2` | ⚠️ Verificar |
| `GEMINI_API_KEY_3` | ⚠️ Verificar |

---

## ⚠️ Issues Conocidos

### 1. Gemini Vision → 429 Quota (en testing)
- **Causa**: Tests intensivos agotaron el rate limit de las 3 keys (free tier = 15 RPM)
- **Fix**: Esperar 1-2 min sin tests. En uso normal (1 req/usuario) nunca se satura.
- **Modelos disponibles con AI Studio free keys**: solo `gemini-2.0-flash` (v1 API)
- **Gemini 2.5 preview** requiere paid tier o Workspace — da 404 con estas keys.

### 2. ML OAuth → App en modo "test"
- **Causa**: ML requiere certificación para producción (proceso manual en su portal)
- **Fix**: Solicitar producción en developers.mercadolibre.com.ar → Tu App → Seguridad
- **Workaround actual**: Mock data funcional con links reales a ML

---

## 🔜 Próximos Pasos — Fase 3 Continuación

1. **Verificar Vision en uso real** (abrir app, subir captura, esperar quota reset)
2. **ML Certificación**: Completar el formulario de seguridad en ML Developers
3. **Cloudflare Worker proxy**: Para bypass del bloqueo 403 de ML API sin OAuth
4. **Supabase cache**: Guardar resultados de búsqueda para evitar re-fetch

---

## 📊 Progreso General
```
[▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░] 60% — Fase 1+2+3 implementadas, Vision pendiente verificación
```
