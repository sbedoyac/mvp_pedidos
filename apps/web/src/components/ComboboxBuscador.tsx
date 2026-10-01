import { useEffect, useRef, useState } from 'react';

interface Opcion {
  id: number;
  etiqueta: string;
}

interface Props {
  label: string;
  placeholder: string;
  opciones: Opcion[];
  valor: string;
  disabled?: boolean;
  onSeleccionar: (opcion: Opcion) => void;
}

/**
 * Combobox de texto + dropdown filtrado en vivo — mismo patrón de "Tercero" / "Sucursal" de
 * `sgc` (ver capturas del usuario 2026-09-22): escribir filtra la lista, click selecciona.
 * Reemplaza el <select> nativo original, inmanejable con 829 clientes reales.
 */
export function ComboboxBuscador({ label, placeholder, opciones, valor, disabled, onSeleccionar }: Props) {
  const [texto, setTexto] = useState(valor);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTexto(valor), [valor]);

  useEffect(() => {
    function alClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setTexto(valor);
      }
    }
    document.addEventListener('mousedown', alClickFuera);
    return () => document.removeEventListener('mousedown', alClickFuera);
  }, [valor]);

  const filtradas = opciones.filter((o) => o.etiqueta.toLowerCase().includes(texto.toLowerCase())).slice(0, 50);

  return (
    <div className="combobox" ref={contenedorRef}>
      <label>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={texto}
        disabled={disabled}
        onFocus={() => setAbierto(true)}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
      />
      {abierto && !disabled && (
        <ul className="combobox-lista">
          {filtradas.length === 0 && <li className="combobox-vacio">Sin coincidencias</li>}
          {filtradas.map((op) => (
            <li
              key={op.id}
              onMouseDown={() => {
                onSeleccionar(op);
                setTexto(op.etiqueta);
                setAbierto(false);
              }}
            >
              {op.etiqueta}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
