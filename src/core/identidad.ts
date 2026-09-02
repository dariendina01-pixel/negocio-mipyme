// =============================================================
// identidad.ts — Identidad única del dispositivo (se genera una vez
// y se guarda). La gestión nombra a cada dispositivo como un punto.
// =============================================================
import { v4 } from "./uuid";
import type { AdapterFs } from "./fs";

export interface Identidad {
  dispositivo: string;
  rol: "dependiente" | "gestion" | "";
  creado: string;
}

export async function obtenerIdentidad(fs: AdapterFs, ruta: string): Promise<Identidad> {
  const texto = await fs.leer(ruta);
  if (texto) {
    try {
      const obj = JSON.parse(texto) as Identidad;
      if (obj.dispositivo) return obj;
    } catch {
      /* regenerar */
    }
  }
  const nueva: Identidad = {
    dispositivo: "D-" + v4().slice(0, 8).toUpperCase(),
    rol: "",
    creado: new Date().toISOString(),
  };
  await fs.escribir(ruta, JSON.stringify(nueva, null, 2));
  return nueva;
}