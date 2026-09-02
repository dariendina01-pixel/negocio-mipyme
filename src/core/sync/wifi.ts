// =============================================================
// wifi.ts — Cliente del "puente WiFi" local.
// El puente es un mini servidor Node (bridge/wifi_bridge.js) que corre en
// la PC del dueño en la misma red. Las apps hacen PUSH/PULL de paquetes.
// Funciona con fetch estándar (Node y React Native).
// =============================================================
import type { Paquete } from "../types";

export interface WifiLista {
  entrantes: Paquete[]; // paquetes nuevos para mí, ordenados por folio
}

export class PuenteWifi {
  constructor(private baseUrl: string) {}

  /** Registra el dispositivo (opcional, para comprobación). */
  async ping(): Promise<boolean> {
    try {
      const r = await fetch(this.baseUrl.replace(/\/$/, "") + "/ping", { method: "GET" });
      return r.ok;
    } catch {
      return false;
    }
  }

  /** Sube un paquete al puente para que la otra app lo baje. */
  async enviar(paquete: Paquete): Promise<boolean> {
    const r = await fetch(this.baseUrl.replace(/\/$/, "") + "/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paquete),
    });
    return r.ok;
  }

  /**
   * Baja los paquetes con folio posterior a `desdeFolio` dirigidos a `miId`.
   */
  async descargar(miId: string, desdeFolio: number): Promise<WifiLista> {
    const url =
      this.baseUrl.replace(/\/$/, "") +
      "/descargar?dispositivo=" +
      encodeURIComponent(miId) +
      "&desde=" +
      desdeFolio;
    const r = await fetch(url, { method: "GET" });
    if (!r.ok) return { entrantes: [] };
    const data = (await r.json()) as { paquetes: Paquete[] };
    return { entrantes: data.paquetes ?? [] };
  }
}