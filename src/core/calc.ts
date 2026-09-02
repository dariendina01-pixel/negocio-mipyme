// =============================================================
// calc.ts — Calculadoras de cobro, cambio y devoluciones
// =============================================================
import type { Centavos } from "./money";
import { multiplicar } from "./money";

export interface LineaCompra {
  precioCents: Centavos;
  cantidad?: number;
}

/** Descuento en % -> factor (0.9 = 10% menos). */
export function aplicarDescuento(totalCents: Centavos, porciento: number): Centavos {
  if (porciento <= 0) return totalCents;
  const factor = Math.max(0, Math.min(100, porciento)) / 100;
  return Math.round(totalCents * (1 - factor));
}

/** Subtotal del carrito de compra. */
export function subtotal(lineas: LineaCompra[]): Centavos {
  return lineas.reduce((acc, l) => acc + multiplicar(l.precioCents, l.cantidad ?? 1), 0);
}

export interface ResultadoCobro {
  total: Centavos; // a cobrar al cliente
  recibido: Centavos; // dinero que entrega el cliente
  cambio: Centavos; // a devolver
  falta: Centavos; // cuánto falta si recibido < total
  completo: boolean; // true si recibido >= total
}

/** Calcula el cobro: total de la venta vs dinero recibido. */
export function calcularCobro(
  total: Centavos,
  recibido: Centavos
): ResultadoCobro {
  const cambio = Math.max(0, recibido - total);
  const falta = Math.max(0, total - recibido);
  return {
    total,
    recibido,
    cambio,
    falta,
    completo: recibido >= total,
  };
}

/**
 * Calcula una DEVOLUCIÓN (cliente devuelve mercancía y hay que devolverle dinero).
 * Si la venta original tuvo descuento, se devuelve el proporcional.
 */
export function calcularDevolucion(
  lineas: LineaCompra[],
  descuentoPorciento = 0
): { totalDevolver: Centavos; lineas: LineaCompra[] } {
  const bruto = subtotal(lineas);
  const neto = aplicarDescuento(bruto, descuentoPorciento);
  return { totalDevolver: neto, lineas };
}

/** Cantidad total de unidades del carrito (para informes). */
export function unidades(lineas: LineaCompra[]): number {
  return lineas.reduce((acc, l) => acc + (l.cantidad ?? 1), 0);
}