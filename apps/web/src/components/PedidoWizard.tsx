import { useEffect, useMemo } from 'react';
import { usePedidoStore } from '../store/usePedidoStore';
import { ComboboxBuscador } from './ComboboxBuscador';

export function PedidoWizard() {
  const {
    fechaEntrega,
    origen,
    terceroId,
    clienteNombre,
    sucursalNombre,
    especie,
    cantidadAnimales,
    clientes,
    clientesStatus,
    cargarClientes,
    setFechaEntrega,
    setTercero,
    setSucursal,
    setEspecie,
    setCantidadAnimales,
  } = usePedidoStore();

  useEffect(() => {
    if (clientesStatus === 'idle') cargarClientes();
  }, [clientesStatus, cargarClientes]);

  // Un tercero puede tener varias sucursales repetidas en la lista de clientes (una fila por
  // sucursal) — de-duplicar por terceroId para el combobox de Tercero.
  const terceros = useMemo(() => {
    const vistos = new Map<number, string>();
    for (const c of clientes) if (!vistos.has(c.terceroId)) vistos.set(c.terceroId, c.terceroNombre);
    return [...vistos.entries()].map(([id, etiqueta]) => ({ id, etiqueta }));
  }, [clientes]);

  const sucursalesDelTercero = useMemo(
    () =>
      clientes
        .filter((c) => c.terceroId === terceroId)
        .map((c) => ({ id: c.sucursalId, etiqueta: c.sucursalNombre })),
    [clientes, terceroId],
  );

  return (
    <div className={`wizard ${origen === 'planta' ? 'wizard-planta' : ''}`}>
      {origen === 'planta' && <p className="wizard-aviso-planta">🏭 Pedido de planta — sin Tercero/Sucursal, cubre el excedente semanal.</p>}

      <div className="wizard-campo">
        <label htmlFor="fechaEntrega">Fecha de entrega</label>
        <input
          id="fechaEntrega"
          type="date"
          value={fechaEntrega}
          onChange={(e) => setFechaEntrega(e.target.value)}
        />
      </div>

      {origen === 'punto_venta' && (
        <>
          <ComboboxBuscador
            label="Tercero"
            placeholder={clientesStatus === 'loading' ? 'Cargando…' : 'Buscar cliente…'}
            opciones={terceros}
            valor={clienteNombre}
            onSeleccionar={(op) => setTercero(op.id, op.etiqueta)}
          />

          <ComboboxBuscador
            label="Sucursal"
            placeholder={terceroId ? 'Buscar sucursal…' : 'Elige un Tercero primero'}
            opciones={sucursalesDelTercero}
            valor={sucursalNombre}
            disabled={!terceroId}
            onSeleccionar={(op) => setSucursal(op.id, op.etiqueta)}
          />
        </>
      )}

      <div className="wizard-campo">
        <label>Especie</label>
        <div className="wizard-toggle">
          <button
            type="button"
            className={especie === 'cerdo' ? 'activo' : ''}
            onClick={() => setEspecie('cerdo')}
          >
            Cerdo
          </button>
          <button
            type="button"
            className={especie === 'res' ? 'activo' : ''}
            onClick={() => setEspecie('res')}
          >
            Res
          </button>
        </div>
      </div>

      <div className="wizard-campo">
        <label htmlFor="cantidadAnimales">Cantidad de animales</label>
        <input
          id="cantidadAnimales"
          type="number"
          min={0}
          value={cantidadAnimales || ''}
          onChange={(e) => setCantidadAnimales(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
