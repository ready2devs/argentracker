import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full mt-auto bg-surface-container-low" id="footer">
      <div className="flex flex-col md:flex-row justify-between items-center px-8 py-12 gap-4 max-w-7xl mx-auto">
        <div className="flex flex-col gap-2">
          <span className="font-headline font-extrabold text-primary text-xl">
            ArgenTracker
          </span>
          <p className="text-sm text-on-surface-variant">
            © {new Date().getFullYear()} ArgenTracker. Monitoreo independiente de
            precios para Argentina.
          </p>
        </div>

        <div className="flex gap-8">
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary text-sm underline underline-offset-4 transition-smooth"
          >
            Acerca de
          </Link>
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary text-sm underline underline-offset-4 transition-smooth"
          >
            Términos
          </Link>
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary text-sm underline underline-offset-4 transition-smooth"
          >
            Privacidad
          </Link>
          <Link
            href="#"
            className="text-on-surface-variant hover:text-primary text-sm underline underline-offset-4 transition-smooth"
          >
            Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}
