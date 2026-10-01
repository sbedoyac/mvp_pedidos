interface Props {
  opciones: string[];
  valor: string | null;
  onChange: (valor: string | null) => void;
}

export function EspecificacionSelector({ opciones, valor, onChange }: Props) {
  if (opciones.length === 0) return null;

  return (
    <select
      className="especificacion-selector"
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">Sin especificación</option>
      {opciones.map((op) => (
        <option key={op} value={op}>
          {op}
        </option>
      ))}
    </select>
  );
}
