"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/config";
import type { Database } from "@/types/database";
export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase no está configurado.");
  return createBrowserClient<Database>(config.url, config.key, {
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });
}
