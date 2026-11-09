"use client";

const PREFIX = "rinde:draft:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type LocalDraft = Record<string, string>;

function key(userId: string, form: string) {
  return `${PREFIX}${userId}:${form}`;
}

export function readLocalDraft(
  userId: string,
  form: string,
): LocalDraft | null {
  try {
    const storageKey = key(userId, form);
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("savedAt" in parsed) ||
      !("values" in parsed)
    )
      return null;
    const stored = parsed as { savedAt: number; values: unknown };
    if (
      !Number.isFinite(stored.savedAt) ||
      Date.now() - stored.savedAt > MAX_AGE_MS
    ) {
      localStorage.removeItem(storageKey);
      return null;
    }
    if (
      !stored.values ||
      typeof stored.values !== "object" ||
      Array.isArray(stored.values)
    )
      return null;
    return Object.fromEntries(
      Object.entries(stored.values).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return null;
  }
}

export function updateLocalDraft(
  userId: string,
  form: string,
  patch: LocalDraft,
) {
  try {
    const values = { ...(readLocalDraft(userId, form) ?? {}), ...patch };
    localStorage.setItem(
      key(userId, form),
      JSON.stringify({ savedAt: Date.now(), values }),
    );
  } catch {
    // El formulario sigue disponible si el dispositivo no permite guardar borradores.
  }
}

export function clearLocalDraft(userId: string, form: string) {
  try {
    localStorage.removeItem(key(userId, form));
  } catch {
    // No impedir que el registro guardado se cierre por un fallo de almacenamiento local.
  }
}

export function clearUserDrafts(userId: string) {
  try {
    const prefix = `${PREFIX}${userId}:`;
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const storageKey = localStorage.key(index);
      if (storageKey?.startsWith(prefix)) localStorage.removeItem(storageKey);
    }
  } catch {
    // La salida de la cuenta no depende del almacenamiento local.
  }
}
