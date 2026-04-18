import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones — ArgenTracker",
  description: "Términos y condiciones de uso de ArgenTracker",
};

export default function TermsPage() {
  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "3rem 1.5rem",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: "#e0e0e0",
        backgroundColor: "#0a0a1a",
        minHeight: "100vh",
        lineHeight: 1.7,
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
          background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Términos y Condiciones
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Última actualización: {new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <Section title="1. Aceptación">
        <p>
          Al utilizar ArgenTracker aceptás estos términos. Si no estás de acuerdo,
          no utilices la aplicación.
        </p>
      </Section>

      <Section title="2. Descripción del Servicio">
        <p>
          ArgenTracker es una herramienta gratuita de comparación de precios que
          consulta el catálogo público de MercadoLibre para ayudarte a encontrar el
          mejor precio para un producto determinado. No somos parte de MercadoLibre
          ni estamos afiliados oficialmente a ellos.
        </p>
      </Section>

      <Section title="3. Uso Permitido">
        <ul style={{ paddingLeft: "1.5rem" }}>
          <li>Buscar y comparar precios de productos.</li>
          <li>Utilizar las funciones de análisis de imagen para identificar productos.</li>
          <li>Compartir resultados de búsqueda.</li>
        </ul>
      </Section>

      <Section title="4. Limitaciones">
        <ul style={{ paddingLeft: "1.5rem" }}>
          <li>
            Los precios mostrados son orientativos y pueden cambiar en cualquier
            momento en MercadoLibre.
          </li>
          <li>
            Los impuestos estimados para compras internacionales son aproximaciones
            y pueden diferir del monto final.
          </li>
          <li>
            ArgenTracker no garantiza la disponibilidad de los productos ni la
            confiabilidad de los vendedores.
          </li>
          <li>
            No somos responsables por transacciones realizadas en MercadoLibre a
            partir de los enlaces proporcionados.
          </li>
        </ul>
      </Section>

      <Section title="5. Propiedad Intelectual">
        <p>
          MercadoLibre, sus logos y marcas son propiedad de MercadoLibre S.R.L.
          ArgenTracker es una herramienta independiente que utiliza su API pública
          bajo los términos del programa de desarrolladores.
        </p>
      </Section>

      <Section title="6. Modificaciones">
        <p>
          Podemos modificar estos términos en cualquier momento. El uso continuado
          de ArgenTracker implica aceptación de los términos actualizados.
        </p>
      </Section>

      <Section title="7. Contacto">
        <p>
          Consultas:{" "}
          <a
            href="mailto:contacto@argentracker.com"
            style={{ color: "#60a5fa", textDecoration: "none" }}
          >
            contacto@argentracker.com
          </a>
        </p>
      </Section>

      <footer
        style={{
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid #1e293b",
          fontSize: "0.85rem",
          color: "#666",
          textAlign: "center",
        }}
      >
        © {new Date().getFullYear()} ArgenTracker
      </footer>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "#c4b5fd",
          marginBottom: "0.75rem",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "0.5rem",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: "0.95rem" }}>{children}</div>
    </section>
  );
}
