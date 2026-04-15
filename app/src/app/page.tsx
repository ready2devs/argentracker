"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopNavBar from "@/components/layout/TopNavBar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import Footer from "@/components/layout/Footer";
import SearchInput from "@/components/search/SearchInput";
import ScreenshotUpload from "@/components/search/ScreenshotUpload";

type SearchStep = "idle" | "searching" | "done" | "error";

interface MLAuthStatus {
  isAuthenticated: boolean;
  userId: string | null;
}

const STEP_LABELS: Record<string, string> = {
  idle: "",
  searching: "Buscando en Mercado Libre…",
  done: "¡Listo! Redirigiendo…",
  error: "",
};

export default function LandingPage() {
  const router = useRouter();
  const [step, setStep] = useState<SearchStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [mlAuth, setMlAuth] = useState<MLAuthStatus | null>(null);
  const isLoading = step === "searching" || step === "done";

  const [mlAuthError, setMlAuthError] = useState(false);

  // Verificar auth status al cargar
  useEffect(() => {
    fetch("/api/auth/ml/status")
      .then((r) => r.json())
      .then(setMlAuth)
      .catch(() => setMlAuth({ isAuthenticated: false, userId: null }));

    // Detectar resultado del redirect OAuth
    const url = new URL(window.location.href);
    if (url.searchParams.get("ml_auth") === "error") {
      setMlAuthError(true);
    }
    if (url.searchParams.has("ml_auth")) {
      url.searchParams.delete("ml_auth");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleSearch = async (
    query: string,
    inputType: "url" | "screenshot" = "url"
  ) => {
    setStep("searching");
    setProgress(20);
    setErrorMsg("");

    try {
      setProgress(50);
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, inputType }),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Error del servidor.");

      setProgress(90);
      setStep("done");
      setProgress(100);

      sessionStorage.setItem("lastSearchResult", JSON.stringify(json.data));
      router.push(`/results?q=${encodeURIComponent(query)}`);
    } catch (err) {
      setStep("error");
      setProgress(0);
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido.");
    }
  };

  const handleUrlSearch = (input: string) => {
    const mlMatch = input.match(/mercadolibre\.com\.ar\/[^/]+\/([^/?#]+)/);
    const query = mlMatch
      ? decodeURIComponent(mlMatch[1]).replace(/-/g, " ").trim()
      : input.trim();
    handleSearch(query, "url");
  };

  const handleScreenshotUpload = (file: File) => {
    const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
    handleSearch(name, "screenshot");
  };

  return (
    <>
      <TopNavBar />
      <main className="pt-24 pb-20 md:pb-0">

        {/* Hero */}
        <section className="relative px-6 py-16 lg:py-32 hero-gradient overflow-hidden" id="hero-section">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <h1 className="text-5xl lg:text-7xl font-extrabold font-headline text-primary leading-tight tracking-tight">
                Ahorrá tiempo y plata en Mercado Libre
              </h1>
              <p className="text-xl text-on-surface-variant max-w-xl leading-relaxed">
                Subí una captura o pegá el link y nosotros encontramos el mejor
                precio real, sin vueltas ni anuncios.
              </p>

              <div className="space-y-4">
                {/* Error banner OAuth ML */}
                {mlAuthError && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm bg-error-container text-on-error-container">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">error</span>
                      <span>No se pudo conectar con ML. Probá con otra cuenta de MercadoLibre.</span>
                    </div>
                    <button onClick={() => setMlAuthError(false)}>
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                )}

                {/* ML Auth Banner */}
                {mlAuth !== null && (
                  <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    mlAuth.isAuthenticated
                      ? "bg-tertiary-fixed/20 text-primary border border-tertiary-fixed/30"
                      : "bg-surface-container border border-outline-variant"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-lg ${
                        mlAuth.isAuthenticated ? "text-tertiary-fixed-dim" : "text-outline"
                      }`}>
                        {mlAuth.isAuthenticated ? "verified" : "link"}
                      </span>
                      <span className={mlAuth.isAuthenticated ? "text-primary" : "text-on-surface-variant"}>
                        {mlAuth.isAuthenticated
                          ? `✅ Conectado a Mercado Libre — búsqueda en tiempo real`
                          : "Conectá tu cuenta de ML para ver precios reales"}
                      </span>
                    </div>
                    {mlAuth.isAuthenticated ? (
                      <a href="/api/auth/ml/logout"
                        className="text-xs text-outline hover:text-error transition-colors whitespace-nowrap">
                        Desconectar
                      </a>
                    ) : (
                      <a href="/api/auth/ml/login" id="btn-ml-connect"
                        className="flex items-center gap-1 px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 transition-smooth whitespace-nowrap">
                        <span className="material-symbols-outlined text-sm">login</span>
                        Conectar ML
                      </a>
                    )}
                  </div>
                )}

                <SearchInput onSearch={handleUrlSearch} isLoading={isLoading} />
                <ScreenshotUpload onUpload={handleScreenshotUpload} isLoading={isLoading} />

                {/* Status feedback */}
                {step !== "idle" && (
                  <div className={`flex flex-col gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-smooth ${
                    step === "error"
                      ? "bg-error-container text-on-error-container"
                      : "bg-primary-fixed/20 text-primary"
                  }`}>
                    <div className="flex items-center gap-3">
                      {step === "error" ? (
                        <span className="material-symbols-outlined text-lg">error</span>
                      ) : step === "done" ? (
                        <span className="material-symbols-outlined text-lg text-tertiary-fixed-dim">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      )}
                      <span className="flex-1">
                        {step === "error" ? errorMsg : STEP_LABELS[step]}
                      </span>
                      {step === "error" && (
                        <button onClick={() => { setStep("idle"); setProgress(0); }}>
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      )}
                    </div>
                    {step !== "error" && (
                      <div className="w-full bg-primary-fixed/20 rounded-full h-1">
                        <div
                          className="bg-primary h-1 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Floating card */}
            <div className="hidden lg:block lg:col-span-5">
              <div className="relative bg-surface-container-lowest rounded-2xl p-6 rotate-3"
                style={{ boxShadow: "0px 16px 48px rgba(24, 28, 29, 0.12)" }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-tertiary-fixed">trending_down</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-outline uppercase tracking-widest">Alerta de ahorro</p>
                    <p className="font-headline font-bold text-primary">¡Precio histórico más bajo!</p>
                  </div>
                </div>
                <div className="w-full h-48 bg-surface-container rounded-lg mb-4 flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-outline-variant">devices</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-on-surface-variant">Precio Actual</p>
                    <p className="text-2xl font-extrabold font-headline text-primary">$45.299</p>
                  </div>
                  <div className="bg-tertiary-fixed px-3 py-1 rounded-full text-xs font-bold text-on-tertiary-fixed animate-pulse-soft">
                    -15% HOY
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="py-24 px-6 bg-surface-container-low" id="how-it-works">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 text-center">
              <h2 className="text-3xl lg:text-4xl font-extrabold font-headline text-primary mb-4">Cómo funciona</h2>
              <p className="text-on-surface-variant">Tres pasos simples para dejar de pagar de más.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { n: "01", icon: "add_photo_alternate", title: "Subir", desc: "Subí una captura del producto o pegá el link directo.", color: "text-primary" },
                { n: "02", icon: "query_stats", title: "Analizar", desc: "Nuestro motor busca en tiempo real variaciones de precio y vendedores alternativos.", color: "text-primary" },
                { n: "03", icon: "verified", title: "Ahorrar", desc: "Elegí la mejor opción y ahorrá hasta un 40% en tus compras.", color: "text-tertiary" },
              ].map((s) => (
                <div key={s.n} className="bg-surface-container-lowest p-8 rounded-xl relative hover:shadow-[var(--shadow-ambient)] transition-smooth">
                  <div className="text-primary-fixed-dim font-extrabold text-6xl opacity-20 absolute top-4 right-8 font-headline">{s.n}</div>
                  <span className={`material-symbols-outlined text-4xl ${s.color} mb-6 block filled`}>{s.icon}</span>
                  <h3 className="text-xl font-bold font-headline mb-3">{s.title}</h3>
                  <p className="text-on-surface-variant leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento */}
        <section className="py-24 px-6 bg-surface" id="bento-section">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 gradient-cta p-10 rounded-2xl flex flex-col justify-between min-h-[400px]">
              <div>
                <h2 className="text-4xl font-extrabold font-headline mb-4 leading-tight text-primary-fixed">
                  Precios reales,<br />sin manipulación.
                </h2>
                <p className="text-primary-fixed-dim/80 max-w-md text-lg">
                  Ignoramos el &quot;tachado&quot; falso. Te mostramos el historial real para que sepas si una oferta es de verdad.
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex -space-x-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-primary-container bg-outline-variant" />
                  ))}
                </div>
                <p className="text-sm font-medium text-primary-fixed-dim">+15k usuarios ahorrando hoy</p>
              </div>
            </div>
            <div className="lg:col-span-4 bg-tertiary text-on-tertiary p-10 rounded-2xl flex flex-col justify-center items-center text-center">
              <span className="material-symbols-outlined text-6xl text-tertiary-fixed mb-4">bolt</span>
              <h3 className="text-2xl font-extrabold font-headline mb-2">Ultra Rápido</h3>
              <p className="text-tertiary-fixed/80">Resultados en menos de 2 segundos.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNavBar />
    </>
  );
}
