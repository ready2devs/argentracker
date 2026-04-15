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
- [x] `ScreenshotUpload` reescrito con estados: idle / analyzing / retrying / done / error
- [x] Auto-retry con countdown 30s en caso de 429 quota
- [x] Modelo: `gemini-2.5-flash-lite` (stable ID, v1 API, alto RPM)
  - ⚠️ El preview `-04-17` fue shut down — usar el stable sin fecha
  - ⚠️ `gemini-2.0-flash` también funciona como fallback
- [x] Rotación automática de 3 API keys (429 → siguiente key)
- [x] Variables en `.env.local`:
  - `GEMINI_API_KEY` (key1)
  - `GEMINI_API_KEY_2` (key2)
  - `GEMINI_API_KEY_3` (key3)
- [x] **En Vercel**: verificar que GEMINI_API_KEY_2 y _3 estén agregadas

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

### 1. 🚨 API Keys REVOCADAS por Google
- Google detectó las keys en el repo público y las revocó automáticamente
- Error: `403 PERMISSION_DENIED — API key was reported as leaked`
- **Acción**: Generar 3 keys nuevas en [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- **Actualizar**: `.env.local` + Vercel Environment Variables
- **Regla**: NUNCA más poner keys en archivos que van a git

### 2. Gemini Vision — Modelo y Rate Limits
- **Modelo final**: `gemini-2.5-flash-lite` (stable, alto RPM, soporta imágenes)
- El preview `-04-17` fue SHUT DOWN por Google — usar el stable sin fecha
- `gemini-2.0-flash` también funciona como fallback

### 2. ML OAuth → App en modo "test"
- **Causa**: ML requiere certificación para producción
- **Fix**: Solicitar producción en developers.mercadolibre.com.ar
- **Workaround actual**: Mock data funcional con links reales a ML

---

## 🔜 Próximos Pasos — Mañana

1. **🚨 Generar 3 API keys nuevas** en AI Studio (las actuales fueron revocadas)
2. **Actualizar `.env.local`** y **Vercel** con las keys nuevas
3. **Probar Vision** con las keys nuevas
4. **Agregar más API keys** de otras cuentas si se quiere más capacidad
5. **ML Certificación**: Completar el formulario de seguridad en ML Developers
6. **Supabase cache**: Guardar resultados de búsqueda para evitar re-fetch
7. **ML API real**: Conectar búsquedas reales una vez resuelto el OAuth

---

## 📊 Progreso General
```
[▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░] 60% — Fase 1+2+3 implementadas, Vision pendiente verificación
```
