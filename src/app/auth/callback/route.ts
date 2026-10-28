import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/config";
import { safeAuthDestination } from "@/lib/auth/validation";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && getSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error)
        return NextResponse.redirect(
          new URL(
            safeAuthDestination(request.nextUrl.searchParams.get("next")),
            request.url,
          ),
        );
    } catch {
      /* Enlaces expirados o conexiones fallidas muestran un mensaje recuperable. */
    }
  }
  return NextResponse.redirect(new URL("/login?authError=1", request.url));
}
