// =============================================================
// marca.ts — "Marca de agua": hasta dónde ya se envió cada tipo de
// registro del dependiente, para no reenviar lo ya enviado.
// =============================================================

export function actualizarMarca(data: unknown, tipo: string, indice: number): void {
  const meta = (data as { meta?: { marcas?: Record<string, number> } }).meta;
  if (!meta) return;
  if (!meta.marcas) meta.marcas = {};
  meta.marcas[tipo] = indice;
}

export function marcaActual(data: unknown, tipo: string): number {
  return (
    (data as { meta?: { marcas?: Record<string, number> } }).meta?.marcas?.[tipo] ?? 0
  );
}

/** Aplica marcas de venta base (cuando se importa un archivo de gestión, etc.) */
export function sincronizarMarcasDesde(db: unknown, tipos: Record<string, number>): void {
  for (const [k, v] of Object.entries(tipos)) actualizarMarca(db, k, v);
}