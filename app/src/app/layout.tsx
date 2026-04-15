import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-headline",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArgenTracker | Ahorrá en Mercado Libre",
  description:
    "Encontrá el mejor precio real en Mercado Libre Argentina. Sin anuncios, sin manipulación. Subí una captura o pegá el link y ahorrá hasta un 40%.",
  keywords: [
    "mercado libre",
    "mejor precio",
    "argentina",
    "comparar precios",
    "ahorro",
  ],
  openGraph: {
    title: "ArgenTracker | El Ancla del Mercado Libre",
    description:
      "Encontrá el mejor precio real en Mercado Libre Argentina. Sin anuncios, sin manipulación.",
    type: "website",
    locale: "es_AR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${inter.variable} h-full`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface font-body text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}
