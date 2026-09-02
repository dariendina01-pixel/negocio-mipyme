// =============================================================
// Productos.tsx — Catálogo general e inventario de la gestión
// =============================================================
import React, { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Campo, Aviso, SinDatos, PantallaConTeclado } from "../../ui/components";
import { fmtMoneda, aCentavos, fmt } from "../../core/money";
import { nuevoProducto, productoTieneEntrada } from "../../core/operations";
import type { ProductoGestion, TipoEntrada, UnidadMedida } from "../../core/types";
import { UNIDADES_MEDIDA } from "../../core/types";

const TIPOS_ENTRADA: { valor: TipoEntrada; etiqueta: string }[] = [
  { valor: "compra", etiqueta: "Compra" },
  { valor: "beneficiario", etiqueta: "Beneficiario" },
  { valor: "consignacion", etiqueta: "Consignación" },
];

export function ProductosGestion() {
  const { gestDb: db, mutarGest } = useApp();
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<ProductoGestion | "nuevo" | null>(null);

  const productos = db.productos.filter(
    (p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (editando) {
    return (
      <EditorProducto
        producto={editando === "nuevo" ? nuevoProducto() : editando}
        esNuevo={editando === "nuevo"}
        onGuardar={(p) => {
          mutarGest((d) => {
            const idx = d.productos.findIndex((x) => x.id === p.id);
            if (idx >= 0) d.productos[idx] = p;
            else d.productos.push(p);
          });
          setEditando(null);
        }}
        onCancelar={() => setEditando(null)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={estilos.contenido}>
        <View style={{ marginBottom: 10 }}>
          <Campo etiqueta="Buscar" valor={busqueda} onChange={setBusqueda} placeholder="Nombre o código…" />
          <Boton texto="+ Nuevo producto" onPress={() => setEditando("nuevo")} />
        </View>
        <FlatList
          data={productos}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={<SinDatos texto="No hay productos registrados." />}
          renderItem={({ item }) => {
            const tieneEntrada = productoTieneEntrada(item);
            return (
              <Pressable onPress={() => setEditando(item)}>
                <Tarjeta>
                  <View style={[estilos.fila, { alignItems: "flex-start" }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.titulo}>{item.nombre}</Text>
                      <Text style={estilos.subtitulo}>Código {item.codigo} · {item.categoria || "sin categoría"}</Text>
                    </View>
                    {item.precioCents > 0 ? (
                      <Text style={[estilos.monto, { fontSize: 18 }]}>{fmtMoneda(item.precioCents)}</Text>
                    ) : (
                      <Text style={[estilos.subtitulo, { fontSize: 13 }]}>sin precio</Text>
                    )}
                  </View>
                  <View style={[estilos.fila, { marginTop: 10 }]}>
                    <Text style={estilos.etiqueta}>Existencias</Text>
                    <Text style={{ fontWeight: "700" }}>
                      Bodega: {item.inventario["bodega"] ?? 0} {etiquetaUnidad(item.unidadMedida)}
                    </Text>
                  </View>
                  <View style={[estilos.fila, { marginTop: 4 }]}>
                    <Text style={estilos.etiqueta}>Entrada</Text>
                    <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                      {tieneEntrada
                        ? TIPOS_ENTRADA.find((t) => t.valor === item.tipoEntrada)?.etiqueta ?? item.tipoEntrada
                        : "Pendiente"}
                    </Text>
                  </View>
                  <View style={[estilos.fila, { marginTop: 4 }]}>
                    <Text style={estilos.etiqueta}>Unidad</Text>
                    <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{etiquetaUnidad(item.unidadMedida)}</Text>
                  </View>
                  {Object.entries(item.inventario)
                    .filter(([k, v]) => k !== "bodega" && v > 0)
                    .map(([k, v]) => (
                      <Text key={k} style={{ color: colores.textoSuave, fontSize: 13 }}>
                        {k}: {v} {etiquetaUnidad(item.unidadMedida)}
                      </Text>
                    ))}
                </Tarjeta>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

function etiquetaUnidad(u?: UnidadMedida): string {
  return UNIDADES_MEDIDA.find((x) => x.valor === u)?.etiqueta ?? "Unidad";
}

function EditorProducto(props: {
  producto: ProductoGestion;
  esNuevo: boolean;
  onGuardar: (p: ProductoGestion) => void;
  onCancelar: () => void;
}) {
  const { gestDb: db } = useApp();
  const [nombre, setNombre] = useState(props.producto.nombre);
  const [codigo, setCodigo] = useState(props.producto.codigo);
  const [categoria, setCategoria] = useState(props.producto.categoria ?? "");
  const [unidad, setUnidad] = useState<UnidadMedida>(props.producto.unidadMedida ?? "unidad");
  const [tipoEntrada, setTipoEntrada] = useState<TipoEntrada | "">(props.producto.tipoEntrada ?? "");
  const [costo, setCosto] = useState(props.producto.costoPromedioCents ? String(props.producto.costoPromedioCents) : "");
  const [cantidadEntrada, setCantidadEntrada] = useState("");
  // Distribución de la entrada nueva: clave destino -> unidades
  const [distribucion, setDistribucion] = useState<Record<string, string>>({});
  const [precio, setPrecio] = useState(
    props.producto.precioCents ? fmt(props.producto.precioCents) : ""
  );
  const [error, setError] = useState("");

  const tieneEntradaPrevia = productoTieneEntrada(props.producto);
  const bodegaInicial = props.producto.inventario["bodega"] ?? 0;

  const totalEntrada = cantidadEntradaNueva(cantidadEntrada);
  const destinos = [...db.puntos.map((p) => p.id), "bodega"];
  const hayDistribucion = Object.values(distribucion).some((v) => parseInt(v, 10) > 0);
  const puntos = db.puntos;

  function cantidadEntradaNueva(c: string): number {
    if (!tipoEntrada) return 0;
    const n = parseInt(c.trim(), 10);
    return isNaN(n) || n <= 0 ? 0 : n;
  }

  const guardar = () => {
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (tipoEntrada && costo.trim() === "") return setError("Si registras una entrada, pon el costo unitario.");

    const costoNumerico = costo ? aCentavos(costo) : undefined;
    const costoFinal = totalEntrada > 0 ? costoNumerico : props.producto.costoPromedioCents;

    // Construye el inventario con la distribución nueva aplicada
    const inventario: Record<string, number> = { ...props.producto.inventario };
    if (totalEntrada > 0) {
      if (hayDistribucion) {
        for (const destino of destinos) {
          const n = parseInt(distribucion[destino] ?? "0", 10) || 0;
          if (n > 0) inventario[destino] = (inventario[destino] ?? 0) + n;
        }
      } else {
        // Sin distribución: si hay puntos, va al primero (por defecto); si no, a bodega
        const destinoDefecto = puntos[0]?.id ?? "bodega";
        inventario[destinoDefecto] = (inventario[destinoDefecto] ?? 0) + totalEntrada;
      }
    }

    const p: ProductoGestion = {
      ...props.producto,
      nombre: nombre.trim(),
      codigo: codigo.trim() || "S/C",
      categoria: categoria.trim(),
      unidadMedida: unidad,
      precioCents: tieneEntradaPrevia || totalEntrada > 0 ? aCentavos(precio) : 0,
      costoPromedioCents: costoFinal,
      tipoEntrada: totalEntrada > 0 || props.producto.tipoEntrada ? (tipoEntrada as TipoEntrada) || props.producto.tipoEntrada : undefined,
      activo: props.producto.activo,
      updatedAt: new Date().toISOString(),
      inventario,
    };
    if (props.esNuevo) p.id = props.producto.id || "P-" + Date.now().toString(36);
    props.onGuardar(p);
  };

  const precioBloqueado = !tieneEntradaPrevia && totalEntrada <= 0;

  return (
    <PantallaConTeclado>
      <Tarjeta>
        <Text style={estilos.titulo}>{props.esNuevo ? "Nuevo producto" : "Editar producto"}</Text>
        {error ? <Aviso texto={error} tipo="error" /> : null}
        <Campo etiqueta="Nombre" valor={nombre} onChange={setNombre} />
        <Campo etiqueta="Código" valor={codigo} onChange={setCodigo} />
        <Campo etiqueta="Categoría" valor={categoria} onChange={setCategoria} />

        <Text style={estilos.etiqueta}>Unidad de medida</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {UNIDADES_MEDIDA.map((u) => {
            const activo = unidad === u.valor;
            return (
              <Boton
                key={u.valor}
                texto={u.etiqueta}
                variante={activo ? "primario" : "secundario"}
                onPress={() => setUnidad(u.valor)}
              />
            );
          })}
        </View>

        <Text style={estilos.etiqueta}>Entrada de mercancía</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {TIPOS_ENTRADA.map((t) => {
            const activo = tipoEntrada === t.valor;
            return (
              <Boton
                key={t.valor}
                texto={t.etiqueta}
                variante={activo ? "primario" : "secundario"}
                onPress={() => setTipoEntrada(activo ? "" : t.valor)}
              />
            );
          })}
        </View>
        {tipoEntrada ? (
          <>
            <Campo etiqueta="Costo unitario" valor={costo} onChange={setCosto} teclado="numeric" />
            <Campo
              etiqueta={`Cantidad por ${TIPOS_ENTRADA.find((x) => x.valor === tipoEntrada)?.etiqueta?.toLowerCase() ?? "entrada"} (${etiquetaUnidad(unidad)})`}
              valor={cantidadEntrada}
              onChange={(t) => setCantidadEntrada(t.replace(/[^\d]/g, ""))}
              teclado="numeric"
              placeholder="0"
            />
            {pointsExisten(puntos) ? (
              <>
                <Text style={estilos.etiqueta}>Repartir la entrada</Text>
                <Text style={estilos.subtitulo}>
                  Si lo dejas vacío, va al primer punto (o bodega si no hay puntos).
                </Text>
                {destinos.map((dest) => (
                  <View key={dest} style={[estilos.fila, { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colores.borde }]}>
                    <Text style={{ flex: 1, fontWeight: "600" }}>{nombreDestino(dest, puntos)}</Text>
                    <TextInput
                      keyboardType="number-pad"
                      placeholder="0"
                      style={[s.inputReparto, { width: 90, textAlign: "right" }]}
                      value={distribucion[dest] ?? ""}
                      onChangeText={(t) => setDistribucion((prev) => ({ ...prev, [dest]: t.replace(/[^\d]/g, "") }))}
                    />
                  </View>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        <Text style={estilos.etiqueta}>Precio de venta</Text>
        {precioBloqueado ? (
          <Aviso texto="Registra una entrada de mercancía (compra, beneficiario o consignación) para habilitar el precio de venta." />
        ) : (
          <>
            <Campo
              etiqueta="Precio de venta (en pesos)"
              valor={precio}
              onChange={setPrecio}
              teclado="decimal-pad"
              placeholder="Ej: 1500 o 1234,50"
            />
            <Text style={estilos.montoGrande}>{fmtMoneda(aCentavos(precio))}</Text>
          </>
        )}

        <Text style={estilos.etiqueta}>Existencias en bodega</Text>
        <Text style={estilos.subtitulo}>{bodegaInicial} {etiquetaUnidad(unidad)} actualmente</Text>

        <View style={[estilos.fila, { gap: 10 }]}>
          <View style={{ flex: 1 }}>
            <Boton texto="Cancelar" variante="secundario" onPress={props.onCancelar} />
          </View>
          <View style={{ flex: 2 }}>
            <Boton texto="Guardar" onPress={guardar} grande />
          </View>
        </View>
      </Tarjeta>
    </PantallaConTeclado>
  );
}

function pointsExisten(puntos: unknown[]): boolean {
  return puntos.length > 0;
}

function nombreDestino(dest: string, puntos: { id: string; nombre: string }[]): string {
  if (dest === "bodega") return "Bodega (central)";
  return puntos.find((p) => p.id === dest)?.nombre ?? dest;
}

const s = {
  inputReparto: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    backgroundColor: colores.blanco,
  },
} as const;
