// =============================================================
// Ajustes.tsx (gestión) — Ajustes de inventario + historial inmutable
// =============================================================
import React, { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Aviso, SinDatos, Campo } from "../../ui/components";
import { registrarAjusteInventario } from "../../core/operations";
import { fmtMoneda } from "../../core/money";
import type { TipoAjusteInventario } from "../../core/operations";

type Seccion = "porPunto" | "ajustar" | "historial";

const TIPOS_AJUSTE: { valor: TipoAjusteInventario; etiqueta: string }[] = [
  { valor: "faltante", etiqueta: "Faltante" },
  { valor: "sobrante", etiqueta: "Sobrante" },
  { valor: "deterioro", etiqueta: "Deterioro" },
];

export function AjustesGestion() {
  const [seccion, setSeccion] = useState<Seccion>("porPunto");
  return (
    <View style={estilos.contenido}>
      <View style={[s.pestanas, { marginBottom: 12 }]}>
        {([
          ["porPunto", "Por punto"],
          ["ajustar", "Ajustar"],
          ["historial", "Historial"],
        ] as [Seccion, string][]).map(([c, txt]) => (
          <Pressable
            key={c}
            onPress={() => setSeccion(c)}
            style={[s.pestana, seccion === c && { backgroundColor: colores.primario }]}
          >
            <Text style={[s.pestanaTexto, seccion === c && { color: colores.blanco }]}>{txt}</Text>
          </Pressable>
        ))}
      </View>
      {seccion === "porPunto" && <InventarioPorPunto />}
      {seccion === "ajustar" && <AjustarInventario />}
      {seccion === "historial" && <HistorialInventario />}
    </View>
  );
}

function InventarioPorPunto() {
  const { gestDb: db } = useApp();
  const ubicaciones: { id: string; nombre: string }[] = [
    { id: "bodega", nombre: "Bodega (central)" },
    ...db.puntos.map((p) => ({ id: p.id, nombre: p.nombre })),
  ];
  return (
    <FlatList
      data={ubicaciones}
      keyExtractor={(u) => u.id}
      ListEmptyComponent={<SinDatos texto="Sin ubicaciones." />}
      renderItem={({ item }) => {
        const productosExistentes = db.productos.filter((p) => (p.inventario[item.id] ?? 0) > 0)
          .sort((a, b) => (b.inventario[item.id] ?? 0) - (a.inventario[item.id] ?? 0));
        const totalUnidades = productosExistentes.reduce((s, p) => s + (p.inventario[item.id] ?? 0), 0);
        return (
          <Tarjeta>
            <View style={[estilos.fila, { marginBottom: 6 }]}>
              <Text style={estilos.titulo}>{item.nombre}</Text>
              <Text style={estilos.subtitulo}>{totalUnidades} uds</Text>
            </View>
            {productosExistentes.length === 0 ? (
              <Text style={estilos.subtitulo}>Sin existencias.</Text>
            ) : (
              productosExistentes.map((p) => (
                <View key={p.id} style={[estilos.fila, { paddingVertical: 5, borderTopWidth: 1, borderTopColor: colores.borde }]}>
                  <Text style={{ flex: 1 }} numberOfLines={1}>{p.nombre}</Text>
                  <Text style={{ fontWeight: "700" }}>{p.inventario[item.id] ?? 0} {etiquetaUnidad(p.unidadMedida)}</Text>
                </View>
              ))
            )}
          </Tarjeta>
        );
      }}
    />
  );
}

function etiquetaUnidad(u?: string): string {
  return u === "kg" ? "kg" : u === "l" ? "L" : "uds";
}

function AjustarInventario() {
  const { gestDb: db, mutarGest } = useApp();
  const [productoId, setProductoId] = useState("");
  const [ubicacion, setUbicacion] = useState("bodega");
  const [tipo, setTipo] = useState<TipoAjusteInventario>("faltante");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const productos = db.productos;
  const seleccionado = db.productos.find((p) => p.id === productoId);
  const ubicaciones = [
    { id: "bodega", nombre: "Bodega (central)" },
    ...db.puntos.map((p) => ({ id: p.id, nombre: p.nombre })),
  ];

  const registrar = () => {
    if (!seleccionado) return setError("Elige el producto.");
    const cant = parseInt(cantidad.trim(), 10) || 0;
    if (cant <= 0) return setError("Indica la cantidad (mayor que 0).");
    mutarGest((d) =>
      registrarAjusteInventario({
        gestion: d,
        productoId: seleccionado.id,
        ubicacion,
        tipo,
        cantidad: cant,
        motivo: motivo.trim() || undefined,
      })
    );
    setCantidad("");
    setMotivo("");
    setProductoId("");
    setError("");
  };

  return (
    <>
      {error ? <Aviso texto={error} tipo="error" /> : null}
      <Aviso texto="Corrige las existencias reales: sobrante suma, faltante y deterioro restan. Queda registrado en el historial." />

      <Tarjeta>
        <Text style={estilos.etiqueta}>Producto</Text>
        <FlatList
          data={productos}
          keyExtractor={(p) => p.id}
          style={{ maxHeight: 200, marginTop: 6 }}
          ListEmptyComponent={<SinDatos texto="Sin productos." />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setProductoId(item.id)}
              style={[estilos.fila, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colores.borde }]}
            >
              <Text style={{ flex: 1 }} numberOfLines={1}>{item.nombre}</Text>
              <Text style={{ color: colores.textoSuave }}>
                Bodega {item.inventario["bodega"] ?? 0}
              </Text>
              <View
                style={{
                  width: 14, height: 14, borderRadius: 7, borderWidth: 1, marginLeft: 8,
                  borderColor: colores.primario,
                  backgroundColor: productoId === item.id ? colores.primario : "transparent",
                }}
              />
            </Pressable>
          )}
        />

        <Text style={[estilos.etiqueta, { marginTop: 12 }]}>Ubicación</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {ubicaciones.map((u) => (
            <Boton
              key={u.id}
              texto={u.nombre.length > 12 ? u.nombre.slice(0, 11) + "…" : u.nombre}
              variante={ubicacion === u.id ? "primario" : "secundario"}
              onPress={() => setUbicacion(u.id)}
            />
          ))}
        </View>

        <Text style={estilos.etiqueta}>Tipo de ajuste</Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          {TIPOS_AJUSTE.map((t) => (
            <Boton
              key={t.valor}
              texto={t.etiqueta}
              variante={tipo === t.valor ? "primario" : "secundario"}
              onPress={() => setTipo(t.valor)}
            />
          ))}
        </View>

        <Text style={estilos.etiqueta}>Cantidad</Text>
        <TextInput
          keyboardType="number-pad"
          placeholder="0"
          style={[estilos.cajaInput, { textAlign: "right" }]}
          value={cantidad}
          onChangeText={(t) => setCantidad(t.replace(/[^\d]/g, ""))}
        />

        <Campo etiqueta="Motivo (opcional)" valor={motivo} onChange={setMotivo} />

        <View style={{ marginTop: 12 }}>
          <Boton texto="Registrar ajuste" onPress={registrar} grande />
        </View>
      </Tarjeta>
    </>
  );
}

function HistorialInventario() {
  const { gestDb: db } = useApp();
  const movimientos = [...db.movimientosInventario].reverse();
  const etiquetaTipo: Record<string, string> = {
    ENTRADA: "Entrada",
    SALIDA: "Salida",
    AJUSTE: "Ajuste",
    VENTA: "Venta",
    ENVIO: "Envío",
    DEVOLUCION: "Devolución",
  };
  return (
    <FlatList
      data={movimientos}
      keyExtractor={(m) => m.id}
      ListEmptyComponent={<SinDatos texto="Sin movimientos de inventario todavía." />}
      renderItem={({ item }) => {
        const punto = item.punto === "bodega" ? "Bodega" : db.puntos.find((p) => p.id === item.punto)?.nombre ?? item.punto;
        const esEntrada = item.cantidad > 0;
        const prod = db.productos.find((p) => p.id === item.productoId);
        return (
          <Tarjeta>
            <View style={[estilos.fila]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800" }}>{prod?.nombre ?? item.productoId}</Text>
                <Text style={estilos.subtitulo}>
                  {etiquetaTipo[item.tipo] ?? item.tipo} · {punto} · {item.fecha.slice(0, 16).replace("T", " ")}
                </Text>
              </View>
              <Text style={{ fontWeight: "800", color: esEntrada ? colores.ok : colores.peligro }}>
                {esEntrada ? "+" : ""}{item.cantidad}
              </Text>
            </View>
          </Tarjeta>
        );
      }}
    />
  );
}

function useAppStyle() {
  return { estilos };
}

const s = {
  pestanas: { flexDirection: "row", backgroundColor: colores.tarjeta, borderRadius: 10, borderWidth: 1, borderColor: colores.borde, padding: 3 },
  pestana: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  pestanaTexto: { fontSize: 14, fontWeight: "700", color: colores.textoSuave },
} as const;
