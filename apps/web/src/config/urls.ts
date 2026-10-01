const apiConfigurada = import.meta.env.VITE_API_BASE?.trim().replace(/\/+$/, '');

/** En desarrollo Vite reenvía /api al backend local (ver vite.config.ts) — no depender de una IP LAN fija. */
export const API_BASE = apiConfigurada || '';

export function mensajeErrorApi(error: unknown, fallback: string): string {
  if (error instanceof TypeError && /fetch|network|conexión|connection/i.test(error.message)) {
    return 'No se pudo conectar con el servidor. Verifica que la API esté iniciada y vuelve a intentar.';
  }
  return error instanceof Error ? error.message : fallback;
}
