// =============================================================
// fs_memoria.ts — Adaptador en memoria para tests (rápido, sin disco)
// =============================================================
import type { AdapterFs } from "../fs";

export function adapterMemoria(): AdapterFs {
  const archivos = new Map<string, string>();
  return {
    async leer(ruta) {
      return archivos.get(ruta) ?? null;
    },
    async escribir(ruta, contenido) {
      archivos.set(ruta, contenido);
    },
    async existe(ruta) {
      return archivos.has(ruta);
    },
    async listar(dir) {
      const prefijo = dir.replace(/\/+$/, "") + "/";
      return [...archivos.keys()].filter((k) => k.startsWith(prefijo));
    },
    async crearDir() {
      /* nada */
    },
    async mover(origen, destino) {
      if (archivos.has(origen)) {
        archivos.set(destino, archivos.get(origen)!);
        archivos.delete(origen);
      }
    },
  };
}