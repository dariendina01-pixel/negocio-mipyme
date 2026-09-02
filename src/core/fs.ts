// =============================================================
// fs.ts — Interfaz de sistema de archivos + utilidades de JSON
// Replica el patrón del otro sistema: guardar en JSON indentado,
// escritura atómica (tmp + mover) para no corromper la base.
// =============================================================
import { v4 as uuid } from "./uuid";

export interface AdapterFs {
  leer(ruta: string): Promise<string | null>;
  escribir(ruta: string, contenido: string): Promise<void>;
  existe(ruta: string): Promise<boolean>;
  listar(dir: string): Promise<string[]>;
  crearDir(ruta: string, recursivo?: boolean): Promise<void>;
  mover(origen: string, destino: string): Promise<void>;
}

/** Escribe un objeto como JSON indentado (igual que json.dump indent=2). */
export function serializarJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/** Convierte a JSON carpetas con nombre año-mes día (estilo datoteca). */
export function rutaDatos(fechaIso: string, base: string): string {
  const d = new Date(fechaIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${base}/${y}-${m}-${dia}`;
}

/**
 * Guarda/actualiza una "salva" JSON de forma atómica.
 * data debe tener "version" y "ultima_modificacion".
 */
export class JsonStore<T extends object> {
  constructor(
    private fs: AdapterFs,
    private ruta: string,
    private plantilla: () => T
  ) {}

  async cargar(): Promise<T> {
    const texto = await this.fs.leer(this.ruta);
    if (texto === null || texto.trim() === "") return this.plantilla();
    try {
      const obj = JSON.parse(texto) as T;
      // Mantener shape: completar claves que falten con el default
      const base = this.plantilla() as Record<string, unknown>;
      const resultado = { ...base, ...(obj as Record<string, unknown>) } as T;
      return resultado;
    } catch {
      // Archivo dañado: se respalda la copia vieja con extensión .roto y se empieza de cero
      try {
        await this.fs.mover(this.ruta, this.ruta + ".roto_" + Date.now());
      } catch {
        /* ignorar */
      }
      return this.plantilla();
    }
  }

  async guardar(data: T): Promise<void> {
    const registro = data as unknown as Record<string, unknown>;
    const final = {
      ...data,
      ...{ version: registro.version ?? "1.0", ultima_modificacion: new Date().toISOString() },
    };
    const tmp = this.ruta + ".tmp";
    await this.fs.escribir(tmp, serializarJson(final));
    // Escritura atómica tipo rename
    await this.fs.mover(tmp, this.ruta);
  }

  async respaldar(extension = "bak"): Promise<string> {
    const copia = `${this.ruta}.${extension}_${new Date().toISOString().replace(/[:\.]/g, "-")}`;
    const texto = await this.fs.leer(this.ruta);
    if (texto !== null) await this.fs.escribir(copia, texto);
    return copia;
  }
}

/** Id único corto y legible (ej: V20260829-000001) o uuid. */
export function nuevoId(prefijo: string): string {
  return prefijo + "-" + uuid().slice(0, 8).toUpperCase() + Date.now().toString(36).slice(-4);
}