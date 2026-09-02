// =============================================================
// repo.ts — Capa de persistencia: vincula el modelo con los archivos.
//  - Dependiente usa DOS bases de datos (como se pidió):
//      1) datos/productos.json  = BASE DE PRECIOS Y PRODUCTOS
//      2) datos/ventas.json     = BASE DE VENTAS Y DEL DIA (ventas, gastos,
//                                 recepciones, arqueos y cierres)
//  - Gestión usa una sola salva: datos/gestion.json
//  - Los archivos se guardan en JSON igual que el otro sistema (indent=2).
// =============================================================
import type { AdapterFs } from "./fs";
import { JsonStore, serializarJson, nuevoId } from "./fs";
import {
  DependienteDb,
  GestionDb,
  plantillaDependiente,
  plantillaGestion,
  Paquete,
  ResultadoAplicar,
} from "./types";
import { aplicarPaquete } from "./sync/merge";
import { parsearPaquete, nombreArchivoPaquete } from "./sync/package";

const SECCIONES_PRODUCTOS = ["version", "ultima_modificacion", "meta", "productos", "config"] as const;
const SECCIONES_VENTAS = ["ventas", "gastos", "recepciones", "arqueos", "cierres"] as const;

export class Repo {
  private storeProductos: JsonStore<DependienteDb>;
  private storeVentas: JsonStore<Partial<DependienteDb>>;
  private storeGestion: JsonStore<GestionDb>;
  private rutaProductos: string;
  private rutaVentas: string;

  constructor(private fs: AdapterFs, dir: string) {
    this.rutaProductos = `${dir}/productos.json`;
    this.rutaVentas = `${dir}/ventas.json`;
    this.storeProductos = new JsonStore<DependienteDb>(fs, this.rutaProductos, plantillaDependiente);
    this.storeVentas = new JsonStore<Partial<DependienteDb>>(fs, this.rutaVentas, () => ({
      ...plantillaDependiente(),
    }));
    this.storeGestion = new JsonStore<GestionDb>(fs, `${dir}/gestion.json`, plantillaGestion);
  }

  /** Une las dos bases del dependiente en un solo modelo en memoria. */
  async cargarDependiente(): Promise<DependienteDb> {
    const productos = await this.storeProductos.cargar();
    const ventas = await this.storeVentas.cargar();
    // metas: la del archivo de productos es la principal; se fusionan folios recibidos
    const meta = { ...productos.meta };
    const recibidos = { ...(productos.meta.recibidos ?? {}), ...(ventas.meta?.recibidos ?? {}) };
    meta.recibidos = recibidos;
    meta.punto = productos.meta.punto || ventas.meta?.punto || "";
    meta.puntoNombre = productos.meta.puntoNombre || ventas.meta?.puntoNombre || "";
    meta.dispositivo = productos.meta.dispositivo || ventas.meta?.dispositivo || "";
    meta.exportados = { ...(productos.meta.exportados ?? {}), ...(ventas.meta?.exportados ?? {}) };
    meta.baseProductos = productos.meta.baseProductos ?? {
      paqueteOrigen: null,
      folio: 0,
      fecha: "",
    };
    return {
      ...plantillaDependiente(),
      ...productos,
      meta,
      ventas: ventas.ventas ?? [],
      gastos: ventas.gastos ?? [],
      recepciones: ventas.recepciones ?? [],
      arqueos: ventas.arqueos ?? [],
      cierres: ventas.cierres ?? [],
    };
  }

  /** Divide el modelo del dependiente y guarda ambas bases por separado. */
  async guardarDependiente(db: DependienteDb): Promise<void> {
    db.ultima_modificacion = new Date().toISOString();
    const base = { version: db.version, ultima_modificacion: db.ultima_modificacion, meta: db.meta };
    const archivoProductos: Record<string, unknown> = {};
    for (const k of SECCIONES_PRODUCTOS) archivoProductos[k] = (base as unknown as Record<string, unknown>)[k] ?? (db as unknown as Record<string, unknown>)[k];
    archivoProductos.productos = db.productos;
    archivoProductos.config = db.config;
    const archivoVentas: Record<string, unknown> = {
      version: db.version,
      ultima_modificacion: db.ultima_modificacion,
      meta: db.meta,
    };
    for (const k of SECCIONES_VENTAS) archivoVentas[k] = (db as unknown as Record<string, unknown>)[k];
    await this.storeProductos.guardar(archivoProductos as unknown as DependienteDb);
    await this.storeVentas.guardar(archivoVentas as unknown as Partial<DependienteDb>);
  }

  async cargarGestion(): Promise<GestionDb> {
    return this.storeGestion.cargar();
  }

  async guardarGestion(db: GestionDb): Promise<void> {
    await this.storeGestion.guardar(db);
  }

  /** Exporta un paquete: lo escribe en la carpeta de exportaciones y devuelve texto. */
  async exportarPaquete(paquete: Paquete): Promise<{ nombre: string; contenido: string }> {
    const nombre = nombreArchivoPaquete(paquete);
    const contenido = serializarJson(paquete);
    await this.fs.crearDir("exportaciones", true);
    await this.fs.escribir(`exportaciones/${nombre}`, contenido);
    return { nombre, contenido };
  }

  /** Lee texto de paquete y lo aplica sobre la base indicada. */
  async importarTexto(arr: { paquete: Paquete; texto: string }[], base: DependienteDb | GestionDb, idMiBase: string): Promise<ResultadoAplicar[]> {
    const resultados: ResultadoAplicar[] = [];
    for (const { paquete, texto } of arr) {
      const resultado = aplicarPaquete(base, paquete, idMiBase);
      resultados.push(resultado);
    }
    return resultados;
  }

  async importarArchivoTexto(base: DependienteDb | GestionDb, idMiBase: string, texto: string): Promise<ResultadoAplicar> {
    const paquete = parsearPaquete(texto);
    return aplicarPaquete(base, paquete, idMiBase);
  }
}

export { nuevoId };