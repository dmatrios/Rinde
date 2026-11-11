import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Rinde",
    short_name: "Rinde",
    description: "Tus jornadas, cobros y gastos en claro.",
    lang: "es-PE",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#cc481c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
