import { useEffect, useMemo, useState } from 'react';
import { CAPACIDAD_SEMANAL_CERDOS, diasDeLaSemana, domingoDeLaSemana, lunesDeLaSemana } from '../calc/semana';
import { API_BASE, mensajeErrorApi } from '../config/urls';
import type { PedidoResumenDTO } from '../types/dto';

const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface ProgramacionSemanalProps {
  /** Cambia a la vista de captura ya con origen='planta' y la fecha exacta del día clickeado preseleccionada. */
  onCrearPedidoPlanta: (fechaEntrega: string) => void;
}

/**
 * Vista de planta (ver CLAUDE.md §6.14): agrupa los pedidos ya guardados por semana calendario
 * lunes-domingo y muestra cuánto del cupo fijo semanal (CAPACIDAD_SEMANAL_CERDOS = 3240
 * cerdos, confirmado por el usuario — no viene de sgc, no es configurable en la UI todavía)
 * ya está comprometido por pedidos de punto de venta, dejando ver el excedente que la persona
 * de planta debe cubrir con pedidos de origen='planta'.
 *
 * Solo agrupa CERDO — Res no tiene un cupo semanal fijo conocido (el usuario no lo mencionó),
 * se muestra aparte sin barra de excedente.
 */
export function ProgramacionSemanal({ onCrearPedidoPlanta }: ProgramacionSemanalProps) {
  const [pedidos, setPedidos] = useState<PedidoResumenDTO[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | undefined>();
  // Lunes de la semana mostrada — arranca en la semana actual.
  const [lunesActual, setLunesActual] = useState(() => lunesDeLaSemana(new Date().toISOString().slice(0, 10)));

  useEffect(() => {
    setStatus('loading');
    fetch(`${API_BASE}/api/pedidos`)
      .then((res) => {
        if (!res.ok) throw new Error(`Error ${res.status} al cargar pedidos`);
        return res.json() as Promise<PedidoResumenDTO[]>;
      })
      .then((data) => {
        setPedidos(data);
        setStatus('ready');
      })
      .catch((err) => {
        setError(mensajeErrorApi(err, 'No se pudieron cargar los pedidos'));
        setStatus('error');
      });
  }, []);

  const domingoActual = domingoDeLaSemana(lunesActual);

  const pedidosDeLaSemana = useMemo(
    () => pedidos.filter((p) => p.fechaEntrega >= lunesActual && p.fechaEntrega <= domingoActual),
    [pedidos, lunesActual, domingoActual],
  );

  const pedidosCerdo = pedidosDeLaSemana.filter((p) => p.especie === 'cerdo');
  const totalPuntoVenta = pedidosCerdo.filter((p) => p.origen === 'punto_venta').reduce((s, p) => s + p.cantidadAnimales, 0);
  const totalPlanta = pedidosCerdo.filter((p) => p.origen === 'planta').reduce((s, p) => s + p.cantidadAnimales, 0);
  const totalComprometido = totalPuntoVenta + totalPlanta;
  const excedente = Math.max(0, CAPACIDAD_SEMANAL_CERDOS - totalComprometido);
  const porcentaje = Math.min(100, (totalComprometido / CAPACIDAD_SEMANAL_CERDOS) * 100);

  function semanaAnterior() {
    const anterior = new Date(`${lunesActual}T00:00:00Z`);
    anterior.setUTCDate(anterior.getUTCDate() - 7);
    setLunesActual(anterior.toISOString().slice(0, 10));
  }

  function semanaSiguiente() {
    const siguiente = new Date(`${lunesActual}T00:00:00Z`);
    siguiente.setUTCDate(siguiente.getUTCDate() + 7);
    setLunesActual(siguiente.toISOString().slice(0, 10));
  }

  return (
    <div className="programacion">
      <div className="programacion-navegacion">
        <button type="button" onClick={semanaAnterior}>← Semana anterior</button>
        <h2>{lunesActual} al {domingoActual}</h2>
        <button type="button" onClick={semanaSiguiente}>Semana siguiente →</button>
      </div>

      {status === 'loading' && <p className="carrito-hint">Cargando pedidos…</p>}
      {status === 'error' && <p className="carrito-error">{error}</p>}

      {status === 'ready' && (
        <>
          <section className="programacion-capacidad">
            <div className="barra-familia-cabecera">
              <span className="barra-familia-nombre">Cerdo — capacidad semanal</span>
              <span className="barra-familia-cifras">
                {totalComprometido} de {CAPACIDAD_SEMANAL_CERDOS} comprometidos
              </span>
            </div>
            <div className="barra-fondo">
              <div
                className="barra-relleno"
                style={{ width: `${porcentaje}%`, background: totalComprometido > CAPACIDAD_SEMANAL_CERDOS ? '#b5472b' : '#3a7d44' }}
              />
            </div>
            <p className="programacion-excedente">
              {excedente > 0
                ? `Excedente sin asignar: ${excedente} cerdos — usa "+ Pedido de planta" en el día que corresponda`
                : totalComprometido > CAPACIDAD_SEMANAL_CERDOS
                  ? `⚠️ ${totalComprometido - CAPACIDAD_SEMANAL_CERDOS} cerdos por encima de la capacidad`
                  : 'Cupo semanal cubierto por completo'}
            </p>
          </section>

          <section className="calendario-semana">
            {diasDeLaSemana(lunesActual).map((dia, i) => {
              const pedidosDelDia = pedidosDeLaSemana.filter((p) => p.fechaEntrega === dia);
              const esHoy = dia === new Date().toISOString().slice(0, 10);
              return (
                <div key={dia} className={`calendario-dia ${esHoy ? 'calendario-dia-hoy' : ''}`}>
                  <div className="calendario-dia-cabecera">
                    <span className="calendario-dia-nombre">{NOMBRES_DIA[i]}</span>
                    <span className="calendario-dia-fecha">{dia.slice(8, 10)}</span>
                  </div>
                  <div className="calendario-dia-tarjetas">
                    {pedidosDelDia.map((p) => (
                      <div key={p.id} className={`calendario-tarjeta ${p.origen === 'planta' ? 'calendario-tarjeta-planta' : ''}`}>
                        <span className="calendario-tarjeta-titulo">
                          {p.origen === 'planta' ? '🏭 Planta' : p.cliente}
                        </span>
                        {p.origen === 'punto_venta' && <span className="calendario-tarjeta-sub">{p.sucursal}</span>}
                        <span className="calendario-tarjeta-cantidad">{p.cantidadAnimales} {p.especie}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="calendario-dia-agregar" onClick={() => onCrearPedidoPlanta(dia)}>
                    + Pedido de planta
                  </button>
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
