import { DependienteDb, GestionDb, Producto, ProductoGestion } from "../src/core/types";
import { plantillaDependiente, plantillaGestion } from "../src/core/types";

let seq = 0;
function id(prefijo: string): string {
  seq += 1;
  return `${prefijo}-${seq}`;
}

export function producto(nombre: string, precio: number, stock = 0): Producto {
  const p = id("P");
  return {
    id: p,
    codigo: p.slice(-4),
    nombre,
    precioCents: Math.round(precio * 100),
    activo: true,
    updatedAt: new Date("2026-08-29T10:00:00Z").toISOString(),
    stock,
  };
}

export function dependienteCon(productos: Producto[]): DependienteDb {
  const db = plantillaDependiente();
  db.meta.dispositivo = "D-PRUEBA";
  db.meta.punto = "punto-1";
  db.meta.puntoNombre = "Punto Uno";
  db.productos = productos;
  return db;
}

export function gestionProducto(p: Producto, enBodega: number): ProductoGestion {
  return {
    ...p,
    inventario: { bodega: enBodega, "punto-1": 0 },
  };
}

export function gestionCon(prod: ProductoGestion[]): GestionDb {
  const db = plantillaGestion();
  db.meta.nombreNegocio = "Mi Negocio";
  db.productos = prod;
  db.puntos = [{ id: "punto-1", nombre: "Punto Uno", saldoCajaCents: 0 }];
  return db;
}