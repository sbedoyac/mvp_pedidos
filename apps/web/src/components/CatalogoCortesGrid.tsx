import { useMemo, useState } from 'react';
import { catalogoCortes, type CorteCatalogo } from '../calc/catalogoCortes';
import { colorDeFamilia } from '../calc/coloresFamilia';
import { FAMILIAS_PIEZAS, FAMILIAS_PIEZAS_RES } from '../calc/familiasPiezas.config';
import { usePedidoStore } from '../store/usePedidoStore';
import { EspecificacionSelector } from './EspecificacionSelector';

interface StepperProps {
  etiqueta?: string;
  cantidad: number;
  onChange: (cantidad: number) => void;
  /** Incremento de los botones +/- — 2 para cortes derivados (bilaterales, vienen en pares por animal). */
  paso?: number;
}

/**
 * Stepper genérico +/- con input editable — usado tanto para la cantidad total (paso 1) como
 * para cada presentación (paso 2). El texto tecleado se guarda en estado local y solo se
 * confirma (`onChange`, que redondea a `paso`) al perder el foco o presionar Enter — si se
 * redondeara en cada tecla, escribir "12" dígito a dígito nunca llegaría a completarse: el "1"
 * ya se redondearía a "0" antes de que el "2" se agregara.
 */
function Stepper({ etiqueta, cantidad, onChange, paso = 1 }: StepperProps) {
  const [texto, setTexto] = useState<string | null>(null);

  const confirmar = () => {
    if (texto !== null) {
      onChange(Math.max(0, Math.floor(Number(texto) || 0)));
      setTexto(null);
    }
  };

  return (
    <div className="tarjeta-stepper-presentacion">
      {etiqueta && <span className="tarjeta-stepper-etiqueta">{etiqueta}</span>}
      <div className="tarjeta-stepper">
        <button type="button" onClick={() => onChange(Math.max(0, cantidad - paso))} disabled={cantidad === 0}>
          −
        </button>
        <input
          type="number"
          min={0}
          step={paso}
          className="tarjeta-cantidad-input"
          value={texto ?? (cantidad === 0 ? '' : cantidad)}
          placeholder="0"
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => e.key === 'Enter' && confirmar()}
        />
        <button type="button" onClick={() => onChange(cantidad + paso)}>
          +
        </button>
      </div>
    </div>
  );
}

interface CatalogoCortesGridProps {
  /**
   * 'total' (paso 1, ver CLAUDE.md §6.8): un solo stepper por tarjeta, cantidad total del
   * corte, sin distinguir presentación todavía. 'presentacion' (paso 2): dos steppers
   * (Vacío/Granel) para repartir la cantidad total ya fijada en el paso 1.
   */
  modo: 'total' | 'presentacion';
}

export function CatalogoCortesGrid({ modo }: CatalogoCortesGridProps) {
  const especie = usePedidoStore((s) => s.especie);
  const lineas = usePedidoStore((s) => s.lineas);
  const setCantidadTotalLinea = usePedidoStore((s) => s.setCantidadTotalLinea);
  const repartirPresentacion = usePedidoStore((s) => s.repartirPresentacion);
  const setEspecificacionLinea = usePedidoStore((s) => s.setEspecificacionLinea);
  const proyeccion = usePedidoStore((s) => s.proyeccion());

  const cortesPedibles = useMemo(() => catalogoCortes(especie), [especie]);

  // En modo 'presentacion' (paso 2), las líneas "sin transformar" generadas automáticamente
  // al avanzar de paso (ver usePedidoStore.irAPaso2, CLAUDE.md §6.9) tienen el productoId del
  // corte PADRE — excluido a propósito de `catalogoCortes()` porque nunca se pide a mano
  // (modo 'total'). Para poder repartir su Vacío/Granel en el paso 2, se agregan como tarjeta
  // solo si ya existe una línea de carrito con ese productoId.
  const cortes = useMemo(() => {
    if (modo !== 'presentacion') return cortesPedibles;
    const familias = especie === 'cerdo' ? FAMILIAS_PIEZAS : FAMILIAS_PIEZAS_RES;
    const padresConLinea: CorteCatalogo[] = [];
    for (const familia of familias) {
      const padre = familia.productos[0];
      if (familia.productos.length <= 1) continue; // sin derivados, no es "padre" — ya está en cortesPedibles
      if (!lineas.some((l) => l.productoId === padre.productoId)) continue;
      padresConLinea.push({
        productoId: padre.productoId,
        nombre: padre.nombre,
        familiaClave: familia.clave,
        familiaNombre: familia.nombre,
        especificaciones: [],
        esPadre: true,
      });
    }
    return [...cortesPedibles, ...padresConLinea];
  }, [cortesPedibles, modo, especie, lineas]);

  const porFamilia = useMemo(() => {
    const grupos = new Map<string, { nombre: string; cortes: typeof cortes }>();
    for (const corte of cortes) {
      if (!grupos.has(corte.familiaClave)) grupos.set(corte.familiaClave, { nombre: corte.familiaNombre, cortes: [] });
      grupos.get(corte.familiaClave)!.cortes.push(corte);
    }
    return grupos;
  }, [cortes]);

  // En el paso 2 solo tiene sentido repartir presentación de lo que ya se pidió en el paso 1.
  const familiasVisibles =
    modo === 'presentacion'
      ? [...porFamilia.entries()].filter(([, { cortes: cortesFamilia }]) =>
          cortesFamilia.some((c) => lineas.some((l) => l.productoId === c.productoId)),
        )
      : [...porFamilia.entries()];

  return (
    <div className="catalogo-grid">
      {familiasVisibles.map(([familiaClave, { nombre: familiaNombre, cortes: cortesFamilia }]) => {
        const color = colorDeFamilia(familiaClave);
        const cortesConLinea =
          modo === 'presentacion' ? cortesFamilia.filter((c) => lineas.some((l) => l.productoId === c.productoId)) : cortesFamilia;
        const totalFamilia = cortesFamilia.reduce((suma, corte) => {
          const linea = lineas.find((l) => l.productoId === corte.productoId);
          return suma + (linea ? linea.cantidadVacio + linea.cantidadGranel : 0);
        }, 0);
        // Disponible del corte padre (ver catalogoCortes.ts: familias con derivados no
        // ofrecen el genérico como tarjeta pedible — el punto de venta lo recibe por
        // defecto, cada derivado pedido le resta). Sin familia proyectada (Res sin patrón
        // fijo) no hay disponible que mostrar.
        const familiaProyectada = proyeccion.find((f) => f.clave === familiaClave);

        return (
          <section
            key={familiaClave || familiaNombre}
            className="catalogo-seccion"
            style={{ ['--acento' as string]: color.acento, ['--acento-oscuro' as string]: color.acentoOscuro, ['--fondo-suave' as string]: color.fondo }}
          >
            <h3>
              {familiaNombre}
              {familiaProyectada && (
                <span className={`seccion-disponible ${familiaProyectada.sobrepasado ? 'sobrepasado' : ''}`}>
                  Sin transformar: {familiaProyectada.disponible}
                </span>
              )}
              {totalFamilia > 0 && <span className="seccion-contador">{totalFamilia} en el carrito</span>}
            </h3>
            <div className="catalogo-tarjetas">
              {cortesConLinea.map((corte) => {
                const linea = lineas.find((l) => l.productoId === corte.productoId);
                const cantidadVacio = linea?.cantidadVacio ?? 0;
                const cantidadGranel = linea?.cantidadGranel ?? 0;
                const cantidadTotal = cantidadVacio + cantidadGranel;

                return (
                  <div key={corte.productoId} className={`tarjeta-corte ${cantidadTotal > 0 ? 'con-cantidad' : ''}`}>
                    {cantidadTotal > 0 && <span className="tarjeta-badge">{cantidadTotal}</span>}
                    <p className="tarjeta-nombre">
                      {corte.nombre}
                      {corte.esPadre && <span className="tarjeta-etiqueta-padre"> (sin transformar)</span>}
                    </p>
                    {corte.nota && cantidadTotal > 0 && <p className="tarjeta-nota">⚠ {corte.nota}</p>}

                    <EspecificacionSelector
                      opciones={corte.especificaciones}
                      valor={linea?.especificacion ?? null}
                      onChange={(v) => setEspecificacionLinea(corte.productoId, v)}
                    />

                    {modo === 'total' ? (
                      <Stepper
                        cantidad={cantidadTotal}
                        onChange={(v) => setCantidadTotalLinea(corte.productoId, corte.nombre, v)}
                        paso={2}
                      />
                    ) : (
                      <>
                        <p className="tarjeta-total-fijo">Total: {cantidadTotal}</p>
                        <Stepper
                          etiqueta="Vacío"
                          cantidad={cantidadVacio}
                          onChange={(v) => repartirPresentacion(corte.productoId, 'vacio', v)}
                          paso={2}
                        />
                        <Stepper
                          etiqueta="Granel"
                          cantidad={cantidadGranel}
                          paso={2}
                          onChange={(v) => repartirPresentacion(corte.productoId, 'granel', v)}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
