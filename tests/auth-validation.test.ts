import { describe, expect, it, afterEach } from "vitest";
import {
  signupSchema,
  loginSchema,
  updatePasswordSchema,
  safeAuthDestination,
} from "../src/lib/auth/validation";
import { getSupabaseConfig, getAppUrl } from "../src/lib/config";

describe("validación de cuentas", () => {
  it("normaliza el correo y conserva la contraseña literalmente", () => {
    const result = signupSchema.parse({
      email: "  Prueba@EXAMPLE.COM ",
      password: "  una contraseña segura  ",
      displayName: "  Repartidor  ",
    });
    expect(result).toEqual({
      email: "prueba@example.com",
      password: "  una contraseña segura  ",
      displayName: "Repartidor",
    });
  });
  it("rechaza contraseñas cortas al crear cuenta pero admite contraseñas existentes al iniciar sesión", () => {
    expect(
      signupSchema.safeParse({
        email: "test@example.com",
        password: "123456",
        displayName: "Prueba",
      }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "test@example.com", password: "123456" })
        .success,
    ).toBe(true);
  });
  it("requiere que coincidan las contraseñas", () => {
    expect(
      updatePasswordSchema.safeParse({
        password: "una contraseña segura",
        confirmPassword: "otra contraseña segura",
      }).success,
    ).toBe(false);
  });
  it.each([
    "https://evil.example",
    "//evil.example",
    "/app/../../evil",
    "/auth/update-password?next=https://evil.example",
    null,
  ])("bloquea redirecciones externas o no permitidas: %s", (destination) => {
    expect(safeAuthDestination(destination)).toBe("/app");
  });
  it("admite la ruta exacta de recuperación", () => {
    expect(safeAuthDestination("/auth/update-password")).toBe(
      "/auth/update-password",
    );
  });
});

describe("configuración pública", () => {
  const initial = { ...process.env };
  afterEach(() => {
    process.env = { ...initial };
  });
  it("no inventa credenciales si faltan", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(getSupabaseConfig()).toBeNull();
  });
  it("rechaza claves secretas", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_secret_only-for-test";
    expect(getSupabaseConfig()).toBeNull();
  });
  it("rechaza service_role incluso con formato JWT", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = `eyJtest.${btoa(JSON.stringify({ role: "service_role" }))}.signature`;
    expect(getSupabaseConfig()).toBeNull();
  });
  it("requiere un origen seguro para los correos", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://example.com";
    expect(() => getAppUrl()).toThrow();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
