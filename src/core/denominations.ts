// =============================================================
// denominations.ts — Contar dinero por denominaciones
// y desglose de cambio con la cantidad mínima de billetes/monedas
// =============================================================

export type Denominaciones = number[]; // valores en CUP (enteros, sin centavos)

// Billetes y monedas de CUP en circulación (en pesos)
export const DEN_CUP: Denominaciones = [1000, 500, 200, 100, 50, 20, 10, 5, 3, 1];

// Billetes de USD (dólares) habituales
export const DEN_USD: Denominaciones = [100, 50, 20, 10, 5, 1];

// Mapa nombre -> denominaciones para el selector de la app
export const CONJUNTOS_DENOMINACIONES: Record<string, Denominaciones> = {
  CUP: DEN_CUP,
  USD: DEN_USD,
  MIXTO: [...DEN_USD, 50, 20, 10, 5][0] ? [...DEN_USD, ...DEN_CUP].sort((a, b) => b - a) : DEN_CUP,
};

/**
 * Convierte el conteo del cajero (billete -> cantidad de piezas) en total de centavos.
 * conteo = { "1000": 3, "100": 2 } -> 3.200,00 CUP
 */
export function totalConteo(conteo: Record<string, number>): number {
  let total = 0;
  for (const [denomStr, piezas] of Object.entries(conteo)) {
    const denom = parseInt(denomStr, 10);
    if (isNaN(denom) || !isFinite(piezas) || piezas < 0) continue;
    total += Math.round(piezas) * denom * 100;
  }
  return total;
}

export interface DesgloseCambio {
  unidad: number; // valor del billete
  piezas: number; // cuántos entregar
}

/**
 * Calcula el cambio a devolver usando la MENOR cantidad de billetes.
 * Devuelve lista de {unidad, piezas} ordenada de mayor a menor.
 */
export function desgloseCambio(
  cambioCents: number,
  denominaciones: Denominaciones = DEN_CUP
): DesgloseCambio[] {
  if (cambioCents < 0) return [];
  let restante = Math.round(cambioCents);
  const resultado: DesgloseCambio[] = [];
  const denoms = [...denominaciones].sort((a, b) => b - a);
  for (const d of denoms) {
    if (d <= 0) continue;
    const valorCents = d * 100;
    if (restante >= valorCents) {
      const piezas = Math.floor(restante / valorCents);
      restante -= piezas * valorCents;
      if (piezas > 0) resultado.push({ unidad: d, piezas });
    }
  }
  return resultado;
}

/**
 * Si el cambio no es exacto con los billetes disponibles (ej: faltan monedas),
 * redondea "hacia abajo" al valor más cercano pagable y entrega verdaderos.
 */
export interface OpcionesDesglose {
  denominaciones: Denominaciones;
  redondear?: boolean; // si true, se permite quedar corto de centavos
}

/** Cambio a devolver como suma redondeada a billetes (para mostrar). */
export function cambioEnBilletes(
  cambioCents: number,
  opts: OpcionesDesglose
): { desglose: DesgloseCambio[]; pagadoCents: number; faltanteCents: number } {
  const desglose = desgloseCambio(cambioCents, opts.denominaciones);
  const pagado = desglose.reduce((acc, d) => acc + d.unidad * d.piezas * 100, 0);
  return {
    desglose,
    pagadoCents: pagado,
    faltanteCents: Math.max(0, cambioCents - pagado),
  };
}