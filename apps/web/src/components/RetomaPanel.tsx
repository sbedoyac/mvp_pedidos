import { useMemo, useState } from 'react';
import { catalogoCortes, cortesPadre } from '../calc/catalogoCortes';
import { RETOMA_EXTENDIDA_CERDO } from '../calc/retomaExtendida.config';
import { usePedidoStore } from '../store/usePedidoStore';

interface InputCantidadRetomaProps {
  cantidad: number;
  onChange: (cantidad: number) => void;
}

/**
 * Igual patrón que el Stepper de CatalogoCortesGrid.tsx (ver CLAUDE.md §6.10): el texto
 * tecleado se guarda en estado local sin redondear, y solo se confirma (onChange, que
 * redondea a par) al perder el foco o presionar Enter — si se redondeara en cada tecla,
 * escribir "12" dígito a dígito nunca llegaría a completarse.
 */
function InputCantidadRetoma({ cantidad, onChange }: InputCantidadRetomaProps) {
  const [texto, setTexto] = useState<string | null>(null);

  const confirmar = () => {
    if (texto !== null) {
      onChange(Math.max(0, Math.floor(Number(texto) || 0)));
      setTexto(null);
    }
  };

  return (
    <input
      type="number"
      min={0}
      step={2}
      className="retoma-cantidad-input"
      placeholder="Piezas (vacío = todo el disponible)"
      value={texto ?? (cantidad === 0 ? '' : cantidad)}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => e.key === 'Enter' && confirmar()}
    />
  );
}

/**
 * Retoma (ver PLAN.md §1.5): instrucción INVERSA a un pedido normal — un corte marcado aquí
 * NO se despacha, se queda en planta. Sección aparte del carrito, no resta contra el
 * disponible proyectado de ninguna familia (no es un consumo).
 *
 * Tres grupos de chips: (1) `cortesPadre` — el genérico "sin transformar" de cada familia
 * (Pierna, Lomo, Manero...), excluido de la grilla pedible pero retomable igual (ver
 * CLAUDE.md §6.12 — el administrador puede necesitar marcar exceso del corte sin transformar,
 * no solo de sus derivados); (2) `catalogoCortes` — los mismos cortes especiales que se pueden
 * pedir; (3) `RETOMA_EXTENDIDA_CERDO` — productos que SOLO existen en Retoma (vísceras,
 * pedacitos, desgorde...), sin proyección de piezas porque no tienen multiplicador confiable,
 * ver CLAUDE.md §6.7.
 */
export function RetomaPanel() {
  const especie = usePedidoStore((s) => s.especie);
  const retomas = usePedidoStore((s) => s.retomas);
  const toggleRetoma = usePedidoStore((s) => s.toggleRetoma);
  const setNotaRetoma = usePedidoStore((s) => s.setNotaRetoma);
  const setCantidadRetoma = usePedidoStore((s) => s.setCantidadRetoma);

  const cortes = useMemo(() => catalogoCortes(especie), [especie]);
  const padres = useMemo(() => cortesPadre(especie), [especie]);
  const extendida = especie === 'cerdo' ? RETOMA_EXTENDIDA_CERDO : [];

  // Productos con proyección de piezas (padres + cortes especiales) piden cantidad al
  // retomar — los de `extendida` (sin multiplicador confiable) siguen siendo todo-o-nada.
  const conProyeccion = useMemo(
    () => new Set([...padres, ...cortes].map((c) => c.productoId)),
    [padres, cortes],
  );

  const chips = (lista: { productoId: number; nombre: string }[]) =>
    lista.map((item) => {
      const marcado = retomas.some((r) => r.productoId === item.productoId);
      return (
        <button
          key={item.productoId}
          type="button"
          className={`retoma-chip ${marcado ? 'activo' : ''}`}
          onClick={() => toggleRetoma(item.productoId, item.nombre)}
        >
          {item.nombre}
        </button>
      );
    });

  return (
    <section className="retoma-panel">
      <h3>Retoma — productos que NO se despachan</h3>

      {padres.length > 0 && (
        <>
          <p className="retoma-subtitulo">Cortes sin transformar</p>
          <div className="retoma-chips">{chips(padres)}</div>
        </>
      )}

      <p className="retoma-subtitulo">Cortes especiales</p>
      <div className="retoma-chips">{chips(cortes)}</div>

      {extendida.length > 0 && (
        <>
          <p className="retoma-subtitulo">Otros productos (sin proyección por familia)</p>
          <div className="retoma-chips">{chips(extendida)}</div>
        </>
      )}

      {retomas.length > 0 && (
        <ul className="retoma-lista">
          {retomas.map((r) => (
            <li key={r.productoId}>
              <span>{r.nombre}</span>
              {conProyeccion.has(r.productoId) ? (
                <InputCantidadRetoma cantidad={r.cantidad ?? 0} onChange={(v) => setCantidadRetoma(r.productoId, v)} />
              ) : (
                <span className="retoma-lote-completo">Lote completo</span>
              )}
              <input
                type="text"
                placeholder="Nota (opcional)"
                value={r.nota ?? ''}
                onChange={(e) => setNotaRetoma(r.productoId, e.target.value)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
