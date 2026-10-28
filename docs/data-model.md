# Modelo de datos del MVP

Este documento define el destino del producto. Las entidades hasta
`recurring_expenses` están migradas en la iteración 4; las posteriores son
decisiones de diseño para cambios futuros.

## Tablas y relaciones

Cada entidad pertenece a `auth.users.id`, lleva fechas de creación/modificación y
RLS por propietario. Los IDs de entidades futuras son UUID. Las relaciones entre
dos entidades privadas deberán usar FK compuestas `(user_id, id)` para impedir
vincular, por ejemplo, la jornada de otro usuario aunque se conozca su UUID.

| Entidad            | Campos principales y restricciones                                                                                                | Etapa |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----- |
| profiles           | `id` PK/FK auth.users; display_name                                                                                               | 1     |
| user_settings      | `user_id` PK; PEN, America/Lima, modo daily/shift y RUC opcional                                                                  | 1     |
| user_platforms     | id, user_id, name, active; nombre normalizado único por usuario                                                                   | 1     |
| vehicles           | user_id PK, name, odometer_km opcional; un vehículo principal                                                                     | 1     |
| work_shifts        | id, user_id, platform_id, started_at, ended_at, status, odometer_start/end, orders opcional, notes                                | 2     |
| shift_pauses       | id, user_id, shift_id, started_at, ended_at                                                                                       | 2     |
| earnings           | id, user_id, platform_id, date, mode, shift_id opcional, reported_amount, tips, bonuses, inclusion flags, orders, notes, revision | 3     |
| earnings_history   | id, user_id, earnings_id, before/after JSONB, changed_at; sólo lectura para propietario                                           | 3     |
| expense_categories | id, user_id, name, kind operational/personal, active                                                                              | 4     |
| expenses           | id, user_id, category_id, occurred_at, amount, descripción, nota, indicador de pago con RUC y recurrencia opcional               | 4     |
| fuel_refills       | id, user_id, occurred_at, amount, liters opcional, odometer_km opcional, full_tank, notes                                         | 4     |
| recurring_expenses | id, user_id, category_id, amount, cadence weekly/monthly, anchor_date, active                                                     | 4     |
| goals              | user_id PK, daily_income, weekly_income, weekly_minutes opcionales                                                                | 5     |

Las sugerencias frecuentes se consultan en `expenses`, agrupando descripción
normalizada, categoría e importe por frecuencia/recencia. No necesitan otra tabla
ni IA. Las plataformas/categorías con historial se archivan en vez de borrar
registros referenciados. La UI de eliminación de categorías debe ofrecer reasignar
los gastos o desactivar la categoría; no borrar gastos silenciosamente.

## Tiempo y jornadas

- Marcas de tiempo en `timestamptz`; fechas de negocio calculadas explícitamente en
  America/Lima. La semana empieza lunes y los filtros usan intervalos semiabiertos.
- Índice único parcial `work_shifts(user_id) where status in ('active','paused')`.
  Índice equivalente para una pausa abierta por jornada.
- Iniciar, pausar, reanudar y finalizar mediante transacciones/RPC de contexto de
  usuario. Validar transiciones, evitar pausas solapadas, fin anterior al inicio y
  usar hora del servidor. Permitir idempotencia de los toques repetidos.
- El tiempo efectivo se deriva de marcas almacenadas menos pausas. El reloj de UI
  refresca visualmente; no es el origen de verdad.
- Dividir los intervalos que atraviesan medianoche para reportar horas por fecha.
  Las ganancias por jornada se atribuyen inicialmente a la fecha de inicio; dejar
  esta atribución visible, sin inventar ingresos parciales por hora.

## Acumulados sin duplicación

- Modo diario: único `(user_id, platform_id, date)` donde `mode='daily'`.
- Modo jornada: único `(user_id, shift_id)` donde `mode='shift'`; la plataforma debe
  coincidir con la jornada y pertenecer al mismo usuario.
- No mezclar diario y jornada para una misma plataforma/fecha. El cambio de
  preferencia afecta registros futuros; los existentes conservan su modo. Un
  cambio incompatible requiere consolidación explícita, no sumar ambos modos.
- Cada actualización reemplaza el acumulado y aumenta `revision`. UPDATE y
  snapshot de historial se realizan en una sola transacción. El cliente envía la
  revisión esperada; un conflicto se muestra antes de sobreescribir otro cambio.
- `reported_amount` es el importe que el usuario copia de la plataforma. Dos flags
  explícitos `tips_included`/`bonuses_included` indican si contiene esos conceptos.
  Ingreso bruto = reportado + propinas excluidas + bonos excluidos. Nunca se vuelve
  a sumar un concepto incluido. El historial registra también esos flags.
- Los pedidos copiados junto al acumulado son reemplazos, no incrementos. Para un
  período con ganancias registradas se utiliza su recuento; el de jornadas sirve
  sólo como fallback si no existe recuento de ingresos en esa plataforma/fecha.

## Precisión financiera y combustible

Importes PostgreSQL `numeric(14,2)` positivos. Intercambio en cadenas decimales
y cálculo de importes en céntimos enteros dentro de un límite validado seguro de
JavaScript. No sumar monedas con float ni usar la representación redondeada de
pantalla como dato fuente. Litros `numeric(10,3)`, odómetros `numeric(12,1)`;
intermedios de rendimiento se redondean sólo al presentar.

`fuel_refills` es el único origen de compras de combustible. Los reportes unen sus
desembolsos con gastos operativos; **no crear un gasto de gasolina duplicado**.
La opción Gasolina del formulario de gastos debe llevar al formulario de recarga.

Rendimiento: sólo intervalos entre dos recargas de tanque lleno, con odómetros
crecientes y litros conocidos de todas las recargas posteriores a la inicial,
incluida la final. La recarga inicial queda fuera del volumen consumido. km/L =
delta km / suma litros; L/100 km = suma litros × 100 / delta km. Si faltan litros
o hay trayectos personales no identificados, señalar la limitación; no asignar
ese consumo automáticamente a delivery. Gasto por km basado en reposición debe
etiquetarse como estimado y usar el mismo intervalo, sin recargas parciales sueltas.

Indicadores previstos:

- Ingreso bruto generado: acumulados vigentes, sin sumar su historial.
- Resultado operativo por desembolsos: bruto menos gastos operativos pagados y
  combustible comprado durante el período. No denominarlo consumo exacto.
- Resultado operativo estimado por consumo: sólo con base suficiente de consumo;
  sustituye la compra de combustible por la estimación, nunca resta ambos.
- Restante tras gastos registrados: bruto − desembolsos operativos − personales.
  Es una medida sobre ingresos generados; no afirmar que es el saldo bancario ni
  dinero efectivamente cobrado.
- Ganancia bruta/h y operativa/h: denominadores de tiempo efectivo del mismo
  período. Sin horas, devolver ausencia de indicador, nunca infinito ni cero falso.

Transferencias, propinas ya incluidas y efectivo cobrado por cuenta de la
plataforma no se suman como nuevos ingresos. No existe módulo de cobros en esta
etapa. Impuestos/descuentos se registrarán con naturaleza explícita y sin volver a
restar lo ya deducido del monto informado; no suponer porcentajes contractuales.

## Recurrencias, borradores e historial

Una regla recurrente es una previsión, no un gasto pagado. Confirmar un pago crea
un `expense` con `(recurring_rule_id, due_date)` único por usuario. Cambiar la regla
no modifica pagos anteriores. Las fechas mensuales que no existen se ajustan al
último día del mes. No se requiere cron para mostrar vencimientos.

Borradores locales futuros con clave por usuario y formulario, timestamp,
expiración y limpieza al salir. Nunca persistir contraseñas/tokens en borradores.
Cambios confirmados se guardan de forma explícita o con debounce, control de
revisión e idempotencia. Mostrar diferencia entre borrador local y confirmado en
servidor. No afirmar sincronización offline hasta implementarla y probarla.

Los ingresos conservarán snapshot antes/después inmutable y propietario. Las
ediciones recalculan reportes a partir de fuentes, sin guardar totales derivados.
Los cálculos se centralizarán en `src/lib/finance` con pruebas en su iteración.
