"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Explorar", href: "/", icon: "explore", id: "mobile-explore" },
  { label: "Historial", href: "/history", icon: "history", id: "mobile-history" },
  { label: "Guardados", href: "/saved", icon: "bookmark", id: "mobile-saved" },
  { label: "Cuenta", href: "/account", icon: "person", id: "mobile-account" },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-3 pb-6 glass-nav z-50 rounded-t-2xl"
      id="bottom-nav"
      style={{ boxShadow: "0 -8px 24px rgba(24, 28, 29, 0.04)" }}
    >
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
            className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-smooth ${
              isActive
                ? "bg-primary-fixed/20 text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span
              className={`material-symbols-outlined ${isActive ? "filled" : ""}`}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider mt-1">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
