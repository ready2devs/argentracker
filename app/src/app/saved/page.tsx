import TopNavBar from "@/components/layout/TopNavBar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import type { SavedProduct } from "@/types";

const demoSavedProducts: SavedProduct[] = [
  {
    id: "1",
    product_name: 'MacBook Pro 14" M2 Max',
    brand: "Apple",
    model: "MacBook Pro 14",
    category: "Electronics",
    thumbnail: null,
    last_new_price: 2499000,
    last_used_price: 1850000,
    alert_enabled: true,
    alert_target_price: 2200000,
    price_trend: "down",
    price_change_pct: -15,
    last_checked_at: "2024-10-24T14:28:00Z",
    created_at: "2024-10-01T10:00:00Z",
  },
  {
    id: "2",
    product_name: "Nike Air Zoom Pegasus",
    brand: "Nike",
    model: "Pegasus 41",
    category: "Apparel",
    thumbnail: null,
    last_new_price: 120000,
    last_used_price: 85000,
    alert_enabled: false,
    alert_target_price: null,
    price_trend: "stable",
    price_change_pct: 0,
    last_checked_at: "2024-10-24T13:00:00Z",
    created_at: "2024-10-05T08:00:00Z",
  },
  {
    id: "3",
    product_name: "Sony WH-1000XM5",
    brand: "Sony",
    model: "WH-1000XM5",
    category: "Audio",
    thumbnail: null,
    last_new_price: 398000,
    last_used_price: 310000,
    alert_enabled: true,
    alert_target_price: 350000,
    price_trend: "up",
    price_change_pct: 8,
    last_checked_at: "2024-10-24T13:45:00Z",
    created_at: "2024-10-10T12:00:00Z",
  },
  {
    id: "4",
    product_name: "Nordic Minimalist Watch",
    brand: "Nordic",
    model: "Classic",
    category: "Accessories",
    thumbnail: null,
    last_new_price: 189000,
    last_used_price: 145000,
    alert_enabled: false,
    alert_target_price: null,
    price_trend: "stable",
    price_change_pct: 0,
    last_checked_at: "2024-10-21T10:00:00Z",
    created_at: "2024-10-15T09:00:00Z",
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Electronics": return "laptop_mac";
    case "Apparel": return "steps";
    case "Audio": return "headset_mic";
    case "Accessories": return "watch";
    default: return "category";
  }
}

export default function SavedPage() {
  return (
    <>
      <TopNavBar />
      <div className="flex min-h-screen pt-20 pb-24 md:pb-0">
        {/* Side Nav */}
        <aside className="hidden md:flex flex-col py-8 pr-4 gap-2 h-screen w-64 fixed left-0">
          <div className="px-6 mb-8">
            <h2 className="font-headline font-extrabold text-xl text-primary">
              ArgenTracker
            </h2>
            <p className="text-xs text-on-surface-variant">
              Precision Data Authority
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            <a
              href="/"
              className="flex items-center gap-3 px-6 py-3 text-on-surface-variant hover:bg-surface-container-low rounded-r-full transition-smooth text-sm font-medium"
            >
              <span className="material-symbols-outlined">home</span> Inicio
            </a>
            <a
              href="/history"
              className="flex items-center gap-3 px-6 py-3 text-on-surface-variant hover:bg-surface-container-low rounded-r-full transition-smooth text-sm font-medium"
            >
              <span className="material-symbols-outlined">history</span> Historial
            </a>
            <a
              href="/saved"
              className="flex items-center gap-3 px-6 py-3 bg-primary-fixed/10 text-primary font-semibold rounded-r-full transition-smooth text-sm"
            >
              <span className="material-symbols-outlined filled">bookmark</span>{" "}
              Guardados
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
        <main className="flex-1 md:ml-64 px-6 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h1 className="text-4xl font-extrabold text-primary tracking-tight mb-2 font-headline">
                  Productos Guardados
                </h1>
                <p className="text-on-surface-variant font-medium">
                  Monitoreando {demoSavedProducts.length} productos para detectar fluctuaciones.
                </p>
              </div>
              <button
                id="btn-check-now"
                className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-6 py-3 rounded-full font-bold hover:brightness-95 transition-smooth active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">sync</span>
                Verificar Ahora
              </button>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demoSavedProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-surface-container-lowest rounded-xl p-5 flex flex-col gap-4 group hover:shadow-[var(--shadow-ambient)] transition-smooth"
                >
                  {/* Image Area */}
                  <div className="relative w-full aspect-square bg-surface-container-low rounded-lg overflow-hidden flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-outline-variant">
                      {getCategoryIcon(product.category || "")}
                    </span>

                    {/* Price trend badge */}
                    {product.price_change_pct != null && product.price_change_pct !== 0 && (
                      <div className="absolute top-3 left-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${
                            product.price_trend === "down"
                              ? "bg-tertiary-fixed text-on-tertiary-fixed"
                              : "bg-error-container text-on-error-container"
                          }`}
                        >
                          {product.price_trend === "down" ? "" : "UP "}
                          {(product.price_change_pct ?? 0) > 0 ? "+" : ""}
                          {product.price_change_pct}%
                        </span>
                      </div>
                    )}

                    {/* Favorite */}
                    <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur text-error flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm filled">
                        favorite
                      </span>
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                      {product.category}
                    </span>
                    <h3 className="text-lg font-bold text-on-surface leading-tight">
                      {product.product_name}
                    </h3>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-2 gap-4 py-2 bg-surface-container-low/50 rounded-lg px-3">
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase">
                        Nuevo
                      </p>
                      <p className="text-lg font-extrabold text-primary font-headline">
                        {product.last_new_price
                          ? formatPrice(product.last_new_price)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase">
                        Usado
                      </p>
                      <p className="text-lg font-extrabold text-on-surface-variant font-headline">
                        {product.last_used_price
                          ? formatPrice(product.last_used_price)
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Alert Status */}
                  <div className="flex items-center justify-between mt-2">
                    <div
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold ${
                        product.alert_enabled
                          ? "text-tertiary-fixed-dim bg-tertiary"
                          : "text-on-surface-variant bg-surface-container-highest"
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {product.alert_enabled
                          ? "notifications_active"
                          : "notifications_off"}
                      </span>
                      <span>
                        {product.alert_enabled ? "ALERTA: ACTIVA" : "SIN ALERTAS"}
                      </span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant font-medium italic">
                      {product.last_checked_at
                        ? timeAgo(product.last_checked_at)
                        : "Sin verificar"}
                    </span>
                  </div>
                </div>
              ))}

              {/* Insight Banner */}
              <div className="lg:col-span-2 gradient-cta text-on-primary-container rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center justify-between overflow-hidden relative">
                <div className="relative z-10">
                  <h2 className="text-3xl font-extrabold mb-4 leading-tight text-primary-fixed font-headline">
                    Insights Semanales:
                    <br />
                    <span className="text-primary-fixed-dim">
                      Electrónica en baja
                    </span>
                  </h2>
                  <p className="text-primary-fixed-dim/80 font-medium mb-6 max-w-md">
                    Basado en tus productos guardados, ahora es el momento ideal
                    para comprar hardware. Las tendencias muestran una baja promedio
                    del 4.2% esta semana.
                  </p>
                  <button className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold transition-smooth active:scale-95">
                    Ver Reporte Completo
                  </button>
                </div>

                {/* Mini Chart */}
                <div className="w-full md:w-1/3 aspect-video bg-white/10 backdrop-blur rounded-xl border border-white/5 p-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60 text-primary-fixed-dim">
                      Volatilidad
                    </span>
                    <span className="material-symbols-outlined text-tertiary-fixed">
                      trending_down
                    </span>
                  </div>
                  <div className="h-24 w-full flex items-end gap-1">
                    <div className="w-full bg-primary-fixed/20 h-3/4 rounded-t-sm" />
                    <div className="w-full bg-primary-fixed/20 h-full rounded-t-sm" />
                    <div className="w-full bg-primary-fixed/40 h-2/3 rounded-t-sm" />
                    <div className="w-full bg-primary-fixed/60 h-1/2 rounded-t-sm" />
                    <div className="w-full bg-primary-fixed/80 h-1/3 rounded-t-sm" />
                    <div className="w-full bg-tertiary-fixed h-1/4 rounded-t-sm" />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] font-bold text-primary-fixed-dim">LUN</span>
                    <span className="text-[10px] font-bold text-primary-fixed-dim">HOY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNavBar />
    </>
  );
}
