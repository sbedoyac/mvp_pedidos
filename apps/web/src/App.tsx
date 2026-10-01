import { useState } from 'react';
import { CarritoLateral } from './components/CarritoLateral';
import { CatalogoCortesGrid } from './components/CatalogoCortesGrid';
import { PedidoWizard } from './components/PedidoWizard';
import { ProgramacionSemanal } from './components/ProgramacionSemanal';
import { RetomaPanel } from './components/RetomaPanel';
import { usePedidoStore } from './store/usePedidoStore';

type Vista = 'captura' | 'programacion';

export function App() {
  const [vista, setVista] = useState<Vista>('captura');
  const paso = usePedidoStore((s) => s.paso);
  const reset = usePedidoStore((s) => s.reset);
  const setFechaEntrega = usePedidoStore((s) => s.setFechaEntrega);

  function crearPedidoPlanta(fechaEntrega: string) {
    reset('planta');
    setFechaEntrega(fechaEntrega);
    setVista('captura');
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Pedidos JH</h1>
        <nav className="app-nav">
          <button type="button" className={vista === 'captura' ? 'activo' : ''} onClick={() => setVista('captura')}>
            Captura de pedido
          </button>
          <button type="button" className={vista === 'programacion' ? 'activo' : ''} onClick={() => setVista('programacion')}>
            Programación semanal
          </button>
        </nav>
      </header>

      {vista === 'programacion' ? (
        <main className="app-main-programacion">
          <ProgramacionSemanal onCrearPedidoPlanta={crearPedidoPlanta} />
        </main>
      ) : (
        <main className="app-main">
          <div className="app-columna-principal">
            {paso === 1 ? (
              <>
                <PedidoWizard />
                <CatalogoCortesGrid modo="total" />
                <RetomaPanel />
              </>
            ) : (
              <CatalogoCortesGrid modo="presentacion" />
            )}
          </div>
          <CarritoLateral />
        </main>
      )}
    </div>
  );
}
