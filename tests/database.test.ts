import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

// Motor PostgreSQL real embebido. auth.users y auth.uid reproducen sólo el contrato
// necesario para probar las migraciones/RLS; no simulan el servicio GoTrue de Supabase.
let db: PGlite;
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users(id) values ('${a}');
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610220001_initial_accounts.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.query(
    "insert into auth.users (id, raw_user_meta_data) values ($1, $2)",
    [b, JSON.stringify({ display_name: "Usuario B" })],
  );
});
afterAll(async () => {
  await db?.close();
});

async function asUser<T>(id: string, callback: () => Promise<T>) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  try {
    return await callback();
  } finally {
    await db.exec("reset role");
  }
}
describe("migración inicial y aislamiento por usuario", () => {
  it("inicializa usuarios anteriores y nuevos, con valores explícitos", async () => {
    const settings = await db.query<{
      currency: string;
      timezone: string;
      earnings_mode: string;
    }>(
      "select currency, timezone, earnings_mode from public.user_settings order by user_id",
    );
    expect(settings.rows).toEqual([
      { currency: "PEN", timezone: "America/Lima", earnings_mode: "daily" },
      { currency: "PEN", timezone: "America/Lima", earnings_mode: "daily" },
    ]);
  });
  it("cada usuario sólo puede leer su perfil y preferencias", async () => {
    for (const id of [a, b])
      await asUser(id, async () => {
        expect((await db.query("select id from public.profiles")).rows).toEqual(
          [{ id }],
        );
        expect(
          (await db.query("select user_id from public.user_settings")).rows,
        ).toEqual([{ user_id: id }]);
      });
  });
  it("permite guardar el perfil propio y evita modificar el ajeno", async () => {
    await asUser(a, async () => {
      expect(
        (
          await db.query(
            "update public.profiles set display_name = 'Nombre nuevo' where id = $1 returning id",
            [a],
          )
        ).rows,
      ).toHaveLength(1);
      expect(
        (
          await db.query(
            "update public.profiles set display_name = 'Intruso' where id = $1 returning id",
            [b],
          )
        ).rows,
      ).toHaveLength(0);
      await expect(
        db.query("update public.profiles set id = $1 where id = $2", [b, a]),
      ).rejects.toThrow();
    });
  });
  it("rechaza crear datos a nombre de otro usuario", async () => {
    await asUser(a, async () => {
      await expect(
        db.query(
          "insert into public.user_platforms (user_id, name) values ($1, 'Plataforma ajena')",
          [b],
        ),
      ).rejects.toThrow(/row-level security/i);
      await expect(
        db.query(
          "insert into public.vehicles (user_id, name) values ($1, 'Vehículo ajeno')",
          [b],
        ),
      ).rejects.toThrow(/row-level security/i);
    });
  });
  it("aísla plataformas y vehículos en lectura, edición y borrado", async () => {
    await asUser(b, async () => {
      await db.query(
        "insert into public.user_platforms (name) values ('PedidosYa')",
      );
      await db.query(
        "insert into public.vehicles (name) values ('Moto de prueba')",
      );
    });
    await asUser(a, async () => {
      for (const table of ["user_platforms", "vehicles"]) {
        expect(
          (await db.query(`select * from public.${table}`)).rows,
        ).toHaveLength(0);
        expect(
          (
            await db.query(
              `update public.${table} set name = 'Intruso' returning *`,
            )
          ).rows,
        ).toHaveLength(0);
        expect(
          (await db.query(`delete from public.${table} returning *`)).rows,
        ).toHaveLength(0);
      }
    });
    await asUser(b, async () => {
      expect(
        (await db.query("select * from public.user_platforms")).rows,
      ).toHaveLength(1);
      expect(
        (await db.query("select * from public.vehicles")).rows,
      ).toHaveLength(1);
    });
  });
  it("no admite plataformas duplicadas ni dos vehículos principales", async () => {
    await asUser(b, async () => {
      await expect(
        db.query(
          "insert into public.user_platforms (name) values (' pedidosya ')",
        ),
      ).rejects.toThrow(/duplicate key/i);
      await expect(
        db.query("insert into public.vehicles (name) values ('Otra moto')"),
      ).rejects.toThrow(/duplicate key/i);
      await expect(
        db.query("update public.vehicles set odometer_km = -1"),
      ).rejects.toThrow(/check constraint/i);
    });
  });
  it("rechaza lecturas anónimas en todas las tablas", async () => {
    await db.exec("set role anon");
    try {
      for (const table of [
        "profiles",
        "user_settings",
        "user_platforms",
        "vehicles",
      ])
        await expect(db.query(`select * from public.${table}`)).rejects.toThrow(
          /permission denied/i,
        );
    } finally {
      await db.exec("reset role");
    }
  });
  it("nadie puede ejecutar la función privilegiada directamente", async () => {
    await asUser(a, async () => {
      await expect(db.query("select public.handle_new_user()")).rejects.toThrow(
        /permission denied/i,
      );
    });
  });
  it("elimina los registros dependientes al eliminar una cuenta", async () => {
    await db.query("delete from auth.users where id = $1", [b]);
    for (const table of [
      "profiles",
      "user_settings",
      "user_platforms",
      "vehicles",
    ]) {
      const key = table === "profiles" ? "id" : "user_id";
      expect(
        (await db.query(`select * from public.${table} where ${key} = $1`, [b]))
          .rows,
      ).toHaveLength(0);
    }
  });
});
