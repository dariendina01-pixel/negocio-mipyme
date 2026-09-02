// =============================================================
// package.ts — Construcción de paquetes de sincronización
// Un paquete = archivo .json listo para enviar por WhatsApp/Bluetooth/WiFi
// =============================================================
import { FORMATO_PAQUETE, Paquete, TipoPaquete } from "../types";
import { v4 } from "../uuid";
import { siguienteFolio } from "../folio";
import type { EstructuraMeta } from "../folio";

export interface CrearPaqueteArgs {
  origen: string; // id dispositivo
  tipo: TipoPaquete;
  destino: string | "cualquiera";
  contendido: Record<string, unknown>;
  resumen?: string;
}

export function crearPaquete<T extends EstructuraMeta>(
  data: T,
  args: CrearPaqueteArgs
): Paquete {
  const folio = siguienteFolio(data, args.tipo);
  return {
    formato: FORMATO_PAQUETE,
    paqueteId: "PQ-" + v4(),
    folio,
    tipo: args.tipo,
    origen: args.origen,
    destino: args.destino,
    fecha: new Date().toISOString(),
    contendido: args.contendido,
    resumen: args.resumen,
  };
}

/** Nombre de archivo del paquete (ordenable y con descripción). */
export function nombreArchivoPaquete(p: Paquete): string {
  const fecha = p.fecha.slice(0, 10).replace(/-/g, "");
  return `sync_${fecha}_${p.tipo}_F${String(p.folio).padStart(5, "0")}_${p.origen}_${p.paqueteId.slice(0, 8)}.json`;
}

/** Lee el contenido crudo de un archivo importado y lo valida como paquete. */
export function parsearPaquete(texto: string): Paquete {
  const obj = JSON.parse(texto) as Paquete;
  if (!obj || obj.formato !== FORMATO_PAQUETE || !obj.tipo || !obj.paqueteId) {
    throw new Error("El archivo no es un paquete de sincronización válido de Negocio - Mipyme.");
  }
  return obj;
}