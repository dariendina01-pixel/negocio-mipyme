// =============================================================
// types.ts — Tipos y esquemas de las bases de datos (patrón "salva" JSON)
// Dos bases en la app del dependiente, dos en la app de gestión.
// =============================================================
import type { Centavos } from "./money";

export const FORMATO_PAQUETE = "NE/1.0";
export const VERSION_DB = "1.0";

// ---------- Entidades básicas ----------

export interface Producto {
  id: string;
  codigo: string; // código corto o de barras
  nombre: string;
  precioCents: Centavos;
  categoria?: string;
  activo: boolean;
  updatedAt: string; // fecha ISO para merge
  stock: number; // existencias EN EL DISPOSITIVO (nunca se muestran al público)
}

export type TipoEntrada = "compra" | "beneficiario" | "consignacion";

/** Unidad de medida física del producto (por defecto: unidad). */
export type UnidadMedida = "unidad" | "paquete" | "lata" | "libra" | "caja";

export const UNIDADES_MEDIDA: { valor: UnidadMedida; etiqueta: string }[] = [
  { valor: "unidad", etiqueta: "Unidad" },
  { valor: "paquete", etiqueta: "Paquete" },
  { valor: "lata", etiqueta: "Lata" },
  { valor: "libra", etiqueta: "Libra" },
  { valor: "caja", etiqueta: "Caja" },
];

export interface ProductoGestion extends Producto {
  costoPromedioCents?: Centavos;
  // Unidad de medida física (paquete, lata, etc.) para mostrar y anotar cantidades.
  unidadMedida?: UnidadMedida;
  // Tipo de entrada por el que llegó la mercancía (compra/beneficiario/consignación).
  // Si está presente, el producto ya tiene una entrada registrada y se habilita el precio de venta.
  tipoEntrada?: TipoEntrada;
  inventario: Record<string, number>; // puntoId -> unidades (bodega = "bodega")
}

export interface Punto {
  id: string;
  nombre: string;
  dispositivo?: string;
  saldoCajaCents: Centavos;
}

export interface LineaVenta {
  productoId: string;
  nombre: string;
  precioCents: Centavos;
  cantidad: number;
}

export interface Venta {
  id: string;
  folio: number; // folio local del dependiente
  punto: string; // id del punto
  fecha: string; // ISO
  items: LineaVenta[];
  subtotalCents: Centavos;
  descuentoPorciento: number;
  totalCents: Centavos;
  recibidoCents: Centavos;
  cambioCents: Centavos;
  gastadoEnExterno?: boolean; // true si no pasó por la caja de la app
}

export interface Gasto {
  id: string;
  folio: number;
  punto: string;
  fecha: string;
  concepto: string;
  montoCents: Centavos;
}

export interface Recepcion {
  id: string;
  folio: number;
  punto: string;
  fecha: string;
  origen: string; // "bodega" | id de tienda | nombre libre
  items: { productoId: string; cantidad: number }[];
}

export interface Arqueo {
  id: string;
  folio: number;
  punto: string;
  fecha: string;
  conteo: Record<string, number>; // denominacion -> piezas
  totalCents: Centavos;
  nota?: string;
}

export interface Cierre {
  id: string;
  punto: string;
  fecha: string; // día del cierre YYYY-MM-DD
  totalVentasCents: Centavos;
  unidadesVendidas: number;
  totalGastosCents: Centavos;
  entradasMercancia: number;
  arqueoCents: Centavos;
  numVentas: number;
  exportado: boolean;
}

// ---------- Base datos DEPENDIENTE ----------

export interface DependienteDb {
  version: string;
  ultima_modificacion: string;
  meta: {
    dispositivo: string;
    punto: string; // id del punto
    puntoNombre: string;
    baseProductos: {
      paqueteOrigen: string | null; // id del paquete de productos aplicado
      folio: number;
      fecha: string;
    };
    recibidos: Record<string, Record<string, number>>; // origen -> tipo -> ultimo folio
    exportados: Record<string, number>; // tipo -> último folio generado al exportar
  };
  productos: Producto[]; // ============ BASE DE PRECIOS / PRODUCTOS ============
  ventas: Venta[]; //                ============ BASE DE VENTAS ============
  gastos: Gasto[];
  recepciones: Recepcion[];
  arqueos: Arqueo[];
  cierres: Cierre[];
  config: {
    nombreNegocio: string;
    moneda: string;
    denominaciones: number[];
  };
}

export function plantillaDependiente(): DependienteDb {
  return {
    version: VERSION_DB,
    ultima_modificacion: "",
    meta: {
      dispositivo: "",
      punto: "",
      puntoNombre: "",
      baseProductos: { paqueteOrigen: null, folio: 0, fecha: "" },
      recibidos: {},
      exportados: {},
    },
    productos: [],
    ventas: [],
    gastos: [],
    recepciones: [],
    arqueos: [],
    cierres: [],
    config: { nombreNegocio: "", moneda: "CUP", denominaciones: [1000, 500, 200, 100, 50, 20, 10, 5, 3, 1] },
  };
}

// ---------- Base datos GESTION ----------

export interface GestionDb {
  version: string;
  ultima_modificacion: string;
  meta: {
    nombreNegocio: string;
    recibidos: Record<string, Record<string, number>>;
    exportados: Record<string, number>;
  };
  productos: ProductoGestion[]; // inventario general + precios
  puntos: Punto[]; // puntos de venta / dispositivos dependientes
  ventasRecibidas: Venta[];
  gastosRecibidos: Gasto[];
  recepcionesRecibidas: Recepcion[];
  arqueosRecibidos: Arqueo[];
  movimientosInventario: {
    id: string;
    fecha: string;
    tipo: "ENTRADA" | "SALIDA" | "AJUSTE" | "VENTA" | "ENVIO";
    productoId: string;
    punto: string;
    cantidad: number;
    referencia?: string;
  }[];
  config: {
    denominaciones: number[];
    moneda: string;
  };
}

export function plantillaGestion(): GestionDb {
  return {
    version: VERSION_DB,
    ultima_modificacion: "",
    meta: { nombreNegocio: "", recibidos: {}, exportados: {} },
    productos: [],
    puntos: [],
    ventasRecibidas: [],
    gastosRecibidos: [],
    recepcionesRecibidas: [],
    arqueosRecibidos: [],
    movimientosInventario: [],
    config: { denominaciones: [1000, 500, 200, 100, 50, 20, 10, 5, 3, 1], moneda: "CUP" },
  };
}

// ---------- Paquetes de sincronización ----------

export type TipoPaquete =
  | "PRODUCTOS" // gestión -> dependiente: lista de precios/productos (sin existencias reales)
  | "VENTAS" // dependiente -> gestión: ventas, gastos, arqueos, recepciones, cierre
  | "INVENTARIO" // gestión -> dependiente: mercancía enviada a un punto
  | "INVENTARIO_RECIBIDO" // dependiente -> gestión: mercancía que llegó directo al punto
  | "CONFIG"; // ajustes de negocio

export interface Paquete {
  formato: string;
  paqueteId: string;
  folio: number; // folio global por origen (incrementa con cada paquete)
  tipo: TipoPaquete;
  origen: string; // id dispositivo/tienda que lo emite
  destino: string | "cualquiera"; // id del punto o "gestion"
  fecha: string; // ISO
  contendido: Record<string, unknown>;
  resumen?: string;
}

export interface ResultadoAplicar {
  aplicado: boolean; // false = ya se conocía el paquete
  motivo?: string;
  nuevosVentas?: number;
  nuevosGastos?: number;
  productosActualizados?: number;
}