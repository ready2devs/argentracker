# 🛰️ Argentracker — Session State

## 📅 Sesión Actual
- **Fecha**: 2026-04-15 04:19 (ART)
- **Fase**: ✅ FASE 2 COMPLETADA → Listo para Fase 3
- **Estado**: Frontend + Gemini Vision + Mock data funcionando en Vercel.

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
  - Modelo: `gemini-2.5-flash-lite` (stable ID, v1 API, alto RPM)
  - Fallback: `gemini-2.0-flash` también funciona
  - Rotación automática de 3 API keys en caso de 429
  - Auto-retry con countdown de 30s en el frontend
- [x] ML OAuth flow (`/api/auth/ml/*`) — implementado pero bloqueado (app en modo test)
- [x] Mock data calibrada con precios reales ARS
- [x] Links "Ir a la oferta" → búsquedas en ML filtradas por condición + precio

### ✅ Verificado en producción
- Gemini Vision detectó correctamente "Celular iPhone 15 Pro 128 GB" desde una captura
- Resultados se muestran con precio promedio, mejor nuevo, mejor usado
- UI responsive y funcional en argentracker.vercel.app

---

## ⚠️ Issues Conocidos

### 1. API Keys — Regeneradas
- Las keys originales fueron revocadas por Google (detectadas en historial git público)
- ✅ Ya se generaron 3 keys nuevas y se cargaron en `.env.local` + Vercel
- **Regla**: NUNCA poner API keys en archivos que van a git

### 2. Links "Ir a la oferta" → Listado genérico de ML
- Actualmente los links llevan a una búsqueda general en ML (incluye fundas, accesorios, etc.)
- **Causa**: Son URLs de búsqueda del mock data, no links directos a publicaciones
- **Fix**: Fase 3 — conectar ML API real para obtener links directos al producto más barato

### 3. ML OAuth → App en modo "test"
- ML requiere certificación para producción
- Workaround actual: Mock data funcional

---

## 🔜 Próximos Pasos — Fase 3 (Motor de Búsqueda Real)

1. **Conectar ML API real** — Reemplazar mock data con búsquedas reales en ML
   - Usar API pública de ML (no requiere OAuth para búsqueda)
   - Obtener links directos a publicaciones (no búsquedas genéricas)
   - Filtrar por categoría para excluir fundas/accesorios
2. **Normalización de resultados** — Agrupar publicaciones del mismo producto exacto
3. **Imágenes reales** — Mostrar thumbnails de los productos desde ML
4. **Supabase cache** — Guardar resultados para evitar re-fetch
5. **ML Certificación** — Solicitar modo producción para OAuth

---

## 📊 Progreso General
```
[▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░] 60% — Fase 1+2 completadas, mock data + Vision funcionando
```
