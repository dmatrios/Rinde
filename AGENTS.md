# Rinde

Proyecto Next.js nativo. Leer README.md y docs/architecture.md antes de editar.
La iteración vigente es la 6; no implementar otras iteraciones sin instrucción
del usuario. El diseño de futuras tablas está en docs/data-model.md.

- Consultar las guías relevantes de la versión instalada en
  node_modules/next/dist/docs/ antes de modificar convenciones o APIs de Next.
- Mantener TypeScript estricto, componentes pequeños y lógica separada de UI.
- Acceder a datos privados con el usuario de Supabase y RLS; sin claves secretas.
- No introducir datos reales, ingresos ficticios ni operaciones simuladas.
- Migraciones incrementales en supabase/migrations. No reescribir una migración
  ya aplicada; añadir una nueva para cambios posteriores.
- Pruebas: pnpm typecheck, pnpm lint, pnpm test y pnpm build.
- Mantener .env.example sin valores secretos y no versionar .env.local.
- La vista /preview es sólo visual, no una excepción de autorización para /app.
- El texto visible para repartidores no menciona MVP, iteraciones, etapas,
  servidor, base de datos, Supabase ni otros detalles internos. Comunicar
  beneficios, acciones y estados en lenguaje de producto.
- Todos los menús desplegables dentro de modales usan `ModalPopover`; no usar
  `<select>` nativos que rompan la consistencia visual o se recorten.

## Estado operativo de Supabase

- La integración está conectada al proyecto remoto Rinde. `.env.local` contiene
  la Project URL, la Publishable key y la URL local de la app. Nunca leer,
  imprimir, copiar a documentación ni versionar ese archivo.
- La `Publishable key` es la única clave de Supabase admitida por la app. Nunca
  solicitar, pegar ni usar `service_role`, `sb_secret_` o contraseñas de base
  de datos.
- La migración `supabase/migrations/202610220001_initial_accounts.sql` fue
  aplicada una vez mediante Supabase SQL Editor el 23/10/2026 y verificada con
  cuatro tablas, RLS, políticas de propiedad y triggers. No volver a aplicarla
  ni usar Supabase CLI para ella; los cambios posteriores requieren una nueva
  migración incremental.
- La migración incremental de la iteración 2 es
  `supabase/migrations/20261023204751_work_shifts.sql`. Fue aplicada una vez
  mediante Supabase SQL Editor el 23/10/2026. Se verificaron `work_shifts` y
  `shift_pauses`, RLS, políticas de propiedad, índices y las funciones
  `start_work_shift` y `transition_work_shift`. No volver a aplicarla; los
  cambios posteriores requieren una nueva migración incremental.
- La migración `supabase/migrations/20261023212936_platform_name_guard.sql`
  fue aplicada una vez mediante Supabase SQL Editor el 25/10/2026. El trigger
  `user_platforms_prevent_duplicate_name` fue verificado; no volver a aplicarla.
- La migración incremental de la iteración 3 es
  `supabase/migrations/20261025203000_earnings.sql`. Fue aplicada una vez
  mediante Supabase SQL Editor el 25/10/2026. Se verificaron `earnings`,
  `earnings_history`, los triggers de plataforma e ingresos y la función
  `upsert_earning`. No volver a aplicarla; los cambios posteriores requieren
  una migración incremental.
- La migración incremental de la iteración 4 es
  `supabase/migrations/20261025220000_expenses_and_fuel.sql`. Fue aplicada una
  vez mediante Supabase SQL Editor el 25/10/2026. Se verificaron
  `expense_categories`, `recurring_expenses`, `expenses` y `fuel_refills`, con
  RLS habilitado y una política de propiedad en cada tabla. No volver a
  aplicarla; los cambios posteriores requieren una migración incremental.
- La migración `supabase/migrations/20261025233000_expense_category_delete.sql`
  fue aplicada una vez mediante Supabase SQL Editor el 25/10/2026. Concede a
  `authenticated` eliminar categorías propias; las FK impiden borrar una
  categoría que tenga gastos o recurrencias. No volver a aplicarla.
- La migración `supabase/migrations/20261027215857_onboarding_and_self_deletion.sql`
  fue aplicada una vez mediante Supabase SQL Editor el 27/10/2026. Añade el
  estado de bienvenida y la función `delete_own_account`, disponible sólo para
  `authenticated` y limitada a la cuenta de la sesión. No volver a aplicarla.
- La migración `supabase/migrations/20261027223000_account_deletion_dependencies.sql`
  fue aplicada una vez mediante Supabase SQL Editor el 27/10/2026. Actualiza
  `delete_own_account` para eliminar primero los registros relacionados de la
  propia cuenta, antes de eliminarla. No volver a aplicarla.
- La migración `supabase/migrations/20261027213056_shift_odometer.sql` fue
  aplicada una vez mediante Supabase SQL Editor el 27/10/2026. Se verificaron
  `work_shifts.odometer_start`, `work_shifts.odometer_end` y el permiso de
  ejecución autenticado de las funciones de inicio y finalización actualizadas.
  No volver a aplicarla.
- La migración `supabase/migrations/20261027194500_expense_ruc.sql` fue
  aplicada una vez mediante Supabase SQL Editor el 27/10/2026. Añade el RUC
  opcional a la configuración y el indicador de pago con RUC a los gastos. No
  volver a aplicarla.
- La migración `supabase/migrations/20261027210000_platform_normalization_execute.sql`
  fue aplicada una vez mediante Supabase SQL Editor el 27/10/2026. Concede a
  `authenticated` ejecutar la normalización necesaria para crear y editar sus
  propias plataformas. El permiso fue verificado. No volver a aplicarla.
- La migración `supabase/migrations/20261028193652_pause_odometer_readings.sql`
  fue aplicada una vez mediante Supabase SQL Editor el 28/10/2026. Añade las
  lecturas de kilometraje de pausa y reanudación, su índice por jornada y
  actualiza `transition_work_shift` para conservar la última lectura al cerrar
  una jornada pausada. No volver a aplicarla; los cambios posteriores requieren
  una migración incremental.
- La migración `supabase/migrations/20261028204822_onboarding_settings_permission.sql`
  fue aplicada una vez mediante Supabase SQL Editor el 28/10/2026. Concede a
  `authenticated` actualizar únicamente `onboarding_completed` en su propia
  configuración. No volver a aplicarla; los cambios posteriores requieren una
  migración incremental.
- La migración incremental
  `supabase/migrations/20261102214913_shift_cash_movements.sql` fue aplicada
  por el usuario el 02/11/2026, según confirmó en la conversación. Añade efectivo inicial, cobros por
  método de pago, vinculación opcional de gastos y recargas a la jornada, saldo
  de caja y eliminación de cuenta compatible. No volver a aplicarla. La
  verificación remota sigue pendiente porque no hubo acceso seguro al navegador.
- La migración incremental
  `supabase/migrations/20261102222100_plin_payment_method.sql` fue aplicada
  por el usuario el 02/11/2026, según confirmó en la conversación. Amplía los
  métodos de pago con Plin para cobros, gastos y recargas. No volver a aplicarla.
- La migración incremental
  `supabase/migrations/20261109203917_weekly_goals_cash_reconciliation.sql`
  añade el efectivo contado al cierre y la meta semanal con RLS y permisos
  explícitos. Pendiente de aplicar al proyecto remoto; no afirmar que está
  aplicada hasta verificarla. Las funciones nuevas dependen de ella.
- El usuario autorizó el 09/11/2026 terminar las mejoras de arqueo, indicadores,
  meta y borradores y después subir estos cambios a GitHub. Esta autorización
  corresponde a este pase.
- El usuario autorizó el 02/11/2026 publicar en GitHub y producción los cambios
  locales de sesión persistente, movimientos, Plin y Mi resumen. Esta autorización
  corresponde a este pase, no a cambios futuros.
- En Auth, configurar Site URL y los redirects documentados en README.md;
  habilitar email/contraseña, confirmación por correo y contraseñas de 12 o
  más caracteres.
- El proyecto usa por ahora el SMTP predeterminado de Supabase. Sus plantillas
  no se pueden editar: la confirmación y recuperación PKCE deben abrirse en el
  mismo navegador que inició el flujo. Para enlaces entre dispositivos, primero
  configurar un SMTP propio y después aplicar las plantillas recomendadas en
  README.md.
- Tras conectarlo, registrar en la conversación que se aplicó la migración y
  verificar manualmente registro, confirmación, login, perfil, logout y
  recuperación. No registrar ni versionar valores de las variables.

## Validación temporal

Por instrucción vigente del usuario, conservar la suite pero no ejecutar
`pnpm test` hasta nuevo aviso. Los demás chequeos se ejecutan cuando sean
necesarios.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
