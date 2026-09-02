// =============================================================
// operations.ts — Operaciones del dependiente y de la gestión
// =============================================================
import {
  DependienteDb,
  GestionDb,
  Venta,
  Gasto,
  Recepcion,
  Arqueo,
  LineaVenta,
  ProductoGestion,
} from "./types";
import { Centavos, fmt } from "./money";
import { subtotal, calcularCobro, aplicarDescuento } from "./calc";
import { nuevoId } from "./fs";
import { v4 } from "./uuid";
import { hoyLocal } from "./folio";

// ---------------- VENTAS (dependiente) ----------------

export interface RegistroVentaArgs {
  punto: string;
  items: LineaVenta[];
  descuentoPorciento?: number;
  recibidoCents?: Centavos; // 0 = venta a crédito/anotación manual
  fecha?: string;
}

/** Valida existencias antes de cobrar. */
export function validarExistencias(db: DependienteDb, items: LineaVenta[]): {
  ok: boolean;
  faltantes: { nombre: string; pedido: number; disponible: number }[];
} {
  const faltantes: { nombre: string; pedido: number; disponible: number }[] = [];
  for (const item of items) {
    const prod = db.productos.find((p) => p.id === item.productoId);
    const disponible = prod ? prod.stock : 0;
    if (item.cantidad > disponible) {
      faltantes.push({ nombre: item.nombre || "?", pedido: item.cantidad, disponible });
    }
  }
  return { ok: faltantes.length === 0, faltantes };
}

/** Crea y registra una venta descontando existencias. */
export function registrarVenta(db: DependienteDb, args: RegistroVentaArgs): Venta {
  const fecha = args.fecha ?? new Date().toISOString();
  const subtotalCents = subtotal(args.items);
  const totalCents = aplicarDescuento(subtotalCents, args.descuentoPorciento ?? 0);
  const cobro = calcularCobro(totalCents, args.recibidoCents ?? 0);
  const venta: Venta = {
    id: "V-" + v4(),
    folio: db.ventas.length + 1,
    punto: args.punto,
    fecha,
    items: args.items.map((i) => ({ ...i })),
    subtotalCents,
    descuentoPorciento: args.descuentoPorciento ?? 0,
    totalCents,
    recibidoCents: args.recibidoCents ?? 0,
    cambioCents: cobro.completo ? cobro.cambio : 0,
    gastadoEnExterno: args.recibidoCents === 0 || args.recibidoCents === undefined,
  };
  db.ventas.push(venta);
  for (const item of args.items) {
    const prod = db.productos.find((p) => p.id === item.productoId);
    if (prod) prod.stock = Math.max(0, prod.stock - item.cantidad);
  }
  db.ultima_modificacion = new Date().toISOString();
  return venta;
}

/** Lista de productos "añadibles" al carrito (los agotados desaparecen). */
export function productosDisponibles(db: DependienteDb): ProductoListable[] {
  return db.productos
    .filter((p) => p.activo && p.stock > 0)
    .map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, precioCents: p.precioCents, stock: p.stock }));
}

export interface ProductoListable {
  id: string;
  codigo: string;
  nombre: string;
  precioCents: Centavos;
  stock: number;
}

// ---------------- GASTOS (dependiente) ----------------

export interface RegistrarGastoArgs {
  punto: string;
  concepto: string;
  montoCents: Centavos;
  fecha?: string;
}

export function registrarGasto(db: DependienteDb, args: RegistrarGastoArgs): Gasto {
  const gasto: Gasto = {
    id: "G-" + v4(),
    folio: db.gastos.length + 1,
    punto: args.punto,
    fecha: args.fecha ?? new Date().toISOString(),
    concepto: args.concepto,
    montoCents: args.montoCents,
  };
  db.gastos.push(gasto);
  db.ultima_modificacion = new Date().toISOString();
  return gasto;
}

// ---------------- RECEPCIONES / MERCADERÍA ----------------

export interface RecibirMercanciaArgs {
  punto: string;
  origen: string;
  items: { productoId: string; cantidad: number }[];
  fecha?: string;
}

/** Registra mercancía que llega al punto DENTRO del día (no enviada por gestión). */
export function registrarRecepcionDirecta(db: DependienteDb, args: RecibirMercanciaArgs): Recepcion {
  // Verificar que existan los productos
  const items = args.items.filter((i) => i.cantidad > 0 && db.productos.some((p) => p.id === i.productoId));
  const recepcion: Recepcion = {
    id: "R-" + v4(),
    folio: db.recepciones.length + 1,
    punto: args.punto,
    fecha: args.fecha ?? new Date().toISOString(),
    origen: args.origen,
    items,
  };
  for (const it of items) {
    const prod = db.productos.find((p) => p.id === it.productoId);
    if (prod) prod.stock += it.cantidad;
  }
  db.recepciones.push(recepcion);
  db.ultima_modificacion = new Date().toISOString();
  return recepcion;
}

// ---------------- ARQUEO (dependiente) ----------------

export function registrarArqueo(db: DependienteDb, args: { conteo: Record<string, number>; nota?: string }): Arqueo {
  const total = Object.entries(args.conteo).reduce(
    (acc, [d, piezas]) => acc + parseInt(d, 10) * (piezas || 0) * 100,
    0
  );
  const arqueo: Arqueo = {
    id: "A-" + v4(),
    folio: db.arqueos.length + 1,
    punto: db.meta.punto,
    fecha: new Date().toISOString(),
    conteo: args.conteo,
    totalCents: total,
    nota: args.nota,
  };
  db.arqueos.push(arqueo);
  db.ultima_modificacion = new Date().toISOString();
  return arqueo;
}

// ---------------- CIERRE DE DÍA + RESÚMENES ----------------

export interface ResumenDia {
  dia: string;
  ventas: number;
  unidades: number;
  totalVentasCents: Centavos;
  totalGastosCents: Centavos;
  esperadoCajaCents: Centavos; // ingresos - gastos
  detalleProductos: { producto: string; unidades: number; montoCents: Centavos }[];
}

/** Resumen de un día completo (para el cierre y para el dueño). */
export function resumenDia(db: DependienteDb, dia: string): ResumenDia {
  const ventasDelDia = db.ventas.filter((v) => v.fecha.slice(0, 10) === dia);
  const gastosDelDia = db.gastos.filter((g) => g.fecha.slice(0, 10) === dia);
  const detalle = new Map<string, { unidades: number; montoCents: Centavos }>();
  for (const v of ventasDelDia) {
    const proporcional = v.totalCents;
    for (const item of v.items) {
      const actual = detalle.get(item.nombre) ?? { unidades: 0, montoCents: 0 };
      actual.unidades += item.cantidad;
      actual.montoCents += Math.round((proporcional * item.precioCents * item.cantidad) / (v.subtotalCents || 1));
      detalle.set(item.nombre, actual);
    }
  }
  return {
    dia,
    ventas: ventasDelDia.length,
    unidades: ventasDelDia.reduce((a, v) => a + v.items.reduce((s, i) => s + i.cantidad, 0), 0),
    totalVentasCents: ventasDelDia.reduce((a, v) => a + v.totalCents, 0),
    totalGastosCents: gastosDelDia.reduce((a, g) => a + g.montoCents, 0),
    esperadoCajaCents: ventasDelDia.reduce((a, v) => a + v.totalCents, 0) - gastosDelDia.reduce((a, g) => a + g.montoCents, 0),
    detalleProductos: [...detalle.entries()].map(([nombre, v]) => ({
      producto: nombre,
      unidades: v.unidades,
      montoCents: v.montoCents,
    })),
  };
}

export interface InfoCierre {
  dia: string;
  resumen: ResumenDia;
}

/** Arma el texto legible del cierre (para enviar por WhatsApp como resumen). */
export function textoCierre(info: InfoCierre): string {
  const r = info.resumen;
  const lineas: string[] = [];
  lineas.push(`CIERRE DEL DIA ${r.dia}`);
  lineas.push(`Ventas: ${r.ventas} (${r.unidades} unidades)`);
  lineas.push(`Total vendido: ${fmt(r.totalVentasCents)}`);
  lineas.push(`Gastos del dia: ${fmt(r.totalGastosCents)}`);
  lineas.push(`Caja esperada: ${fmt(r.esperadoCajaCents)}`);
  if (r.detalleProductos.length > 0) {
    lineas.push("Por producto:");
    for (const p of r.detalleProductos) {
      lineas.push(`  - ${p.producto}: ${p.unidades} u = ${fmt(p.montoCents)}`);
    }
  }
  return lineas.join("\n");
}

// ---------------- GESTIÓN: envío de mercancía a un punto ----------------

export interface EnvioMercanciaArgs {
  gestion: GestionDb;
  puntoId: string;
  items: { productoId: string; cantidad: number }[];
  fecha?: string;
}

/**
 * Registra el envío en la gestión: descuenta de bodega (o del punto que sea),
 * suma al punto destino y deja constancia en movimientos.
 * Opcionalmente se convierte en paquete INVENTARIO hacia el dependiente.
 */
export function enviarMercanciaAPunto(args: EnvioMercanciaArgs): Recepcion {
  const fecha = args.fecha ?? new Date().toISOString();
  const items = args.items.filter((i) => i.cantidad > 0);
  const recepcion: Recepcion = {
    id: "RCP-" + v4(),
    folio: 0,
    punto: args.puntoId,
    fecha,
    origen: args.gestion.meta.nombreNegocio || "bodega",
    items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
  };
  for (const it of items) {
    const prod = args.gestion.productos.find((p) => p.id === it.productoId);
    if (!prod) continue;
    const enBodega = prod.inventario["bodega"] ?? 0;
    const efectivo = enBodega >= it.cantidad ? enBodega : 0;
    // 1. Sale de bodega (si hay)
    if (efectivo >= it.cantidad) {
      prod.inventario["bodega"] = enBodega - it.cantidad;
    }
    // 2. Entra al punto destino
    const destino = prod.inventario[args.puntoId] ?? 0;
    prod.inventario[args.puntoId] = destino + it.cantidad;
    args.gestion.movimientosInventario.push({
      id: "MOV-" + v4(),
      fecha,
      tipo: "ENVIO",
      productoId: it.productoId,
      punto: args.puntoId,
      cantidad: it.cantidad,
      referencia: recepcion.id,
    });
  }
  args.gestion.ultima_modificacion = new Date().toISOString();
  return recepcion;
}

// ---------------- GESTIÓN: dashboard ----------------

export interface DashboardGestion {
  totalPuntos: number;
  totalProductos: number;
  ventasTotales: Centavos;
  numVentas: number;
  unidadesVendidas: number;
  gastosTotales: Centavos;
  porPunto: { punto: string; ventas: number; numVentas: number }[];
  movimientosRecientes: number;
}

export function dashboardGestion(db: GestionDb): DashboardGestion {
  const porPunto = new Map<string, { punto: string; ventas: Centavos; numVentas: number }>();
  for (const v of db.ventasRecibidas) {
    const nombre = db.puntos.find((p) => p.id === v.punto)?.nombre ?? v.punto;
    const actual = porPunto.get(nombre) ?? { punto: nombre, ventas: 0, numVentas: 0 };
    actual.ventas += v.totalCents;
    actual.numVentas += 1;
    porPunto.set(nombre, actual);
  }
  return {
    totalPuntos: db.puntos.length,
    totalProductos: db.productos.length,
    ventasTotales: db.ventasRecibidas.reduce((a, v) => a + v.totalCents, 0),
    numVentas: db.ventasRecibidas.length,
    unidadesVendidas: db.ventasRecibidas.reduce(
      (a, v) => a + v.items.reduce((s, i) => s + i.cantidad, 0),
      0
    ),
    gastosTotales: db.gastosRecibidos.reduce((a, g) => a + g.montoCents, 0),
    porPunto: [...porPunto.values()],
    movimientosRecientes: db.movimientosInventario.length,
  };
}

export function totalCajaEsperada(db: DependienteDb): Centavos {
  const dia = hoyLocal();
  return resumenDia(db, dia).esperadoCajaCents;
}

export function nuevoProducto(): ProductoGestion {
  return {
    id: "P-" + uuidCorto(),
    nombre: "",
    codigo: "",
    precioCents: 0,
    activo: true,
    updatedAt: new Date().toISOString(),
    stock: 0,
    inventario: {},
  };
}

/**
 * Un producto tiene entrada cuando ya se registró mercancía en bodega con costo.
 * Solo entonces se habilita el precio de venta.
 */
export function productoTieneEntrada(p: ProductoGestion): boolean {
  const enBodega = p.inventario["bodega"] ?? 0;
  return !!p.tipoEntrada && enBodega > 0 && (p.costoPromedioCents ?? 0) > 0;
}

function uuidCorto(): string {
  return v4().slice(0, 8).toUpperCase();
}

/** Alias compatible */
export const nuevoIdVenta = (): string => nuevoId("V");