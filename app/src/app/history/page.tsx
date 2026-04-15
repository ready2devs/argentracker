import TopNavBar from "@/components/layout/TopNavBar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import type { SearchRecord } from "@/types";

const demoHistory: SearchRecord[] = [
  {
    id: "1",
    product_name: "PlayStation 5 Slim 1TB Console",
    brand: "Sony",
    model: "PS5 Slim",
    category: "Electronics",
    input_type: "url",
    best_new_price: 1250000,
    best_new_url: "#",
    best_new_seller: "Electrosale AR",
    best_used_price: 980000,
    best_used_url: "#",
    best_used_seller: "Julian G.",
    avg_market_price: 1240000,
    total_results: 48,
    created_at: "2024-10-24T14:30:00Z",
  },
  {
    id: "2",
    product_name: "iPhone 15 Pro Max 256GB",
    brand: "Apple",
    model: "iPhone 15 Pro Max",
    category: "Smartphones",
    input_type: "screenshot",
    best_new_price: 2450000,
    best_new_url: "#",
    best_new_seller: "iPoint AR",
    best_used_price: 1890000,
    best_used_url: "#",
    best_used_seller: "MercadoTech",
    avg_market_price: 2200000,
    total_results: 65,
    created_at: "2024-10-22T09:15:00Z",
  },
  {
    id: "3",
    product_name: "Nike Air Max 270 React",
    brand: "Nike",
    model: "Air Max 270",
    category: "Footwear",
    input_type: "url",
    best_new_price: 185000,
    best_new_url: "#",
    best_new_seller: "Nike Store AR",
    best_used_price: 110000,
    best_used_url: "#",
    best_used_seller: "SneakerHead BA",
    avg_market_price: 165000,
    total_results: 33,
    created_at: "2024-10-19T18:45:00Z",
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  return (
    <>
      <TopNavBar />
      <div className="flex max-w-7xl mx-auto pt-20 pb-24 md:pb-8">
        {/* Side Nav */}
        <aside className="hidden md:flex flex-col py-8 pr-4 gap-2 h-[calc(100vh-80px)] w-64 sticky top-20">
          <div className="px-4 mb-8">
            <h2 className="font-headline font-extrabold text-xl text-primary">
              ArgenTracker
            </h2>
            <p className="text-on-surface-variant text-xs">
              Precision Data Authority
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            <a
              href="/"
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low rounded-r-full transition-smooth text-sm font-medium"
            >
              <span className="material-symbols-outlined">home</span> Inicio
            </a>
            <a
              href="/history"
              className="flex items-center gap-3 px-4 py-3 bg-primary-fixed/10 text-primary font-semibold rounded-r-full transition-smooth text-sm"
            >
              <span className="material-symbols-outlined">history</span> Historial
            </a>
            <a
              href="/saved"
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low rounded-r-full transition-smooth text-sm font-medium"
            >
              <span className="material-symbols-outlined">bookmark</span> Guardados
            </a>
          </nav>
          <div className="mt-auto px-4">
            <a
              href="/"
              className="w-full gradient-cta text-on-primary py-3 rounded-xl font-headline font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-smooth"
            >
              <span className="material-symbols-outlined">add</span>
              Nueva Búsqueda
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-8 py-8">
          <header className="mb-10">
            <h1 className="text-4xl font-headline font-extrabold text-primary mb-2">
              Historial de Búsquedas
            </h1>
            <p className="text-on-surface-variant">
              Seguí el rastro de tus consultas y snapshots de precios.
            </p>
          </header>

          {/* Search & Filter */}
          <section className="mb-8 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-on-surface-variant">
                  search
                </span>
              </div>
              <input
                id="history-search"
                type="text"
                placeholder="Buscar por nombre de producto..."
                className="block w-full pl-11 pr-4 py-3 bg-surface-container-highest border-none rounded-full text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-6 py-3 bg-surface-container-low text-on-surface rounded-full font-medium text-sm hover:bg-surface-container-high transition-smooth">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filtrar
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-surface-container-low text-on-surface rounded-full font-medium text-sm hover:bg-surface-container-high transition-smooth">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Últimos 30 días
              </button>
            </div>
          </section>

          {/* History List */}
          <div className="flex flex-col gap-4">
            {demoHistory.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-lowest rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 group transition-smooth hover:shadow-[var(--shadow-ambient)]"
              >
                {/* Thumbnail */}
                <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden shrink-0 bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-outline-variant">
                    {item.category === "Electronics"
                      ? "sports_esports"
                      : item.category === "Smartphones"
                        ? "smartphone"
                        : "steps"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {item.category}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <h3 className="text-xl font-headline font-bold text-on-surface mb-4">
                    {item.product_name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-low p-3 rounded-lg">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">
                        Mejor Precio Nuevo
                      </p>
                      <p className="text-lg font-headline font-extrabold text-primary">
                        {item.best_new_price
                          ? formatPrice(item.best_new_price)
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-tertiary/5 p-3 rounded-lg">
                      <p className="text-[10px] font-bold text-tertiary uppercase mb-1">
                        Mejor Precio Usado
                      </p>
                      <p className="text-lg font-headline font-extrabold text-tertiary-fixed-dim">
                        {item.best_used_price
                          ? formatPrice(item.best_used_price)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                  <button
                    className="flex-1 md:flex-none p-3 bg-secondary-container text-on-secondary-container rounded-lg hover:opacity-90 transition-smooth flex items-center justify-center"
                    aria-label="Ver detalles"
                  >
                    <span className="material-symbols-outlined">visibility</span>
                  </button>
                  <button
                    className="flex-1 md:flex-none p-3 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container-highest transition-smooth flex items-center justify-center"
                    aria-label="Actualizar búsqueda"
                  >
                    <span className="material-symbols-outlined">refresh</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Load More */}
            <button className="mt-4 py-4 w-full border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant font-bold hover:bg-surface-container-low transition-smooth">
              Ver búsquedas anteriores
            </button>
          </div>
        </main>
      </div>

      <BottomNavBar />
    </>
  );
}
