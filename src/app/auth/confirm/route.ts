import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/config";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (
    tokenHash &&
    (type === "email" || type === "recovery") &&
    getSupabaseConfig()
  ) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (!error)
        return NextResponse.redirect(
          new URL(
            type === "recovery" ? "/auth/update-password" : "/app",
            request.url,
          ),
        );
    } catch {
      /* No exponer tokens ni errores del proveedor. */
    }
  }
  return NextResponse.redirect(new URL("/login?authError=1", request.url));
}
