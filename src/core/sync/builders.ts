// =============================================================
// builders.ts — Crea los paquetes típicos de cada base:
//  - PRODUCTOS        (gestión -> dependiente) lista de precios
//  - INVENTARIO       (gestión -> dependiente) mercancía enviada
//  - VENTAS           (dependiente -> gestión) cierre/ventas del día
//  - INVENTARIO_RECIBIDO (dependiente -> gestión) llegada directa
//  - CONFIG           (ambos sentidos)
// Se usa "marca de agua" por contador para no reenviar lo ya enviado.
// =============================================================
import {
  DependienteDb,
  GestionDb,
  Paquete,
  Producto,
  ProductoGestion,
  Venta,
  Devolucion,
  Gasto,
  Arqueo,
  Recepcion,
} from "../types";
import { crearPaquete } from "./package";
import { actualizarMarca, marcaActual } from "./marca";

// ---------- GESTIÓN -> DEPENDIENTE ----------

/** Producto limpio para el dependiente (sin existencias reales de gestión). */
function productoParaDependiente(p: ProductoGestion): Producto {
  return {
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    precioCents: p.precioCents,
    categoria: p.categoria,
    activo: p.activo,
    updatedAt: p.updatedAt,
    stock: 0, // el stock lo comienza desde los paquetes INVENTARIO
  };
}

export function crearPaqueteProductos(gestion: GestionDb, destino = "cualquiera"): Paquete {
  const paquete = crearPaquete(gestion, {
    origen: "gestion",
    tipo: "PRODUCTOS",
    destino,
    contendido: {
      productos: gestion.productos.map(productoParaDependiente),
      punto: "",
      puntoNombre: "",
      nombreNegocio: gestion.meta.nombreNegocio,
      config: gestion.config,
    },
    resumen: `${gestion.productos.length} productos (precios)`,
  });
  return paquete;
}

/**
 * Paquete BASE_DIA (gestión -> dependiente): el archivo que el dependiente
 * importa para "abrir el día". Lleva su identidad (nombre, dirección, cuenta),
 * los precios y el inventario inicial de ESE punto. Confirmar el inventario de
 * un punto en la gestión = generar y entregar este archivo.
 */
export function crearPaqueteBaseDia(gestion: GestionDb, puntoId: string): Paquete {
  const punto = gestion.puntos.find((p) => p.id === puntoId);
  const baseProductos: Producto[] = gestion.productos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    precioCents: p.precioCents,
    categoria: p.categoria,
    activo: p.activo,
    updatedAt: p.updatedAt,
    stock: p.inventario[puntoId] ?? 0, // inventario de apertura del punto
  }));
  return crearPaquete(gestion, {
    origen: "gestion",
    tipo: "BASE_DIA",
    destino: puntoId,
    contendido: {
      productos: baseProductos,
      punto: puntoId,
      puntoNombre: punto?.nombre ?? puntoId,
      puntoDireccion: punto?.direccion,
      puntoCuenta: punto?.cuentaTransferencia,
      nombreNegocio: gestion.meta.nombreNegocio,
      config: gestion.config,
      dia: new Date().toISOString().slice(0, 10),
    },
    resumen: `Base del día para ${punto?.nombre ?? puntoId}`,
  });
}

export function crearPaqueteInventario(
  gestion: GestionDb,
  puntoId: string,
  recepcion: Recepcion
): Paquete {
  const paquete = crearPaquete(gestion, {
    origen: "gestion",
    tipo: "INVENTARIO",
    destino: puntoId,
    contendido: {
      items: recepcion.items,
      recepcionId: recepcion.id,
      fechaEnvio: recepcion.fecha,
    },
    resumen: `${recepcion.items.reduce((a, i) => a + i.cantidad, 0)} unidades a ${puntoId}`,
  });
  return paquete;
}

export function crearPaqueteConfig(gestion: GestionDb, destino = "cualquiera"): Paquete {
  return crearPaquete(gestion, {
    origen: "gestion",
    tipo: "CONFIG",
    destino,
    contendido: {
      config: {
        nombreNegocio: gestion.meta.nombreNegocio,
        moneda: gestion.config.moneda,
        denominaciones: gestion.config.denominaciones,
      },
    },
    resumen: "Configuración del negocio",
  });
}

// ---------- DEPENDIENTE -> GESTIÓN ----------

export interface PaqueteVentasExtra {
  marcar?: boolean; // si true, actualiza la marca de agua antes de guardar
}

/** Empaqueta todo lo nuevo (desde la última marca) para la gestión. */
export function crearPaqueteVentas(
  db: DependienteDb,
  opts: PaqueteVentasExtra = {}
): Paquete {
  const marcas = {
    ventas: marcaActual(db, "ventas"),
    devoluciones: marcaActual(db, "devoluciones"),
    gastos: marcaActual(db, "gastos"),
    recepciones: marcaActual(db, "recepciones"),
    arqueos: marcaActual(db, "arqueos"),
  };
  const nuevasVentas = db.ventas.slice(marcas.ventas);
  const nuevasDevoluciones = db.devoluciones.slice(marcas.devoluciones);
  const nuevosGastos = db.gastos.slice(marcas.gastos);
  // Las recepciones originadas por la gestión (envío de mercancía) ya fueron
  // aplicadas a su inventario en la gestión: no se vuelven a reportar.
  const nuevosRecepciones = db.recepciones
    .slice(marcas.recepciones)
    .filter((r) => r.origen !== "gestion");
  const nuevosArqueos = db.arqueos.slice(marcas.arqueos);

  const cont = {
    ventas: nuevasVentas as Venta[],
    devoluciones: nuevasDevoluciones as Devolucion[],
    gastos: nuevosGastos as Gasto[],
    recepciones: nuevosRecepciones as Recepcion[],
    arqueos: nuevosArqueos as Arqueo[],
    punto: db.meta.punto,
    puntoNombre: db.meta.puntoNombre,
    dispositivo: db.meta.dispositivo,
  };

  const paquete = crearPaquete(db, {
    origen: db.meta.dispositivo || "punto-" + db.meta.punto,
    tipo: "VENTAS",
    destino: "gestion",
    contendido: cont,
    resumen: `${nuevasVentas.length} ventas, ${nuevasDevoluciones.length} devoluciones, ${nuevosGastos.length} gastos`,
  });

  if (opts.marcar !== false) {
    actualizarMarca(db, "ventas", db.ventas.length);
    actualizarMarca(db, "devoluciones", db.devoluciones.length);
    actualizarMarca(db, "gastos", db.gastos.length);
    actualizarMarca(db, "recepciones", db.recepciones.length);
    actualizarMarca(db, "arqueos", db.arqueos.length);
  }
  return paquete;
}

/** Paquete inmediato cuando el punto recibe mercancía directa de su proveedor/tienda. */
export function crearPaqueteInventarioRecibido(
  db: DependienteDb,
  recepcionId: string
): Paquete | null {
  const recepciones = db.recepciones.filter((r) => r.id === recepcionId);
  if (recepciones.length === 0) return null;
  return crearPaquete(db, {
    origen: db.meta.dispositivo || "punto-" + db.meta.punto,
    tipo: "INVENTARIO_RECIBIDO",
    destino: "gestion",
    contendido: { recepciones },
    resumen: `${recepciones[0].items.length} entradas de mercancía`,
  });
}