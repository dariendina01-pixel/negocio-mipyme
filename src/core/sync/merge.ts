// =============================================================
// merge.ts — Aplicar un paquete sobre una base de datos del dispositivo.
// Reglas:
//  - Cada registro tiene id único + updatedAt (los de gestión conservan su
//    id aunque cambien precio; el dependiente NO pierde su stock local).
//  - Nunca se duplican ventas/gastos/arqueos: se buscan por id.
//  - Folio por (origen, tipo) permite saltar paquetes ya consumidos.
// =============================================================
import {
  Paquete,
  Producto,
  Venta,
  Gasto,
  Recepcion,
  Arqueo,
  DependienteDb,
  GestionDb,
  ResultadoAplicar,
} from "../types";
import { registrarRecibido, folioRecibido } from "../folio";

export type BaseRecipiente = DependienteDb | GestionDb;

function pertenece(desde: unknown, para: string | "cualquiera"): boolean {
  return para === "cualquiera" || para === desde;
}

/** Upsert de producto en base de dependiente, conservando el stock local. */
function upsertProductoDependiente(db: DependienteDb, p: Producto): number {
  const idx = db.productos.findIndex((x) => x.id === p.id);
  if (idx >= 0) {
    const existente = db.productos[idx];
    // Solo se actualiza si el emisor está más al día
    if (p.updatedAt >= existente.updatedAt) {
      db.productos[idx] = {
        ...existente,
        codigo: p.codigo ?? existente.codigo,
        nombre: p.nombre ?? existente.nombre,
        precioCents: p.precioCents,
        categoria: p.categoria ?? existente.categoria,
        activo: p.activo,
        updatedAt: p.updatedAt,
        stock: existente.stock, // conserva existencias locales
      };
    }
    return 0;
  }
  db.productos.push({
    ...p,
    stock: 0, // la mercancía llega por paquete INVENTARIO, no por la lista de precios
  });
  return 1;
}

function upsertProductoGestion(db: GestionDb, p: Producto): number {
  const idx = db.productos.findIndex((x) => x.id === p.id);
  if (idx >= 0) {
    const existente = db.productos[idx];
    if (p.updatedAt >= existente.updatedAt) {
      db.productos[idx] = {
        ...existente,
        codigo: p.codigo ?? existente.codigo,
        nombre: p.nombre ?? existente.nombre,
        precioCents: p.precioCents,
        categoria: p.categoria ?? existente.categoria,
        activo: p.activo,
        updatedAt: p.updatedAt,
      };
    }
    return 0;
  }
  db.productos.push({ ...p, inventario: {} });
  return 1;
}

/** Suma cantidad a un punto del inventario de gestión. */
function sumarInventarioPunto(db: GestionDb, productoId: string, punto: string, cantidad: number): void {
  const prod = db.productos.find((x) => x.id === productoId);
  if (!prod) return;
  const actual = prod.inventario[punto] ?? 0;
  prod.inventario[punto] = Math.max(0, actual + cantidad);
}

/**
 * Aplica un paquete a la base indicada.
 * `idMiBase` es el id del dispositivo/tienda de esta base (para filtrar destino).
 */
export function aplicarPaquete(
  base: BaseRecipiente,
  paquete: Paquete,
  idMiBase: string
): ResultadoAplicar {
  // 1) Fast-path: si ya consumimos un folio mayor/igual de ese origen+tipo, ignorar
  if (paquete.destino !== "cualquiera" && !pertenece(idMiBase, paquete.destino)) {
    return { aplicado: false, motivo: "Paquete para otro destino" };
  }
  const yaVisto = folioRecibido(base.meta, paquete.origen, paquete.tipo);
  if (paquete.folio <= yaVisto && yaVisto > 0) {
    return { aplicado: false, motivo: `Paquete ya recibido (F${paquete.folio})` };
  }

  const resultado: ResultadoAplicar = { aplicado: true };
  const esDependiente = "punto" in base.meta; // DependienteDb lleva meta.punto

  switch (paquete.tipo) {
    case "PRODUCTOS": {
      const productos = (paquete.contendido.productos ?? []) as Producto[];
      let actualizados = 0;
      for (const p of productos) {
        if (esDependiente) actualizados += upsertProductoDependiente(base as DependienteDb, p);
        else actualizados += upsertProductoGestion(base as GestionDb, p);
      }
      resultado.productosActualizados = actualizados;
      if (esDependiente && (paquete.contendido.puntoNombre || paquete.contendido.punto)) {
        const db = base as DependienteDb;
        if (paquete.contendido.punto) db.meta.punto = String(paquete.contendido.punto);
        if (paquete.contendido.puntoNombre) db.meta.puntoNombre = String(paquete.contendido.puntoNombre);
        if (paquete.contendido.nombreNegocio) db.config.nombreNegocio = String(paquete.contendido.nombreNegocio);
        db.meta.baseProductos = {
          paqueteOrigen: paquete.paqueteId,
          folio: paquete.folio,
          fecha: paquete.fecha,
        };
      }
      break;
    }

    case "VENTAS": {
      const ventas = (paquete.contendido.ventas ?? []) as Venta[];
      const gastos = (paquete.contendido.gastos ?? []) as Gasto[];
      const arqueos = (paquete.contendido.arqueos ?? []) as Arqueo[];
      const recepciones = (paquete.contendido.recepciones ?? []) as Recepcion[];

      const db = base as GestionDb;
      if (!esDependiente) {
        // Alta automática del punto de venta si es la primera vez que reporta
        if (typeof paquete.contendido.punto === "string") {
          const pid = paquete.contendido.punto as string;
          if (!db.puntos.some((p) => p.id === pid)) {
            db.puntos.push({
              id: pid,
              nombre: (paquete.contendido.puntoNombre as string) || pid,
              saldoCajaCents: 0,
            });
          }
        }
        let nuevasVentas = 0;
        for (const v of ventas) {
          if (!db.ventasRecibidas.some((x) => x.id === v.id)) {
            db.ventasRecibidas.push(v);
            nuevasVentas += 1;
            // Descontar del inventario de ese punto
            for (const item of v.items) {
              sumarInventarioPunto(db, item.productoId, v.punto, -item.cantidad);
              db.movimientosInventario.push({
                id: "MOV-" + v.id,
                fecha: v.fecha,
                tipo: "VENTA",
                productoId: item.productoId,
                punto: v.punto,
                cantidad: -item.cantidad,
                referencia: v.id,
              });
            }
          }
        }
        resultado.nuevosVentas = nuevasVentas;

        let nuevosGastos = 0;
        for (const g of gastos) {
          if (!db.gastosRecibidos.some((x) => x.id === g.id)) {
            db.gastosRecibidos.push(g);
            nuevosGastos += 1;
          }
        }
        resultado.nuevosGastos = nuevosGastos;

        for (const a of arqueos) {
          if (!db.arqueosRecibidos.some((x) => x.id === a.id)) db.arqueosRecibidos.push(a);
        }

        // Mercancía que llegó directo al punto (el punto informa a la gestión)
        for (const r of recepciones) {
          if (!db.recepcionesRecibidas.some((x) => x.id === r.id)) {
            db.recepcionesRecibidas.push(r);
            // El inventario de ese punto auténtico = lo que la tienda reporta;
            // al llegar directo, la tienda ya lo tiene físico; la gestión lo suma.
            for (const item of r.items) {
              sumarInventarioPunto(db, item.productoId, r.punto, item.cantidad);
            }
          }
        }
      }
      break;
    }

    case "INVENTARIO": {
      // Gestión -> dependiente: mercancía enviada a un punto
      const db = base as DependienteDb;
      if (esDependiente) {
        const items = (paquete.contendido.items ?? []) as { productoId: string; cantidad: number; nombre?: string }[];
        for (const it of items) {
          const prod = db.productos.find((x) => x.id === it.productoId);
          if (prod) prod.stock += it.cantidad;
        }
        // Registrar la recepción (solo si no está ya registrada)
        const recepcionId = "RCP-" + (paquete.contendido.recepcionId ?? paquete.paqueteId);
        if (!db.recepciones.some((x) => x.id === recepcionId)) {
          db.recepciones.push({
            id: recepcionId,
            folio: db.recepciones.length + 1,
            punto: db.meta.punto,
            fecha: new Date().toISOString(),
            origen: paquete.origen,
            items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
          });
        }
      }
      break;
    }

    case "INVENTARIO_RECIBIDO": {
      // Dependiente -> gestión: reportar recepción directa (ya cubierta en VENTAS),
      // pero si viene suelta también se procesa.
      const db = base as GestionDb;
      if (!esDependiente) {
        const recepciones = (paquete.contendido.recepciones ?? []) as Recepcion[];
        for (const r of recepciones) {
          if (!db.recepcionesRecibidas.some((x) => x.id === r.id)) {
            db.recepcionesRecibidas.push(r);
            for (const item of r.items) {
              sumarInventarioPunto(db, item.productoId, r.punto, item.cantidad);
            }
          }
        }
      }
      break;
    }

    case "CONFIG": {
      const c = (paquete.contendido.config ?? {}) as Record<string, unknown>;
      if (esDependiente) {
        const db = base as DependienteDb;
        if (typeof c.nombreNegocio === "string") db.config.nombreNegocio = c.nombreNegocio;
        if (typeof c.moneda === "string") db.config.moneda = c.moneda;
        if (Array.isArray(c.denominaciones)) db.config.denominaciones = c.denominaciones as number[];
      } else {
        const db = base as GestionDb;
        if (typeof c.nombreNegocio === "string") db.meta.nombreNegocio = c.nombreNegocio;
        if (Array.isArray(c.denominaciones)) db.config.denominaciones = c.denominaciones as number[];
        if (typeof c.moneda === "string") db.config.moneda = c.moneda;
      }
      break;
    }

    default:
      return { aplicado: false, motivo: "Tipo de paquete desconocido" };
  }

  registrarRecibido(base.meta, paquete.origen, paquete.tipo, paquete.folio);
  base.ultima_modificacion = new Date().toISOString();
  return resultado;
}

/** Inserta una venta nueva en la base del dependiente descontando existencias. */
export function registrarVentaLocal(db: DependienteDb, venta: Venta): Venta {
  db.ventas.push(venta);
  for (const item of venta.items) {
    const prod = db.productos.find((x) => x.id === item.productoId);
    if (prod) prod.stock = Math.max(0, prod.stock - item.cantidad);
  }
  db.ultima_modificacion = new Date().toISOString();
  return venta;
}