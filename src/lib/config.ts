export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
    // La integración utiliza únicamente la clave pública; nunca una clave privilegiada.
    if (key.startsWith("sb_secret_")) return null;
    if (key.startsWith("eyJ")) {
      const payload = key.split(".")[1];
      if (!payload || JSON.parse(atob(payload)).role !== "anon") return null;
    } else if (!key.startsWith("sb_publishable_")) return null;
    return { url, key };
  } catch {
    return null;
  }
}

export function getAppUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value)
    throw new Error("Configura NEXT_PUBLIC_APP_URL antes de enviar correos.");
  const url = new URL(value);
  // `0.0.0.0` sirve para escuchar conexiones durante desarrollo, pero no es
  // una dirección a la que un navegador pueda volver desde un correo.
  if (url.protocol === "http:" && url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  ) {
    throw new Error("NEXT_PUBLIC_APP_URL debe usar HTTPS fuera de localhost.");
  }
  return url.origin;
}
