import { test } from "node:test";
import assert from "node:assert/strict";
import { aCentavos, fmt, fmtMoneda, multiplicar } from "../src/core/money";

test("aCentavos parsea formato cubano 1.500,50", () => {
  assert.equal(aCentavos("1.500,50"), 150050);
  assert.equal(aCentavos("75.648,00"), 7564800);
  assert.equal(aCentavos("1,25"), 125);
  assert.equal(aCentavos("1000"), 100000);
  assert.equal(aCentavos(""), 0);
  assert.equal(aCentavos("abc"), 0);
});

test("fmt produce 75.648,50", () => {
  assert.equal(fmt(7564850), "75.648,50");
  assert.equal(fmt(150050), "1.500,50");
  assert.equal(fmt(0), "0,00");
  assert.equal(fmt(5), "0,05");
  assert.equal(fmtMoneda(150050), "$1.500,50");
  assert.equal(fmt(-2500), "-25,00");
});

test("multiplicar redondea en centavos", () => {
  assert.equal(multiplicar(150050, 3), 450150);
});