// =============================================================
// modelo.ts — Modelo del carrito de venta del dependiente
// =============================================================
import type { ProductoListable } from "../../core/operations";
import type { LineaVenta } from "../../core/types";
import { subtotal } from "../../core/calc";

export interface LineaCarrito {
  producto: ProductoListable;
  cantidad: number;
}

/** Añade o incrementa un producto al carrito (respetando existencias disponibles). */
export function cambiarCantidad(
  carrito: LineaCarrito[],
  producto: ProductoListable,
  delta: number
): LineaCarrito[] {
  const existente = carrito.find((l) => l.producto.id === producto.id);
  if (existente) {
    const nueva = existente.cantidad + delta;
    if (nueva <= 0) return carrito.filter((l) => l.producto.id !== producto.id);
    if (nueva > producto.stock) return carrito; // no pasa de las existencias
    return carrito.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: nueva } : l));
  }
  if (delta <= 0 || producto.stock <= 0) return carrito;
  return [...carrito, { producto, cantidad: delta }];
}

export function quitarLinea(carrito: LineaCarrito[], indice: number, todo: boolean): LineaCarrito[] {
  if (todo) return carrito.filter((_, i) => i !== indice);
  const l = carrito[indice];
  if (!l) return carrito;
  return cambiarCantidad(carrito, l.producto, -1);
}

/** Fija la cantidad exacta de un producto en el carrito (para teclear). */
export function fijarCantidad(
  carrito: LineaCarrito[],
  producto: ProductoListable,
  cantidad: number
): LineaCarrito[] {
  if (!isFinite(cantidad) || cantidad < 0) return carrito;
  const limitada = Math.min(Math.floor(cantidad), Math.max(0, producto.stock));
  if (limitada <= 0) return carrito.filter((l) => l.producto.id !== producto.id);
  const existente = carrito.find((l) => l.producto.id === producto.id);
  if (existente) {
    return carrito.map((l) => (l.producto.id === producto.id ? { ...l, cantidad: limitada } : l));
  }
  return [...carrito, { producto, cantidad: limitada }];
}

export function totalCarrito(carrito: LineaCarrito[]): number {
  return subtotal(carrito.map((l) => ({ precioCents: l.producto.precioCents, cantidad: l.cantidad })));
}

export function convertirLineas(carrito: LineaCarrito[]): LineaVenta[] {
  return carrito.map((l) => ({
    productoId: l.producto.id,
    nombre: l.producto.nombre,
    precioCents: l.producto.precioCents,
    cantidad: l.cantidad,
  }));
}