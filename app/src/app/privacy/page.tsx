import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — ArgenTracker",
  description: "Política de privacidad y protección de datos de ArgenTracker",
};

export default function PrivacyPolicyPage() {
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
        Política de Privacidad
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Última actualización: {new Date().toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <Section title="1. Información General">
        <p>
          <strong>ArgenTracker</strong> es una herramienta de comparación de precios
          para el mercado argentino. La aplicación utiliza la API pública de MercadoLibre
          para buscar y comparar precios de productos, ayudando a los usuarios a encontrar
          las mejores ofertas.
        </p>
        <p>
          Esta política describe cómo recopilamos, utilizamos y protegemos la información
          de nuestros usuarios.
        </p>
      </Section>

      <Section title="2. Datos que Recopilamos">
        <p>ArgenTracker recopila la mínima información necesaria para funcionar:</p>
        <ul style={{ paddingLeft: "1.5rem" }}>
          <li>
            <strong>Consultas de búsqueda:</strong> Los términos que ingresás para buscar
            productos. Se almacenan temporalmente en caché para mejorar la velocidad de
            respuesta.
          </li>
          <li>
            <strong>Capturas de pantalla (opcional):</strong> Si usás la función de
            análisis por imagen, la imagen se procesa en tiempo real y no se almacena
            permanentemente.
          </li>
          <li>
            <strong>Datos de autenticación OAuth:</strong> Al vincular tu cuenta de
            MercadoLibre, recibimos un token de acceso temporal. No almacenamos tu
            contraseña ni datos personales de tu cuenta.
          </li>
        </ul>
      </Section>

      <Section title="3. Datos que NO Recopilamos">
        <ul style={{ paddingLeft: "1.5rem" }}>
          <li>No recopilamos datos personales identificables (nombre, DNI, dirección).</li>
          <li>No almacenamos credenciales de MercadoLibre.</li>
          <li>No rastreamos la actividad de navegación fuera de ArgenTracker.</li>
          <li>No compartimos datos con terceros para fines publicitarios.</li>
          <li>No utilizamos cookies de seguimiento de terceros.</li>
        </ul>
      </Section>

      <Section title="4. Uso de la API de MercadoLibre">
        <p>
          ArgenTracker accede a la API de MercadoLibre exclusivamente para:
        </p>
        <ul style={{ paddingLeft: "1.5rem" }}>
          <li>Buscar productos en el catálogo público.</li>
          <li>Obtener precios, condiciones y datos de envío de publicaciones activas.</li>
          <li>Comparar precios entre vendedores nacionales e internacionales.</li>
        </ul>
        <p>
          No realizamos compras, publicaciones ni modificaciones en cuentas de usuarios.
          El acceso es de solo lectura.
        </p>
      </Section>

      <Section title="5. Almacenamiento y Seguridad">
        <p>
          Los datos temporales se almacenan en servidores seguros de Supabase
          (PostgreSQL) con encriptación en tránsito (TLS) y en reposo. Los tokens de
          acceso de MercadoLibre se renuevan automáticamente y expiran según los
          tiempos definidos por la plataforma.
        </p>
        <p>
          El caché de búsquedas tiene una duración máxima de 30 minutos, después de lo
          cual los datos se eliminan automáticamente.
        </p>
      </Section>

      <Section title="6. Derechos del Usuario">
        <p>Tenés derecho a:</p>
        <ul style={{ paddingLeft: "1.5rem" }}>
          <li>Desvincular tu cuenta de MercadoLibre en cualquier momento.</li>
          <li>
            Solicitar la eliminación de cualquier dato asociado a tu uso de la
            aplicación.
          </li>
          <li>Acceder a la información que ArgenTracker tenga sobre vos.</li>
        </ul>
      </Section>

      <Section title="7. Cambios en la Política">
        <p>
          Nos reservamos el derecho de actualizar esta política. Los cambios
          significativos serán notificados a través de la aplicación. El uso continuado
          de ArgenTracker después de los cambios constituye aceptación de la política
          actualizada.
        </p>
      </Section>

      <Section title="8. Contacto">
        <p>
          Para consultas sobre privacidad o solicitudes de datos, podés contactarnos en:{" "}
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
        © {new Date().getFullYear()} ArgenTracker — Herramienta de ahorro para el
        mercado argentino.
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
