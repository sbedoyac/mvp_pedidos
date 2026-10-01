/**
 * Catálogo "Corte Padre → Especificación[]" de Res (ver PLAN.md §1.5 y §2.3).
 *
 * Verificado 2026-09-22 contra el catálogo REAL de productos con movimiento (121 productos,
 * 64 de Res, extraído 2026-09-07 de `sgc` — fuente:
 * `web_apps/tabla_especificaciones/productos_despachados.json`, cruce
 * `productos` + `prod_subgrupos` + `prod_grupos` + `sal_pivot_sal_producto`/`sal_mercancias`,
 * ventana de 90 días. Trae `producto_id` real, no solo nombre — ese archivo es la
 * investigación de "qué producto es real" que pedía la Fase 1.5, hecha en sesión previa;
 * este archivo es el cruce nuevo contra los nombres de la 2ª imagen de referencia del
 * usuario, que aún no se había hecho).
 *
 * Cada entrada de `especificaciones` es METADATA de texto libre (ver PLAN.md §1.5, punto 3):
 * NO es otro productoId, no cambia el cálculo de familias/piezas ni el disponible — es una
 * variante de presentación seleccionable al pedir ese corte padre (ej. "Solomito → Sin
 * cordón"), igual concepto que una talla/variante de producto en un carrito de compras.
 *
 * `productoId` de cada corte padre referencia directamente `FAMILIAS_PIEZAS_RES` en
 * `familiasPiezas.config.ts` cuando el corte pertenece a una familia con multiplicador
 * conocido — reutilizado tal cual (PLAN.md §2.3: "reutilizar esos ids directamente, no
 * volver a buscarlos").
 */

export interface EspecificacionCortePadre {
  /** productoId real en sgc.productos — el mismo que aparece en FAMILIAS_PIEZAS_RES cuando aplica. */
  productoId: number;
  nombre: string;
  /** Nombres de especificación/variante — metadata de texto libre, no otro productoId. */
  especificaciones: string[];
}

/**
 * Especificaciones de Cerdo — agregado 2026-09-22 tras revisar
 * `SCSJ_REGISTRO_ANUAL_CERDO_2026 - MAQUILAS.pdf` (registro real de pedidos manuales del
 * negocio, compartido por el usuario). Ese documento NO se copia literal — es texto libre de
 * instrucciones combinadas (ver CLAUDE.md §6.7 para el detalle completo de por qué) — de ahí
 * se extrajeron solo los 2 patrones de "especificación de línea" que se repiten con nombre de
 * corte identificable, siguiendo la instrucción explícita del usuario de "no dejar nada como
 * texto libre".
 */
export const ESPECIFICACIONES_CERDO: EspecificacionCortePadre[] = [
  {
    productoId: 8, // Papada — ya existe en FAMILIAS_PIEZAS
    nombre: 'Papada',
    // "Hombrillo separado (de la Papada)" aparece repetido >10 veces en el documento real.
    // "Papada sin hombrillo" (id 32040) YA es un productoId propio en familiasPiezas.config.ts
    // (familia 'papada') — esta especificación es solo metadata de presentación cuando se pide
    // "Papada" (id 8) a secas, para que quede registrado que el hombrillo debe ir aparte sin
    // necesidad de que el admin busque y agregue la línea "Papada sin hombrillo" por separado.
    especificaciones: ['Hombrillo separado'],
  },
  {
    productoId: 52, // Solomito de cerdo — NO pertenece a FAMILIAS_PIEZAS a propósito (excluido
    // explícitamente de la familia 'lomo', ver familiasPiezas.config.ts línea ~78) — se ofrece
    // igual como tarjeta de pedido, sin familia proyectada asociada.
    nombre: 'Solomito de cerdo',
    // "Solomitos aparte" aparece repetido >8 veces — instrucción de separar el Solomito del
    // corte padre (Lomo) en vez de dejarlo pegado, mismo patrón que Hombrillo separado arriba.
    especificaciones: ['Aparte'],
  },
];

export const ESPECIFICACIONES_RES: EspecificacionCortePadre[] = [
  { productoId: 39, nombre: 'Cascara', especificaciones: [] },
  { productoId: 26, nombre: 'Chata', especificaciones: [] },
  { productoId: 42, nombre: 'Copete', especificaciones: [] },
  // "Desmechar" en la imagen del usuario == "Desmechar especial" (id 175, único match real
  // en el catálogo con movimiento — no existe un "Desmechar" a secas separado, ver PLAN.md §2.3).
  { productoId: 175, nombre: 'Desmechar especial', especificaciones: [] },
  { productoId: 33, nombre: 'Huevo de aldana', especificaciones: [] },
  { productoId: 45, nombre: 'Lagarto', especificaciones: [] },
  // Confirmado 2026-09-22: "Morrillo" es producto propio real (id 256), no una especificación
  // de otro corte — antes pendiente en PLAN.md §2.3.
  { productoId: 256, nombre: 'Morrillo', especificaciones: [] },
  { productoId: 28, nombre: 'Muchacho', especificaciones: [] },
  { productoId: 37, nombre: 'Paletero', especificaciones: [] },
  // Confirmado 2026-09-22: "Sabaleta" es producto propio real (id 363), DISTINTO de Paletero
  // — antes pendiente en PLAN.md §2.3 como "¿corte propio o especificación de Paletero?".
  { productoId: 363, nombre: 'Sabaleta', especificaciones: [] },
  {
    productoId: 44,
    nombre: 'Pecho',
    // "Pecho recortado" de la imagen: no hay productoId propio con ese nombre exacto en el
    // catálogo real — se trata como especificación de presentación de Pecho. "Pecho entero"
    // SÍ es producto propio (id 10592, ya en FAMILIAS_PIEZAS_RES sumando a la misma familia
    // 'pecho') — se ofrece como especificación aquí también para que el usuario elija la
    // presentación sin que cambie a qué familia resta (ambas restan a 'pecho').
    especificaciones: ['Recortado', 'Entero'],
  },
  {
    productoId: 29,
    nombre: 'Posta',
    // "Posta entera" de la imagen: sin productoId propio — especificación de presentación.
    especificaciones: ['Entera'],
  },
  { productoId: 35, nombre: 'Punta de espaldilla', especificaciones: [] },
  { productoId: 36, nombre: 'Punta de falda', especificaciones: [] },
  {
    productoId: 43,
    nombre: 'Sobrebarriga',
    // "Sobrebarriga con nuca" de la imagen: "Nucas" (id 55) es producto propio separado en
    // el catálogo real, pero sin patrón fijo de piezas/canal (ver nota en
    // familiasPiezas.config.ts) — se modela como especificación de presentación de
    // Sobrebarriga, no como línea de pedido independiente, siguiendo la semántica de la
    // imagen ("con nuca" describe cómo viene la Sobrebarriga, no un corte aparte).
    especificaciones: ['Con nuca', 'Sin nuca'],
  },
  {
    productoId: 24,
    nombre: 'Solomito',
    // "Sin cordón"/"T-bone" de la imagen: sin match de productoId propio para "T-bone".
    // "Cordones de solomito" (id 21872) SÍ existe como producto de recorte separado en el
    // catálogo real, pero la especificación aquí describe la presentación DEL Solomito
    // pedido (si se despacha con o sin el cordón), no el recorte en sí como línea de pedido.
    especificaciones: ['Sin cordón', 'T-bone'],
  },
  {
    productoId: 25,
    nombre: 'Solomo redondo',
    // "Tomahawk"/"Ribeye" de la imagen SÍ son productoId propios reales — se listan aquí
    // como especificaciones de presentación porque la imagen los agrupa bajo el mismo corte
    // padre "Solomo redondo/entero", pero si el negocio pide luego tratarlos como línea de
    // pedido independiente (tienen su propio id, 10547 y 32072), es un cambio de modelo, no
    // un dato faltante — dejarlo así hasta que el usuario lo confirme explícitamente.
    especificaciones: ['Entero', 'Tomahawk', 'Ribeye'],
  },
  { productoId: 31, nombre: 'Tabla', especificaciones: [] },
  {
    productoId: 41,
    nombre: 'Tableado',
    // "Tortuga"/"Con lagarto" de la imagen: sin productoId propio — especificaciones de
    // presentación de Tableado.
    especificaciones: ['Tortuga', 'Con lagarto'],
  },
  {
    productoId: 34,
    nombre: 'Tablon',
    // "Tablón entero" de la imagen: sin productoId propio — especificación de presentación.
    especificaciones: ['Entero'],
  },
  // "Tapa de costilla" de la imagen: producto real (id 61) pero SIN patrón fijo de
  // piezas/canal (ver nota en familiasPiezas.config.ts, no está en FAMILIAS_PIEZAS_RES) —
  // se incluye igual como corte padre propio porque el usuario lo pide como línea de pedido
  // independiente en la imagen, no como especificación de otro corte. No resta contra
  // ninguna familia proyectada hasta que se decida cómo tratar los productos sin patrón fijo.
  { productoId: 61, nombre: 'Tapa de costilla', especificaciones: [] },
  { productoId: 46, nombre: 'Trestela', especificaciones: [] },
  {
    productoId: 64,
    nombre: 'Costilla de res',
    // "Asado de tira"/"Tapa de costilla" de la imagen como especificaciones de Costilla de
    // res: "Asados de tiras" (id 21944) y "Tapa de costilla" (id 61) SÍ son productos propios
    // reales en el catálogo — mismo caso que Solomo redondo/Tomahawk/Ribeye arriba, se
    // agrupan aquí como especificación de presentación siguiendo la semántica de la imagen
    // ("Costilla de res → Asado de tira / Tapa de costilla"), no como líneas de pedido
    // independientes. Tapa de costilla también existe como corte padre propio arriba (id 61)
    // para cuando se pide directamente, no como parte de Costilla de res.
    especificaciones: ['Asado de tira', 'Tapa de costilla'],
  },
];
