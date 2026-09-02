import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dependienteCon,
  producto,
  gestionCon,
  gestionProducto,
} from "./helpers";
import {
  registrarVenta,
  registrarGasto,
  registrarRecepcionDirecta,
  validarExistencias,
  productosDisponibles,
  resumenDia,
  enviarMercanciaAPunto,
} from "../src/core/operations";

const dia = "2026-08-29";

test("registrarVenta descuenta stock y registra", () => {
  const pan = producto("Pan", 50, 100); // 50,00
  const db = dependienteCon([pan]);
  const v = registrarVenta(db, {
    punto: "punto-1",
    items: [{ productoId: pan.id, nombre: "Pan", precioCents: pan.precioCents, cantidad: 4 }],
    recibidoCents: 20000, // 200,00
    fecha: dia + "T10:00:00Z",
  });
  assert.ok(v);
  assert.equal(v.totalCents, 20000);
  assert.equal(v.cambioCents, 0);
  assert.equal(db.productos[0].stock, 96);
  // El producto sigue apareciendo mientras haya stock
  assert.ok(productosDisponibles(db).some((p) => p.id === pan.id));
});

test("al agotarse, el producto desaparece de la lista añadible", () => {
  const pan = producto("Pan", 50, 1);
  const db = dependienteCon([pan]);
  registrarVenta(db, {
    punto: "punto-1",
    items: [{ productoId: pan.id, nombre: "Pan", precioCents: 5000, cantidad: 1 }],
    recibidoCents: 5000,
    fecha: dia + "T10:00:00Z",
  });
  assert.equal(productosDisponibles(db).length, 0);
});

test("no permite vender más de lo que hay", () => {
  const pan = producto("Pan", 50, 2);
  const db = dependienteCon([pan]);
  const r = validarExistencias(db, [
    { productoId: pan.id, nombre: "Pan", precioCents: 5000, cantidad: 3 },
  ]);
  assert.equal(r.ok, false);
  assert.equal(r.faltantes.length, 1);
  assert.equal(r.faltantes[0].disponible, 2);
});

test("recepcion directa sube el stock y queda registrada", () => {
  const pan = producto("Pan", 50, 0);
  const db = dependienteCon([pan]);
  const rec = registrarRecepcionDirecta(db, {
    punto: "punto-1",
    origen: "proveedor calle",
    items: [{ productoId: pan.id, cantidad: 30 }],
    fecha: dia + "T09:00:00Z",
  });
  assert.equal(db.productos[0].stock, 30);
  assert.equal(db.recepciones.length, 1);
  assert.equal(rec.origen, "proveedor calle");
});

test("resumenDia calcula ventas, gastos y lo esperado en caja", () => {
  const pan = producto("Pan", 50, 100);
  const agua = producto("Agua", 25, 50); // 25,00
  const db = dependienteCon([pan, agua]);
  registrarVenta(db, {
    punto: "punto-1",
    items: [{ productoId: pan.id, nombre: "Pan", precioCents: 5000, cantidad: 3 }],
    recibidoCents: 15000,
    fecha: dia + "T10:00:00Z",
  });
  registrarVenta(db, {
    punto: "punto-1",
    items: [{ productoId: agua.id, nombre: "Agua", precioCents: 2500, cantidad: 10 }],
    recibidoCents: 25000,
    fecha: dia + "T11:00:00Z",
  });
  registrarGasto(db, { punto: "punto-1", concepto: "Luz de quiosco", montoCents: 20000, fecha: dia + "T12:00:00Z" });
  const r = resumenDia(db, dia);
  assert.equal(r.ventas, 2);
  assert.equal(r.unidades, 13);
  assert.equal(r.totalVentasCents, 4_00_00);
  assert.equal(r.totalGastosCents, 2_00_00);
  assert.equal(r.esperadoCajaCents, 2_00_00);
  assert.deepEqual(r.detalleProductos.find((x) => x.producto === "Pan")?.unidades, 3);
});

test("enviarMercanciaAPunto mueve de bodega al punto en la gestión", () => {
  const pan = producto("Pan", 50, 0);
  const g = gestionCon([gestionProducto(pan, 40)]);
  const rec = enviarMercanciaAPunto({
    gestion: g,
    puntoId: "punto-1",
    items: [{ productoId: pan.id, cantidad: 15 }],
    fecha: dia + "T08:00:00Z",
  });
  assert.equal(g.productos[0].inventario["bodega"], 25);
  assert.equal(g.productos[0].inventario["punto-1"], 15);
  assert.equal(g.movimientosInventario.length, 1);
  assert.equal(g.movimientosInventario[0].tipo, "ENVIO");
  assert.equal(rec.items[0].cantidad, 15);
});