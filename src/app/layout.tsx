import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Rinde · Tu trabajo, en claro", template: "%s · Rinde" },
  description: "Tus horas, ingresos y gastos de delivery en un solo lugar.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8fa",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-PE">
      <body className="bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-lg bg-white p-4 focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
