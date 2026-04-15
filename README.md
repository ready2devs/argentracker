# ArgenTracker

> Encontrá el mejor precio real en Mercado Libre Argentina, sin anuncios ni algoritmos promocionados.

## Stack
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4
- **Backend**: Next.js Route Handlers (serverless)  
- **DB / Caché**: Supabase (PostgreSQL)
- **Búsqueda**: MercadoLibre Public API
- **Visión**: Gemini 2.5 Flash *(Fase 3)*
- **Deploy**: Vercel (región gru1 — São Paulo)

## Estructura

```
app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── search/route.ts   ← Motor de búsqueda
│   │   │   └── rank/route.ts     ← Ranking de resultados
│   │   ├── page.tsx              ← Landing
│   │   ├── results/              ← Resultados de búsqueda
│   │   ├── history/              ← Historial de búsquedas
│   │   └── saved/                ← Productos guardados
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── orchestrator.ts   ← Coordinador Swarm
│   │   │   ├── price-ranker.ts   ← Scoring (precio/reputación/envío)
│   │   │   └── database-manager.ts ← Supabase CRUD + caché
│   │   ├── mercadolibre/
│   │   │   ├── api.ts            ← ML API connector
│   │   │   ├── normalizer.ts     ← Normalización de títulos
│   │   │   └── mock-data.ts      ← Mock data para desarrollo
│   │   └── supabase/
│   │       ├── client.ts         ← Browser client
│   │       └── admin.ts          ← Server admin client
│   ├── components/
│   │   ├── layout/               ← TopNavBar, BottomNavBar, Footer
│   │   └── search/               ← SearchInput, ScreenshotUpload
│   └── types/index.ts            ← TypeScript definitions
└── supabase_schema.sql           ← Schema SQL completo
```

## Variables de entorno

Crear `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ML_CLIENT_ID=...
ML_CLIENT_SECRET=...
ML_SITE_ID=MLA
GEMINI_API_KEY=...
```

## Desarrollo local

```bash
cd app
npm install
npm run dev
```

En desarrollo usa **mock data** automáticamente (ML bloquea IPs de servidor local).  
En producción (Vercel) usa la **API real de MercadoLibre**.

## Deploy

```bash
# 1. Push a GitHub
git add .
git commit -m "feat: Fase 2 - Motor de búsqueda"
git push

# 2. Import en vercel.com → seleccionar /app como root directory
# 3. Configurar env vars en Vercel Dashboard
```

## Roadmap

- [x] Fase 1 — Fundación (UI, Design System, páginas)
- [x] Fase 2 — Motor de búsqueda (ML API, ranking, caché Supabase)
- [ ] Fase 3 — Visión multimodal (Gemini)
- [ ] Fase 4 — Auth + historial + alertas
- [ ] Fase 5 — Deploy + optimización
