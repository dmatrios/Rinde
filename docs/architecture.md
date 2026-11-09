# Rinde — arquitectura e iteraciones

## Alcance entregado

Iteración 6: Next.js nativo, autenticación, perfil, plataformas, jornadas,
ingresos, categorías, gastos frecuentes, combustible y reportes. Los datos se
guardan con RLS, restricciones de propiedad y un historial atómico de ediciones
de ingresos. Los reportes consultan los registros propios del día, semana o mes
elegidos y el PDF se construye localmente en el navegador a partir de ese mismo
resumen.
La ampliación local de movimientos registra cobros por método de pago, efectivo
inicial y pagos dentro o fuera de la jornada. Los cobros aparecen en reportes;
cuando existe un ingreso total del mismo ámbito, ese total los cubre y evita
sumarlos dos veces. El saldo de caja se calcula en PostgreSQL a partir del
efectivo inicial, cobros en efectivo y gastos en efectivo vinculados a la jornada.
`/app/activity/[id]` consulta únicamente la jornada del usuario autenticado y
sus movimientos vinculados. La corrección de horas requiere confirmación,
mantiene las fechas originales y valida que las pausas sigan dentro del nuevo
intervalo. Los gastos y recargas del detalle enlazan a sus formularios de edición.
La vista «Mi semana» de reportes permite recorrer semanas completas; la semana
vigente se limita a hoy. Usa los mismos datos y reglas de importes que los
reportes por fecha, y conserva su selección de fecha por separado.
El arqueo de cierre guarda el efectivo contado en la jornada finalizada y
compara ese valor con el saldo calculado, sin alterar cobros ni gastos. Una meta
semanal opcional pertenece a la cuenta. Los indicadores operativos por hora y
kilómetro usan jornadas finalizadas con ingresos vinculados; el cálculo por km
requiere lecturas completas y descuenta los tramos de pausa.
Los formularios nuevos de cobro y gasto conservan borradores locales por cuenta
y los eliminan al guardar o cerrar sesión. El borrador no se envía automáticamente.
La migración `20261102214913_shift_cash_movements.sql` fue aplicada por el
usuario el 02/11/2026; queda pendiente verificar el flujo con una sesión real.
La migración `20261102222100_plin_payment_method.sql` también fue aplicada
por el usuario el 02/11/2026 y permite Plin como método de pago independiente.
La vista pública `/preview` no
consulta datos, no autentica y no guarda nada. Nunca es una excepción al control
de acceso de `/app`.

## Una aplicación, una base de datos

App Router y Server Components para renderizar y leer. Server Actions para las
mutaciones del usuario; Route Handlers sólo para callbacks de Auth. Componentes
cliente para formularios y navegación activa. PostgreSQL garantiza integridad y
propiedad mediante restricciones y RLS. No hay ORM, servidor separado ni estado
global de cliente. El SDK utiliza siempre el contexto del usuario autenticado.

`proxy.ts` renueva cookies; `requireUser()` verifica la sesión con `getUser()` junto
al acceso a datos. La caché React es por render/request, nunca una caché global de
datos entre usuarios. `/app` se renderiza dinámicamente; sus respuestas no deben
ser cacheadas por un CDN. Los mensajes de error no incluyen tokens, SQL o detalles
internos. Las redirecciones posteriores al correo usan una lista cerrada.

## Responsabilidades y carpetas

| Ruta                     | Responsabilidad                                           |
| ------------------------ | --------------------------------------------------------- |
| `src/app`                | Rutas, layouts, boundaries y callbacks                    |
| `src/components/ui`      | Primitivas shadcn/ui locales: Button, Input, Card, Badge  |
| `src/components/layout`  | Navegación inferior, sidebar y estructura de acceso       |
| `src/features/auth`      | Formularios y acciones de autenticación                   |
| `src/features/settings`  | Lectura de cuenta y actualización de perfil               |
| `src/features/dashboard` | Resumen inicial y acceso a la jornada                     |
| `src/features/shifts`    | Plataformas, jornadas, validación, acciones y consultas   |
| `src/features/earnings`  | Ingresos, acumulados, validación, acciones y consultas    |
| `src/features/expenses`  | Categorías, gastos, recurrencias y recargas               |
| `src/features/movements` | Cobros, métodos de pago e historial de movimientos        |
| `src/features/reports`   | Consultas, cálculos, visualización y descarga de reportes |
| `src/lib/finance`        | Cálculos exactos de importes para presentación            |
| `src/lib/auth`           | Sesión, validaciones y contratos compartidos              |
| `src/lib/supabase`       | Clientes de servidor y navegador                          |
| `src/types`              | Contrato tipado de la base de datos                       |
| `supabase/migrations`    | SQL versionado                                            |
| `tests`                  | Validaciones y pruebas SQL con dos propietarios           |
| `docs`                   | Diseño, modelo completo previsto y verificaciones         |

Al conectar Supabase se puede regenerar `src/types/database.ts` con su CLI. El
tipo incluido refleja las tablas de cuentas y jornadas y mantiene TypeScript
estricto. El SDK cliente está preparado pero no se utiliza para exponer
escrituras amplias.

## Dependencias

Next, React y TypeScript forman la aplicación. Tailwind/PostCSS y tw-animate-css
dan estilos compatibles con shadcn/ui. CVA, clsx, tailwind-merge y Radix Slot son
las utilidades de sus componentes locales. Lucide aporta iconos. Zod valida las
entradas en el servidor. `@supabase/ssr` y `supabase-js` resuelven sesión y datos.
`server-only` impide importar acceso de servidor desde el cliente. `pdf-lib`
construye el PDF en el navegador: no requiere una ruta de descarga ni comparte
los movimientos con otro servicio.

Vitest es el ejecutor de pruebas; PGlite ejecuta PostgreSQL embebido para comprobar
la migración y RLS sin requerir Docker. ESLint y sus reglas de Next verifican el
código. Prettier mantiene un formato de código consistente. ESLint 9 conserva la
compatibilidad declarada por los plugins del preset oficial de Next instalado.
Los gráficos de reportes se componen con elementos de interfaz accesibles y CSS,
manteniendo baja la carga inicial. La instalación PWA y la sincronización de
registros sin conexión corresponden a etapas futuras.

Se utiliza Webpack mediante la opción oficial de Next para desarrollo y build,
incluyendo Windows. El lockfile fija la resolución exacta. No hay scripts que
envíen datos del usuario a servicios externos adicionales.

## Próximas etapas (sin implementación automática)

7. PWA, sincronización automática sin conexión, rendimiento y QA integral.

## Fuentes oficiales consultadas el 22/10/2026

- https://nextjs.org/docs/app/getting-started/installation
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/passwords
- https://ui.shadcn.com/docs/installation/manual

Se ha mantenido Next.js nativo, como exige el proyecto. La entrega está preparada
para ejecutar en Node.js; no se ha sustituido por otro framework para publicarla
en un hosting de Workers.
