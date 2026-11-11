import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Rinde · Tu trabajo, en claro", template: "%s · Rinde" },
  description: "Tus horas, ingresos y gastos de delivery en un solo lugar.",
  applicationName: "Rinde",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Rinde" },
  icons: {
    icon: [{ url: "/rinde-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#cc481c",
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
