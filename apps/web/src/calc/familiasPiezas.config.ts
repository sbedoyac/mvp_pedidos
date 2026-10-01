/**
 * COPIADO de superops_jh/apps/web/src/calc/familiasPiezas.config.ts el 2026-09-22, sin
 * modificaciones de contenido (ver PLAN.md §Fase 1.4 — copia manual, no paquete compartido,
 * por simplicidad de MVP). Si superops_jh corrige esta config más adelante (ej. otro fix de
 * "sexteado" como el de Papada/Manero de 2026-09-22, ver su CLAUDE.md §6.94), hay que
 * diffear manualmente contra el archivo fuente y replicar el fix aquí.
 *
 * ---- Comentario original de superops_jh ----
 *
 * Configuración de familias de piezas — validación de desposte (ver CLAUDE.md §6.19).
 *
 * Cada cerdo produce, en condiciones normales, 2 unidades de cada corte principal
 * bilateral. Un corte principal puede transformarse/dividirse en otros productos durante
 * el desposte (ej. "Pierna" puede salir como "Pierna rasgada" o "Pierna sin punta de
 * anca") — por eso la validación suma TODOS los productos relacionados de la familia, no
 * solo el nombre del corte principal.
 *
 * Los productos se identifican por `productoId` (columna `productos.id` en `sgc`), NO por
 * nombre — verificado contra la DB real que al menos un producto de esta lista
 * ("Barriguero sin piel", id 32824) tiene su nombre guardado con caracteres NBSP en vez de
 * espacios normales (`Barriguero\xa0sin\xa0piel`), lo que haría frágil cualquier match por
 * texto. El campo `nombre` de cada entrada es solo para legibilidad del código/UI — nunca
 * se usa para matchear contra `sgc`.
 *
 * IDs verificados 2026-08-24 contra `productos`/`producto_terminados` reales (todos con
 * volumen real de desposte, no solo presentes en el catálogo general que mezcla venta al
 * detal con desposte primario).
 *
 * DIFERENCIA DE USO EN ESTE MVP (ver PLAN.md §2.1): en superops_jh esta config se usa para
 * VALIDAR desposte ya ocurrido (piezas reales vs. esperadas). Aquí se usa para PROYECTAR
 * consumo antes de que ocurra el desposte (acumulación de un carrito de pedido, no
 * comparación contra un hecho consumado) — misma tabla de relaciones, sentido de cálculo
 * distinto. Ver src/calc/proyeccionPiezas.ts.
 */

export interface FamiliaPiezasConfig {
  /** Clave estable de la familia — usada como id en resultados y tests. */
  clave: string;
  /** Nombre para mostrar en UI/reportes. */
  nombre: string;
  /** piezasEsperadas = cantidadAnimales × multiplicador */
  multiplicador: number;
  /**
   * Productos cuyo numPiezas se suma para obtener el total real de la familia.
   * `factor` (default 1, omitido en la mayoría de entradas) escala numPiezas antes de sumar
   * — necesario cuando el mismo producto físico representa una fracción de pieza distinta en
   * dos familias con multiplicador diferente. Caso real: "Barriguero sexteado" cuenta ×1 en
   * Barriguero/Lomo/Costilla/Papada (todas multiplicador ×2), pero Cabeza de lomo es
   * multiplicador ×1 — cada pieza de Barriguero sexteado ahí vale la mitad (factor: 0.5). Ver
   * nota completa más abajo.
   */
  productos: { productoId: number; nombre: string; factor?: number }[];
}

export const FAMILIAS_PIEZAS: FamiliaPiezasConfig[] = [
  {
    clave: 'manero',
    nombre: 'Manero',
    multiplicador: 2,
    productos: [
      { productoId: 5, nombre: 'Manero' },
      { productoId: 86, nombre: 'Chuleta de manero' },
      { productoId: 58, nombre: 'Manero sexteado' },
    ],
  },
  {
    clave: 'pierna',
    nombre: 'Pierna',
    multiplicador: 2,
    productos: [
      { productoId: 4, nombre: 'Pierna' },
      { productoId: 314, nombre: 'Pierna rasgada' },
      { productoId: 10629, nombre: 'Pierna sin punta de anca' },
      { productoId: 85, nombre: 'Chuleta de pierna' },
      { productoId: 59, nombre: 'Pierna sexteado' },
      // ⚠️ "Punta de anca de cerdo" (productoId 79) NO suma aquí a propósito — tiene su
      // propia validación de correspondencia 1:1 contra "Pierna sin punta de anca",
      // ver PUNTA_DE_ANCA_CONFIG más abajo. Sumarla aquí duplicaría el conteo de la
      // misma pieza física (una "Pierna sin punta de anca" + su "Punta de anca" son las
      // dos mitades de una sola pierna, no dos piernas).
    ],
  },
  {
    clave: 'lomo',
    nombre: 'Lomo',
    multiplicador: 2,
    productos: [
      { productoId: 3, nombre: 'Lomo' },
      { productoId: 396, nombre: 'Churrasco de cerdo' },
      { productoId: 10571, nombre: 'Chuleton' }, // agregado 2026-08-25 a pedido del usuario — mismo patrón de "cuenta en varias familias a la vez" ya usado en Barriguero/Costilla, ver nota de Chuleton/Tocino y costilla/Costi-chi más abajo
      { productoId: 60, nombre: 'Barriguero sexteado' }, // ver nota de "sexteado" más abajo
      // "Solomito de cerdo" (productoId 52) NO suma — explícitamente excluido por el negocio.
    ],
  },
  {
    clave: 'papada',
    nombre: 'Papada',
    multiplicador: 2,
    productos: [
      { productoId: 8, nombre: 'Papada' },
      { productoId: 32040, nombre: 'Papada sin hombrillo' },
      { productoId: 10618, nombre: 'Hombrillo de cerdo' },
      // Corregido 2026-09-22 (reportado por el usuario): el cruce de Papada es con "Manero
      // sexteado" (id 58), no "Barriguero sexteado" (id 60) — antes de esta fecha esta familia
      // tenía Barriguero sexteado por error, agregado el 2026-08-27 sin distinguir bien entre
      // los dos "sexteado". Ver nota completa de "sexteado" más abajo.
      { productoId: 58, nombre: 'Manero sexteado' },
    ],
  },
  {
    clave: 'barriguero',
    nombre: 'Barriguero',
    multiplicador: 2,
    productos: [
      { productoId: 7, nombre: 'Barriguero' },
      { productoId: 32824, nombre: 'Barriguero sin piel' }, // nombre real en sgc tiene NBSP, no espacios
      { productoId: 21869, nombre: 'Tocino y costilla' },
      { productoId: 80, nombre: 'Costi-chi' },
      { productoId: 10571, nombre: 'Chuleton' }, // también en Lomo y Costilla — ver nota de Chuleton más abajo
      { productoId: 60, nombre: 'Barriguero sexteado' }, // ver nota de "sexteado" más abajo
    ],
  },
  {
    clave: 'costilla',
    nombre: 'Costilla de cerdo',
    multiplicador: 2,
    productos: [
      { productoId: 10, nombre: 'Costilla de cerdo' },
      { productoId: 21869, nombre: 'Tocino y costilla' },
      { productoId: 80, nombre: 'Costi-chi' },
      { productoId: 10571, nombre: 'Chuleton' }, // también en Barriguero y Lomo — ver nota de Chuleton más abajo
      { productoId: 60, nombre: 'Barriguero sexteado' }, // ver nota de "sexteado" más abajo
    ],
  },
  {
    // Agregada 2026-08-24, multiplicador corregido a ×1 el 2026-08-25 (pedido explícito del
    // usuario). Verificado contra sgc: productoId 6 ("Cabeza de lomo") y 10891 ("Chuleta de
    // cabeza de lomo") ambos con volumen real en producto_terminados. No se incluye "Chuleta
    // de cabeza de lomo picada" (id 21868) — es una presentación de venta al detal derivada,
    // con solo 2 filas históricas, mismo patrón que los demás productos "picada"/"porcionado"
    // excluidos de las otras familias.
    //
    // ⚠️ DIVERGE DE superops_jh a propósito (2026-09-22, pedido explícito del usuario en este
    // MVP) — multiplicador ×2 aquí, NO ×1 como en la copia fuente. En superops_jh es ×1 porque
    // ahí se VALIDA desposte ya ocurrido: las 2 unidades físicas de Cabeza de lomo de un mismo
    // animal se PESAN juntas en una sola canasta, así que producto_terminados registra 1
    // "pieza" por animal (verificado contra 6 programaciones reales, ver
    // superops_jh/apps/web/src/calc/familiasPiezas.config.ts para el detalle completo — no
    // reverificar ese dato, sigue siendo correcto para SU caso de uso). Pero este MVP
    // PROYECTA lo que recibe el punto de venta (ver PLAN.md §2.1: "el sentido del cálculo se
    // invierte") — y físicamente SÍ llegan 2 piezas de Cabeza de lomo por animal (una por cada
    // mitad), aunque en planta se pesen/registren como una sola. Mismo dato de planta, misma
    // config de origen, multiplicador distinto porque la pregunta que responde es distinta
    // ("¿cuántas piezas se pesaron juntas?" vs. "¿cuántas piezas físicas recibe el cliente?").
    clave: 'cabezaDeLomo',
    nombre: 'Cabeza de lomo',
    multiplicador: 2,
    productos: [
      { productoId: 6, nombre: 'Cabeza de lomo' },
      { productoId: 10891, nombre: 'Chuleta de cabeza de lomo' },
      // Agregado 2026-08-27, corregido 2026-09-22 (reportado por el usuario: el cruce correcto
      // es con "Manero sexteado", no "Barriguero sexteado" — mismo error y mismo fix que en
      // Papada, ver nota de "sexteado" más abajo). Factor 0.5: Cabeza de lomo es multiplicador
      // ×1 (una pieza esperada por animal) mientras "sexteado" se cuenta ×1 por pieza física en
      // las familias ×2 — cada pieza de Manero sexteado equivale a media pieza de Cabeza de
      // lomo. Verificado exacto contra 2 programaciones reales (mismas cantidades que tenía
      // Barriguero sexteado en esos casos, la corrección no cambia el resultado numérico ya
      // verificado, solo la fuente): 227226 (50 animales) 46 + 8×0.5=4 → 50; 227096 (26
      // animales) 23 + 6×0.5=3 → 26.
      { productoId: 58, nombre: 'Manero sexteado', factor: 0.5 },
    ],
  },
  {
    // Agregada 2026-08-25 a pedido del usuario (ver CLAUDE.md §6.23), multiplicador ×1, no
    // ×2 (igual razón que Cabeza de lomo arriba, aunque aquí no es "misma canasta" sino que
    // el animal tiene una sola cabeza — no bilateral). Verificado contra 3 programaciones
    // reales independientes
    // (227002/69 animales, 227023/12 animales, 227096/26 animales): SUM(num_piezas) =
    // numAnimalesProgramacion EXACTO en las tres. Un cuarto caso real (227152, 40 animales)
    // dio 77 piezas en vez de 40 — la propia hoja de cálculo del usuario marca esa celda en
    // rojo como discrepancia real de planta, no un error de la fórmula (confirma que la
    // validación SÍ debe alertar en ese caso, no absorberlo silenciosamente con otro
    // multiplicador). Sin productos "hijos" conocidos — a diferencia de Pierna/Lomo/etc.,
    // "Cabeza de cerdo" no se subdivide en otros productos derivados en el desposte.
    clave: 'cabezaDeCerdo',
    nombre: 'Cabeza de cerdo',
    multiplicador: 1,
    productos: [{ productoId: 17, nombre: 'Cabeza de cerdo' }],
  },
];

/**
 * Familias de piezas para Res — agregado 2026-09-16 a pedido del usuario (antes de esto,
 * "Validación de piezas" solo tenía las familias de Cerdo de arriba, así que un lote de Res
 * mostraba 0 encontrado en las 8 familias, sin ninguna corresponder a Res).
 *
 * Verificado real contra `sgc` en 3 programaciones independientes (227608/45 animales,
 * 227390/42 animales, 226648/31 animales) — `SUM(num_piezas) / num_animales` (canales de Res,
 * no "cerdos" — a diferencia de Cerdo, aquí el multiplicador aplica sobre la cantidad de
 * canales/animales de Res) dio exactamente 2,00 o 1,00 para los productos de abajo en los 3
 * casos, con solo 1-2 desviaciones de ±1 pieza puntuales sobre cientos (mismo ruido de captura
 * ya documentado para Cerdo, no invalida el patrón).
 *
 * A diferencia de Cerdo, ningún corte de Res tiene productos "hijos" conocidos (Pierna
 * rasgada, Chuleta de manero, etc.) — cada familia es un único producto, así que
 * `multiplicador` ES directamente la proporción piezas/animal confirmada.
 */
export const FAMILIAS_PIEZAS_RES: FamiliaPiezasConfig[] = [
  // ×2 por canal — 17 productos, exacto en los 3 casos reales.
  { clave: 'costillaDeRes', nombre: 'Costilla de res', multiplicador: 2, productos: [{ productoId: 64, nombre: 'Costilla de res' }] },
  { clave: 'tabla', nombre: 'Tabla', multiplicador: 2, productos: [{ productoId: 31, nombre: 'Tabla' }] },
  { clave: 'posta', nombre: 'Posta', multiplicador: 2, productos: [{ productoId: 29, nombre: 'Posta' }] },
  { clave: 'huevoDeAldana', nombre: 'Huevo de aldana', multiplicador: 2, productos: [{ productoId: 33, nombre: 'Huevo de aldana' }] },
  { clave: 'muchacho', nombre: 'Muchacho', multiplicador: 2, productos: [{ productoId: 28, nombre: 'Muchacho' }] },
  { clave: 'solomoExtranjero', nombre: 'Solomo extranjero', multiplicador: 2, productos: [{ productoId: 32, nombre: 'Solomo extranjero' }] },
  { clave: 'puntaDeAncaRes', nombre: 'Punta de anca', multiplicador: 2, productos: [{ productoId: 27, nombre: 'Punta de anca' }] },
  { clave: 'cascaraDeMoler', nombre: 'Cascara de moler', multiplicador: 2, productos: [{ productoId: 40, nombre: 'Cascara de moler' }] },
  { clave: 'solomoRedondo', nombre: 'Solomo redondo', multiplicador: 2, productos: [{ productoId: 25, nombre: 'Solomo redondo' }] },
  { clave: 'tablon', nombre: 'Tablon', multiplicador: 2, productos: [{ productoId: 34, nombre: 'Tablon' }] },
  { clave: 'lagarto', nombre: 'Lagarto', multiplicador: 2, productos: [{ productoId: 45, nombre: 'Lagarto' }] },
  { clave: 'chata', nombre: 'Chata', multiplicador: 2, productos: [{ productoId: 26, nombre: 'Chata' }] },
  { clave: 'cascara', nombre: 'Cascara', multiplicador: 2, productos: [{ productoId: 39, nombre: 'Cascara' }] },
  { clave: 'solomito', nombre: 'Solomito', multiplicador: 2, productos: [{ productoId: 24, nombre: 'Solomito' }] },
  { clave: 'huevoDeSolomo', nombre: 'Huevo de solomo', multiplicador: 2, productos: [{ productoId: 38, nombre: 'Huevo de solomo' }] },
  { clave: 'paletero', nombre: 'Paletero', multiplicador: 2, productos: [{ productoId: 37, nombre: 'Paletero' }] },
  {
    clave: 'pecho',
    nombre: 'Pecho',
    multiplicador: 2,
    productos: [
      { productoId: 44, nombre: 'Pecho' },
      // Agregado 2026-09-21 (ver CLAUDE.md §6.88) — variante de presentación del mismo
      // corte, mismo patrón que "Pierna"/"Pierna rasgada" en Cerdo. Verificado ×2 exacto en
      // 2 programaciones reales (228115/15 canales: 30 piezas; 227280/14 canales: 28 piezas,
      // ahí registrado como "Pecho entero" en vez de "Pecho" — nunca aparecen juntos en el
      // mismo lote en la muestra revisada).
      { productoId: 10592, nombre: 'Pecho entero' },
    ],
  },
  // ×1 por canal — 6 productos, exacto en los 3 casos reales (Cola xKg: 1,00/0,93/0,91 —
  // el más cercano a exacto de los 3 casos, con déficit leve en 2 de ellos; se mantiene en
  // este grupo por ser la mejor aproximación disponible, no una regla perfecta).
  { clave: 'sobrebarriga', nombre: 'Sobrebarriga', multiplicador: 1, productos: [{ productoId: 43, nombre: 'Sobrebarriga' }] },
  { clave: 'desmecharEspecial', nombre: 'Desmechar especial', multiplicador: 1, productos: [{ productoId: 175, nombre: 'Desmechar especial' }] },
  { clave: 'copete', nombre: 'Copete', multiplicador: 1, productos: [{ productoId: 42, nombre: 'Copete' }] },
  { clave: 'trestela', nombre: 'Trestela', multiplicador: 1, productos: [{ productoId: 46, nombre: 'Trestela' }] },
  { clave: 'tableado', nombre: 'Tableado', multiplicador: 1, productos: [{ productoId: 41, nombre: 'Tableado' }] },
  { clave: 'colaXKg', nombre: 'Cola xKg', multiplicador: 1, productos: [{ productoId: 21305, nombre: 'Cola xKg' }] },
  // Agregados 2026-09-21 (ver CLAUDE.md §6.88) — ×1 exacto en los 4 lotes reales donde
  // aparecen (227280/14, 228082/15, 228083/14, 228108/15 canales); ausentes en los otros 3
  // lotes de la misma muestra (228109/228115/228116) — no se investigó si es una omisión de
  // captura o un corte que no siempre se separa, pero no invalida el patrón ×1 en los casos
  // donde sí aparecen.
  { clave: 'puntaDeEspaldilla', nombre: 'Punta de espaldilla', multiplicador: 1, productos: [{ productoId: 35, nombre: 'Punta de espaldilla' }] },
  { clave: 'puntaDeFalda', nombre: 'Punta de falda', multiplicador: 1, productos: [{ productoId: 36, nombre: 'Punta de falda' }] },
];

/**
 * Nota sobre productos de Res SIN patrón fijo de piezas por canal (verificado en los mismos 3
 * casos reales de arriba) — quedan fuera de `FAMILIAS_PIEZAS_RES` a propósito, mismo criterio
 * que garra/tocino/huesos en Cerdo (§6.20): van a comparación contra promedio histórico, no a
 * una regla fija que sería falsa.
 *
 * - **Hueso** (id 65): 1,18 / 1,19 / 1,16 piezas/canal — cerca de ×1 pero con excedente
 *   consistente, no exacto.
 * - **Nucas** (id 55): 0,58 / 0,50 / 0,48 — proporción real, no entero.
 * - **Tapas de cadero** (id 56): 0,13 / 0,17 / 0,19 — subproducto de volumen bajo y variable.
 * - **Repele de res** (id 63): 0,11 / 0,19 / 0,16 — repesaje, no corte primario regular.
 * - **Rompe** (id 66) y **Chocozuela** (id 67): 0,02-0,07 — recortes de volumen mínimo.
 * - **Desperdicio de res** (id 279): solo 1 pieza en 1 de los 3 casos — sin señal.
 * - **Tapa de costilla** (id 61) y **Osobuco de res** (id 10628): solo vistos en 1 lote
 *   (227280/124603, 0,71 piezas/canal ambos) — sin suficiente evidencia para un patrón fijo.
 *
 * Ampliación 2026-09-21 (ver CLAUDE.md §6.88), muestra ampliada a 7 programaciones (94
 * canales): confirmó que NO hay piezas que varíen entre ×1/×2 "según tipo de lote" — el
 * único caso de variación real encontrado (**Lagarto**, id 45: ×1 en 5 de 7 lotes, ×2 en 2)
 * resultó ser ruido de captura en planta, no una regla distinta. En el lote 124603/prog.
 * 227280 (el caso "×1"), cada canasta de Lagarto trae `num_piezas=2` pero pesa ~7,8 Kg/pieza
 * — casi el doble del peso real (~6,2 Kg/pieza, verificado en prog. 228109) — evidencia de
 * que el operador capturó 2 piezas por canasta cuando la canasta en realidad contenía las 2
 * piezas de 2 canales distintos (4 piezas físicas). Lagarto se mantiene en el grupo ×2
 * arriba; el caso 227280 debe quedar señalado por la alerta de "pieza atípica" (§6.23,
 * comparación de peso/pieza dentro del mismo producto+programación), no por un cambio de
 * multiplicador.
 */

/**
 * Correspondencia 1:1 entre "Pierna sin punta de anca" y "Punta de anca de cerdo" — cada
 * pierna a la que se le quita la punta debe generar exactamente una punta de anca. Es una
 * validación independiente de la familia Pierna (no afecta piezasEsperadas/piezasEncontradas
 * de esa familia).
 */
export const PUNTA_DE_ANCA_CONFIG = {
  piernaSinPunta: { productoId: 10629, nombre: 'Pierna sin punta de anca' },
  puntaDeAnca: { productoId: 79, nombre: 'Punta de anca de cerdo' },
};

/**
 * Nota sobre los productos "sexteado" (agregado 2026-08-24, reportado por el usuario
 * probando la programación 227096, 26 animales real). Solo existen 3 en `sgc`: "Manero
 * sexteado" (id 58), "Pierna sexteado" (id 59), "Barriguero sexteado" (id 60).
 *
 * - Manero sexteado y Pierna sexteado son SIMPLES: cada uno suma solo a su propia familia
 *   (confirmado con el caso real: Manero 46 + Manero sexteado 6 = 52 = 26×2 exacto; mismo
 *   patrón para Pierna).
 * - Barriguero sexteado es DISTINTO — pese al nombre, representa una pieza que contiene
 *   SIMULTÁNEAMENTE un corte de Barriguero, uno de Lomo y uno de Costilla de cerdo (mismo
 *   patrón ya usado con "Tocino y costilla"/"Costi-chi", que cuentan en Barriguero y Costilla
 *   — ver esas familias arriba). Por eso aparece sumando en 3 familias a la vez, NO solo en
 *   Barriguero como el nombre sugeriría. Confirmado explícitamente por el usuario: en el caso
 *   real 227096, "Barriguero" solo (52 piezas) ya cuadraba exacto contra 26×2 SIN sumarle nada
 *   — sumar también "Barriguero sexteado" (6 piezas) ahí produce un excedente de +6 en esa
 *   familia. Es intencional y se acepta: mismo criterio que las otras familias con excedente
 *   real (Manero/Papada en el caso 227002, ver CLAUDE.md §6.19) — no se oculta el excedente
 *   ajustando la fórmula para que "cuadre bonito", se reporta tal cual.
 *
 * CORRECCIÓN 2026-09-22 (reportada por el usuario): la ampliación original del 2026-08-27
 * había agregado "Barriguero sexteado" (con factor 0.5) tanto a Papada como a Cabeza de
 * lomo — AMBAS estaban MAL. El cruce correcto en las dos familias es con "Manero sexteado"
 * (id 58), no con Barriguero sexteado. Verificado exacto en 2 programaciones reales (mismas
 * cantidades que tenía Barriguero sexteado en esos casos — la corrección no cambia el
 * resultado numérico ya verificado, solo la fuente):
 * - Papada: 227226 92+8=100; 227096 46+6=52 (factor 1, familia ×2).
 * - Cabeza de lomo: 227226 46+8×0.5=50; 227096 23+6×0.5=26 (factor 0.5, familia ×1).
 * Los cálculos de verificación de 2026-08-27 con Barriguero sexteado quedaron documentados
 * como referencia histórica del error, no como patrón vigente — no repetir esa combinación
 * de productos si se reinvestiga alguna de las dos familias más adelante.
 *
 * Nota sobre "Chuleton" (agregado a Lomo 2026-08-25, a pedido explícito del usuario — antes
 * solo estaba en Barriguero y Costilla de cerdo, igual que "Tocino y costilla"/"Costi-chi").
 * Con este cambio, Chuleton pasa a sumar en 3 familias a la vez (Barriguero, Costilla, Lomo)
 * — mismo patrón que Barriguero sexteado arriba, no doble conteo por error: cada unidad de
 * Chuleton es simultáneamente una pieza de cada uno de los 3 cortes.
 */
