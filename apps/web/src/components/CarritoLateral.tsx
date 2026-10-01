import { colorDeFamilia } from '../calc/coloresFamilia';
import { usePedidoStore } from '../store/usePedidoStore';

export function CarritoLateral() {
  const {
    paso,
    fechaEntrega,
    origen,
    clienteNombre,
    cantidadAnimales,
    lineas,
    status,
    error,
    pedidoGuardadoId,
    quitarLinea,
    guardarPedido,
    irAPaso2,
    volverAPaso1,
    reset,
  } = usePedidoStore();
  const proyeccion = usePedidoStore((s) => s.proyeccion());

  // Un pedido válido puede ser "todo sin transformar" (ver CLAUDE.md §6.9) — no se exige
  // ninguna línea de carrito para avanzar, irAPaso2 genera las líneas "sin transformar"
  // automáticamente antes de cambiar de paso. Un pedido de planta (ver CLAUDE.md §6.14) no
  // tiene Tercero/Sucursal — no se exige clienteNombre en ese caso.
  const puedeAvanzar = fechaEntrega !== '' && (origen === 'planta' || clienteNombre !== '') && cantidadAnimales > 0;
  const puedeGuardar = puedeAvanzar && status !== 'guardando';

  return (
    <aside className="carrito-lateral">
      <h2>🛒 Resumen del pedido</h2>
      {!pedidoGuardadoId && <p className="carrito-paso">Paso {paso} de 2 — {paso === 1 ? 'cantidad de cortes' : 'Vacío / Granel'}</p>}

      {pedidoGuardadoId ? (
        <div className="carrito-confirmado">
          <p>✅ Pedido #{pedidoGuardadoId} guardado.</p>
          <button type="button" onClick={() => reset()}>
            Nuevo pedido
          </button>
        </div>
      ) : (
        <>
          <section className="carrito-proyeccion">
            <h3>Cortes padre — lo que llega sin transformar</h3>
            {cantidadAnimales === 0 ? (
              <p className="carrito-hint">Ingresa la cantidad de animales para ver la proyección.</p>
            ) : (
              <div className="barras-familia">
                {proyeccion
                  .filter((f) => f.clave !== 'cabezaDeCerdo') // no le interesa al cliente, ver catalogoCortes.ts
                  .map((f) => {
                    const color = colorDeFamilia(f.clave);
                    // La barra representa lo que YA se transformó (comprometido) sobre el
                    // total esperado del corte padre — el disponible (esperado − comprometido)
                    // es lo que sigue llegando sin transformar.
                    const porcentaje = Math.min(100, (f.comprometido / f.esperado) * 100);
                    return (
                      <div key={f.clave} className="barra-familia">
                        <div className="barra-familia-cabecera">
                          <span className="barra-familia-nombre">{f.nombre}</span>
                          <span className={`barra-familia-cifras ${f.sobrepasado ? 'sobrepasado' : ''}`}>
                            {f.disponible} sin transformar
                            {f.comprometido > 0 && ` (de ${f.esperado})`}
                            {f.sobrepasado && ' ⚠️'}
                          </span>
                        </div>
                        <div className="barra-fondo">
                          <div
                            className="barra-relleno"
                            style={{
                              width: `${porcentaje}%`,
                              background: f.sobrepasado ? '#b5472b' : color.acento,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          <section className="carrito-lineas">
            <h3>Líneas del pedido ({lineas.length})</h3>
            {lineas.length === 0 ? (
              <p className="carrito-hint">El carrito está vacío.</p>
            ) : (
              <ul>
                {lineas.map((l) => (
                  <li key={l.productoId}>
                    <span>
                      <strong>{l.cantidadVacio + l.cantidadGranel}×</strong> {l.nombre}
                      {l.especificacion ? ` (${l.especificacion})` : ''}
                      {' — '}
                      {[l.cantidadVacio > 0 && `${l.cantidadVacio} Vacío`, l.cantidadGranel > 0 && `${l.cantidadGranel} Granel`]
                        .filter(Boolean)
                        .join(' + ')}
                    </span>
                    <button type="button" onClick={() => quitarLinea(l.productoId)} aria-label={`Quitar ${l.nombre}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {error && <p className="carrito-error">{error}</p>}

          <div className="carrito-navegacion">
            {paso === 2 && (
              <button type="button" className="carrito-volver" onClick={volverAPaso1}>
                ← Volver
              </button>
            )}
            {paso === 1 ? (
              <button type="button" className="carrito-confirmar" disabled={!puedeAvanzar} onClick={irAPaso2}>
                Siguiente: Vacío / Granel →
              </button>
            ) : (
              <button type="button" className="carrito-confirmar" disabled={!puedeGuardar} onClick={guardarPedido}>
                {status === 'guardando' ? 'Guardando…' : 'Confirmar pedido'}
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
