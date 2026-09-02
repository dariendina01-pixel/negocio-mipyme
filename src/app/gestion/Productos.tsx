// =============================================================
// Productos.tsx — Catálogo general e inventario de la gestión
// =============================================================
import React, { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Campo, Aviso, SinDatos, TecladoNumerico, PantallaConTeclado } from "../../ui/components";
import { fmtMoneda, aCentavos } from "../../core/money";
import { nuevoProducto, productoTieneEntrada } from "../../core/operations";
import type { ProductoGestion, TipoEntrada } from "../../core/types";

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
                      Bodega: {item.inventario["bodega"] ?? 0} u
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
                  {Object.entries(item.inventario)
                    .filter(([k, v]) => k !== "bodega" && v > 0)
                    .map(([k, v]) => (
                      <Text key={k} style={{ color: colores.textoSuave, fontSize: 13 }}>
                        {k}: {v} u
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

function EditorProducto(props: {
  producto: ProductoGestion;
  esNuevo: boolean;
  onGuardar: (p: ProductoGestion) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(props.producto.nombre);
  const [codigo, setCodigo] = useState(props.producto.codigo);
  const [categoria, setCategoria] = useState(props.producto.categoria ?? "");
  const [tipoEntrada, setTipoEntrada] = useState<TipoEntrada | "">(props.producto.tipoEntrada ?? "");
  const [costo, setCosto] = useState(props.producto.costoPromedioCents ? String(props.producto.costoPromedioCents) : "");
  const [cantidadEntrada, setCantidadEntrada] = useState("");
  const [precio, setPrecio] = useState(props.producto.precioCents ? String(props.producto.precioCents) : "");
  const [bodega, setBodega] = useState(String(props.producto.inventario["bodega"] ?? 0));
  const [error, setError] = useState("");

  const tieneEntradaPrevia = productoTieneEntrada(props.producto);
  const bodegaInicial = props.producto.inventario["bodega"] ?? 0;

  const hayEntradaNueva = !!tipoEntrada && cantidadEntrada.trim() !== "" && parseInt(cantidadEntrada, 10) > 0;

  const guardar = () => {
    if (!nombre.trim()) return setError("El nombre es obligatorio.");
    if (tipoEntrada && costo.trim() === "") return setError("Si registras una entrada, pon el costo unitario.");

    const nuevaBodega = hayEntradaNueva
      ? bodegaInicial + (parseInt(cantidadEntrada, 10) || 0)
      : bodegaInicial;
    const costoNumerico = costo ? aCentavos(costo) : undefined;

    // Un producto con entrada nueva actualiza el costo promedio.
    const costoFinal = hayEntradaNueva
      ? costoNumerico
      : props.producto.costoPromedioCents;

    const p: ProductoGestion = {
      ...props.producto,
      nombre: nombre.trim(),
      codigo: codigo.trim() || "S/C",
      categoria: categoria.trim(),
      precioCents: tieneEntradaPrevia || hayEntradaNueva ? aCentavos(precio) : 0,
      costoPromedioCents: costoFinal,
      tipoEntrada: hayEntradaNueva || props.producto.tipoEntrada ? (tipoEntrada as TipoEntrada) || props.producto.tipoEntrada : undefined,
      activo: props.producto.activo,
      updatedAt: new Date().toISOString(),
      inventario: { ...props.producto.inventario, bodega: nuevaBodega },
    };
    if (props.esNuevo) p.id = props.producto.id || "P-" + Date.now().toString(36);
    props.onGuardar(p);
  };

  const precioBloqueado = !tieneEntradaPrevia && !hayEntradaNueva;

  return (
    <PantallaConTeclado>
      <Tarjeta>
        <Text style={estilos.titulo}>{props.esNuevo ? "Nuevo producto" : "Editar producto"}</Text>
        {error ? <Aviso texto={error} tipo="error" /> : null}
        <Campo etiqueta="Nombre" valor={nombre} onChange={setNombre} />
        <Campo etiqueta="Código" valor={codigo} onChange={setCodigo} />
        <Campo etiqueta="Categoría" valor={categoria} onChange={setCategoria} />

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
              etiqueta={`Cantidad por ${TIPOS_ENTRADA.find((x) => x.valor === tipoEntrada)?.etiqueta?.toLowerCase() ?? "entrada"}`}
              valor={cantidadEntrada}
              onChange={(t) => setCantidadEntrada(t.replace(/[^\d]/g, ""))}
              teclado="numeric"
              placeholder="0"
            />
          </>
        ) : null}

        <Text style={estilos.etiqueta}>Precio de venta</Text>
        {precioBloqueado ? (
          <Aviso texto="Registra una entrada de mercancía (compra, beneficiario o consignación) para habilitar el precio de venta." />
        ) : (
          <>
            <Text style={estilos.montoGrande}>{fmtMoneda(aCentavos(precio))}</Text>
            <TecladoNumerico valor={precio} onCambiar={(t) => setPrecio(t)} />
          </>
        )}

        <Text style={estilos.etiqueta}>Existencias en bodega</Text>
        <Text style={estilos.subtitulo}>{bodegaInicial} u actualmente</Text>

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
