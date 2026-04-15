"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TopNavBar from "@/components/layout/TopNavBar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Footer from "@/components/layout/Footer";
import type { RankedResult } from "@/types";

interface SearchOutput {
  productName: string;
  results: RankedResult[];
  bestNew: RankedResult | null;
  bestUsed: RankedResult | null;
  avgPrice: number;
  totalResults: number;
  fromCache: boolean;
  durationMs: number;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

function ReputationBar({ level }: { level: string }) {
  const levels: Record<string, number> = {
    platinum: 5, gold: 4, green: 3, yellow: 2, red: 1, unknown: 0,
  };
  const filled = levels[level] || 0;
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-4 h-1 rounded-full ${i < filled ? "bg-tertiary-fixed" : "bg-outline-variant"}`}
        />
      ))}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton h-20 rounded-xl" />
      ))}
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [data, setData] = useState<SearchOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Intentar leer desde sessionStorage (viene de la landing)
    const cached = sessionStorage.getItem("lastSearchResult");
    if (cached) {
      try {
        setData(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {
        /* ignorar */
      }
    }

    // Si no hay cache (acceso directo a /results?q=...) buscar en la API
    if (!query) {
      setError("No hay búsqueda activa. Volvé al inicio.");
      setLoading(false);
      return;
    }

    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, inputType: "url" }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
        else setError(json.error || "Error al buscar.");
      })
      .catch(() => setError("Error de conexión."))
      .finally(() => setLoading(false));
  }, [query]);

  if (loading) return <ResultsSkeleton />;
  if (error) {
    return (
      <div className="py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-error mb-4 block">
          error_outline
        </span>
        <p className="text-on-surface-variant">{error}</p>
        <a href="/" className="mt-4 inline-block text-primary underline">
          Volver al inicio
        </a>
      </div>
    );
  }
  if (!data || !data.results.length) {
    return (
      <div className="py-16 text-center">
        <span className="material-symbols-outlined text-5xl text-outline-variant mb-4 block">
          search_off
        </span>
        <p className="text-on-surface-variant">
          No encontramos resultados para esta búsqueda.
        </p>
        <a href="/" className="mt-4 inline-block text-primary underline">
          Intentar de nuevo
        </a>
      </div>
    );
  }

  const savingsPct = data.bestNew && data.avgPrice
    ? Math.round(((data.avgPrice - data.bestNew.price) / data.avgPrice) * 100)
    : 0;

  const otherResults = data.results.filter(
    (r) => !r.is_best_new && !r.is_best_used
  );

  return (
    <>
      {/* Cache badge */}
      {data.fromCache && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full">
          <span className="material-symbols-outlined text-sm">cached</span>
          Resultado en caché · {data.durationMs}ms
        </div>
      )}

      {/* Product Summary */}
      <section className="mb-12 bg-surface-container-lowest rounded-xl p-6 md:p-8" id="product-summary">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-full md:w-1/3 bg-surface-container rounded-lg flex items-center justify-center p-4 h-48">
            {data.bestNew?.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.bestNew.thumbnail}
                alt={data.productName}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="material-symbols-outlined text-6xl text-outline-variant">
                devices
              </span>
            )}
          </div>
          <div className="w-full md:w-2/3">
            <span className="inline-flex px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full mb-3">
              REFERENCIA · {data.totalResults} resultados
            </span>
            <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
              {data.productName}
            </h2>
            <div className="mt-4">
              <span className="text-sm text-on-surface-variant block mb-1">
                Precio Promedio de Mercado
              </span>
              <span className="text-3xl font-headline font-extrabold text-primary">
                {formatPrice(data.avgPrice)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Best Price Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12" id="best-prices">
        {/* Best New */}
        {data.bestNew && (
          <div className="bg-surface-container-lowest rounded-xl p-8 border-l-8 border-primary relative overflow-hidden group hover:shadow-[var(--shadow-ambient)] transition-smooth">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wider text-primary opacity-70">
                    Mejor Precio NUEVO
                  </span>
                  <h3 className="text-4xl font-headline font-extrabold text-primary mt-1">
                    {formatPrice(data.bestNew.price)}
                  </h3>
                </div>
                {savingsPct > 0 && (
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-lg font-bold text-sm animate-pulse-soft">
                    {savingsPct}% OFF
                  </span>
                )}
              </div>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim">verified_user</span>
                  <span className="text-sm truncate">
                    {data.bestNew.seller_name} · {data.bestNew.seller_reputation}
                  </span>
                </div>
                {data.bestNew.free_shipping && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-tertiary-fixed-dim">local_shipping</span>
                    <span className="text-sm">Envío gratis</span>
                  </div>
                )}
                {data.bestNew.installments_text && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-tertiary-fixed-dim">credit_card</span>
                    <span className="text-sm">{data.bestNew.installments_text}</span>
                  </div>
                )}
              </div>
              <a
                href={data.bestNew.permalink}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-best-new"
                className="w-full py-4 gradient-cta text-on-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-smooth"
              >
                Ir a la oferta
                <span className="material-symbols-outlined">arrow_outward</span>
              </a>
            </div>
          </div>
        )}

        {/* Best Used */}
        {data.bestUsed && (
          <div className="bg-surface-container-lowest rounded-xl p-8 border-l-8 border-on-secondary-container relative overflow-hidden group hover:shadow-[var(--shadow-ambient)] transition-smooth">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wider text-on-secondary-container opacity-70">
                    Mejor Precio USADO
                  </span>
                  <h3 className="text-4xl font-headline font-extrabold text-on-secondary-container mt-1">
                    {formatPrice(data.bestUsed.price)}
                  </h3>
                </div>
                <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-lg font-bold text-sm">
                  RECOMENDADO
                </span>
              </div>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-on-secondary-container">verified_user</span>
                  <span className="text-sm truncate">
                    {data.bestUsed.seller_name} · {data.bestUsed.seller_reputation}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-on-secondary-container">location_on</span>
                  <span className="text-sm">{data.bestUsed.location}</span>
                </div>
              </div>
              <a
                href={data.bestUsed.permalink}
                target="_blank"
                rel="noopener noreferrer"
                id="btn-best-used"
                className="w-full py-4 bg-on-secondary-container text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-smooth"
              >
                Ir a la oferta
                <span className="material-symbols-outlined">chat_bubble</span>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* Other Options */}
      {otherResults.length > 0 && (
        <section className="bg-surface-container-low rounded-2xl p-8" id="other-options">
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
            <div>
              <h3 className="text-2xl font-headline font-bold text-primary">
                Otras opciones recomendadas
              </h3>
              <p className="text-on-surface-variant text-sm mt-1">
                {otherResults.length} alternativas · Ordenadas por score real
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {otherResults.slice(0, 10).map((result) => (
              <a
                key={result.ml_item_id}
                href={result.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-lowest p-5 rounded-xl flex flex-wrap md:flex-nowrap items-center justify-between gap-4 group hover:scale-[1.01] transition-smooth cursor-pointer block"
              >
                <div className="flex items-center gap-4 w-full md:w-1/3">
                  {result.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.thumbnail}
                      alt={result.title}
                      className="w-12 h-12 rounded-lg object-cover bg-surface-container"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${
                        result.condition === "used"
                          ? "bg-secondary-container text-on-secondary-container"
                          : "bg-surface-container text-primary"
                      }`}
                    >
                      ML
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <span className="block text-xs font-bold uppercase text-on-surface-variant">
                      {result.seller_name}
                    </span>
                    <span className="font-semibold text-on-surface text-sm truncate block">
                      {result.title}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-center w-1/2 md:w-1/5">
                  <span className="text-xs text-on-surface-variant mb-1">Condición</span>
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-full ${
                      result.condition === "used"
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-surface-container text-on-surface"
                    }`}
                  >
                    {result.condition === "new" ? "NUEVO" : "USADO"}
                  </span>
                </div>

                <div className="flex flex-col items-start md:items-center w-1/2 md:w-1/5">
                  <span className="text-xs text-on-surface-variant mb-1">Reputación</span>
                  <ReputationBar level={result.seller_reputation} />
                </div>

                <div className="flex flex-col items-end w-full md:w-1/5">
                  <span
                    className={`text-xl font-extrabold ${
                      result.condition === "used"
                        ? "text-on-secondary-container"
                        : "text-primary"
                    }`}
                  >
                    {formatPrice(result.price)}
                  </span>
                  {result.installments_text && (
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {result.installments_text}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default function ResultsPage() {
  return (
    <>
      <TopNavBar />
      <main className="pt-24 pb-20 md:pb-12 px-6 max-w-7xl mx-auto">
        <Suspense fallback={<ResultsSkeleton />}>
          <ResultsPageHeader />
          <ResultsContent />
        </Suspense>
      </main>
      <Footer />
      <BottomNavBar />
    </>
  );
}

function ResultsPageHeader() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "Producto";
  return (
    <header className="mb-10">
      <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-4">
        <a href="/" className="hover:text-primary">Inicio</a>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="font-semibold text-on-surface">Resultados</span>
      </nav>
      <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-primary">
        Resultados para: {decodeURIComponent(q)}
      </h1>
    </header>
  );
}
