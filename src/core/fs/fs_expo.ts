// =============================================================
// fs_expo.ts — Adaptador de archivos para el teléfono (Expo).
// Usa la carpeta privada del documento de la app (Paths.document).
// Los archivos se exportan con el share sheet de Android (WhatsApp, etc.)
// =============================================================
import { Paths, File, Directory } from "expo-file-system";
import type { AdapterFs } from "../fs";

export function adapterExpo(base: string): AdapterFs {
  const raiz = Paths.document;

  function resolver(ruta: string): { file: File; dir: Directory } {
    const rel = ruta.replace(/\\/g, "/").replace(/^\/+/, "");
    const idx = rel.lastIndexOf("/");
    const dirPart = idx >= 0 ? rel.slice(0, idx) : "";
    const nombre = idx >= 0 ? rel.slice(idx + 1) : rel;
    const dir = dirPart ? new Directory(raiz, dirPart) : raiz;
    return { file: new File(dir, nombre), dir };
  }

  return {
    async leer(ruta) {
      const { file } = resolver(ruta);
      if (!file.exists) return null;
      try {
        return await file.text();
      } catch {
        return null;
      }
    },
    async escribir(ruta, contenido) {
      const { file, dir } = resolver(ruta);
      if (!dir.exists) dir.create({ intermediates: true });
      if (!file.exists) file.create({ intermediates: true });
      file.write(contenido);
    },
    async existe(ruta) {
      return resolver(ruta).file.exists;
    },
    async listar(dir) {
      const d = new Directory(raiz, dir.replace(/\\/g, "/").replace(/^\/+/, ""));
      if (!d.exists) return [];
      return d.list().map((e) => e.uri);
    },
    async crearDir(ruta) {
      const { dir } = resolver(ruta + "/_tmp");
      if (!dir.exists) dir.create({ intermediates: true });
    },
    async mover(origen, destino) {
      const src = resolver(origen).file;
      const dst = resolver(destino).file;
      if (!src.exists) return;
      if (dst.exists) dst.delete();
      src.move(dst);
    },
  };
}