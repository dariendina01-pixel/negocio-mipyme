// =============================================================
// operations.ts — Operaciones del dependiente y de la gestión
// =============================================================
import {
  DependienteDb,
  GestionDb,
  Venta,
  Devolucion,
  Gasto,
  Recepcion,
  Arqueo,
  Cierre,
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
export function registrarVenta(db: DependienteDb, args: RegistroVentaArgs): Venta | null {
  const fecha = args.fecha ?? new Date().toISOString();
  const dia = fecha.slice(0, 10);
  if (diaCerrado(db, dia)) return null; // día entregado = inmutable
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

// ---------------- DEVOLUCIONES (dependiente) ----------------

export interface RegistrarDevolucionArgs {
  punto: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioCents: Centavos;
  motivo?: string;
  fecha?: string;
}

/**
 * Registra una devolución: devuelve las unidades al inventario (stock +) y
 * resta el monto al total de ventas del día (monto negativo).
 */
export function registrarDevolucion(db: DependienteDb, args: RegistrarDevolucionArgs): Devolucion | null {
  if (args.cantidad <= 0) return null;
  const fecha = args.fecha ?? new Date().toISOString();
  if (diaCerrado(db, fecha.slice(0, 10))) return null; // día entregado = inmutable
  const prod = db.productos.find((p) => p.id === args.productoId);
  if (prod) prod.stock = (prod.stock ?? 0) + args.cantidad;
  const monto = Math.round(args.precioCents * args.cantidad);
  const devolucion: Devolucion = {
    id: "D-" + v4(),
    folio: db.devoluciones.length + 1,
    punto: args.punto,
    fecha,
    productoId: args.productoId,
    nombre: args.nombre,
    cantidad: args.cantidad,
    precioCents: args.precioCents,
    montoCents: -monto,
    motivo: args.motivo,
  };
  db.devoluciones.push(devolucion);
  db.ultima_modificacion = new Date().toISOString();
  return devolucion;
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

export function registrarGasto(db: DependienteDb, args: RegistrarGastoArgs): Gasto | null {
  const fecha = args.fecha ?? new Date().toISOString();
  if (diaCerrado(db, fecha.slice(0, 10))) return null; // día entregado = inmutable
  const gasto: Gasto = {
    id: "G-" + v4(),
    folio: db.gastos.length + 1,
    punto: args.punto,
    fecha,
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
  const devolucionesDelDia = db.devoluciones.filter((d) => d.fecha.slice(0, 10) === dia);
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
  // Las devoluciones restan unidades y monto por producto
  for (const dev of devolucionesDelDia) {
    const actual = detalle.get(dev.nombre) ?? { unidades: 0, montoCents: 0 };
    actual.unidades -= dev.cantidad;
    actual.montoCents += dev.montoCents; // negativo
    detalle.set(dev.nombre, actual);
  }
  const unidadesVendidas = ventasDelDia.reduce((a, v) => a + v.items.reduce((s, i) => s + i.cantidad, 0), 0);
  const unidadesDevueltas = devolucionesDelDia.reduce((a, d) => a + d.cantidad, 0);
  const totalVentas = ventasDelDia.reduce((a, v) => a + v.totalCents, 0) + devolucionesDelDia.reduce((a, d) => a + d.montoCents, 0);
  const totalGastos = gastosDelDia.reduce((a, g) => a + g.montoCents, 0);
  return {
    dia,
    ventas: ventasDelDia.length,
    unidades: unidadesVendidas - unidadesDevueltas,
    totalVentasCents: totalVentas,
    totalGastosCents: totalGastos,
    esperadoCajaCents: totalVentas - totalGastos,
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

// ---------------- CIERRE DE DÍA (dependiente) ----------------

/** Devuelve el cierre del día indicado si ya existe (null si no). */
export function cierreDeDia(db: DependienteDb, dia: string): Cierre | null {
  return db.cierres.find((c) => c.fecha === dia) ?? null;
}

/** ¿El día ya está cerrado y entregado (inmutable)? */
export function diaCerrado(db: DependienteDb, dia: string): boolean {
  return cierreDeDia(db, dia)?.entregado === true;
}

/**
 * Registra el cierre del día del punto. La primera vez queda como "pendiente";
 * al marcarlo `entregado` se vuelve inmutable (no se pueden modificar los
 * datos del día en el dependiente).
 */
export function registrarCierre(db: DependienteDb, dia: string): Cierre {
  const existente = cierreDeDia(db, dia);
  if (existente) return existente;
  const resumen = resumenDia(db, dia);
  const cierre: Cierre = {
    id: "CIE-" + v4(),
    punto: db.meta.punto || db.meta.puntoNombre || db.meta.dispositivo,
    fecha: dia,
    totalVentasCents: resumen.totalVentasCents,
    unidadesVendidas: resumen.unidades,
    totalGastosCents: resumen.totalGastosCents,
    entradasMercancia: db.recepciones
      .filter((r) => r.fecha.slice(0, 10) === dia)
      .reduce((a, r) => a + r.items.reduce((s, i) => s + i.cantidad, 0), 0),
    arqueoCents: db.arqueos
      .filter((a) => a.fecha.slice(0, 10) === dia)
      .reduce((a2, x) => a2 + x.totalCents, 0),
    numVentas: resumen.ventas,
    exportado: false,
    entregado: false,
    generado: new Date().toISOString(),
  };
  db.cierres.push(cierre);
  db.ultima_modificacion = new Date().toISOString();
  return cierre;
}

/** Marca el cierre del día como entregado (inmutable). Sin efecto si ya está entregado. */
export function marcarCierreEntregado(db: DependienteDb, dia: string): Cierre | null {
  const cierre = cierreDeDia(db, dia);
  if (!cierre || cierre.entregado) return cierre ?? null;
  cierre.entregado = true;
  cierre.exportado = true;
  db.ultima_modificacion = new Date().toISOString();
  return cierre;
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

// ---------------- GESTIÓN: ajuste de inventario ----------------

export type TipoAjusteInventario = "faltante" | "sobrante" | "deterioro";

export interface AjusteInventarioArgs {
  gestion: GestionDb;
  productoId: string;
  ubicacion: string; // "bodega" o id de punto
  tipo: TipoAjusteInventario;
  cantidad: number; // unidades (positivas)
  motivo?: string;
  fecha?: string;
}

/**
 * Registra un ajuste de inventario (faltante/sobrante/deterioro) en una
 * ubicación concreta, modifica las existencias y deja constancia en el
 * historial de movimientos (inmutable una vez registrado).
 */
export function registrarAjusteInventario(args: AjusteInventarioArgs): boolean {
  const fecha = args.fecha ?? new Date().toISOString();
  const cantidad = args.cantidad || 0;
  if (cantidad <= 0) return false;
  const prod = args.gestion.productos.find((p) => p.id === args.productoId);
  if (!prod) return false;

  const actual = prod.inventario[args.ubicacion] ?? 0;
  let delta = 0;
  if (args.tipo === "sobrante") {
    delta = cantidad; // sobra mercancía -> suma
  } else {
    // faltante o deterioro -> resta (sin pasar de 0)
    delta = -Math.min(cantidad, actual);
  }
  prod.inventario[args.ubicacion] = Math.max(0, actual + delta);

  args.gestion.movimientosInventario.push({
    id: "MOV-" + v4(),
    fecha,
    tipo: "AJUSTE",
    productoId: args.productoId,
    punto: args.ubicacion,
    cantidad: delta,
    referencia: args.tipo,
  });
  args.gestion.ultima_modificacion = fecha;
  return true;
}

// ---------------- GESTIÓN: dashboard ----------------

export interface DashboardGestion {  totalPuntos: number;
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
  for (const dev of db.devolucionesRecibidas) {
    const nombre = db.puntos.find((p) => p.id === dev.punto)?.nombre ?? dev.punto;
    const actual = porPunto.get(nombre) ?? { punto: nombre, ventas: 0, numVentas: 0 };
    actual.ventas += dev.montoCents; // negativo
    porPunto.set(nombre, actual);
  }
  const devTotal = db.devolucionesRecibidas.reduce((a, d) => a + d.montoCents, 0);
  const devUnidades = db.devolucionesRecibidas.reduce((a, d) => a + d.cantidad, 0);
  return {
    totalPuntos: db.puntos.length,
    totalProductos: db.productos.length,
    ventasTotales: db.ventasRecibidas.reduce((a, v) => a + v.totalCents, 0) + devTotal,
    numVentas: db.ventasRecibidas.length,
    unidadesVendidas: db.ventasRecibidas.reduce(
      (a, v) => a + v.items.reduce((s, i) => s + i.cantidad, 0),
      0
    ) - devUnidades,
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
    unidadMedida: "unidad",
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