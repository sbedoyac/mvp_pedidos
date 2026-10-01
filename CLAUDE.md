# MVP_PEDIDOS — Captura de pedidos de Super Carnes JH

> Este archivo es el punto de entrada para cualquier LLM que continúe este proyecto.
> Léelo completo antes de tocar nada. Complementa a [`PLAN.md`](PLAN.md) (alcance, decisiones
> de negocio ya confirmadas, plan de fases) — este archivo cubre el ESTADO del código y el
> MÉTODO de trabajo; `PLAN.md` cubre el QUÉ y el POR QUÉ. Mismo espíritu que
> `superops_jh/CLAUDE.md`, proyecto hermano del que este MVP reutiliza el modelo de familias
> de piezas — no reutiliza código, es un repo independiente.

## 0. Qué es esto, en una frase

Una app de captura de pedidos (React+TS, estilo carrito de compras) para que un
administrador de Super Carnes JH registre el pedido de un punto de venta, viendo en tiempo
real cuánto de cada corte "padre" va comprometiendo a medida que agrega cortes derivados —
ver [`PLAN.md`](PLAN.md) §0-§1 para el detalle completo de alcance y decisiones de negocio.

## 1. Estado actual del código (verificado, no supuesto)

| Fase | Qué | Estado |
|---|---|---|
| 0 — Andamiaje | Monorepo npm workspaces, `apps/api` (Express+TS) y `apps/web` (React+Vite+TS), ambos `strict: true` | ✅ Completo. `npm run check` verde. |
| 0 — Persistencia | DB propia con `sql.js` (SQLite WASM, sin build nativo — decisión explícita, ver `PLAN.md` §Fase 0.3) | ✅ Completo. Archivo en `apps/api/data/mvp_pedidos.sqlite3` (gitignored). |
| 0 — Conexión a `sgc` | `apps/api/src/sgc/db.ts` — ver regla dura en §5 de este archivo | ✅ Completo y **reforzado en código** (ver §5.1 — la cuenta configurada es admin, no readonly). |
| 1 — Catálogo de piezas | `apps/web/src/calc/familiasPiezas.config.ts` (copiado de `superops_jh`) + `especificaciones.config.ts` (armado nuevo) + `proyeccionPiezas.ts` | ✅ Completo. 15/15 tests (Vitest). Ver `PLAN.md` §2.1/§2.3 para el detalle de cada hallazgo. |
| 2 — Backend de pedidos | `GET /api/clientes` (829 clientes reales de `sgc`), CRUD `POST/GET /api/pedidos` contra DB propia | ✅ Completo. Probado con pedido real de 3 líneas + 1 retoma, guardado y releído. |
| 3 — Frontend carrito | `PedidoWizard`, `CatalogoCortesGrid`, `CarritoLateral`, `RetomaPanel`, `ComboboxBuscador`, store Zustand | ✅ UX verificada visualmente (ver §6.1/§6.2). Colores por familia (`calc/coloresFamilia.ts`), badges de cantidad, barras de progreso en el carrito. |
| 4 — Programación semanal (vista de planta) | `ProgramacionSemanal.tsx`, campo `pedidos.origen` (punto_venta\|planta), `calc/semana.ts` | ✅ Implementado 2026-09-23, ver §6.14. Listado general de pedidos / exportación: ⬜ no iniciado. |

Antes de escribir código nuevo: corre `npm install && npm run check` para confirmar que
sigues partiendo de una base verde.

**Verificación visual disponible**: `@playwright/test` está instalado en `apps/web` (dev
dependency) con Chromium ya descargado. Con `npm run dev:api`/`dev:web` corriendo, se puede
levantar un script Playwright temporal (fuera del repo, ej. en el scratchpad) para tomar
screenshots o interactuar con la UI antes de pedir confirmación visual al usuario — no asumir
que el render es correcto solo porque el build pasa. Borrar el script temporal al terminar,
no dejarlo commiteado.

## 2. Método de trabajo para cambios de código

Estas pautas favorecen la cautela sobre la velocidad. Para tareas triviales, aplica criterio
y evita convertir el proceso en burocracia.

### 2.1 Antes de implementar

- **No asumas ni ocultes incertidumbre.** Expón las suposiciones que afecten el resultado. Si
  hay varias interpretaciones relevantes, preséntalas — no elijas una en silencio. Si algo no
  es claro, para y nombra qué es lo confuso antes de continuar.
- **Investiga primero lo que el repositorio puede responder.** Revisa `PLAN.md`, este archivo,
  el código y los tests antes de preguntar o repetir trabajo ya hecho. No uses esta autonomía
  para adivinar reglas de negocio, datos de `sgc` ni decisiones ya tomadas — esas sí se
  preguntan si no están documentadas.
- **Propón la solución más simple que satisfaga la solicitud.** Señala una alternativa más
  sencilla o un costo importante cuando exista; no agregues funcionalidad especulativa,
  configurabilidad no pedida, ni manejo de casos imposibles.
- Para una tarea de varios pasos, declara un plan breve con verificaciones concretas:

  ```text
  1. [Paso] → verificar: [comprobación]
  2. [Paso] → verificar: [comprobación]
  3. [Paso] → verificar: [comprobación]
  ```

### 2.2 Durante la implementación

- **Haz cambios quirúrgicos.** Cada línea modificada debe poder relacionarse con la solicitud.
  No reformatees, refactorices ni "mejores" código adyacente que no esté roto; conserva el
  estilo y los patrones existentes aunque prefieras otros.
- **Escribe el mínimo código necesario.** Nada de abstracciones de un solo uso, opciones de
  configuración no solicitadas, ni manejo de casos que no pueden ocurrir. Si escribiste 200
  líneas y podían ser 50, reescríbelo. Pregúntate: "¿un ingeniero senior diría que esto está
  sobrecomplicado?" — si la respuesta es sí, simplifica.
- **Limpia únicamente lo que tu cambio deje huérfano:** imports, variables, funciones o tests
  que se vuelvan innecesarios por tu propia edición. El código muerto preexistente se reporta,
  no se elimina sin que el usuario lo pida.
- Respeta como límite superior no negociable la regla dura de §5: `sgc` nunca se escribe,
  bajo ninguna circunstancia, desde ningún punto del código.

### 2.3 Verificación y cierre

- Convierte la solicitud en criterios observables antes de darla por terminada. Ejemplos:
  "agregar validación" → escribir tests con entradas inválidas y hacerlos pasar; "corregir un
  bug" → reproducirlo con un test, luego hacerlo pasar; "refactorizar" → verificar el mismo
  comportamiento antes y después.
- Ejecuta `npm run check` (build + tests de ambos workspaces) antes de dar algo por cerrado.
  No afirmes que algo quedó verificado si la prueba no se ejecutó realmente — informa
  cualquier limitación (ej. sin herramienta de navegador, pedir confirmación visual al
  usuario en vez de asumir que el render es correcto).
- Revisa el diff final para detectar cambios accidentales. Actualiza `PLAN.md` (bitácora de
  fases/hallazgos) y este archivo (§1, tabla de estado) solo cuando haya un hallazgo o cambio
  de arquitectura real — una corrección rutinaria no debe inflar la documentación.

**Señales de que este método funciona:** diffs pequeños y explicables, menos retrabajo por
sobreingeniería, dudas relevantes resueltas antes de implementar (no después de un error), y
criterios de éxito verificados con evidencia real, no supuesta.

## 3. Arquitectura (resumen — ver `PLAN.md` §3 para el árbol completo)

```
mvp_pedidos/
├── PLAN.md              alcance, decisiones de negocio, plan de fases con hallazgos
├── CLAUDE.md             este archivo
├── apps/api/             Node + Express + TS — solo esto puede tocar sgc (solo lectura) y
│   │                     la DB propia (lectura+escritura)
│   └── src/
│       ├── sgc/db.ts      pool mysql2 — ver regla dura §5
│       ├── db/            esquema + acceso a la DB propia (sql.js)
│       └── routes/        health, clientes, pedidos
└── apps/web/              React + TS + Vite — UI tipo carrito
    └── src/
        ├── calc/           familiasPiezas.config.ts, especificaciones.config.ts,
        │                   catalogoCortes.ts, proyeccionPiezas.ts — funciones PURAS,
        │                   testeables con Vitest, sin fetch. El catálogo completo vive
        │                   SOLO aquí (decisión 2026-09-22, ver PLAN.md — no hay endpoint
        │                   GET /api/catalogo/cortes, sería duplicación sin beneficio)
        ├── components/     PedidoWizard, ComboboxBuscador, CatalogoCortesGrid,
        │                   CarritoLateral, RetomaPanel, EspecificacionSelector
        └── store/          usePedidoStore.ts (Zustand) — fuente única de verdad son los
                            inputs crudos; la proyección se recalcula a demanda, nunca se
                            persiste (mismo patrón que usePreliquidacionStore.ts de superops_jh)
```

## 4. Comandos

```bash
npm install     # una vez, en la raíz del monorepo
npm run dev:api  # API en :4000
npm run dev:web  # Web en :5173 (proxy /api → :4000, ver vite.config.ts)
npm run check    # build + test de ambos workspaces — correr antes de cerrar cualquier tarea
```

## 5. Reglas duras (no negociables)

1. **La app NUNCA escribe en `sgc`, bajo ninguna circunstancia.** Solo `SELECT`/`SHOW`/
   `EXPLAIN`. Los pedidos capturados viven exclusivamente en la DB propia
   (`apps/api/src/db/`, sql.js). Ver `PLAN.md` §1.1.
2. **No manejes ni imprimas la contraseña de `sgc`** en logs, commits, o salida de terminal
   que quede persistida. Vive solo en `apps/api/.env` (gitignored).
3. **No asumas datos de `sgc`** (nombres de tabla, columnas, ids de producto) — todo lo usado
   hasta ahora fue verificado contra el esquema real, documentado en `PLAN.md` §2. Si
   necesitas un dato nuevo, verifícalo, no lo infieras por convención de nombres.

### 5.1 Hallazgo 2026-09-22 — la cuenta de `sgc` configurada es ADMIN, no readonly

La credencial que el usuario configuró en `apps/api/.env` tiene permisos de
escritura reales en MySQL — **no** es una cuenta `readonly_app` restringida del lado del
servidor. Por lo tanto la regla "solo lectura" de arriba **no está protegida por MySQL, está
forzada en código**: `apps/api/src/sgc/db.ts` expone únicamente `sgcQuery`/`sgcQueryOne`, que
inspeccionan cada sentencia y rechazan cualquier cosa que no empiece por
`SELECT`/`SHOW`/`EXPLAIN` antes de tocar la red. **Nunca importar un pool crudo de mysql2
directo en una ruta nueva** — siempre pasar por esas dos funciones. Si se agrega una query
nueva contra `sgc`, usar `sgcQuery`, nunca `mysql.createPool(...).query(...)` inline.

## 6. Hallazgos y decisiones de sesión (bitácora corta — el detalle completo vive en `PLAN.md`)

### 6.1 — UX del selector Cliente/Sucursal (2026-09-22)

Primera versión usaba un `<select>` nativo con las 829 filas de `GET /api/clientes` —
inmanejable en la práctica (scroll infinito, sin búsqueda). El usuario mostró capturas de
cómo lo resuelve `sgc` real: dos campos encadenados, "Tercero" (autocompletar con dropdown
filtrado en vivo) y luego "Sucursal" (mismo patrón, acotado a las sucursales del Tercero ya
elegido). Reemplazado con `ComboboxBuscador.tsx` (componente genérico) + `setTercero`/
`setSucursal` en el store (antes era un solo `setCliente`). También se corrigió un bug de
layout: el grid del wizard tenía `repeat(4, 1fr)` para lo que ya eran 5 campos (Fecha,
Cliente, Especie, Animales — con Tercero/Sucursal ahora son 5), lo que ocultaba visualmente
el campo "Cantidad de animales".

### 6.2 — Falso bug de UTF-8 en pruebas manuales (2026-09-22, no reinvestigar)

Ver `PLAN.md` §Fase 2 para el detalle completo del diagnóstico. Resumen: no hay ningún bug de
encoding en la aplicación (sql.js, Express, persistencia a archivo — todos verificados
aislados, todos correctos). La corrupción observada al probar manualmente con `curl -d '...'`
en Git Bash fue del terminal de pruebas de esta máquina (`cp1252`), no del código. Al probar
texto con tildes/ñ manualmente, usar un cliente que controle el encoding explícitamente
(Python con `ensure_ascii=False` + `.encode('utf-8')`, o un script Node), no pegar el literal
directo en un comando de shell.

### 6.3 — Rediseño visual del catálogo/carrito (2026-09-22)

A pedido del usuario tras ver la primera versión (monocromática, sin jerarquía visual): cada
familia tiene ahora un color de acento estable (`calc/coloresFamilia.ts`, rota sobre una
paleta fija de 6 colores por orden de aparición), aplicado como variables CSS
(`--acento`/`--acento-oscuro`/`--fondo-suave`) en el header de cada sección de
`CatalogoCortesGrid`. Tarjetas con cantidad > 0 muestran un badge numérico y cambian de fondo
(antes solo un outline sutil). El carrito lateral reemplazó la tabla numérica de
"Esperado/Comprometido/Disponible" por barras de progreso por familia, mismo color que la
sección correspondiente en la grilla — el objetivo explícito era que el administrador "sepa
exactamente lo que le va a llegar de una manera ordenada" de un vistazo, no solo en números.
También se quitó "Cabeza de cerdo" de la grilla (el administrador nunca la pide directamente)
— sigue existiendo en `familiasPiezas.config.ts` sin tocar, solo se filtra en
`catalogoCortes.ts` por `familiaClave === 'cabezaDeCerdo'`.

**Nota de verificación (no reinvestigar)**: durante la prueba visual con Playwright se
sospechó un bug donde un producto que pertenece a 2 familias a la vez (ej. "Tocino y
costilla", que resta en Barriguero Y Costilla de cerdo) no reflejaba la segunda familia en el
resumen. Aislado con un script Playwright dedicado: **no hay bug** — el resumen sí mostraba
ambas familias correctamente; fue una lectura apresurada de una captura con scroll (la sección
"Costilla de cerdo" del resumen estaba fuera del recorte que se revisó primero). La lógica de
`proyeccionPiezas` para productos multi-familia ya estaba cubierta por un test (ver
`proyeccionPiezas.test.ts`, caso "Chuleton") y sigue correcta.

### 6.4 — Modelo "corte padre no se pide a mano" (2026-09-22, cambio de modelo, no solo UI)

El usuario probó con 40 cerdos y señaló que pedir 70 unidades de un corte a punta de click en
"+" era inviable — y más de fondo, que el flujo natural del negocio es al revés: el punto de
venta recibe por DEFECTO el corte genérico (ej. "Barriguero"), y solo lo que el administrador
pide como derivado (Costi-chi, Tocino y costilla...) se desvía de ese default. Confirmado con
el usuario en 3 preguntas antes de implementar (ver contexto de la conversación si hace falta
el detalle completo):

1. El corte padre (primer producto de cada `FamiliaPiezasConfig.productos`, el que da nombre a
   la familia) **ya no es una tarjeta pedible** — `catalogoCortes.ts` expone
   `esPadre: boolean` (true solo si es el primer producto Y la familia tiene más de un
   producto — en Res, con 1 producto por familia, nunca aplica) y lo excluye del catálogo
   pedible que arma la grilla.
2. Su cantidad implícita se muestra como **badge informativo de solo lectura** en el header de
   cada sección (`CatalogoCortesGrid.tsx`, `familiaProyectada.disponible` — el mismo
   `disponible` que ya calculaba `proyeccionPiezas`, esperado − comprometido de TODOS los
   productos pedibles de la familia). No es un dato nuevo, es el mismo cálculo ya verificado,
   solo cambia dónde se muestra.
3. Un producto multi-familia (Costi-chi, Tocino y costilla → Barriguero Y Costilla de cerdo a
   la vez) resta de AMBOS padres simultáneamente — esto no requirió código nuevo, es el
   comportamiento que `proyeccionPiezas` ya tenía.

También se resolvió la ineficiencia del stepper: el número ahora es un `<input type="number">`
editable directamente (escribir "10" de una vez), además de mantener los botones +/- para
ajustes finos de a 1.

**Importante para quien continúe**: `esPadre` es sobre la GRILLA VISUAL (qué se ofrece como
tarjeta), no sobre el cálculo — `proyeccionPiezas.ts` no cambió, sigue sumando
`cantidadPiezas × factor` de cualquier línea que pertenezca a la familia, sin distinguir
"padre" de "derivado". No hay lógica de "restar automáticamente del padre" en ningún lado del
código — el padre simplemente NUNCA aparece como línea de pedido propia, así que su valor
mostrado (`disponible`) ya refleja el descuento sin necesidad de restarle nada a mano.

### 6.10 — Todo corte derivado se pide en cantidades pares (2026-09-23)

Probando con 40 cerdos, el usuario detectó que la grilla dejaba escribir cantidades impares en
cortes especiales (ej. 9 Churrasco de cerdo) — confirmó explícitamente que es un hallazgo de
negocio, no un capricho de UI: cada corte derivado es bilateral (viene en pares por animal,
mismo motivo que ya justificaba el multiplicador ×2 de Punta de anca/Cabeza de lomo/etc.), así
que un valor impar no es físicamente entregable. Aplica a TODOS los derivados, ambas especies
— no solo a Cerdo, no solo a algunos cortes.

Implementación (`apps/web/src/store/usePedidoStore.ts`, `setCantidadTotalLinea`): tras aplicar
el tope de `maxCantidadPermitida` (§6.6), se redondea hacia abajo al par más cercano —
`Math.floor(Math.min(cantidadDeseada, max) / 2) * 2`. Sin mensaje de error, mismo patrón sin
fricción que el bloqueo duro existente: el campo simplemente no queda en impar, ni escribiendo
directo ni con el botón "+". `CatalogoCortesGrid.tsx` gana un prop `paso` en el `Stepper`
genérico (default 1) — el stepper del modo `'total'` (paso 1 del wizard, el único que llama a
`setCantidadTotalLinea`) usa `paso={2}` para que el botón "+" salte 0→2→4 en vez de quedarse
atascado en un impar que el store recortaría de vuelta a 0. El input numérico sigue aceptando
cualquier tecleo; el redondeo ocurre en el store al confirmar, no en el input.

**Actualizado 2026-09-23 — `repartirPresentacion` (paso 2) también quedó incluido.** La
primera versión de este hallazgo dejó el reparto Vacío/Granel del paso 2 sin tocar (ver git
history si hace falta el razonamiento original) asumiendo que bastaba con que el TOTAL fuera
par. El usuario probó el paso 2 y mostró un caso real ("Lomo — 27 Vacío + 13 Granel", total 80)
donde cada presentación individual quedaba impar — pidió explícitamente que también se fuerce
paridad ahí, confirmando (al preguntársele el criterio de redondeo) el mismo patrón que el
paso 1: redondear hacia abajo la presentación que se está editando, nunca hacia el par más
cercano. Implementación (`repartirPresentacion`): la cantidad de la presentación editada se
recorta al total disponible y LUEGO se redondea con `Math.floor(acotada / 2) * 2`; el
complemento (`total - nuevaCantidad`) queda par automáticamente sin redondearlo aparte, porque
el total ya es par (garantizado por `setCantidadTotalLinea`) y par−par=par. Los steppers
`Vacío`/`Granel` en `CatalogoCortesGrid.tsx` (modo `'presentacion'`) también usan `paso={2}`.

**Tampoco se tocó el corte padre** ("sin transformar", generado automáticamente en
`irAPaso2()`, ver §6.9): su cantidad es `disponible` (esperado − comprometido de la familia),
que puede quedar en un valor impar legítimo si los derivados ya restaron un número impar de
piezas — no pasa por `setCantidadTotalLinea`, así que no aplica el redondeo. Es el remanente
de una resta, no un pedido bilateral en sí mismo.

**Bug real encontrado y corregido el mismo día**: la primera versión del `Stepper` llamaba a
`onChange` (que redondea) en cada tecla del `onChange` nativo del input — el usuario reportó
que era imposible escribir "12" a mano: el primer dígito ("1") se redondeaba a "0" antes de
que el segundo dígito ("2") se agregara, dejando el campo atascado en el último dígito tecleado
suelto. Fix: el `Stepper` ahora guarda el texto tecleado en estado local (`useState`) sin
redondear mientras el usuario escribe, y solo llama a `onChange` (el redondeo real) al perder
el foco (`onBlur`) o presionar Enter — mismo patrón que cualquier input numérico controlado que
necesita permitir estados intermedios inválidos ("1", a medio escribir "12") sin descartarlos.
Los botones +/- siguen llamando a `onChange` directo (no pasan por texto intermedio, no tienen
este problema). Verificado con Playwright tecleando "12" carácter por carácter.

### 6.5 — El resumen lateral debe mostrar TODOS los cortes padre desde el inicio (2026-09-22)

Seguimiento directo de §6.4: la primera versión de `CarritoLateral.tsx` solo listaba familias
con `comprometido > 0` (mensaje "aún no has agregado cortes" si el carrito estaba vacío). El
usuario mostró con capturas que eso no cumple el objetivo real: quiere ver, apenas escribe la
cantidad de animales, TODOS los cortes padre con su valor completo (ej. 40 cerdos → "Barriguero
80 sin transformar", "Pierna 80 sin transformar"...), y que cada uno se reduzca en vivo según
lo que va pidiendo de sus derivados — no que la lista empiece vacía y se llene reactivamente.
Fix: se quitó el filtro `familiasConCompromiso`, `CarritoLateral` ahora itera `proyeccion`
completa (ver `apps/web/src/components/CarritoLateral.tsx`). También se cambió el texto de la
cifra de "comprometido/esperado" a "`disponible` sin transformar (de `esperado`)" — mismos 3
campos que ya devolvía `proyeccionPiezas`, solo se cambió cuál se muestra primero para que
calce con el mental model del usuario ("cuánto me queda del corte padre", no "cuánto llevo
gastado de un total"). No hubo cambio de cálculo, solo de filtro y de copy.

### 6.6 — Cabeza de lomo ×2 (no ×1) + bloqueo duro real (2026-09-22)

Dos cambios confirmados explícitamente por el usuario en la misma sesión, tras probar el
flujo con 25 cerdos:

**a) Multiplicador de "Cabeza de lomo" cambiado a ×2** (antes ×1, copiado sin modificar de
`superops_jh`). La razón del ×1 en `superops_jh` sigue siendo válida PARA SU caso de uso — ahí
se valida desposte real, y las 2 mitades de Cabeza de lomo de un animal se pesan juntas en una
sola canasta (`num_piezas=1` por animal, verificado contra 6 programaciones reales). Pero para
proyectar un PEDIDO, lo relevante es cuántas piezas físicas recibe el punto de venta, que
siguen siendo 2 por animal aunque en planta se registren como 1. Confirmado explícitamente por
el usuario antes de cambiar (no se asumió). Cambio solo en
`apps/web/src/calc/familiasPiezas.config.ts` de este MVP — la copia de `superops_jh` no se
toca. Ver comentario extenso en el código para el detalle completo del razonamiento.

**b) Bloqueo duro real, revirtiendo PLAN.md §1.3 original** — ver ese archivo para el detalle
de la decisión. Implementación: `maxCantidadPermitida(cantidadAnimales, especie, productoId,
otrasLineas)` en `proyeccionPiezas.ts`, que para cada familia a la que pertenece `productoId`
calcula `Math.floor((esperado − comprometidoPorOtrasLineas) / factor)` y devuelve el mínimo
entre todas (nunca negativo). `usePedidoStore.setCantidadLinea` la usa para recortar
`cantidad` antes de guardarla — el usuario nunca ve un mensaje de error, el número
simplemente no sube más del tope, tanto escribiendo directo como con el botón "+".

**Importante para quien continúe**: el bloqueo vive en el STORE (`setCantidadLinea`), no en
los componentes — cualquier otro lugar que modifique `lineas` directamente (no debería
haberlo, pero si se agrega) tiene que pasar por la misma función o el bloqueo se puede saltar.
El campo `sobrepasado`/la clase `fila-sobrepasada` de `proyeccionPiezas`/`ProyeccionFamilia`
ya no debería activarse nunca en el flujo normal de la UI (el bloqueo lo previene antes), pero
se dejó en el motor de cálculo como defensa en profundidad — no se eliminó.

### 6.7 — Registro real de pedidos manuales (PDF) → especificaciones, retoma y presentación mixta (2026-09-22)

El usuario compartió `SCSJ_REGISTRO_ANUAL_CERDO_2026 - MAQUILAS.pdf` (gitignored, contiene
datos reales de clientes — no versionar, ver `.gitignore`), el registro Excel/manual con el
que el negocio toma pedidos HOY, para entender el problema real que la app reemplaza. **No es
un modelo a copiar literal** — es texto libre de instrucciones combinadas (ej. "HOMBRILLO
SEPARADO, 30 ANCAS, 10 COSTICHI, SOLOMITOS APARTE Y ENVIAR ETIQUETAS DE CONGELACIÓN"), y el
usuario fue explícito: "no vamos a dejar nada como texto libre... te pasé eso para que
entiendas lo que queremos eficientizar". De ahí se extrajeron 3 patrones ESTRUCTURADOS reales
y se implementaron como catálogo, no como campo de texto:

**a) `ESPECIFICACIONES_CERDO`** (nuevo, `apps/web/src/calc/especificaciones.config.ts` — antes
solo existía `ESPECIFICACIONES_RES`). Solo 2 entradas, las únicas que se repiten con nombre de
corte identificable en el documento: Papada → "Hombrillo separado" (>10 menciones), Solomito
de cerdo (id 52) → "Aparte" (>8 menciones). El resto de frases del documento (unidades en Kg,
presentaciones combinadas tipo "Manero entero" = Papada+Cabeza de lomo+Manero deshuesado,
instrucciones generales de logística como "enviar etiquetas de congelación") se dejaron FUERA
a propósito — ver puntos (d) y (e) más abajo.

**b) `RETOMA_EXTENDIDA_CERDO`** (nuevo, `apps/web/src/calc/retomaExtendida.config.ts`) — el
documento retoma con mucha frecuencia productos que nunca aparecían en ningún catálogo de la
app: Vísceras (id 19), Pedacitos (id 21), Desgorde (id 20), Tocino grasa (id 9), Garra (id
14), Hueso blanco de cerdo (id 18), Cadero (id 15), Empella (id 16) — mismos productos que
`superops_jh/CLAUDE.md` §6.20 documenta como "sin patrón fijo de piezas/canal, van a
comparación contra promedio histórico". `RetomaPanel.tsx` ahora los muestra en una segunda
sección ("Otros productos, sin proyección por familia") separada de los cortes ya pedibles —
nunca aparecen en `CatalogoCortesGrid`, solo en Retoma, y no restan de ningún `disponible`.

**c) Presentación Vacío/Granel MIXTA por línea** — el documento tiene casos reales como
"MITAD BARRIGUERO A GRANEL, MITAD PAPADA A GRANEL" o "20 COSTICHIP... LA MITAD DE SOLOMITOS A
GRANEL". Antes cada línea de carrito tenía una sola `presentacion` (Vacío O Granel). Cambio de
modelo: `LineaCarrito` pasó de `{ cantidad, presentacion }` a
`{ cantidadVacio, cantidadGranel }` — cada tarjeta de `CatalogoCortesGrid.tsx` ahora tiene 2
mini-steppers (`StepperPresentacion`, uno por presentación) en vez de un stepper + checkbox.
El total pedido de la línea es `cantidadVacio + cantidadGranel` (usado por `proyeccion()` y
por `maxCantidadPermitida` en el bloqueo duro — las 2 presentaciones cuentan juntas contra el
disponible de la familia). **El backend NO cambió**: `PedidoLineaInput` ya modelaba 1
presentación por fila (mismo nivel de granularidad que `pedido_lineas` en la DB) — el store
simplemente expande cada `LineaCarrito` a hasta 2 filas de `PedidoLineaInput` en
`guardarPedido()` (una por presentación con cantidad > 0). Verificado end-to-end contra la API
real: un pedido con 5 Vacío + 3 Granel del mismo `productoId` se guardó como 2 filas
independientes en `pedido_lineas`, mismo `producto_id`, `presentacion` distinta.

**d) Pospuesto explícitamente, NO implementar sin que el usuario lo pida de nuevo**:
- Pedidos en Kg — "nada de pedidos por Kg, todo por cantidad de cerdos y piezas" (confirmado
  explícito). El documento SÍ tiene casos reales en Kg ("100 KG DE CHULETA DE MANERO"), pero
  quedan fuera del alcance de este MVP a propósito.
- Sección de "instrucciones generales del pedido" (ej. "Enviar etiquetas de congelación",
  "Rótulo de congelado") — el usuario prefirió esperar a tener más ejemplos reales antes de
  catalogar solo 2 frases distintas. Si se agrega después, seguir el mismo patrón de
  `RetomaPanel` (chips seleccionables, sección aparte del carrito de líneas).
- "Manero entero" (Papada + Cabeza de lomo + Manero deshuesado y pegado, presentación
  combinada de 3 familias en un solo corte físico) — no se modeló, no se preguntó. Si aparece
  como pedido explícito más adelante, es un caso nuevo de arquitectura (una línea que resta de
  3 familias a la vez con semántica de "producto compuesto", distinto del multi-familia ya
  existente tipo Chuleton) — no asumir la solución, preguntar primero.

**e) Nota de método para quien continúe**: cuando el usuario comparte un documento operativo
real "para que entiendas el problema", el instinto correcto es extraer PATRONES
ESTRUCTURADOS repetidos (con volumen de menciones) y convertirlos en catálogo — nunca copiar
el documento como está ni convertirlo en un campo de texto libre "por si acaso". Aquí el
criterio de corte fue: ¿la frase se repite ≥5 veces con un corte identificable? → catálogo. ¿Es
un caso aislado o ambiguo? → se deja fuera y se pregunta antes de inventar una categoría.

**Corrección del mismo día**: al iterar `proyeccion` completa se coló de nuevo "Cabeza de
cerdo" en el resumen lateral — la exclusión de §6.3/§6.4 (`familiaClave !== 'cabezaDeCerdo'`)
solo estaba aplicada en `catalogoCortes.ts` (la grilla), no en `CarritoLateral.tsx`. Si se
agrega una tercera vista que también recorra `proyeccion()` o `catalogoCortes()`, verificar
que excluya `cabezaDeCerdo` ahí también — no hay un solo punto central que lo filtre, cada
componente que muestra familias lo tiene que hacer explícitamente.

### 6.8 — Flujo de captura en 2 pasos: cantidad total → reparto Vacío/Granel (2026-09-22)

A pedido del usuario: la Fase 3 original pedía la cantidad de cada corte Y su presentación
(Vacío/Granel) en el mismo paso — se dividió en 2 pantallas secuenciales. `usePedidoStore`
gana un campo `paso: 1 | 2` (no persistido, solo de sesión de captura) con acciones
`irAPaso2`/`volverAPaso1`.

- **Paso 1** (`App.tsx` con `paso === 1`): `PedidoWizard` + `CatalogoCortesGrid modo="total"` +
  `RetomaPanel`. Cada tarjeta tiene UN solo stepper — la cantidad total del corte, sin
  distinguir presentación. Nueva acción del store: `setCantidadTotalLinea(productoId, nombre,
  cantidadTotal)` — escribe sobre `cantidadVacio` (presentación por defecto) y deja
  `cantidadGranel` en 0 para una línea nueva; si la línea ya existía (el admin volvió a este
  paso y cambió el total), mantiene el reparto ya hecho, recortando `cantidadGranel` primero
  si el nuevo total ya no alcanza para lo que había ahí.
- **Paso 2** (`App.tsx` con `paso === 2`): solo `CatalogoCortesGrid modo="presentacion"` — la
  grilla se filtra a únicamente las familias/cortes que ya tienen una línea con cantidad > 0
  en el paso 1 (`familiasVisibles`/`cortesConLinea` en `CatalogoCortesGrid.tsx`). Cada tarjeta
  muestra "Total: N" fijo (de solo lectura) y 2 steppers (Vacío/Granel) para repartir ese
  total ya fijado.

**Bug real encontrado y corregido durante la implementación** (verificado con Playwright antes
de darlo por cerrado, no solo por inspección): la primera versión reutilizó la acción vieja
`setCantidadLinea` (pensada para el modelo de 1 sola pantalla, donde cada presentación se
fijaba independientemente y el total era la SUMA de ambas) también para el paso 2 — resultado:
mover el stepper de Granel no restaba de Vacío, el total real subía por encima de lo fijado en
el paso 1 (ej. Vacío=12 fijo + mover Granel a 5 → total quedaba en 17, no en 12). Se reemplazó
por una acción nueva, `repartirPresentacion(productoId, presentacion, cantidad)`, que NUNCA
cambia el total de la línea — mueve piezas de una presentación a la otra
(`vacioFinal = total - granelFinal`, y viceversa). Como el total no cambia, `repartirPresentacion`
NO necesita pasar por `maxCantidadPermitida` (el bloqueo duro del §1.3/§6.6) — es imposible
exceder el disponible moviendo piezas que ya estaban contadas. `setCantidadLinea` (la acción
vieja) se ELIMINÓ del store — ya no tiene ningún caller; si se necesita en el futuro un modo de
una sola pantalla otra vez, hay que revisar si conviene resucitarla o si `repartirPresentacion`
+ `setCantidadTotalLinea` ya cubren el caso.

**Importante para quien continúe**: el store ya NO valida `puedeGuardar` solo con las
condiciones básicas — `CarritoLateral.tsx` distingue `puedeAvanzar` (paso 1 → 2) de
`puedeGuardar` (`puedeAvanzar && status !== 'guardando'`, usado solo en paso 2 para el botón
"Confirmar pedido"). **Corregido 2026-09-22 (ver §6.9)**: `puedeAvanzar` ya NO exige
`lineas.length > 0` — un pedido "todo sin transformar" es válido con 0 líneas de carrito en el
paso 1, ver el hallazgo de abajo.

### 6.9 — Pedido "todo sin transformar" (sin ningún corte especial) debe poder avanzar y guardarse completo (2026-09-22)

El usuario probó un pedido real donde NO quería ningún corte derivado — solo el corte padre
genérico completo (ej. "60 Manero sin transformar" con 30 cerdos) — y el botón "Siguiente" no
dejaba avanzar, porque `puedeAvanzar` exigía `lineas.length > 0`. Dos problemas reales
encadenados, ambos corregidos:

1. **Bloqueo de navegación**: `puedeAvanzar` (`CarritoLateral.tsx`) ya no exige ninguna línea
   — solo fecha+cliente+especie+animales.
2. **Auditabilidad del dato guardado**: si el pedido avanza sin ninguna línea, `pedido_lineas`
   quedaría vacía — nada explícito registrando que se pidieron 60 Manero, 60 Pierna, etc. El
   usuario confirmó que quiere una línea EXPLÍCITA por cada corte padre sin transformar, no
   dejarlo implícito en `cantidad_animales`.

Implementación: `catalogoCortes.ts` gana `corteDelPadre(familiaClave, especie)` (productoId +
nombre del primer producto de una familia — el mismo criterio que ya usaba `esPadre`, sin
exigir más de 1 producto). `usePedidoStore.irAPaso2()` ahora, antes de cambiar `paso`, recorre
`proyeccionPiezas()` y por cada familia con `disponible > 0` que aún no tenga ninguna línea de
carrito, genera una línea nueva con `productoId` del corte padre y `cantidadVacio =
disponible` (Vacío es la presentación por defecto, igual que `setCantidadTotalLinea`).
`volverAPaso1()` es simétrico: quita esas líneas "sin transformar" generadas automáticamente
(identificadas por ser el primer producto de una familia con >1 producto — el mismo criterio
de `esPadre`) para que ir y volver entre pasos no las duplique ni las deje huérfanas.
Verificado con Playwright: ciclo paso1→paso2→paso1→paso2 se queda en 7 líneas, no 14.

**`CatalogoCortesGrid.tsx` necesitó un ajuste adicional**: en modo `'presentacion'` (paso 2),
`catalogoCortes()` sigue excluyendo los cortes padre (correcto para el modo `'total'`, donde
nunca se piden a mano) — pero las líneas "sin transformar" recién generadas SÍ necesitan una
tarjeta en el paso 2 para poder repartir su Vacío/Granel. Se agregó una lista de "padres con
línea" construida directo desde `FAMILIAS_PIEZAS`/`FAMILIAS_PIEZAS_RES` (no desde
`catalogoCortes()`), solo visible en modo `'presentacion'` y solo si ya existe una línea de
carrito con ese `productoId` — con el nombre sufijado "(sin transformar)" para no confundirse
visualmente con un corte derivado real. Verificado end-to-end contra la API real: un pedido de
30 cerdos sin ningún corte especial guardó 7 líneas explícitas en `pedido_lineas` (una por
familia con `productoId` del corte padre: Manero id 5, Pierna id 4, Lomo id 3, Papada id 8,
Barriguero id 7, Costilla de cerdo id 10, Cabeza de lomo id 6), 60 unidades cada una.

### 6.11 — Aviso de "depende del % de grasa" en Punta de anca de cerdo (2026-09-23)

A pedido del usuario: Punta de anca de cerdo (productoId 79, ver `PUNTA_DE_ANCA_CONFIG` en
`familiasPiezas.config.ts`) es un corte cuyo rendimiento real varía según el porcentaje de
grasa del lote de cerdos — algo que la app no puede proyectar con los datos que tiene — así
que se agregó un aviso visible cuando el administrador le pide cantidad.

Implementación: `CorteCatalogo` (`catalogoCortes.ts`) gana un campo opcional `nota?: string`,
poblado SOLO para este producto (no es un mecanismo genérico de "notas por corte" — si se
necesita para otro corte en el futuro, es agregar la misma propiedad al `vistos.set(...)`
correspondiente). `CatalogoCortesGrid.tsx` la muestra debajo del nombre de la tarjeta SOLO
cuando `cantidadTotal > 0` (no antes — se decidió no mostrarla como ruido permanente en cada
tarjeta con cantidad 0, el aviso importa cuando el admin ya decidió pedir el corte). Estilo
`.tarjeta-nota` en `index.css` (fondo ámbar, ícono ⚠). Verificado con Playwright: 0 notas
visibles en cantidad 0, aparece el texto exacto al fijar cantidad 10.

**Nota para quien continúe**: no se buscó ni se preguntó por otros cortes que pudieran
necesitar el mismo aviso (ej. otros cortes con rendimiento variable) — el usuario pidió
específicamente Punta de anca de cerdo. Si se identifica otro caso, es la misma mecánica
(`nota` en `catalogoCortes.ts`), no una funcionalidad nueva.

### 6.12 — Retoma no ofrecía los cortes padre ("sin transformar") + limpieza de copy (2026-09-23)

El usuario pidió "eficientizar" `RetomaPanel` y señaló, mostrando una captura, que faltaban
cortes de cerdo. Al preguntar cuáles exactamente (no se adivinó), la respuesta acotó el
problema real: el administrador no podía marcar en Retoma la **Pierna** (el corte padre
genérico) — confirmado que aplica a los 7 padres por igual (Manero, Pierna, Lomo, Papada,
Barriguero, Costilla de cerdo, Cabeza de lomo), no solo a Pierna. Causa raíz: `RetomaPanel`
reutilizaba `catalogoCortes(especie)` sin más, y esa función excluye a propósito los cortes
padre (`esPadre: true`, ver §6.4) porque nunca se PIDEN a mano — pero "nunca se pide a mano" y
"nunca se puede retomar" son cosas distintas: el punto de venta sí puede tener exceso del
corte genérico sin transformar (es lo que recibe por defecto), y el administrador necesita
poder marcarlo igual que cualquier derivado.

Implementación: `catalogoCortes.ts` gana `cortesPadre(especie)` — todos los padres de una
especie (mismo criterio que `esPadre`, un padre por cada familia con más de un producto), sin
tocar `catalogoCortes()` (la grilla pedible sigue excluyéndolos, eso no cambió).
`RetomaPanel.tsx` ahora muestra 3 secciones de chips en vez de 2: "Cortes sin transformar"
(nuevo, `cortesPadre`), "Cortes especiales" (el `catalogoCortes` de siempre), "Otros productos"
(`RETOMA_EXTENDIDA_CERDO`, sin cambios). Se extrajo un helper `chips(lista)` dentro del
componente para no triplicar el JSX de botón+estado-marcado entre las 3 secciones.

También se eliminó, a pedido explícito del usuario, la línea de copy "Marca aquí los cortes
que el punto de venta ya tiene en exceso — se quedan en planta, no cuentan como pedido." — la
consideró redundante frente al título "Retoma — productos que NO se despachan" (ya explica lo
mismo). No se tocó `.carrito-hint` en `index.css` — sigue en uso por `CarritoLateral.tsx`.

**"Cabeza de cerdo" sigue sin aparecer en ningún lado de Retoma**, a propósito — no tiene
`esPadre: true` (su familia tiene un solo producto, no hay nada que "transformar" ni derivar),
y ya estaba excluida de `catalogoCortes()` desde §6.3 ("el administrador nunca la pide
directamente"). No se tocó esa exclusión — el usuario no la mencionó y es una decisión ya
tomada, no un olvido de este hallazgo.

### 6.13 — Retoma con cantidad parcial en piezas (2026-09-23)

El usuario mostró un caso real: pedido de 30 cerdos donde el punto de venta solo quiere
retomar 10 Piernas, no las 60 esperadas — hasta ahora Retoma era todo-o-nada (marcar/
desmarcar el producto completo, sin número). También preguntó dónde se guardaba la nota de
Retoma (confirmado: sí se persistía, columna `pedido_retomas.nota` en la DB propia — el
problema real no era la nota, era la falta de cantidad).

Antes de implementar se confirmaron 2 decisiones de negocio con el usuario: (1) la cantidad
retomada de un corte con proyección de piezas SÍ debe restar del `disponible` de su familia,
igual que una línea de pedido normal — evita que el sistema deje pedir de más sin saber que ya
hay piezas comprometidas en Retoma; (2) el campo de cantidad solo aplica a los productos que
YA tienen proyección de piezas (`cortesPadre` + `catalogoCortes`, las 2 primeras secciones de
`RetomaPanel`) — los de "Otros productos" (`RETOMA_EXTENDIDA_CERDO`: Cadero, Garra, Vísceras...)
siguen siendo todo-o-nada ("Lote completo"), porque no tienen multiplicador confiable contra
el cual medir piezas (ver §6.7/superops_jh §6.20).

**Modelo de datos** — `pedido_retomas` gana columna `cantidad REAL` nullable (migración
`ALTER TABLE` idempotente en `ensureSchema`, ver `apps/api/src/db/schema.ts`: envuelta en
try/catch porque SQLite no soporta `ADD COLUMN IF NOT EXISTS` y las DBs de desarrollo ya
creadas antes de este cambio no tenían la columna). `null`/`undefined` = "se retoma el lote
completo, sin cantidad" (comportamiento de antes, sin cambio para `RETOMA_EXTENDIDA_CERDO`).
`PedidoRetomaInput` (backend y frontend, `db/types.ts`/`types/dto.ts`) gana `cantidad?: number
| null`.

**Store** (`usePedidoStore.ts`): nueva acción `setCantidadRetoma(productoId, cantidad)` — mismo
patrón que `setCantidadTotalLinea` (§6.6/§6.10): recorta contra `maxCantidadPermitida` y
redondea a par (bilateralidad). La diferencia es qué cuenta como "ya comprometido" al calcular
el máximo: no solo las demás líneas de `lineas`, sino TAMBIÉN las demás retomas con cantidad —
así, retomar 10 Piernas y luego intentar pedir 60 Chuleta de pierna (que también resta de la
familia Pierna) respeta el límite real de 50 restantes, y viceversa (`setCantidadTotalLinea`
también se actualizó para incluir las retomas como "otras líneas" al calcular su propio
máximo). `proyeccion()` concatena `lineas` + `retomas.filter(cantidad>0)` como `LineaPedido[]`
antes de llamar a `proyeccionPiezas` — una retoma con cantidad resta del disponible exactamente
como una línea de pedido, sin ser una línea de pedido real (nunca se guarda en
`pedido_lineas`). `guardarPedido()` incluye `cantidad` en el payload de cada retoma
(`cantidad || null` — 0 se normaliza a null, mismo significado "sin cantidad especificada").

**UI** (`RetomaPanel.tsx`): la lista de retomas marcadas (debajo de los chips) ahora muestra,
por cada producto, un input de cantidad (si tiene proyección — `conProyeccion`, unión de
`cortesPadre`+`catalogoCortes`) o el texto "Lote completo" (si no la tiene). El input reutiliza
el mismo patrón de `Stepper` en `CatalogoCortesGrid.tsx` (§6.10): texto tecleado en estado
local, redondeo a par solo al confirmar (blur/Enter) — mismo bug que ya se corrigió ahí
(redondear en cada tecla rompía escribir números de 2+ dígitos), extraído como componente
`InputCantidadRetoma` dentro de `RetomaPanel.tsx` (no compartido con `Stepper` — son
componentes chicos y el `paso` fijo en 2 no amerita generalizar entre archivos todavía).

Verificado end-to-end contra la API real: 30 cerdos, retomar 10 Piernas + Cadero completo →
resumen lateral muestra "Pierna 50 sin transformar (de 60)" en vivo, y el pedido guardado
persiste `{ productoId: 4, cantidad: 10 }` para Pierna y `{ productoId: 15, cantidad: null }`
para Cadero en `pedido_retomas`.

### 6.14 — Vista de planta: Programación semanal + pedidos de origen "planta" (2026-09-23)

El usuario pidió una vista tipo calendario para que planta vea los pedidos ya hechos por los
puntos de venta, agrupados por semana, y pueda cubrir con pedidos propios el excedente sobre
la capacidad fija de desposte. Antes de implementar se confirmaron 3 decisiones de negocio
(no se asumió ninguna):

1. **La capacidad semanal es una constante fija de negocio (3240 cerdos), no un dato de
   `sgc` ni algo configurable en la UI todavía** — `CAPACIDAD_SEMANAL_CERDOS` en
   `apps/web/src/calc/semana.ts`. Si el negocio necesita cambiarla, hoy es editar ese número
   en el código; no se construyó UI de configuración porque no se pidió.
2. **Un "slot" es un pedido individual** — no se creó un concepto nuevo de "franja horaria" ni
   "turno": el calendario agrupa los pedidos (tabla `pedidos` ya existente) por semana y
   fecha, nada más.
3. **Semana calendario lunes-domingo** (ISO estándar, sin ciclo operativo especial).
4. **Un pedido de planta reusa el mismo formulario/tabla que un pedido de punto de venta** —
   mismos cortes, misma cantidad de animales, mismo flujo de 2 pasos — pero sin Tercero/
   Sucursal obligatorio. Se distingue por un campo nuevo `origen: 'punto_venta' | 'planta'`,
   no por una tabla separada.

**Modelo de datos**: `pedidos` gana columna `origen TEXT NOT NULL DEFAULT 'punto_venta'`
(migración `ALTER TABLE` idempotente en `ensureSchema`, mismo patrón try/catch que la
migración de `pedido_retomas.cantidad` en §6.13 — las DBs de desarrollo ya creadas antes de
este cambio no tenían la columna). `PedidoInput`/`Pedido`/`PedidoResumen` (backend
`db/types.ts` y frontend `types/dto.ts`) ganan `origen` — opcional en el input (default
`'punto_venta'` si se omite, para no romper nada que ya llamara `POST /api/pedidos` sin ese
campo), obligatorio en las respuestas. **No se creó ningún endpoint nuevo** — la vista
consume `GET /api/pedidos` (ya existente, ya trae `fechaEntrega`/`cantidadAnimales`/
`especie`/`origen`) y agrupa por semana en el FRONTEND (`ProgramacionSemanal.tsx`); con el
volumen de pedidos de este MVP, agregar en el servidor habría sido complejidad sin beneficio
real — si el volumen crece mucho, revisar esta decisión.

**`calc/semana.ts`** (funciones puras, testeadas — `semana.test.ts`, 4 casos: martes, lunes,
domingo, y el cálculo del domingo desde el lunes): `lunesDeLaSemana(fechaISO)` y
`domingoDeLaSemana(lunesISO)`, cálculo en UTC explícito (`Date.UTC`) para no depender de la
zona horaria del navegador/servidor donde corra la app.

**Store** (`usePedidoStore.ts`): campo `origen` (default `'punto_venta'`, parte de
`ESTADO_INICIAL`), acción `setOrigen`. `reset()` gana un parámetro opcional
`reset(origenInicial?)` — sin argumento vuelve al estado normal, con `'planta'` arranca ya en
modo pedido de planta (usado por el botón "Crear pedido de planta" de la vista de
Programación). `puedeAvanzar` (`CarritoLateral.tsx`) ya no exige `clienteNombre !== ''` cuando
`origen === 'planta'`. `guardarPedido()` incluye `origen` en el payload.

**UI**: `App.tsx` gana un toggle simple (`useState`, sin librería de routing — no había
ninguna instalada y el volumen de vistas no lo justifica) entre "Captura de pedido" y
"Programación semanal". `PedidoWizard.tsx` oculta los combobox de Tercero/Sucursal cuando
`origen === 'planta'` y muestra un aviso ámbar ("🏭 Pedido de planta..."); el grid de 5
columnas del wizard (ver §6.1) se reduce a 3 en ese modo (`.wizard-planta` en `index.css`).
`ProgramacionSemanal.tsx` (nuevo): navegación semana a semana, barra de progreso
`comprometido/CAPACIDAD_SEMANAL_CERDOS` (verde si ≤100%, roja si se excede — no debería
poder excederse con el flujo normal, pero no hay bloqueo duro que lo impida: nada evita que
dos personas de planta creen pedidos duplicados a la vez). **Solo agrupa Cerdo** — Res no
tiene una capacidad semanal fija conocida (el usuario no la mencionó), los pedidos de Res de
esa semana no se muestran en esta vista todavía (quedan fuera de alcance, no se preguntó ni se
asumió un número).

**Actualizado 2026-09-23 — grid de calendario semanal (Kanban), no lista.** El usuario mostró
capturas de Google Calendar en vista semana y pidió ese layout, con la aclaración de que "en
esa misma interfaz se creen los slots restantes de planta". Antes de implementar se confirmó
una duda real: Google Calendar posiciona eventos por HORA (eje vertical), pero los pedidos de
esta app solo tienen `fechaEntrega` (día, sin hora) — el usuario confirmó que NO hace falta
agregar hora, el layout correcto es un Kanban semanal: 7 columnas (Lunes-Domingo, fijo en ese
orden, no depende del locale del navegador), cada pedido es una tarjeta apilada verticalmente
en la columna de su día, sin eje de tiempo. `calc/semana.ts` ganó `diasDeLaSemana(lunesISO)`
(los 7 días ISO en orden, testeada). Cada columna tiene su propio botón "+ Pedido de planta"
al pie — llama `onCrearPedidoPlanta(diaExacto)` con la fecha exacta de ESA columna (no el
lunes de la semana, a diferencia de la primera versión) — así "crear el slot" ocurre
directamente sobre el día vacío que se está mirando, igual que click-para-crear-evento en
Google Calendar real. El botón genérico "Crear pedido de planta para el excedente" que vivía
junto a la barra de capacidad se eliminó (quedaba redundante con el botón por día, y creaba
dos caminos distintos a la misma acción) — el texto de la barra ahora apunta al botón de la
columna correspondiente. El día de hoy se resalta con un outline (`.calendario-dia-hoy`).

Verificado end-to-end con Playwright contra la API real: semana 2026-09-28/2026-10-04 con 100
cerdos ya comprometidos por 3 pedidos de punto de venta (guardados en sesiones anteriores) →
excedente mostrado "3140 cerdos" antes del fix, clic en "Crear pedido de planta" → wizard sin
Tercero/Sucursal, fecha precargada en 2026-09-28 → guardado de 500 cerdos como pedido de
planta → vuelta a Programación semanal: barra sube a "600 de 3240", excedente baja a "2640
cerdos" exacto, fila del pedido de planta visible y resaltada en la lista.

**Nota para quien continúe**: no hay bloqueo duro que impida guardar MÁS pedidos de planta de
los que caben en el excedente restante (a diferencia del bloqueo de piezas por familia dentro
de un pedido, ver §6.6) — el número de cerdos de un pedido de planta es libre, la barra solo
informa. Si el negocio pide que también se bloquee ahí, es una extensión del mismo patrón de
`maxCantidadPermitida`, pero a nivel de "cantidad de animales de la semana", no de piezas —
no se implementó porque no se pidió.
