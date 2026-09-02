// =============================================================
// fs_node.ts — Adaptador de archivos para Node (tests y simulaciones)
// =============================================================
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { AdapterFs } from "../fs";

export function adapterNode(baseDir: string): AdapterFs {
  return {
    async leer(ruta) {
      try {
        return await fs.readFile(ruta, "utf-8");
      } catch {
        return null;
      }
    },
    async escribir(ruta, contenido) {
      await fs.mkdir(path.dirname(ruta), { recursive: true });
      await fs.writeFile(ruta, contenido, "utf-8");
    },
    async existe(ruta) {
      try {
        await fs.access(ruta);
        return true;
      } catch {
        return false;
      }
    },
    async listar(dir) {
      try {
        return (await fs.readdir(dir)).map((n) => path.join(dir, n));
      } catch {
        return [];
      }
    },
    async crearDir(ruta) {
      await fs.mkdir(ruta, { recursive: true });
    },
    async mover(origen, destino) {
      await fs.mkdir(path.dirname(destino), { recursive: true });
      if (origen === destino) return;
      try {
        await fs.rename(origen, destino);
      } catch {
        // fallback en Windows si destino ya existe
        await fs.copyFile(origen, destino);
        await fs.unlink(origen);
      }
    },
  };
}