import { test } from "node:test";
import assert from "node:assert/strict";
import { totalConteo, desgloseCambio, DEN_CUP, cambioEnBilletes } from "../src/core/denominations";

test("totalConteo suma denominaciones", () => {
  // 3 de 100 + 2 de 50 + 1 de 1 = 400,00
  assert.equal(totalConteo({ "100": 3, "50": 2, "1": 1 }), 40100);
  assert.equal(totalConteo({}), 0);
});

test("desgloseCambio usa la menor cantidad de billetes", () => {
  const desglose = desgloseCambio(3_67_00, DEN_CUP); // 367,00
  const total = desglose.reduce((a, d) => a + d.unidad * d.piezas, 0);
  assert.equal(total, 367);
  assert.deepEqual(desglose, [
    { unidad: 200, piezas: 1 },
    { unidad: 100, piezas: 1 },
    { unidad: 50, piezas: 1 },
    { unidad: 10, piezas: 1 },
    { unidad: 5, piezas: 1 },
    { unidad: 1, piezas: 2 },
  ]);
});

test("desglose con centavos: queda corto y reporta faltante", () => {
  const r = cambioEnBilletes(1_500_40, { denominaciones: DEN_CUP }); // 1.500,40
  assert.ok((r.faltanteCents ?? Number.NaN) === 0 || r.faltanteCents > 0);
  // no puede pagarse centavo: por eso faltanteCents > 0
  assert.ok(r.faltanteCents > 0);
  assert.equal(r.desglose.length, 2); // 1000 + 500
});