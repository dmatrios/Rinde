import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  },
  createClient: vi.fn(),
  requireUser: vi.fn(),
  from: vi.fn(),
  revalidatePath: vi.fn(),
  config: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));
vi.mock("@/lib/config", () => ({
  getSupabaseConfig: mocks.config,
  getAppUrl: () => "https://rinde.example",
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import {
  login,
  signup,
  forgotPassword,
  updatePassword,
  updateProfile,
  logout,
} from "../src/features/auth/actions";
import { initialActionState } from "../src/lib/auth/types";
const form = (values: Record<string, string>) => {
  const f = new FormData();
  for (const [key, value] of Object.entries(values)) f.set(key, value);
  return f;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({ url: "https://db.example", key: "public" });
  mocks.requireUser.mockResolvedValue({ id: "owner-id" });
  mocks.createClient.mockResolvedValue({ auth: mocks.auth, from: mocks.from });
  mocks.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ single: mocks.single });
  mocks.single.mockResolvedValue({ data: { id: "owner-id" }, error: null });
});
describe("acciones de autenticación (SDK simulado, sin servicio remoto)", () => {
  it("no intenta autenticar sin configuración", async () => {
    mocks.config.mockReturnValue(null);
    expect(
      (
        await login(
          initialActionState,
          form({ email: "test@example.com", password: "password" }),
        )
      ).status,
    ).toBe("error");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("redirige tras un login exitoso sin capturar el control de flujo de Next", async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      login(
        initialActionState,
        form({ email: "test@example.com", password: "password" }),
      ),
    ).rejects.toThrow("REDIRECT:/app");
  });
  it("no expone errores internos de Auth", async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({
      error: { code: "invalid_credentials", message: "INTERNAL-SECRET-DETAIL" },
    });
    const result = await login(
      initialActionState,
      form({ email: "test@example.com", password: "password" }),
    );
    expect(result.message).toBe("Correo o contraseña incorrectos.");
    expect(result.message).not.toContain("SECRET");
  });
  it("el registro envía un callback de origen confiable y espera confirmación", async () => {
    mocks.auth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const result = await signup(
      initialActionState,
      form({
        email: "test@example.com",
        password: "contraseña segura de prueba",
        displayName: "Prueba",
      }),
    );
    expect(result.status).toBe("success");
    expect(mocks.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          data: { display_name: "Prueba" },
          emailRedirectTo: "https://rinde.example/auth/callback",
        },
      }),
    );
  });
  it("la recuperación no confirma si existe una cuenta", async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await forgotPassword(
      initialActionState,
      form({ email: "test@example.com" }),
    );
    expect(result.message).toContain("Si existe una cuenta");
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "test@example.com",
      {
        redirectTo:
          "https://rinde.example/auth/callback?next=/auth/update-password",
      },
    );
  });
  it("actualiza contraseña sólo con usuario autenticado y termina la sesión", async () => {
    mocks.auth.updateUser.mockResolvedValue({ error: null });
    mocks.auth.signOut.mockResolvedValue({ error: null });
    await expect(
      updatePassword(
        initialActionState,
        form({
          password: "contraseña segura de prueba",
          confirmPassword: "contraseña segura de prueba",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/login?updated=1");
    expect(mocks.requireUser).toHaveBeenCalledOnce();
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("no actualiza contraseña si falta sesión", async () => {
    mocks.requireUser.mockRejectedValue(new Error("REDIRECT:/login"));
    await expect(
      updatePassword(
        initialActionState,
        form({
          password: "contraseña segura de prueba",
          confirmPassword: "contraseña segura de prueba",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/login");
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });
  it("la edición de perfil usa el propietario de la sesión, no el del formulario", async () => {
    const result = await updateProfile(
      initialActionState,
      form({
        displayName: "Nuevo nombre",
        user_id: "forged-id",
        id: "forged-id",
      }),
    );
    expect(result.status).toBe("success");
    expect(mocks.eq).toHaveBeenCalledWith("id", "owner-id");
    expect(mocks.update).toHaveBeenCalledWith({ display_name: "Nuevo nombre" });
  });
  it("un logout fallido mantiene un error recuperable y no anuncia éxito", async () => {
    mocks.auth.signOut.mockResolvedValue({ error: { code: "network_error" } });
    await expect(logout()).rejects.toThrow("REDIRECT:/app?logoutError=1");
  });
  it("un logout correcto vuelve al acceso", async () => {
    mocks.auth.signOut.mockResolvedValue({ error: null });
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
  });
});
