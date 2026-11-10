# Rinde

Control personal de horas, ingresos y gastos de delivery. **Entrega: iteración 6**.
Nombre provisional. Sin datos personales precargados ni credenciales incluidas.

## Qué está implementado

- Next.js App Router nativo, React, TypeScript estricto, Tailwind CSS y componentes
  shadcn/ui locales (instalación manual, estilo new-york). Iconos Lucide.
- Registro, login, logout, recuperación/cambio de contraseña, confirmación por
  correo y sesión SSR con Supabase. Formularios validados y estados de error/carga.
- Rutas privadas `/app`, perfil editable y configuración inicial PEN/America/Lima.
- Migraciones transaccionales con cuentas, plataformas, jornadas y pausas;
  restricciones, privilegios y RLS por propietario.
- Gestión de plataformas e inicio, pausa, reanudación, finalización e historial
  reciente de jornadas con marcas de tiempo del servidor. Cada jornada tiene un
  detalle de horarios, pausas y movimientos, con corrección de horas confirmada.
  Al finalizar se puede registrar el ingreso del turno o dejarlo pendiente, y se
  muestra un resumen de cierre con los kilómetros medidos. La pregunta de cierre
  desglosa los cobros asociados, permite asociar cobros del mismo horario que
  quedaron sin turno y evita sumar dos veces lo que ya incluye el total.
- Registro y edición de ingresos por día o jornada, con importes decimales,
  bloqueo de duplicados y un historial de cambios por registro. La pantalla de
  ingresos muestra también los cobros individuales por separado del total de
  plataforma para que se puedan consultar sin duplicar ganancias.
- Categorías operativas o personales, gastos editables, gastos frecuentes que se
  confirman al registrarlos y recargas de combustible separadas para no duplicar
  importes.
- Efectivo inicial opcional por jornada, cobros en efectivo, Yape, Plin o tarjeta,
  vuelto calculado, gastos y recargas con método de pago dentro o fuera de la
  jornada, saldo de caja, arqueo de cierre e historial detallado de movimientos.
- Reportes navegables por día, semana o mes, con desglose por plataforma y
  gasto, pedidos registrados, detalle en las gráficas y descarga local de un
  PDF con el mismo resumen. La vista «Mi semana» permite recorrer semanas con
  flechas, compara ingresos y gastos, muestra una meta opcional y calcula el
  resultado operativo por hora o kilómetro cuando hay datos suficientes.
- Borradores locales de cobros y gastos nuevos, separados por cuenta y con
  vencimiento de siete días. Se envían sólo cuando la persona pulsa Guardar con
  conexión disponible.
- Sidebar desktop, navegación inferior móvil, estados vacíos y vista previa.
- Pruebas de validación y PostgreSQL/RLS con dos usuarios de prueba aislados.

Los gráficos de
la aplicación se renderizan con componentes propios, sin introducir una librería
de visualización adicional. La instalación como PWA y la sincronización automática
de datos sin conexión corresponden a una etapa posterior.

## 1. Requisitos

Node.js **22.18 o superior**, Corepack y pnpm **11.25.0**. Usa una versión LTS
compatible de Node. No necesitas Docker para ejecutar las pruebas incluidas.
Las versiones exactas resueltas están en `package.json` y `pnpm-lock.yaml`.

En PowerShell, desde la carpeta del proyecto:

```powershell
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Abre http://localhost:3000. Sin credenciales abre `/preview`, un diseño vacío sin
datos ni escritura. El acceso a `/app` redirige a `/setup`; no se desactiva Auth.
En macOS/Linux usa `cp .env.example .env.local`.

## 2. Conectar Supabase

Crea un proyecto independiente en Supabase. No reutilices bases de otros productos
sin revisar su esquema. En **Connect** copia Project URL y Publishable key; los
nombres de secciones pueden variar en el dashboard.

Completa `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU-CLAVE-PUBLICABLE
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Estas tres variables están documentadas en `.env.example`. No usar service_role,
`sb_secret_` ni contraseñas de base de datos. La aplicación no necesita claves
privilegiadas en ningún entorno. Reinicia el servidor después de cambiar variables.

En producción usa HTTPS y cambia APP_URL por el origen real. Las variables públicas
se incluyen en build; vuelve a compilar cuando las cambies. Ningún dato de perfil
debe almacenarse en variables de entorno.

## 3. Aplicar base de datos

En un proyecto nuevo abre **SQL Editor**, pega y ejecuta una sola vez, en este
orden:

`supabase/migrations/202610220001_initial_accounts.sql`

`supabase/migrations/20261023204751_work_shifts.sql`

`supabase/migrations/20261023212936_platform_name_guard.sql`

`supabase/migrations/20261025203000_earnings.sql`

`supabase/migrations/20261025220000_expenses_and_fuel.sql`

`supabase/migrations/20261025233000_expense_category_delete.sql`

`supabase/migrations/20261027194500_expense_ruc.sql`

`supabase/migrations/20261027210000_platform_normalization_execute.sql`

`supabase/migrations/20261027213056_shift_odometer.sql`

`supabase/migrations/20261027215857_onboarding_and_self_deletion.sql`

`supabase/migrations/20261027223000_account_deletion_dependencies.sql`

`supabase/migrations/20261028193652_pause_odometer_readings.sql`

`supabase/migrations/20261028204822_onboarding_settings_permission.sql`

`supabase/migrations/20261102214913_shift_cash_movements.sql`

`supabase/migrations/20261102222100_plin_payment_method.sql`

`supabase/migrations/20261109203917_weekly_goals_cash_reconciliation.sql`

Las migraciones de movimientos y Plin fueron aplicadas al proyecto Rinde por el
usuario el 02/11/2026. No las ejecutes otra vez. Verifica el flujo con una sesión
de la aplicación después de publicarlo.
La última migración, de meta semanal y arqueo, aún debe aplicarse una sola vez
antes de usar esas funciones en producción. Las anteriores no deben repetirse.

La migración está envuelta en una transacción. Si falla, corrige el error antes de
reintentar; no ejecutes sólo fragmentos. No contiene datos reales ni borra tablas
existentes. Crea `profiles`, `user_settings`, `user_platforms`, `vehicles`,
`work_shifts`, `shift_pauses`, `earnings`, `earnings_history`,
`expense_categories`, `recurring_expenses`, `expenses`, `fuel_refills`, RLS y perfil/preferencias automáticos para cuentas
nuevas y preexistentes. La segunda migración requiere que la primera ya esté
aplicada. La tercera evita nombres de plataformas repetidos aunque cambien sólo
los espacios o las mayúsculas.

Alternativamente, con Supabase CLI ya instalada y autenticada:

```powershell
supabase init
supabase link --project-ref TU_PROJECT_REF
supabase db push
supabase gen types typescript --linked --schema public > src/types/database.ts
```

La CLI no es dependencia de runtime. `supabase init` prepara la configuración
local de CLI; no reemplaces la migración. No ejecutes el SQL Editor y luego `db
push` sobre esa misma migración sin reconciliar el historial de migraciones con
la CLI. Escoge una ruta y mantenla. Después de regenerar tipos, ejecuta typecheck.

## 4. Configurar autenticación y correos

En **Authentication → URL Configuration**:

- Site URL: `http://localhost:3000` en desarrollo.
- Redirect URLs: `http://localhost:3000/auth/callback` y
  `http://localhost:3000/auth/callback?next=/auth/update-password`.
- Para producción registra las mismas rutas bajo el origen HTTPS real y actualiza
  Site URL y `NEXT_PUBLIC_APP_URL`. No uses comodines amplios en producción.

En el proveedor Email habilita correo/contraseña, confirmación de correo y una
longitud mínima de contraseña de 12 caracteres. Supabase gestiona rate limits;
revisa sus límites de correo y configura SMTP propio antes de ofrecer el producto
a más usuarios. La aplicación no envía correos por otro proveedor.

**Plantillas recomendadas para abrir el enlace desde otro dispositivo:**

En Confirm signup usa este enlace (mantén el resto del diseño de tu plantilla):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
  >Confirmar mi cuenta</a
>
```

En Reset password:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  >Cambiar contraseña</a
>
```

La ruta `/auth/confirm` verifica el OTP con Supabase y crea la sesión por cookies.
No se aceptan destinos arbitrarios. También se incluye `/auth/callback` para las
plantillas PKCE predeterminadas: el enlace de ese flujo debe abrirse en el mismo
navegador que inició el registro o recuperación, pues necesita su verificador.
El enlace de recuperación lleva a una pantalla protegida para elegir contraseña;
al guardarla se cierra la sesión local y se solicita un nuevo login.

## 5. Verificar y compilar

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
```

`pnpm check` agrupa tipos, lint y pruebas. `pnpm build` usa Webpack explícitamente.
En Next 16 el build no reemplaza ESLint. Las pruebas SQL usan PGlite con el contrato
mínimo de Auth; prueban integridad/RLS, no el envío real de emails ni GoTrue.

Después de conectar Supabase verifica manualmente:

1. Crear una cuenta, confirmar correo y entrar a `/app`.
2. Cambiar nombre, recargar y comprobar persistencia.
3. Cerrar sesión; intentar acceder a `/app` y comprobar redirección.
4. Solicitar recuperación, abrir el enlace, cambiar contraseña y volver a entrar.
5. Repetir con una segunda cuenta, comprobando su perfil y datos separados.
6. Confirmar que enlaces expirados muestran un error recuperable.

No hay verificación end-to-end de Auth contra un proyecto alojado mientras no se
configuren credenciales, migración, URLs y correos. No se debe considerar esa
integración validada únicamente porque compile o pasen las pruebas SQL.

## Estructura y documentos

- `src/app`: rutas públicas, privadas y preview.
- `src/features`: comportamiento por funcionalidad.
- `src/components`: UI y layouts reutilizables.
- `src/lib`: sesión, clientes y validaciones.
- `src/types/database.ts`: contrato de tablas iniciales.
- `supabase/migrations`: SQL versionado.
- `tests`: validación y aislamiento PostgreSQL.
- `docs/architecture.md`: decisiones, dependencias y límites.
- `docs/data-model.md`: esquema completo previsto y reglas financieras.
- `docs/design-system.md`: tokens visuales y comportamiento responsive.
- `docs/verification.md`: resultados reales de la entrega.

## Siguiente revisión

Sólo tras revisar esta entrega: metas, PWA, borradores y mejoras de rendimiento.
No avanzar automáticamente.
