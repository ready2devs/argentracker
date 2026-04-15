# 🛰️ Argentracker - Configuración de Agentes y Reglas

Este archivo es la "Constitución" del proyecto. Define el objetivo, las rutas a la biblioteca local, la arquitectura multi-agente y las reglas de negocio.

## 🎯 Objetivo del Proyecto
**Argentracker** es una herramienta de ahorro para el mercado argentino. Su misión es encontrar el mejor precio real (Nuevo y Usado) en Mercado Libre, eliminando sesgos de anuncios y algoritmos promocionados, entregando links directos al usuario a partir de una captura de pantalla o URL.

## 📂 Biblioteca de Skills Local
# Ruta raíz absoluta verificada
skills_library_path: "C:\Users\Luciano\Workspace\antigravity\BIBLIOTECA-Principal"

## 🤖 Arquitectura Swarm (Orquestación Multi-Agente)
El sistema debe coordinar estos 4 roles especializados:
1. **Argentracker-Orchestrator:** Coordina el flujo y aplica lógica de decisiones (scoring, ranking).
2. **Vision-Extractor:** Usa `computer-vision-expert` + `gemini-api-dev` + Gemini 2.5 Flash para procesar capturas [Ref 4].
3. **Scraping-Searcher:** Usa `browser-automation` para buscar en ML con tácticas [Ref 15, 16]. Preferencia: API pública primero, browser como fallback.
4. **Database-Manager:** Usa `postgresql` + `postgres-best-practices` para gestionar el caché en Supabase.

## 🛠️ Habilidades Activadas (Rutas reales verificadas)

### Desarrollo & Orquestación
- **skills/skills/context-claude/skill-creator**: Para instanciar agentes.
- **skills/skills/code-quality/systematic-debugging**: Para resolver fallos en selectores.

### Web & Scraping
- **skills/skills/automation-tools/browser-automation**: (SCRAPING) Motor de navegación y extracción.
- **skills/skills/automation-tools/apify-ultimate-scraper**: Scraping avanzado (fallback).

### Frontend & UI
- **skills/skills/web-frontend/frontend-design**: Diseño general del frontend.
- **skills/skills/web-frontend/stitch-ui-design**: Design System Stitch (componentes obligatorios).
- **skills/skills/web-frontend/nextjs-app-router-patterns**: Patrones Next.js App Router.
- **skills/skills/web-frontend/nextjs-supabase-auth**: Autenticación con Supabase.

### Base de Datos
- **skills/skills/databases/postgresql**: Gestión de PostgreSQL en Supabase.
- **skills/skills/databases/postgres-best-practices**: Optimización y buenas prácticas.

### IA & Visión
- **skills/skills/ai-ml/computer-vision-expert**: Procesamiento de capturas de pantalla.
- **skills/skills/ai-ml/gemini-api-dev**: Integración con Gemini API (visión multimodal).

## 🎨 Design System (Stitch)
- **Base Visual:** Carpeta local `./stitch_screens/`.
- **Design Tokens:** `./stitch_screens/design_system.json` — Sistema "Argento Moderno".
- **Regla:** Es obligatorio reutilizar los componentes y estilos de Stitch. No generar CSS nuevo si el sistema importado ya lo cubre.

## 🤖 Glosario de Referencias Lógicas [Ref]
* **[1] Mejor Precio Nuevo:** Publicaciones `condition: new`, filtrando anuncios.
* **[2] Mejor Precio Usado:** Publicaciones `condition: used`, validando reputación.
* **[4] Visión Multimodal:** Uso de Gemini para extraer datos desde screenshots.
* **[10] Normalización:** Algoritmo para agrupar publicaciones del mismo modelo exacto.
* **[15] Rotación de Headers:** Cambio de User-Agent para evitar bloqueos.
* **[16] Humanización (Delay):** Pausas aleatorias (1.5s - 4s) para simular navegación humana.