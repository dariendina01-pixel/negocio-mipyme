// =============================================================
// money.ts — Manejo de dinero en CENTAVOS (enteros) y formato local
// Formato local cubano: 1.500,50  (punto para miles, coma para entero|dec)
// =============================================================

export type Centavos = number; // siempre entero

/** Convierte un texto "1.500,50" o número a centavos enteros. */
export function aCentavos(valor: string | number): Centavos {
  if (typeof valor === "number") return Math.round(valor * 100);
  const limpio = valor
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "") // quita puntos (separador de miles)
    .replace(",", "."); // coma decimal -> punto
  if (!limpio || isNaN(Number(limpio))) return 0;
  return Math.round(Number(limpio) * 100);
}

/** Convierte centavos enteros a número con decimales (para librerías). */
export function deCentavos(centavos: Centavos): number {
  return centavos / 100;
}

/** Formatea centavos como "1.500,50". Sin símbolo. */
export function fmt(centavos: Centavos | undefined | null): string {
  const c = Math.round((centavos ?? 0));
  const negativo = c < 0;
  const abs = Math.abs(c);
  const partes = Math.floor(abs / 100);
  const resto = abs % 100;
  const entero = String(partes).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimales = resto < 10 ? "0" + resto : String(resto);
  return (negativo ? "-" : "") + entero + "," + decimales;
}

/** Mismo que fmt pero con símbolo de moneda configurado. */
export function fmtMoneda(centavos: Centavos | undefined | null, simbolo = "$"): string {
  return simbolo + fmt(centavos);
}

/** Formatea solo cantidades: "3" / "12 unidades". */
export function fmtCantidad(n: number): string {
  return String(n);
}

/** Suma segura de centavos. */
export function sumar(a: Centavos, b: Centavos): Centavos {
  return a + b;
}

/** Multiplicación con redondeo exacta en centavos (precio x cantidad). */
export function multiplicar(precioCents: Centavos, cantidad: number): Centavos {
  return Math.round(precioCents * cantidad);
}