// =============================================================
// helpersRN.ts — Funciones solo-teléfono: compartir archivos por
// WhatsApp/Bluetooth (share sheet) e importar paquetes con el selector
// de documentos. También el cliente WiFi.
// =============================================================
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { adapterExpo } from "../core/fs/fs_expo";
import { Repo } from "../core/repo";
import type { Paquete } from "../core/types";
import { PuenteWifi } from "../core/sync/wifi";
import { obtenerIdentidad } from "../core/identidad";

export type Rol = "dependiente" | "gestion";

export const dirDatos = (rol: Rol) => `datos/${rol}`;

export function crearRepo(rol: Rol): Repo {
  const dir = dirDatos(rol);
  return new Repo(adapterExpo(dir), dir);
}

export async function identidad(rol: Rol) {
  const dir = dirDatos(rol);
  return obtenerIdentidad(adapterExpo(dir), `${dir}/identidad.json`);
}

/** Exporta un paquete y abre el share sheet (WhatsApp, correo, etc.). */
export async function exportarYCompartir(
  rol: Rol,
  paquete: Paquete
): Promise<string | null> {
  const dir = dirDatos(rol);
  const repo = crearRepo(rol);
  const { nombre } = await repo.exportarPaquete(paquete);
  const archivo = new File(Paths.document, `${dir}/exportaciones/${nombre}`);
  if (!archivo.exists) return null;
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) return nombre;
  await Sharing.shareAsync(archivo.uri, {
    mimeType: "application/json",
    dialogTitle: "Enviar actualización de base de datos",
    UTI: "public.json",
  });
  return nombre;
}

export interface ResultadoImportarDirecto {
  ok: boolean;
  mensaje: string;
  nombre?: string;
  texto?: string;
}

/**
 * Abre el selector de documentos y devuelve el texto del primer JSON elegido.
 * El dependiente usa esto para importar PRODUCTOS / INVENTARIO / CONFIG;
 * la gestión para importar VENTAS / INVENTARIO_RECIBIDO.
 */
export async function seleccionarArchivoRespaldo(): Promise<ResultadoImportarDirecto> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || res.assets.length === 0) {
      return { ok: false, mensaje: "Selección cancelada." };
    }
    const uri = res.assets[0].uri;
    const nombre = res.assets[0].name;
    const archivo = new File(uri);
    if (!archivo.exists) return { ok: false, mensaje: "No se pudo leer el archivo." };
    const texto = await archivo.text();
    return { ok: true, mensaje: "Archivo leído.", nombre, texto };
  } catch (e) {
    return { ok: false, mensaje: "Error al leer archivo: " + String(e) };
  }
}

/** Escribe un texto como .txt y abre el share sheet (WhatsApp, etc.). */
export async function compartirTexto(
  rol: Rol,
  nombreArchivo: string,
  texto: string,
  titulo = "Enviar texto"
): Promise<string | null> {
  const dir = dirDatos(rol);
  const fs = adapterExpo(dir);
  await fs.escribir(`exportaciones/${nombreArchivo}`, texto);
  const archivo = new File(Paths.document, `${dir}/exportaciones/${nombreArchivo}`);
  if (!archivo.exists) return null;
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) return nombreArchivo;
  await Sharing.shareAsync(archivo.uri, {
    mimeType: "text/plain",
    dialogTitle: titulo,
  });
  return nombreArchivo;
}

/** Adapta el resultado del selector para devolver texto además. */
export function puenteWifi(baseUrl: string): PuenteWifi {
  return new PuenteWifi(baseUrl);
}

export { obtenerIdentidad };