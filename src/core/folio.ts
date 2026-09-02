// =============================================================
// folio.ts — Folios: numeración secuencial por tipo de paquete/base
// =============================================================

export interface MetaRecibidos {
  exportados: Record<string, number>;
  recibidos?: Record<string, Record<string, number>>;
  marcas?: Record<string, number>;
  punto?: string;
  puntoNombre?: string;
  dispositivo?: string;
  baseProductos?: { paqueteOrigen: string | null; folio: number; fecha: string };
}

export interface EstructuraMeta {
  meta: MetaRecibidos;
}

/** Devuelve el siguiente folio del dispositivo para un tipo y lo incrementa. */
export function siguienteFolio<T extends EstructuraMeta>(data: T, tipo: string): number {
  const actual = data.meta.exportados[tipo] ?? 0;
  const siguiente = actual + 1;
  data.meta.exportados[tipo] = siguiente;
  return siguiente;
}

/** Último folio emitido para un tipo (sin incrementar). */
export function ultimoFolio<T extends EstructuraMeta>(data: T, tipo: string): number {
  return data.meta.exportados[tipo] ?? 0;
}

/** Marca el folio de paquete recibido de un origen + tipo. */
export function registrarRecibido(
  meta: MetaRecibidos,
  origen: string,
  tipo: string,
  folio: number
): void {
  if (!meta.recibidos) meta.recibidos = {};
  const porOrigen = (meta.recibidos[origen] ??= {});
  porOrigen[tipo] = Math.max(porOrigen[tipo] ?? 0, folio);
}

/** El último folio recibido de un origen+tipo (para saltar paquetes viejos). */
export function folioRecibido(meta: MetaRecibidos, origen: string, tipo: string): number {
  return meta.recibidos?.[origen]?.[tipo] ?? 0;
}

/** Mayor folio recibido para un tipo entre todos los orígenes. */
export function maxFolioRecibido(meta: MetaRecibidos, tipo: string): number {
  if (!meta.recibidos) return 0;
  let maximo = 0;
  for (const porTipo of Object.values(meta.recibidos)) {
    maximo = Math.max(maximo, porTipo?.[tipo] ?? 0);
  }
  return maximo;
}

/** Sello de tiempo de archivo/día: "2026-08-29". */
export function hoyLocal(): string {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}