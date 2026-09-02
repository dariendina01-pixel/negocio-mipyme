import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularCobro, calcularDevolucion, subtotal, aplicarDescuento } from "../src/core/calc";

test("calcularCobro con pago exacto", () => {
  const r = calcularCobro(50000, 50000);
  assert.equal(r.cambio, 0);
  assert.equal(r.falta, 0);
  assert.equal(r.completo, true);
});

test("calcularCobro con cambio", () => {
  const r = calcularCobro(1_475_00, 2_000_00); // 1.475,00 con 2.000,00
  assert.equal(r.cambio, 5_25_00); // 525,00
  assert.equal(r.completo, true);
});

test("calcularCobro con falta", () => {
  const r = calcularCobro(1_000_00, 500_00);
  assert.equal(r.falta, 500_00);
  assert.equal(r.cambio, 0);
  assert.equal(r.completo, false);
});

test("subtotal con cantidades", () => {
  assert.equal(
    subtotal([
      { precioCents: 100_00, cantidad: 3 },
      { precioCents: 50_00, cantidad: 2 },
    ]),
    4_00_00
  );
});

test("descuento porcentual", () => {
  assert.equal(aplicarDescuento(1_000_00, 10), 9_00_00);
  assert.equal(aplicarDescuento(1_000_00, 0), 1_000_00);
});

test("devoluciones: devuelve el total proporcional", () => {
  const r = calcularDevolucion([{ precioCents: 3_500_00, cantidad: 2 }], 0);
  assert.equal(r.totalDevolver, 7_000_00);
});