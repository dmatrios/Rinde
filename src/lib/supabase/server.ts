import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/config";
import type { Database } from "@/types/database";

export async function createClient({
  persistSession = true,
}: {
  persistSession?: boolean;
} = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase no está configurado.");
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        try {
          items.forEach(({ name, value, options }) => {
            const cookieOptions =
              persistSession || options.maxAge === 0
                ? options
                : { ...options, maxAge: undefined, expires: undefined };
            cookieStore.set(name, value, cookieOptions);
          });
        } catch {
          /* Server Components no escriben cookies; proxy.ts renueva la sesión. */
        }
      },
    },
  });
}
