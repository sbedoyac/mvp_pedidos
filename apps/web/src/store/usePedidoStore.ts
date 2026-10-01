import { create } from 'zustand';
import { corteDelPadre } from '../calc/catalogoCortes';
import { FAMILIAS_PIEZAS, FAMILIAS_PIEZAS_RES } from '../calc/familiasPiezas.config';
import type { Especie, ProyeccionFamilia } from '../calc/proyeccionPiezas';
import { maxCantidadPermitida, proyeccionPiezas } from '../calc/proyeccionPiezas';
import { API_BASE, mensajeErrorApi } from '../config/urls';
import type { ClienteDTO, Origen, PedidoInput, PedidoLineaInput, PedidoRetomaInput, Presentacion } from '../types/dto';

type Status = 'idle' | 'guardando' | 'guardado' | 'error';

/**
 * Una línea de carrito por producto, con cantidad separada por presentación (2026-09-22, ver
 * CLAUDE.md §6.7 — caso real "20 Ancas Vacío + 20 Ancas Granel" del mismo corte). El total
 * pedido de la línea es `cantidadVacio + cantidadGranel`; al guardar el pedido
 * (`lineasParaGuardar` más abajo) cada presentación con cantidad > 0 se expande a su propia
 * fila `PedidoLineaInput`, que es el nivel de granularidad real del esquema de la DB
 * (`pedido_lineas`, una presentación por fila) — el backend no cambió, solo cómo el store
 * arma el payload.
 */
interface LineaCarrito {
  productoId: number;
  nombre: string;
  cantidadVacio: number;
  cantidadGranel: number;
  especificacion: string | null;
}

interface RetomaCarrito extends PedidoRetomaInput {
  nombre: string;
}

/**
 * Flujo en 2 pasos (2026-09-22, a pedido del usuario): paso 1 captura fecha/cliente/especie/
 * animales + cantidad TOTAL de cada corte especial + Retoma; paso 2 reparte esa cantidad total
 * entre Vacío/Granel. El carrito lateral es visible en ambos pasos. `paso` no se persiste,
 * vive solo en memoria de la sesión de captura.
 */
type Paso = 1 | 2;

interface PedidoStore {
  status: Status;
  error?: string;
  pedidoGuardadoId?: number;
  paso: Paso;

  // --- fuente única de verdad (ver superops_jh/usePreliquidacionStore.ts, mismo patrón) ---
  fechaEntrega: string;
  /** punto_venta = pedido normal (exige Tercero/Sucursal); planta = reserva de excedente semanal, sin cliente (ver CLAUDE.md §6.14). */
  origen: Origen;
  terceroId: number | null;
  clienteNombre: string;
  sucursalId: number | null;
  sucursalNombre: string;
  especie: Especie;
  cantidadAnimales: number;
  lineas: LineaCarrito[];
  retomas: RetomaCarrito[];

  // --- clientes disponibles (cargados de GET /api/clientes) ---
  clientes: ClienteDTO[];
  clientesStatus: 'idle' | 'loading' | 'ready' | 'error';
  cargarClientes: () => Promise<void>;

  // --- acciones: solo mutan lo de arriba ---
  setFechaEntrega: (v: string) => void;
  setOrigen: (v: Origen) => void;
  /** Combobox en 2 clicks (ver capturas del usuario, mismo patrón de sgc): elegir Tercero limpia la Sucursal. */
  setTercero: (terceroId: number, terceroNombre: string) => void;
  /** Sucursal, siempre entre las del Tercero ya elegido. */
  setSucursal: (sucursalId: number, sucursalNombre: string) => void;
  setEspecie: (v: Especie) => void;
  setCantidadAnimales: (v: number) => void;
  /**
   * Fija la cantidad TOTAL de una línea en el paso 1 (antes de repartir entre Vacío/Granel).
   * Escribe directo sobre `cantidadVacio` (presentación por defecto) y deja `cantidadGranel`
   * en 0 en una línea nueva; si la línea ya existía (el admin volvió al paso 1 y cambió el
   * total), ajusta `cantidadVacio` manteniendo `cantidadGranel` tal cual estaba, recortando
   * este último si ya no cabe en el nuevo total.
   */
  setCantidadTotalLinea: (productoId: number, nombre: string, cantidadTotal: number) => void;
  /**
   * Paso 2: reparte el TOTAL ya fijado en el paso 1 entre Vacío/Granel — mueve piezas de una
   * presentación a la otra, el total de la línea nunca cambia aquí (a diferencia de
   * `setCantidadTotalLinea`). Ej. con Vacío=12/Granel=0 (total 12), llamar con
   * (presentacion: 'granel', cantidad: 5) deja Vacío=7/Granel=5 — sigue sumando 12.
   */
  repartirPresentacion: (productoId: number, presentacion: Presentacion, cantidad: number) => void;
  setEspecificacionLinea: (productoId: number, especificacion: string | null) => void;
  quitarLinea: (productoId: number) => void;
  toggleRetoma: (productoId: number, nombre: string) => void;
  setNotaRetoma: (productoId: number, nota: string) => void;
  /**
   * Piezas retomadas de un producto CON proyección de piezas (cortes padre + cortes
   * especiales — ver CLAUDE.md §6.13). Se recorta al mismo bloqueo duro que una línea de
   * pedido normal (`maxCantidadPermitida`, considerando lo ya pedido en `lineas` más lo ya
   * retomado en otros productos de la misma familia) y se redondea a par (bilateralidad, ver
   * §6.10) — la retoma resta piezas reales del lote igual que un pedido. 0 = sin cantidad
   * (equivale a no marcar la retoma; ver `toggleRetoma`). No aplica a productos de
   * `RETOMA_EXTENDIDA_CERDO` (sin proyección confiable) — esos siguen siendo todo-o-nada.
   */
  setCantidadRetoma: (productoId: number, cantidad: number) => void;
  irAPaso2: () => void;
  volverAPaso1: () => void;
  /** Sin argumento, vuelve al estado de captura normal; con 'planta', arranca ya en modo pedido de planta (ver ProgramacionSemanal.tsx). */
  reset: (origenInicial?: Origen) => void;

  // --- derivado a demanda, nunca persistido ---
  proyeccion: () => ProyeccionFamilia[];

  guardarPedido: () => Promise<void>;
}

const ESTADO_INICIAL = {
  paso: 1 as Paso,
  fechaEntrega: '',
  origen: 'punto_venta' as Origen,
  terceroId: null as number | null,
  clienteNombre: '',
  sucursalId: null as number | null,
  sucursalNombre: '',
  especie: 'cerdo' as Especie,
  cantidadAnimales: 0,
  lineas: [] as LineaCarrito[],
  retomas: [] as RetomaCarrito[],
};

export const usePedidoStore = create<PedidoStore>((set, get) => ({
  status: 'idle',
  error: undefined,
  pedidoGuardadoId: undefined,
  ...ESTADO_INICIAL,

  clientes: [],
  clientesStatus: 'idle',

  cargarClientes: async () => {
    if (get().clientesStatus === 'loading') return;
    set({ clientesStatus: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/api/clientes`);
      if (!res.ok) throw new Error(`Error ${res.status} al cargar clientes`);
      const clientes = (await res.json()) as ClienteDTO[];
      set({ clientes, clientesStatus: 'ready' });
    } catch (err) {
      set({ clientesStatus: 'error', error: mensajeErrorApi(err, 'No se pudieron cargar los clientes') });
    }
  },

  setFechaEntrega: (fechaEntrega) => set({ fechaEntrega }),
  setOrigen: (origen) => set({ origen }),
  setTercero: (terceroId, terceroNombre) =>
    set({ terceroId, clienteNombre: terceroNombre, sucursalId: null, sucursalNombre: '' }),
  setSucursal: (sucursalId, sucursalNombre) => set({ sucursalId, sucursalNombre }),
  setEspecie: (especie) => set({ especie, lineas: [], retomas: [] }), // cambiar de especie invalida el carrito, familias distintas
  setCantidadAnimales: (cantidadAnimales) => set({ cantidadAnimales: Math.max(0, cantidadAnimales) }),

  repartirPresentacion: (productoId, presentacion, cantidad) =>
    set((state) => {
      const existente = state.lineas.find((l) => l.productoId === productoId);
      if (!existente) return {}; // no hay total fijado en el paso 1 — no debería llamarse

      const total = existente.cantidadVacio + existente.cantidadGranel;
      // El total NO cambia aquí (a diferencia de setCantidadTotalLinea) — solo se mueve entre
      // presentaciones, así que nunca puede exceder el disponible: no hace falta bloqueo duro.
      // Cada presentación también debe ser par (bilateralidad, ver §6.10/§6.11 de CLAUDE.md) —
      // como el total ya es par (garantizado por setCantidadTotalLinea), redondear esta
      // presentación hacia abajo al par más cercano deja el complemento (total - par) par
      // automáticamente, sin necesidad de redondearlo también.
      const acotada = Math.max(0, Math.min(cantidad, total));
      const nuevaCantidad = Math.floor(acotada / 2) * 2;
      const vacioFinal = presentacion === 'vacio' ? nuevaCantidad : total - nuevaCantidad;
      const granelFinal = presentacion === 'granel' ? nuevaCantidad : total - nuevaCantidad;

      return {
        lineas: state.lineas.map((l) =>
          l.productoId === productoId ? { ...l, cantidadVacio: vacioFinal, cantidadGranel: granelFinal } : l,
        ),
      };
    }),

  setCantidadTotalLinea: (productoId, nombre, cantidadTotal) =>
    set((state) => {
      const cantidadDeseada = Math.max(0, cantidadTotal);
      // Lo ya comprometido contra el disponible de la familia: otras líneas de pedido +
      // retomas con cantidad (una retoma resta piezas reales del lote igual que un pedido,
      // ver setCantidadRetoma/CLAUDE.md §6.13).
      const otrasLineas = [
        ...state.lineas
          .filter((l) => l.productoId !== productoId)
          .map((l) => ({ productoId: l.productoId, cantidadPiezas: l.cantidadVacio + l.cantidadGranel })),
        ...state.retomas.filter((r) => r.cantidad).map((r) => ({ productoId: r.productoId, cantidadPiezas: r.cantidad! })),
      ];
      const max = maxCantidadPermitida(state.cantidadAnimales, state.especie, productoId, otrasLineas);
      // Todo corte derivado es bilateral (viene en pares por animal, igual que Punta de anca)
      // — se redondea hacia abajo al par más cercano, sin mensaje de error, mismo patrón sin
      // fricción que el bloqueo duro de maxCantidadPermitida.
      const cantidadFinal = Math.floor(Math.min(cantidadDeseada, max) / 2) * 2;

      if (cantidadFinal === 0) {
        return { lineas: state.lineas.filter((l) => l.productoId !== productoId) };
      }

      const existente = state.lineas.find((l) => l.productoId === productoId);
      if (existente) {
        // Mantiene el reparto Vacío/Granel ya hecho si el admin vuelve al paso 1 y sube el
        // total; si lo baja por debajo de lo que ya tenía en Granel, recorta Granel primero
        // (Vacío es la presentación "por defecto", ver comentario de setCantidadTotalLinea).
        const granelFinal = Math.min(existente.cantidadGranel, cantidadFinal);
        const vacioFinal = cantidadFinal - granelFinal;
        return {
          lineas: state.lineas.map((l) =>
            l.productoId === productoId ? { ...l, cantidadVacio: vacioFinal, cantidadGranel: granelFinal } : l,
          ),
        };
      }

      return {
        lineas: [...state.lineas, { productoId, nombre, cantidadVacio: cantidadFinal, cantidadGranel: 0, especificacion: null }],
      };
    }),

  setEspecificacionLinea: (productoId, especificacion) =>
    set((state) => ({
      lineas: state.lineas.map((l) => (l.productoId === productoId ? { ...l, especificacion } : l)),
    })),

  quitarLinea: (productoId) =>
    set((state) => ({ lineas: state.lineas.filter((l) => l.productoId !== productoId) })),

  toggleRetoma: (productoId, nombre) =>
    set((state) => {
      const yaExiste = state.retomas.some((r) => r.productoId === productoId);
      if (yaExiste) {
        return { retomas: state.retomas.filter((r) => r.productoId !== productoId) };
      }
      return { retomas: [...state.retomas, { productoId, nombre, nota: '', cantidad: 0 }] };
    }),

  setNotaRetoma: (productoId, nota) =>
    set((state) => ({
      retomas: state.retomas.map((r) => (r.productoId === productoId ? { ...r, nota } : r)),
    })),

  setCantidadRetoma: (productoId, cantidad) =>
    set((state) => {
      const cantidadDeseada = Math.max(0, cantidad);
      // Lo ya comprometido contra el disponible de la familia: líneas de pedido normales +
      // otras retomas con cantidad (no la del propio productoId, que se está editando).
      const otrasLineas = [
        ...state.lineas.map((l) => ({ productoId: l.productoId, cantidadPiezas: l.cantidadVacio + l.cantidadGranel })),
        ...state.retomas
          .filter((r) => r.productoId !== productoId && r.cantidad)
          .map((r) => ({ productoId: r.productoId, cantidadPiezas: r.cantidad! })),
      ];
      const max = maxCantidadPermitida(state.cantidadAnimales, state.especie, productoId, otrasLineas);
      const cantidadFinal = Math.floor(Math.min(cantidadDeseada, max) / 2) * 2;

      return {
        retomas: state.retomas.map((r) => (r.productoId === productoId ? { ...r, cantidad: cantidadFinal } : r)),
      };
    }),

  irAPaso2: () =>
    set((state) => {
      // Genera automáticamente una línea "sin transformar" por cada familia con disponible > 0
      // que no tenga ya ninguna línea de carrito (ver CLAUDE.md §6.9 — caso real: pedido de
      // puro corte genérico, sin ningún corte especial, ej. "60 Manero sin transformar"). Sin
      // esto el pedido quedaría con 0 líneas y nada auditable en pedido_lineas.
      const proyeccionActual = proyeccionPiezas(
        state.cantidadAnimales,
        state.especie,
        state.lineas.map((l) => ({ productoId: l.productoId, cantidadPiezas: l.cantidadVacio + l.cantidadGranel })),
      );

      const nuevasLineas: LineaCarrito[] = [];
      for (const familia of proyeccionActual) {
        if (familia.clave === 'cabezaDeCerdo' || familia.disponible <= 0) continue;
        const padre = corteDelPadre(familia.clave, state.especie);
        if (!padre) continue;
        const yaTieneLinea = state.lineas.some((l) => l.productoId === padre.productoId);
        if (yaTieneLinea) continue;
        nuevasLineas.push({
          productoId: padre.productoId,
          nombre: padre.nombre,
          cantidadVacio: familia.disponible,
          cantidadGranel: 0,
          especificacion: null,
        });
      }

      return { paso: 2, lineas: [...state.lineas, ...nuevasLineas] };
    }),
  volverAPaso1: () =>
    set((state) => {
      // Simétrico de irAPaso2: quita las líneas "sin transformar" que se generaron
      // automáticamente al avanzar, para que el paso 1 vuelva a mostrar 0 en esos cortes
      // padre (no son líneas que el admin haya pedido a mano) — sin esto, volver y avanzar
      // de nuevo duplicaría/inflaría las cantidades.
      const clavesPadre = new Set(
        [...FAMILIAS_PIEZAS, ...FAMILIAS_PIEZAS_RES]
          .filter((f) => f.productos.length > 1)
          .map((f) => f.productos[0].productoId),
      );
      return {
        paso: 1,
        lineas: state.lineas.filter((l) => !clavesPadre.has(l.productoId)),
      };
    }),

  reset: (origenInicial) =>
    set({ ...ESTADO_INICIAL, origen: origenInicial ?? 'punto_venta', status: 'idle', error: undefined, pedidoGuardadoId: undefined }),

  proyeccion: () => {
    const { cantidadAnimales, especie, lineas, retomas } = get();
    // Una retoma con cantidad (ver setCantidadRetoma/CLAUDE.md §6.13) resta piezas reales del
    // lote igual que una línea de pedido normal — se concatena a las líneas para el cálculo,
    // sin ser una línea de pedido real (no se guarda en pedido_lineas).
    const lineasParaProyeccion = [
      ...lineas.map((l) => ({ productoId: l.productoId, cantidadPiezas: l.cantidadVacio + l.cantidadGranel })),
      ...retomas.filter((r) => r.cantidad).map((r) => ({ productoId: r.productoId, cantidadPiezas: r.cantidad! })),
    ];
    return proyeccionPiezas(cantidadAnimales, especie, lineasParaProyeccion);
  },

  guardarPedido: async () => {
    const state = get();
    set({ status: 'guardando', error: undefined });

    // Cada línea de carrito puede expandirse a hasta 2 filas de PedidoLineaInput — una por
    // presentación con cantidad > 0 (ver LineaCarrito arriba: el esquema de la DB solo admite
    // una presentación por fila, así que "20 Vacío + 20 Granel" del mismo producto se guarda
    // como 2 líneas independientes con el mismo productoId).
    const lineasParaGuardar: PedidoLineaInput[] = state.lineas.flatMap((l) => {
      const filas: PedidoLineaInput[] = [];
      if (l.cantidadVacio > 0) {
        filas.push({ productoId: l.productoId, cantidad: l.cantidadVacio, presentacion: 'vacio', especificacion: l.especificacion });
      }
      if (l.cantidadGranel > 0) {
        filas.push({ productoId: l.productoId, cantidad: l.cantidadGranel, presentacion: 'granel', especificacion: l.especificacion });
      }
      return filas;
    });

    const input: PedidoInput = {
      fechaEntrega: state.fechaEntrega,
      cliente: state.clienteNombre,
      sucursal: state.sucursalNombre,
      especie: state.especie,
      cantidadAnimales: state.cantidadAnimales,
      lineas: lineasParaGuardar,
      retomas: state.retomas.map(({ productoId, nota, cantidad }) => ({ productoId, nota, cantidad: cantidad || null })),
      origen: state.origen,
    };

    try {
      const res = await fetch(`${API_BASE}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al guardar el pedido`);
      const { id } = (await res.json()) as { id: number };
      set({ status: 'guardado', pedidoGuardadoId: id });
    } catch (err) {
      set({ status: 'error', error: mensajeErrorApi(err, 'No se pudo guardar el pedido') });
    }
  },
}));
