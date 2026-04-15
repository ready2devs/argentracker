"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Explorar", href: "/", id: "nav-explore" },
  { label: "Historial", href: "/history", id: "nav-history" },
  { label: "Guardados", href: "/saved", id: "nav-saved" },
];

export default function TopNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav" id="top-nav">
      <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
        {/* Logo + Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-primary font-headline">
              ArgenTracker
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.id}
                  id={item.id}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary border-b-2 border-primary pb-1"
                      : "text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            id="btn-notifications"
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-smooth"
            aria-label="Notificaciones"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button
            id="btn-account"
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-smooth"
            aria-label="Cuenta"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
