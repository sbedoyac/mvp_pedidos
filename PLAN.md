# MVP Pedidos JH — Plan de proyecto

> Este archivo es el punto de entrada para cualquier LLM/desarrollador que continúe este
> proyecto. Léelo completo antes de escribir código. Sigue el mismo espíritu de
> `superops_jh/CLAUDE.md` (verificar contra `sgc` real antes de asumir, documentar hallazgos),
> pero este es un proyecto NUEVO e independiente — no reutiliza código de `superops_jh`, solo
> se apoya en el conocimiento de esquema ya validado ahí.

## 0. Qué es esto, en una frase

Una app de captura de pedidos (React+TS, estilo carrito de compras — clicks rápidos, sin
formularios largos) para que un administrador de Super Carnes JH registre el pedido de un
punto de venta (cliente/sucursal, fecha de entrega, cantidad de animales, cortes especiales,
retomas), viendo en tiempo real cuánto de cada corte "padre" (Pierna, Lomo, Papada...) va
comprometiendo a medida que agrega cortes derivados (Punta de anca, Chuleta de manero...) —
reutilizando el modelo de familias de piezas ya verificado en `superops_jh` (multiplicador
×2/×1 por animal, relaciones padre↔hijo, factor de conversión).

## 1. Decisiones de alcance ya confirmadas con el usuario (2026-09-22)

No las reabras sin que el usuario lo pida explícitamente — ya se preguntó y se descartó la
alternativa en cada caso:

1. **Base de datos propia, independiente de `sgc`.** El MVP tiene su propio almacenamiento
   (pedidos, clientes espejo, catálogo de cortes) — nunca escribe en `sgc`. Puede LEER `sgc`
   (solo `SELECT`) para precargar Tercero/Sucursal/precios/familias de piezas, igual regla
   dura que `superops_jh` (ver su CLAUDE.md §2.6). **Hallazgo 2026-09-22**: la credencial que
   el usuario configuró en `apps/api/.env` es una cuenta ADMIN con permisos de
   escritura reales, no una cuenta `readonly_app` restringida del lado de MySQL — por lo tanto
   la regla de "solo lectura" NO se puede asumir protegida por permisos del servidor, está
   forzada en código: `apps/api/src/sgc/db.ts` expone únicamente `sgcQuery`/`sgcQueryOne`, que
   rechazan cualquier sentencia que no empiece por `SELECT`/`SHOW`/`EXPLAIN` antes de tocar la
   red. Nunca importar el pool crudo directo en una ruta nueva — siempre pasar por esas 2
   funciones. `sgc` ya tiene un flujo real de pedidos de
   puntos de venta (`ord_ordenes`/`ord_pivot_orden_producto`, tipo `ord_tipo_orden_id=18`
   "Orden de compra productos carnicos" — 1.017 filas totales en la tabla, 20 sucursales
   distintas con pedidos reales, ver §3 para el detalle) — el usuario decidió NO integrarse
   con esa tabla en este MVP, para no arriesgar el sistema en producción ni depender de
   entender su flujo completo. Puede revisarse más adelante como un puente de exportación,
   nunca como escritura directa sin decisión explícita nueva.
2. **La proyección de piezas es por familia/corte, NO por "animales completos
   comprometidos".** Pedir 10 Puntas de anca resta 10 de las 100 Piernas esperadas (50×2) —
   se muestra "Esperado / Comprometido / Disponible" por familia. NO se intenta calcular
   cuántos cerdos "completos" quedan asignados a un pedido — los cortes de un mismo animal se
   reparten libremente entre destinos distintos en la operación real, intentar amarrarlos por
   animal sería una complejidad falsa.
3. **~~Sin bloqueo duro~~ → BLOQUEO DURO SÍ (decisión revertida 2026-09-22).** La versión
   original de este punto decía "se marca en rojo/alerta visual, pero se permite exceder el
   disponible — mismo espíritu que Preliquidación en `superops_jh`". El usuario probó el flujo
   real (25 cerdos, Churrasco de cerdo=40 ya deja Lomo en negativo, y el sistema seguía
   dejando escribir más Chuleton) y pidió el comportamiento contrario: **no permitir** que un
   corte derivado exceda el disponible de NINGUNA familia a la que pertenezca. Implementado en
   `apps/web/src/calc/proyeccionPiezas.ts` (`maxCantidadPermitida`) — al escribir o incrementar
   una cantidad, se recorta automáticamente al máximo que no deje negativo el disponible de
   ninguna familia afectada (un producto puede pertenecer a varias a la vez, ej. Costi-chi →
   Barriguero y Costilla de cerdo — se usa el límite más restrictivo). Sin mensaje de error:
   el campo simplemente queda en el máximo permitido. Ver `CLAUDE.md` §6.6 para el detalle de
   implementación.
3.1. **Todo corte derivado se pide en cantidades pares (bilateralidad).** Confirmado por el
   usuario 2026-09-23: cada corte derivado viene en pares por animal (igual que Punta de anca
   ×2), así que un valor impar no tiene sentido físico — aplica a TODOS los derivados, en
   Cerdo y en Res. Sin mensaje de error, mismo espíritu sin fricción que el bloqueo duro del
   punto 3: al escribir o incrementar, se redondea hacia abajo al par más cercano. Ver
   `CLAUDE.md` §6.10 para el detalle de implementación.
4. **UI tipo "carrito de compras" (Rappi), no formulario ni tabla de captura larga.** Grilla de
   tarjetas de producto con stepper +/-, carrito lateral fijo con el resumen en vivo. Prioridad
   en clicks mínimos y feedback inmediato, no en campos de texto. **Captura en 2 pasos
   secuenciales** (2026-09-22, a pedido del usuario): paso 1 = Fecha/Cliente/Especie/Animales +
   cantidad TOTAL de cada corte especial + Retoma; paso 2 = reparto Vacío/Granel de lo ya
   pedido en el paso 1, con botón "← Volver" para regresar sin perder nada. Ver CLAUDE.md §6.8
   para el detalle de implementación.
5. **Semántica de 3 conceptos de la referencia del usuario** (ver capturas adjuntas al pedido
   original, no repetidas aquí — están en `docs-negocio/` de `superops_jh` si hace falta
   volver a mirarlas, o pedir al usuario que las reenvíe). **Ampliado 2026-09-22** tras revisar
   `SCSJ_REGISTRO_ANUAL_CERDO_2026 - MAQUILAS.pdf` (registro real de pedidos manuales,
   gitignored — ver CLAUDE.md §6.7 para el detalle completo):
   - **Vacío / Granel**: presentación de empaque — **ya NO es un checkbox único por línea**
     (cambio 2026-09-22, ver CLAUDE.md §6.7c): puede ser MIXTA dentro del mismo corte (caso
     real del documento: "mitad Barriguero a granel, mitad empacado"). Cada línea de carrito
     tiene cantidad de Vacío y de Granel independientes, con su propio stepper cada una; el
     total pedido de la línea es la suma de ambas. Sigue siendo preferencia de PEDIDO, no un
     dato leído de `sgc`.
   - **Retoma**: instrucción INVERSA a un pedido normal — el administrador marca que un corte
     específico (ej. "Cadero") **no se despache**, se queda en planta porque el punto de venta
     ya tiene exceso de ese producto. Es una exclusión/retención, se muestra aparte del
     carrito de "lo que sí se pide". **Ampliado 2026-09-22**: además de los cortes ya pedibles,
     Retoma ahora también ofrece un segundo grupo de productos que SOLO existen ahí —
     Vísceras, Pedacitos, Desgorde, Tocino grasa, Garra, Hueso, Cadero, Empella (ver
     `RETOMA_EXTENDIDA_CERDO` en CLAUDE.md §6.7b) — confirmado con alta frecuencia real en el
     documento, mismos productos que `superops_jh` documenta como "sin patrón fijo de piezas".
     **Ampliado 2026-09-23**: también ofrece los cortes PADRE (Pierna, Lomo, Manero...),
     excluidos de la grilla pedible pero retomables igual (ver CLAUDE.md §6.12); y además,
     para los productos CON proyección de piezas (padres + cortes especiales, no los de
     `RETOMA_EXTENDIDA_CERDO`), Retoma ya no es todo-o-nada — el administrador puede indicar
     CUÁNTAS piezas retomar (ej. "10 de las 60 Piernas esperadas"), y esa cantidad resta del
     `disponible` de la familia igual que una línea de pedido normal. Ver CLAUDE.md §6.13.
   - **Especificaciones**: catálogo de presentaciones opcionales por corte padre, metadata
     seleccionable al pedir ese corte (como una talla/variante de producto), NO cambia la
     lógica de familias/piezas ni el cálculo de disponible. Antes solo existía para Res (2ª
     imagen: "Corte Padre → Especificación 1/2", ej. Solomito → Sin cordón/T-bone). **Ampliado
     2026-09-22 con Cerdo** (`ESPECIFICACIONES_CERDO`, ver CLAUDE.md §6.7a): Papada → "Hombrillo
     separado", Solomito de cerdo → "Aparte" — únicos 2 patrones con volumen de repetición real
     en el documento; el resto de instrucciones del documento (Kg, presentaciones combinadas
     tipo "Manero entero", instrucciones generales de logística) quedaron fuera a propósito,
     ver CLAUDE.md §6.7d. **Regla de negocio explícita del usuario sobre este punto: "no vamos
     a dejar nada como texto libre"** — cualquier instrucción nueva del negocio se modela como
     catálogo estructurado (chip/especificación seleccionable), nunca como campo de texto.
6. **Vista de planta: Programación semanal** (2026-09-23, ver CLAUDE.md §6.14 para el detalle
   completo de implementación). Planta necesita ver los pedidos de los puntos de venta
   agrupados por semana calendario (lunes-domingo) y cubrir con pedidos propios el excedente
   sobre la capacidad fija de desposte. Decisiones confirmadas con el usuario:
   - **Capacidad semanal = 3240 cerdos, constante fija de negocio** — no viene de `sgc`, no es
     configurable en la UI todavía (`CAPACIDAD_SEMANAL_CERDOS` en `calc/semana.ts`).
   - **Un "slot" del calendario es un pedido individual** — no se inventó un concepto nuevo de
     franja horaria; la vista solo agrupa la tabla `pedidos` ya existente por semana.
   - **Un pedido de planta reusa el mismo formulario y la misma tabla `pedidos`** que un
     pedido de punto de venta (mismos cortes, mismo flujo de 2 pasos) — se distingue por un
     campo nuevo `origen: 'punto_venta' | 'planta'`, sin Tercero/Sucursal obligatorio cuando
     es de planta. No se creó una tabla ni un modelo de datos separado.
   - Solo agrupa **Cerdo** — Res no tiene una capacidad semanal fija conocida, no se preguntó
     ni se asumió un número; queda fuera de esta vista por ahora.

## 2. Lo que YA está verificado y se puede reutilizar sin re-investigar

### 2.1 Modelo de familias de piezas (Cerdo y Res)

Ya extraído, verificado cifra por cifra contra `sgc` real, y documentado en
`superops_jh/apps/web/src/calc/familiasPiezas.config.ts` + `validacionPiezas.ts` (leer esos 2
archivos completos antes de modelar el catálogo de este MVP — no reinventar la relación
padre↔hijo, copiarla/adaptarla).

Resumen de la forma del dato (ver el archivo fuente para los `productoId` reales y las notas
de verificación de cada uno — no los transcribas de memoria a un nuevo archivo sin
recopiarlos literalmente, hay ids con nombres NBSP y casos "sexteado" no obvios):

```ts
interface FamiliaPiezasConfig {
  clave: string;
  nombre: string;           // "Pierna", "Lomo", "Papada"...
  multiplicador: number;    // piezas esperadas = cantidadAnimales × multiplicador (2 o 1)
  productos: {
    productoId: number;     // id real en sgc.productos — SIEMPRE por id, nunca por nombre
    nombre: string;
    factor?: number;        // conversión cuando 1 pieza física vale una fracción distinta
                             // en dos familias con multiplicador distinto (ver "sexteado")
  }[];
}
```

8 familias de Cerdo (`FAMILIAS_PIEZAS`), 25 familias de Res (`FAMILIAS_PIEZAS_RES`), más
`PUNTA_DE_ANCA_CONFIG` (correspondencia 1:1 Pierna sin punta de anca ⇄ Punta de anca, exclusiva
de Cerdo). Para el MVP de pedidos, el "corte padre" de una tarjeta de producto especial es
directamente la familia a la que pertenece ese `productoId` en esta configuración — ej. pedir
"Punta de anca de cerdo" (id 79) resta contra la familia `pierna`.

**Diferencia de uso importante con Preliquidación**: en `superops_jh` esta config se usa para
VALIDAR desposte ya ocurrido (piezas reales vs. esperadas). En el MVP de Pedidos se usa para
PROYECTAR consumo antes de que ocurra el desposte — es la misma tabla de relaciones, pero el
sentido del cálculo se invierte (acumulación de un carrito, no comparación contra un hecho
consumado). No hay lógica nueva de negocio que descubrir aquí, solo un uso distinto del mismo
dato.

### 2.2 Modelo de datos de `sgc` reutilizable de solo lectura

Confirmado real en esta sesión (2026-09-22), agregando a lo ya documentado en
`superops_jh/CLAUDE.md` §3:

- **`ord_ordenes`** (`id, consecutivo, fecha_orden, ord_tipo_orden_id, tercero_sucursal_id,
  usuario_id, estado, subtotal, descuento, ivatotal, total, saldo`) y
  **`ord_pivot_orden_producto`** (`id, ord_orden_id, producto_id, cantidad, precio,
  descporcentaje, iva`) — el sistema real de pedidos de puntos de venta. 1.017 filas totales,
  `fecha_orden` hasta 2026-09-21 (vivo). `ord_tipo_orden_id=18` ("Orden de compra productos
  carnicos") es el tipo que corresponde a "pedido de cortes de un punto de venta" — verificado
  con un caso real (orden 72532, CIENAGA DE ORO, pidió Pecho/Tabla/Solomo extranjero/Posta
  minerva/Desmechar especial en Kg el 2026-09-19). Tipos 1/20 ("Orden de compra Cerdo"/"res")
  son compras de ganado en pie a proveedores/ferias de ganado — mezclan a veces cortes
  también, no son un catálogo limpio de "solo animal en pie". **No se usa nada de esto para
  escribir** (decisión de §1.1) — solo como referencia de qué sucursales/productos son reales
  si hace falta precargar un catálogo de clientes de arranque.
- **`prod_pivot_lista_productos`** (ver `superops_jh/CLAUDE.md` §3.9): precio de venta por
  producto y lista de precios — reutilizable tal cual para precargar precio sugerido al armar
  el catálogo de cortes especiales del MVP.
- **`tercero_sucursales`/`terceros`** (ver §3.1/§3.7 del CLAUDE.md de `superops_jh`): Cliente
  = `terceros.nombre`, Sucursal = `tercero_sucursales.nombre` — misma cadena de relación ya
  verificada, reutilizable para el selector de Cliente/Sucursal del pedido nuevo.
- **`productos`** (`id, nombre`): catálogo general — ya se sabe que mezcla cortes de carne con
  insumos, filtrar siempre por los ids que aparecen en `familiasPiezas.config.ts` o en el
  catálogo de "cortes especiales"/"especificaciones" que se defina en este MVP.

### 2.3 Deuda de investigación pendiente (NO asumir, verificar cuando se llegue a esa parte)

- **Los ~30+ "Cortes especiales" y "Cortes con especificación" de las imágenes de referencia
  del usuario NO están todavía mapeados a `productoId` real de `sgc`.** Las 2 capturas que
  acompañaron el pedido original (una con Barriguero/Cabeza de cerdo/Chuletas de
  manero/Pierna rasgada/Papada sin hombrillo + Retoma "Cadero"; otra con una lista de
  "Corte Padre → Especificación 1/2" de Res: Cáscara, Chata, Copete, Desmechar, Huevo de
  aldana/de X, Lagarto, Morrillo, Muchacho, Paletero/Sabaleta, Pecho recortado, Pecho, Posta
  entera, Punta de/espaldilla/falda, Sabaleta, Sobrebarriga con nuca, Solomito/sin
  cordón/T-bone, Solomo redondo/entero/Tomahawk o Ribeye, Tabla, Tableado/tortuga/con
  lagarto, Tablón entero, Tapa de costilla, Trestelas, Costilla de res/asado de tira/tapa de
  costilla) — varios de estos nombres YA coinciden con productos de `FAMILIAS_PIEZAS_RES` en
  `superops_jh` (Cáscara→`cascara` id 39, Chata→`chata` id 26, Lagarto→`lagarto` id 45,
  Muchacho→`muchacho` id 28, Paletero→`paletero` id 37, Pecho→`pecho` id 44/10592, Posta→
  `posta` id 29, Sobrebarriga→`sobrebarriga` id 43, Tabla→`tabla` id 31, Tableado→`tableado`
  id 41, Tablón→`tablon` id 34, Trestela→`trestela` id 46) — **reutilizar esos ids
  directamente, no volver a buscarlos**. Los que NO tienen match evidente en esa config
  (Desmechar sin más apellido — hay "Desmechar especial" id 175 en `ord_pivot_orden_producto`
  §2.2, ¿es el mismo?; Huevo de aldana ya existe id 33 en Res; Morrillo; Sabaleta como corte
  propio vs. especificación de Paletero; Solomo redondo id 25 ya existe; "Costilla de res" id
  64 ya existe con especificaciones "Asado de tira"/"Tapa de costilla" como variantes) — estos
  quedan **pendientes de una sesión de verificación contra `sgc` real** (buscar por nombre en
  `productos`, cruzar contra volumen real en `producto_terminados`/`inventarios`, mismo método
  de `superops_jh` §7) antes de dar el catálogo de especificaciones por bueno. No inventar el
  mapeo completo de una sola vez sin ese contraste.
- **No se investigó si existe un catálogo formal de "especificaciones"/"variantes" en `sgc`**
  (ej. una tabla `prod_*variante*` o similar) — se buscó únicamente `ord_*`/`pedido*` en esta
  sesión. Antes de modelar "Especificación" como un campo libre de texto en el MVP, vale la
  pena una búsqueda por columna (`information_schema.columns LIKE '%variante%'` o
  `'%presentacion%'`, mismo método de §3.11 de `superops_jh`) para confirmar si ya existe algo
  formal que debería alimentar el catálogo en vez de capturarlo a mano en este MVP.
- **Retoma**: no se verificó si `sgc` ya registra estas exclusiones en alguna tabla (por
  ejemplo si "Cadero" en Retoma tiene relación con el módulo de retoma de Inventario de planta
  de `superops_jh`, §6.27 — ese es sobre producto YA en planta sin salir, no sobre una
  instrucción de pedido a futuro; son conceptos relacionados pero no necesariamente la misma
  tabla). Tratarlo como un campo propio del MVP (lista de productoId marcados "no despachar"
  por pedido) hasta que se confirme lo contrario.

## 3. Arquitectura propuesta

Mismo patrón de monorepo simple que `superops_jh` (2 workspaces npm), por consistencia y
porque ya se sabe que funciona bien para este tipo de app chica:

```
mvp_pedidos/
├── PLAN.md                          (este archivo)
├── package.json                     (workspaces: apps/api, apps/web)
├── apps/
│   ├── api/                         Node + Express + TypeScript
│   │   ├── src/
│   │   │   ├── db/                  SQLite (better-sqlite3 SOLO si el servidor destino
│   │   │   │                        tiene Python/Build Tools — ver superops_jh §6.58, ese
│   │   │   │                        proyecto tuvo que QUITAR better-sqlite3 por esto mismo.
│   │   │   │                        Alternativa sin dependencias nativas: sql.js (WASM) o
│   │   │   │                        un JSON plano si el volumen es bajo al principio —
│   │   │   │                        decidir según dónde se vaya a desplegar, no asumir.)
│   │   │   ├── sgc/                 Cliente de solo lectura a `sgc` (mismo patrón que
│   │   │   │                        apps/api/src/db.ts de superops_jh: pool mysql2,
│   │   │   │                        SOLO SELECT, nunca exponer el pool directo a rutas
│   │   │   │                        que puedan escribir)
│   │   │   ├── routes/
│   │   │   │   ├── clientes.ts      GET /api/clientes (lee tercero_sucursales/terceros de
│   │   │   │                        sgc, solo lectura, cacheado)
│   │   │   │   └── pedidos.ts       CRUD de pedidos — ESCRIBE, pero solo en la DB propia
│   │   │   └── server.ts
│   │   └── package.json
│   └── web/                         React + TypeScript + Vite
│       ├── src/
│       │   ├── calc/
│       │   │   ├── familiasPiezas.config.ts    (copiado de superops_jh 2026-09-22, ver §2.1 —
│       │   │   │                                sincronizado a mano, no paquete compartido)
│       │   │   ├── especificaciones.config.ts  (catálogo Corte Padre → Especificación[] de
│       │   │   │                                Res, armado 2026-09-22, ver §2.3)
│       │   │   └── proyeccionPiezas.ts   Función PURA: dado (cantidadAnimales, especie,
│       │   │                              lineasPedido[]) devuelve por familia
│       │   │                              {esperado, comprometido, disponible} — mismo
│       │   │                              espíritu de deriva.ts/validacionPiezas.ts de
│       │   │                              superops_jh (sin React, sin fetch, testeable con
│       │   │                              Vitest)
│       │   ├── components/
│       │   │   ├── PedidoWizard.tsx       Paso 1: Fecha/Cliente/Sucursal/Especie/Animales
│       │   │   ├── CatalogoCortesGrid.tsx Tarjetas con stepper (+/-), estilo Rappi
│       │   │   ├── CarritoLateral.tsx     Resumen en vivo por familia + total de líneas
│       │   │   ├── RetomaPanel.tsx        Sección aparte para marcar exclusiones
│       │   │   └── EspecificacionSelector.tsx  Dropdown/chip por corte con especificación
│       │   ├── store/
│       │   │   └── usePedidoStore.ts      Zustand, mismo patrón que superops_jh
│       │   └── types/
│       │       └── dto.ts
│       └── package.json
```

**Por qué NO copiar todo `apps/api`/`apps/web` de `superops_jh` como base**: ese proyecto
carga tarifas/precios de un lote YA despostado (lectura de hechos consumados); este MVP
captura una INTENCIÓN de pedido futuro. La forma de los datos de entrada es distinta desde la
raíz (DTO de "lote real" vs. DTO de "línea de pedido en carrito") — es más simple y más
correcto escribir estos componentes/rutas desde cero, reutilizando solo la config de familias
de piezas y el patrón de conexión de solo lectura a `sgc`.

## 4. Plan de implementación por fases

Cada fase termina en un estado funcional y probado — no dejar una fase a medias antes de
avanzar a la siguiente.

### Fase 0 — Andamiaje

1. `npm init` del monorepo (workspaces), `apps/api` y `apps/web` con TypeScript `strict: true`
   (mismo estándar que `superops_jh`).
   → Verificar: `npm run build` en ambos workspaces compila sin errores con un "Hola mundo".
2. Copiar/adaptar `apps/api/src/db.ts` de `superops_jh` (pool mysql2 de SOLO LECTURA contra
   `sgc`) — mismo `.env`/`.env.example`, mismas advertencias de "nunca escribir" en comentario.
   → Verificar: un endpoint de prueba (`GET /api/health-sgc`) hace un `SELECT 1` real contra
   `sgc` usando las credenciales que el usuario configure en su `.env` local (nunca pedidas
   por chat, mismo protocolo que `superops_jh/CLAUDE.md` §2.2).
3. Elegir motor de persistencia propia (SQLite vía `better-sqlite3` vs. alternativa sin
   dependencias nativas) — **decisión pendiente de confirmar con el usuario según el destino
   de despliegue** (ver §6.58 de `superops_jh/CLAUDE.md`: ese proyecto tuvo que arrancar
   `better-sqlite3` de raíz por falta de Python/Build Tools en el servidor Windows destino).
   Si el destino final de este MVP es el MISMO servidor, usar la alternativa sin dependencias
   nativas desde el día 1 para no repetir ese problema.
   → Verificar: la app arranca y crea su archivo/esquema de datos vacío sin pedir
   herramientas de compilación.

### Fase 1 — Catálogo de cortes (fundación del cálculo) — ✅ COMPLETA 2026-09-22

4. ✅ `apps/web/src/calc/familiasPiezas.config.ts` — copiado íntegro de `superops_jh` con nota
   de procedencia y fecha. Test `familiasPiezas.config.test.ts` (Vitest) verifica que cada
   familia tiene ≥1 producto y ningún `productoId` se repite dentro de la misma familia — pasa
   para Cerdo y Res.
5. ✅ `apps/web/src/calc/especificaciones.config.ts` — catálogo Corte Padre → Especificación[]
   de Res armado cruzando `web_apps/tabla_especificaciones/productos_despachados.json`
   (investigación previa: 121 productos reales con movimiento en 90 días, con `producto_id`
   real — 64 de Res) contra los nombres de la 2ª imagen del usuario documentados en §2.3.
   Resueltas las dudas pendientes: **Morrillo** (id 256) y **Sabaleta** (id 363) son productos
   propios reales, no especificaciones de otro corte. **Desmechar** == "Desmechar especial"
   (id 175), único match real. "Posta entera", "Sobrebarriga con nuca", "Solomito sin
   cordón/T-bone", "Tableado tortuga/con lagarto", "Tablón entero" no tienen `productoId`
   propio — quedan como especificación de texto libre del corte padre, según §1.5. "Tomahawk
   de res" (id 32072), "Ribeye" (id 10547), "Asados de tiras" (id 21944) y "Tapa de costilla"
   (id 61) SÍ son productos propios reales pero se agrupan como especificación bajo su corte
   padre de la imagen (Solomo redondo / Costilla de res) — señalado en comentario por si el
   negocio pide tratarlos como línea de pedido independiente más adelante.
6. ✅ `apps/web/src/calc/proyeccionPiezas.ts` + `proyeccionPiezas.test.ts` (Vitest, 7 tests,
   todos pasan) — incluye el caso de referencia exacto del usuario (50 cerdos, 10 Puntas de
   anca ⇒ Pierna esperado 100/comprometido 0/disponible 100, porque "Punta de anca de cerdo"
   id 79 no pertenece a `FAMILIAS_PIEZAS` a propósito — tiene su propia validación 1:1, ver
   `PUNTA_DE_ANCA_CONFIG`), más casos de `sobrepasado`, producto en varias familias a la vez
   (Chuleton) y `factor` fraccional (Manero sexteado en Cabeza de lomo).

**Decisión de arquitectura 2026-09-22**: NO se creó `GET /api/catalogo/cortes` — el catálogo
completo (familias + especificaciones) vive únicamente en `apps/web/src/calc/`, igual patrón
que `superops_jh` (`ValidacionPiezasPanel` usa su config local directamente, sin fetch). Es
data estática que ya está en el bundle del frontend; un endpoint HTTP solo para servirla sería
duplicación sin beneficio. Si en el futuro se necesita el catálogo también desde `apps/api`
(ej. para validar un pedido en el backend antes de guardarlo), evaluar extraerlo a un paquete
npm compartido en ese momento, no antes.

### Fase 2 — Backend de pedidos (DB propia) — ✅ COMPLETA 2026-09-22

7. ✅ Esquema en `apps/api/src/db/schema.ts`: `pedidos`, `pedido_lineas`, `pedido_retomas`
   (campos tal como se planeó). Corre limpio sobre DB nueva vacía (ya verificado en Fase 0).
8. ✅ `GET /api/clientes` (`apps/api/src/routes/clientes.ts`) — join real `terceros t JOIN
   tercero_sucursales ts ON ts.tercero_id = t.id`, cache en memoria TTL 5 min (mismo patrón
   que `despachos.ts` de `superops_jh`). Verificado contra `sgc` real: **829 clientes**
   (Tercero+Sucursal) devueltos correctamente.
9. ✅ `POST /api/pedidos`, `GET /api/pedidos`, `GET /api/pedidos/:id`
   (`apps/api/src/routes/pedidos.ts` + `apps/api/src/db/pedidos.ts`) — CRUD contra la DB
   propia (sql.js). Verificado con un pedido real de 3 líneas + 1 retoma: se guarda y se
   relee completo con los mismos valores, incluyendo texto con tildes/ñ (ver nota abajo).
   Sin autenticación — pendiente igual que antes, ver §5.

**Nota de diagnóstico 2026-09-22 (no es un bug, no volver a investigar)**: durante la prueba
manual de `especificacion` con tildes, `curl -d '...'` con el literal escrito directo en el
comando de Git Bash produjo un caracter corrupto en la respuesta. Aislado paso a paso
(sql.js en memoria → persist/reload a archivo → Express `req.body`/`res.json()` → bytes HTTP
crudos): en cada capa el UTF-8 viajó intacto. La causa real fue el terminal/shell de origen
(Git Bash + Python con `sys.stdout.encoding=cp1252` en este entorno Windows) al construir o
imprimir el literal con tilde, no el código de la aplicación — confirmado con una petición
Python que controla el encoding de punta a punta (`ensure_ascii=False`, `.encode('utf-8')`,
`Content-Type: application/json; charset=utf-8`): el texto `"Sin cordón, ñ, á, é, í, ú"`
se guarda y relee perfecto. Al probar manualmente con texto acentuado en esta máquina, usar
un cliente que controle el encoding explícitamente (Python/Node), no pegar el literal directo
en un comando de Git Bash/PowerShell.

### Fase 3 — Frontend tipo carrito

10. `PedidoWizard.tsx` — paso inicial: Fecha de entrega, selector de Cliente/Sucursal
    (`GET /api/clientes`), Especie (Cerdo/Res), cantidad de animales.
    → Verificar en navegador real (`npm run dev`, este entorno si tiene herramienta de
    browser disponible; si no, dejarlo pendiente de confirmación visual del usuario, mismo
    patrón de limitación ya documentado repetidas veces en `superops_jh`).
11. `CatalogoCortesGrid.tsx` — tarjetas por corte (imagen/ícono genérico + nombre + stepper),
    agrupadas por familia/categoría, con checkbox Vacío/Granel y selector de Especificación
    cuando aplique (Res). Cada cambio de cantidad dispara `proyeccionPiezas()` en el store.
    → Verificar: clicks incrementan/decrementan sin recargar la página, natural para uso
    táctil/mouse rápido (criterio explícito del usuario: "todo con clicks de manera
    eficiente").
12. `CarritoLateral.tsx` — panel fijo con el resumen por familia (Esperado/Comprometido/
    Disponible, rojo si `sobrepasado`), más el listado de líneas agregadas y botón para
    confirmar el pedido (`POST /api/pedidos`).
    → Verificar: agregar 10 Puntas de anca sobre un pedido de 50 cerdos muestra Pierna
    90/100 disponible en tiempo real, sin recargar.
13. `RetomaPanel.tsx` — sección separada (fuera del carrito de "lo que se pide") donde el
    administrador marca productos a retener en planta, con nota opcional.
    → Verificar: un producto marcado en Retoma no aparece como línea de pedido normal ni
    resta contra el disponible de su familia (es una instrucción aparte, no un consumo).

### Fase 4 — Pulido y cierre

14. Vista de "Pedido confirmado" / listado de pedidos (para que el administrador pueda ver lo
    que ya envió, filtrable por fecha/cliente).
15. Exportación simple (PDF o impresión, mismo patrón de `window.print()` que
    `ReporteImprimible.tsx` de `superops_jh` si aplica) — solo si el usuario la pide, no
    construirla especulativamente.
16. Documentar en este mismo `PLAN.md` (o en un `HALLAZGOS.md` propio, si crece mucho) cada
    hallazgo de la Fase 1.5 (mapeo de especificaciones) y cualquier decisión de negocio nueva
    que surja — mismo hábito de `superops_jh`, para que la siguiente persona no tenga que
    re-investigar.

## 5. Preguntas abiertas / pendientes de confirmar con el usuario más adelante

No son bloqueantes para arrancar la Fase 0, pero sí antes de completar las fases marcadas:

- **Persistencia (Fase 0.3)**: ¿SQLite con `better-sqlite3`, alternativa sin dependencias
  nativas, o directamente Postgres si va a vivir en un servidor con más capacidad? Depende de
  dónde se vaya a desplegar — no asumir el mismo servidor Windows limitado de `superops_jh`
  sin preguntar.
- **Autenticación (Fase 2.9)**: ¿el MVP inicial la necesita desde el día 1, o se puede
  posponer hasta tener el flujo de pedido funcionando? `superops_jh` empezó sin ella y la
  agregó después (§6.93 de su CLAUDE.md) — mismo camino parece razonable aquí, pero
  confirmarlo explícitamente antes de la Fase 2.
- **Catálogo de especificaciones (Fase 1.5)**: varios nombres de la 2da imagen no tienen
  match evidente contra `sgc` (Desmechar a secas vs. "Desmechar especial" id 175, Morrillo,
  Sabaleta) — requiere una sesión de verificación con acceso a `sgc` antes de dar el catálogo
  completo por terminado.
- **Relación con `ord_ordenes` a futuro**: aunque la decisión actual es no integrarse (§1.1),
  vale la pena preguntar si en algún momento el pedido capturado en este MVP debe terminar
  empujándose a `ord_ordenes` (vía un proceso de exportación/sincronización, no escritura
  directa desde el MVP) para que el resto de SGC lo vea — no es parte de este plan, pero es
  una pregunta de producto que probablemente surja cuando el MVP funcione.
