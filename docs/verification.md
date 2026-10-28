# Verificación de la iteración 1

## Permiso de bienvenida — 28 de octubre de 2026

- Se aplicó una sola vez `20261028204822_onboarding_settings_permission.sql`
  mediante el SQL Editor de Supabase, sin crear registros de prueba.
- La cuenta autenticada puede actualizar únicamente el estado de finalización
  de su propia bienvenida.

## Lecturas de kilometraje en pausas — 28 de octubre de 2026

- Se aplicó una sola vez `20261028193652_pause_odometer_readings.sql` mediante
  el SQL Editor de Supabase, sin crear registros de prueba.
- `shift_pauses` ahora conserva las lecturas opcionales al pausar y reanudar;
  `transition_work_shift` valida su secuencia y usa la lectura de la pausa al
  finalizar directamente desde ese estado.
- `corepack pnpm typecheck` y `corepack pnpm lint` finalizaron correctamente.
  La suite `pnpm test` no se ejecutó por instrucción vigente del usuario.

## Iteración 5 - reportes y PDF - 28 de octubre de 2026

- Reportes permite navegar los registros propios por día, semana o mes; muestra
  barras comparativas, detalle de pedidos, distribución de gastos, porcentajes,
  ingresos por plataforma y gastos por categoría.
- Los importes se calculan desde las mismas fuentes del resumen y se descargan
  en un PDF generado en el navegador; no se crearon registros de ejemplo ni
  se añadió una migración.
- `corepack pnpm typecheck`, `corepack pnpm lint` y `corepack pnpm build`
  finalizaron correctamente. La suite `pnpm test` no se ejecutó por instrucción
  vigente del usuario.

## Bienvenida y eliminación de cuenta — 27 de octubre de 2026

- Se aplicó una sola vez `20261027215857_onboarding_and_self_deletion.sql`
  mediante el SQL Editor de Supabase, sin crear registros de prueba.
- La verificación posterior confirmó la columna `onboarding_completed` y el
  permiso de ejecución autenticada de `delete_own_account`.
- Se aplicó una sola vez `20261027223000_account_deletion_dependencies.sql`.
  La verificación confirmó que conserva ese permiso y elimina los registros
  relacionados antes de la cuenta, para evitar bloqueos por dependencias.
- Las cuentas existentes conservan el acceso actual; las cuentas nuevas ven la
  bienvenida antes de entrar a su espacio. La eliminación requiere la sesión
  de la misma cuenta y confirmación explícita dentro de Configuración.

## Kilometraje por jornada — 27 de octubre de 2026

- Se aplicó una sola vez `20261027213056_shift_odometer.sql` mediante el SQL
  Editor de Supabase, sin crear registros de prueba.
- La verificación posterior confirmó las columnas `odometer_start` y
  `odometer_end` en `work_shifts`, además de la ejecución autenticada de las
  funciones de inicio y finalización actualizadas.
- El kilometraje se conserva como opcional al iniciar; si se registra, el valor
  de cierre debe estar presente y no puede ser inferior al inicial.

## Iteración 4 — gastos y combustible — 25 de octubre de 2026

- Se aplicó una sola vez `20261025220000_expenses_and_fuel.sql` mediante el SQL
  Editor de Supabase, sin crear datos de ejemplo.
- Se aplicó una sola vez `20261025233000_expense_category_delete.sql`; la
  verificación confirmó el permiso de eliminación para cuentas autenticadas.
  Las claves foráneas mantienen bloqueada la eliminación de categorías que ya
  tengan gastos o recurrencias.
- La verificación posterior confirmó `expense_categories`,
  `recurring_expenses`, `expenses` y `fuel_refills`: las cuatro tienen RLS
  habilitado y una política de propiedad.
- Las categorías se pausan en lugar de borrarse; los pagos de gastos frecuentes
  se registran explícitamente y combustible se mantiene separado de los gastos
  para prevenir duplicados.
- `corepack pnpm typecheck`, `corepack pnpm lint` y `corepack pnpm build` se
  ejecutan al cierre de la entrega. La suite `pnpm test` sigue sin ejecutarse
  por instrucción vigente del usuario.

## Iteración 3 — ingresos — 25 de octubre de 2026

- Se aplicaron una sola vez `20261023212936_platform_name_guard.sql` y
  `20261025203000_earnings.sql` mediante el SQL Editor de Supabase.
- Una consulta de verificación confirmó las tablas `earnings` y
  `earnings_history`, el trigger de nombres de plataforma, el trigger de
  validación de ingresos y la función `upsert_earning`.
- La migración mantiene importes `numeric(14,2)`, RLS por propietario, lectura
  limitada a la cuenta autenticada y escritura atómica mediante la función con
  control de revisión.
- `corepack pnpm typecheck` finalizó correctamente. La suite `pnpm test` no se
  ejecutó por instrucción vigente del usuario.

## Iteración 2 — jornadas y plataformas — 23 de octubre de 2026

La migración `20261023204751_work_shifts.sql` se aplicó una sola vez en el SQL
Editor de Supabase, después de la migración inicial ya registrada.

- Se crearon `work_shifts` y `shift_pauses` sin datos de prueba.
- Ambas tablas tienen RLS habilitado, una política de propiedad y los índices
  para historial y para impedir más de una jornada o pausa abierta.
- `start_work_shift` y `transition_work_shift` son funciones `SECURITY
INVOKER`: `anon` no puede ejecutarlas y `authenticated` sí puede hacerlo.
- Las comprobaciones locales `pnpm typecheck`, `pnpm lint` y `pnpm build`
  finalizaron correctamente. La suite `pnpm test` se conservó, pero no se
  ejecutó por instrucción vigente.

Queda pendiente la comprobación manual con la cuenta del usuario: crear una
plataforma, iniciar, pausar, reanudar y finalizar una jornada desde `/app/activity`.

La migración `20261023212936_platform_name_guard.sql` está pendiente de aplicarse
en el SQL Editor. No se registró como aplicada porque la automatización del
navegador no pudo recuperar la sesión de Chrome para abrir Supabase.

## Integración remota — 23 de octubre de 2026

Se conectó la aplicación al proyecto remoto de Supabase mediante variables
locales no versionadas. No se incluyeron claves ni sus valores en este
documento.

- Antes de aplicar cambios, una consulta de lectura confirmó que las cuatro
  tablas iniciales no existían y que no había un estado parcial.
- La migración `202610220001_initial_accounts.sql` se ejecutó una sola vez en
  Supabase SQL Editor. La verificación posterior confirmó `profiles`,
  `user_settings`, `user_platforms` y `vehicles`, con RLS habilitado, una
  política de propiedad y un trigger en cada tabla.
- La aplicación local carga el acceso correctamente. Un acceso sin sesión a
  `/app` redirige a `/login`.
- Email auth está habilitado, la confirmación de correo es obligatoria y el
  mínimo de contraseña es de 12 caracteres. Las URLs locales de callback y
  recuperación están registradas. El SMTP predeterminado no permite editar
  plantillas, así que los enlaces PKCE deben abrirse en el mismo navegador;
  enlaces entre dispositivos requieren configurar un SMTP propio.
- `pnpm typecheck`, `pnpm lint` y `pnpm build` finalizaron correctamente.
- `pnpm test` se conservó pero no se ejecutó, conforme a la instrucción
  vigente del usuario.

Quedan pendientes las comprobaciones que requieren una cuenta y el acceso del
usuario a su correo: registro, confirmación, edición persistente de perfil,
logout, recuperación de contraseña y aislamiento entre dos cuentas de prueba.

Fecha: 22 de octubre de 2026. Entorno: Linux, Node 24.19.0, pnpm 11.25.0.
No se encontraron repositorio previo ni credenciales de Supabase en el entorno.

| Comprobación                                              | Resultado                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| Instalación reproducible `pnpm install --frozen-lockfile` | Correcta                                                             |
| Compatibilidad de pares `pnpm peers check`                | Sin conflictos                                                       |
| TypeScript estricto (`next typegen` + `tsc --noEmit`)     | Correcto                                                             |
| ESLint                                                    | Sin errores ni advertencias                                          |
| Prettier                                                  | Formato consistente                                                  |
| Vitest                                                    | 3 archivos; 32 pruebas aprobadas                                     |
| Migración en PostgreSQL embebido (PGlite)                 | Ejecutada íntegra con transacción, triggers y políticas              |
| Compilación optimizada Next.js con Webpack                | Correcta                                                             |
| Navegador de pruebas, escritorio                          | Dashboard, navegación, configuración, login y recuperación revisados |
| Acceso directo a `/app` sin conexión configurada          | Redirige a `/setup`, sin acceder a datos privados                    |

## Qué prueban los tests

13 casos de validación/configuración: correo normalizado, contraseñas,
confirmación, destinos de redirección y rechazo de claves privilegiadas.

9 casos SQL: inicialización de cuentas nuevas y anteriores, propiedad de lecturas,
edición propia, bloqueo de edición ajena y falsificación de propietario, aislamiento
de vehículos/plataformas, restricciones, bloqueo anónimo y de ejecución de la
función privilegiada, limpieza en cascada al eliminar la cuenta.

10 casos de Server Actions con SDK simulado: ausencia de configuración, login,
mensajes de error sin detalles internos, callback confiable de registro,
recuperación sin confirmar existencia de cuentas, sesión requerida para cambiar
contraseña, edición ligada al propietario autenticado y logout correcto/fallido.

Las cuentas y nombres usados en tests son sintéticos; PGlite es efímero. No se
crearon cuentas ni se enviaron correos de usuarios reales.

## Límites de esta verificación

- PGlite utiliza el motor PostgreSQL con un contrato mínimo de `auth.users` y
  `auth.uid()`. No sustituye una prueba de integración del servicio Auth de Supabase.
- Falta aplicar el SQL en un proyecto real y completar las variables, URLs de
  redirección y plantillas. Registro, persistencia de cookies, envío de correos,
  confirmación y recuperación deben verificarse de extremo a extremo después.
- Se verificó visualmente escritorio. El layout móvil y sus áreas seguras están
  implementados, pero no se completó la inspección visual a 320/390 px en este
  navegador. Revisar también en un teléfono real antes de dar esa QA por aprobada.
- El arranque del visor necesitó un adaptador temporal para sus flags. Se retiró
  de la entrega; los scripts finales ejecutan Next.js nativo. No se incluyen rutas
  temporales de QA. Se limpiaron tipos de desarrollo obsoletos tras eliminarlas.
- No se publicó un despliegue ni se conectó un repositorio remoto. La entrega es
  código fuente ejecutable con Node.js y documentación, sin secretos.

## Próxima revisión

Configurar el proyecto de Supabase y ejecutar el checklist del README; revisar
el layout en celular. Tras aprobar esta base, comenzar la iteración 2 de jornadas.
