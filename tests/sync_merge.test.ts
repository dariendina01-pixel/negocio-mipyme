import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dependienteCon,
  producto,
  gestionCon,
  gestionProducto,
} from "./helpers";
import { aplicarPaquete } from "../src/core/sync/merge";
import {
  crearPaqueteProductos,
  crearPaqueteInventario,
  crearPaqueteVentas,
} from "../src/core/sync/builders";
import { registrarVenta, registrarRecepcionDirecta, enviarMercanciaAPunto } from "../src/core/operations";
import { plantillaDependiente, plantillaGestion } from "../src/core/types";

const dia = "2026-08-29";

test("PRODUCTOS: el dependiente actualiza precio pero conserva su stock", () => {
  const pan = producto("Pan", 50, 0);
  const gestion = gestionCon([gestionProducto(pan, 0)]);

  // el dependiente ya tenía stock local de 20
  const dependiente = dependienteCon([{ ...pan, stock: 20 }]);

  // gestión sube el precio a 60 y reenvía
  const panNuevo = { ...gestion.productos[0], precioCents: 6000, updatedAt: new Date().toISOString() };
  gestion.productos[0] = panNuevo;
  const paquete = crearPaqueteProductos(gestion);

  const r = aplicarPaquete(dependiente, paquete, "punto-1");
  assert.equal(r.aplicado, true);
  const enDependiente = dependiente.productos.find((p) => p.id === pan.id)!;
  assert.equal(enDependiente.precioCents, 6000);
  assert.equal(enDependiente.stock, 20); // conservó el stock
});

test("PRODUCTOS: no duplica el mismo paquete (folio ya visto)", () => {
  const pan = producto("Pan", 50, 0);
  const gestion = gestionCon([gestionProducto(pan, 0)]);
  const dependiente = dependienteCon([{ ...pan, stock: 5 }]);
  const paquete = crearPaqueteProductos(gestion);
  aplicarPaquete(dependiente, paquete, "punto-1");
  const r2 = aplicarPaquete(dependiente, paquete, "punto-1");
  assert.equal(r2.aplicado, false);
});

test("INVENTARIO: la mercancía enviada aumenta el stock del punto", () => {
  const pan = producto("Pan", 50, 0);
  const gestion = gestionCon([gestionProducto(pan, 30)]);
  const dependiente = dependienteCon([{ ...pan, stock: 0 }]);

  const rec = enviarMercanciaAPunto({ gestion, puntoId: "punto-1", items: [{ productoId: pan.id, cantidad: 12 }], fecha: dia + "T08:00:00Z" });
  const paquete = crearPaqueteInventario(gestion, "punto-1", rec);
  const r = aplicarPaquete(dependiente, paquete, "punto-1");
  assert.equal(r.aplicado, true);
  assert.equal(dependiente.productos.find((p) => p.id === pan.id)!.stock, 12);
  assert.equal(dependiente.recepciones.length, 1);
});

test("VENTAS: la gestión recibe ventas, resta inventario del punto y no duplica", () => {
  const pan = producto("Pan", 50, 100);
  const dependiente = dependienteCon([pan]);
  const gestion = gestionCon([gestionProducto(pan, 0)]); // punto-1 tenía 20 en su tienda
  gestion.productos[0].inventario["punto-1"] = 100;

  registrarVenta(dependiente, {
    punto: "punto-1",
    items: [{ productoId: pan.id, nombre: "Pan", precioCents: 5000, cantidad: 4 }],
    recibidoCents: 20000,
    fecha: dia + "T10:00:00Z",
  });
  const paquete = crearPaqueteVentas(dependiente);

  const r1 = aplicarPaquete(gestion, paquete, "gestion");
  assert.equal(r1.aplicado, true);
  assert.equal(r1.nuevosVentas, 1);
  assert.equal(gestion.ventasRecibidas.length, 1);
  assert.equal(gestion.productos[0].inventario["punto-1"], 96);

  // Reimportar el mismo paquete: no duplica ventas ni vuelve a descontar
  const r2 = aplicarPaquete(gestion, paquete, "gestion");
  assert.equal(r2.aplicado, false);
  assert.equal(gestion.ventasRecibidas.length, 1);
  assert.equal(gestion.productos[0].inventario["punto-1"], 96);
});

test("VENTAS con marca de agua: segundo paquete solo lleva lo nuevo", () => {
  const pan = producto("Pan", 50, 100);
  const dependiente = dependienteCon([pan]);
  registrarVenta(dependiente, {
    punto: "punto-1",
    items: [{ productoId: pan.id, nombre: "Pan", precioCents: 5000, cantidad: 1 }],
    recibidoCents: 5000,
    fecha: dia + "T10:00:00Z",
  });
  const p1 = crearPaqueteVentas(dependiente);
  assert.equal((p1.contendido.ventas as unknown[]).length, 1);

  registrarVenta(dependiente, {
    punto: "punto-1",
    items: [{ productoId: pan.id, nombre: "Pan", precioCents: 5000, cantidad: 2 }],
    recibidoCents: 10000,
    fecha: dia + "T11:00:00Z",
  });
  const p2 = crearPaqueteVentas(dependiente);
  assert.equal((p2.contendido.ventas as unknown[]).length, 1); // solo la nueva
});

test("flujo completo: gestión -> precio e inventario -> punto vende -> gestión consolida", () => {
  const pan = producto("Pan", 50, 0);
  const gestion = gestionCon([gestionProducto(pan, 50)]);
  const dependiente = dependienteCon([]);

  // 1) gestión envía precios
  aplicarPaquete(dependiente, crearPaqueteProductos(gestion), "punto-1");
  assert.equal(dependiente.productos.length, 1);

  // 2) gestión envía mercancía
  const rec = enviarMercanciaAPunto({ gestion, puntoId: "punto-1", items: [{ productoId: pan.id, cantidad: 20 }], fecha: dia + "T08:00:00Z" });
  aplicarPaquete(dependiente, crearPaqueteInventario(gestion, "punto-1", rec), "punto-1");
  assert.equal(dependiente.productos[0].stock, 20);
  assert.equal(gestion.productos[0].inventario["punto-1"], 20);
  assert.equal(gestion.productos[0].inventario["bodega"], 30);

  // 3) punto vende 8
  registrarVenta(dependiente, {
    punto: "punto-1",
    items: [{ productoId: pan.id, nombre: "Pan", precioCents: 5000, cantidad: 8 }],
    recibidoCents: 40000,
    fecha: dia + "T10:30:00Z",
  });
  assert.equal(dependiente.productos[0].stock, 12);

  // 4) cierre/envío -> gestión
  const paqueteVentas = crearPaqueteVentas(dependiente);
  aplicarPaquete(gestion, paqueteVentas, "gestion");
  assert.equal(gestion.ventasRecibidas.length, 1);
  assert.equal(gestion.productos[0].inventario["punto-1"], 12); // 20-8
});