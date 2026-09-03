// =============================================================
// Devoluciones.tsx — Registrar devoluciones de productos vendidos
// =============================================================
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Campo, Aviso, SinDatos } from "../../ui/components";
import { fmtMoneda } from "../../core/money";
import { registrarDevolucion, diaCerrado } from "../../core/operations";
import { hoyLocal } from "../../core/folio";

export function PantallaDevoluciones() {
  const { depDb: db, mutarDep } = useApp();
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const productos = db.productos.filter((p) => p.activo);
  const seleccionado = db.productos.find((p) => p.id === productoId);
  const dia = hoyLocal();
  const devolsDelDia = db.devoluciones.filter((d) => d.fecha.slice(0, 10) === dia);
  const totalDevuelto = devolsDelDia.reduce((a, d) => a + d.montoCents, 0);

  const registrar = () => {
    if (diaCerrado(db, hoyLocal())) return setError("El día de hoy ya está cerrado y entregado.");
    if (!seleccionado) return setError("Elige el producto que se devuelve.");
    const cant = parseInt(cantidad.trim(), 10) || 0;
    if (cant <= 0) return setError("Indica la cantidad devuelta (mayor que 0).");
    mutarDep((d) =>
      registrarDevolucion(d, {
        punto: d.meta.punto || d.meta.puntoNombre || d.meta.dispositivo,
        productoId: seleccionado.id,
        nombre: seleccionado.nombre,
        cantidad: cant,
        precioCents: seleccionado.precioCents,
        motivo: motivo.trim() || undefined,
      })
    );
    setProductoId("");
    setCantidad("");
    setMotivo("");
    setError("");
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Aviso texto="La mercancía devuelta vuelve al inventario del punto y se resta del total vendido del día." />
      {error ? <Aviso texto={error} tipo="error" /> : null}

      <Tarjeta>
        <Text style={estilos.etiqueta}>Producto a devolver</Text>
        {productos.length === 0 ? (
          <SinDatos texto="Sin productos. Importa la base en Sincronizar." />
        ) : (
          productos.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setProductoId(item.id)}
              style={[estilos.fila, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colores.borde }]}
            >
              <Text style={{ flex: 1 }} numberOfLines={1}>
                {item.nombre}
              </Text>
              <Text style={{ fontWeight: "700" }}>{fmtMoneda(item.precioCents)}</Text>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  borderWidth: 1,
                  marginLeft: 8,
                  borderColor: colores.primario,
                  backgroundColor: productoId === item.id ? colores.primario : "transparent",
                }}
              />
            </Pressable>
          ))
        )}
        {seleccionado ? (
          <Text style={[estilos.etiqueta, { marginTop: 8 }]}>
            Seleccionado: {seleccionado.nombre} · Stock {seleccionado.stock}
          </Text>
        ) : null}

        <Text style={[estilos.etiqueta, { marginTop: 12 }]}>Cantidad devuelta</Text>
        <TextInput
          keyboardType="number-pad"
          placeholder="0"
          style={[estilos.cajaInput, { textAlign: "right" }]}
          value={cantidad}
          onChangeText={(t) => setCantidad(t.replace(/[^\d]/g, ""))}
        />

        <Campo etiqueta="Motivo (opcional)" valor={motivo} onChange={setMotivo} placeholder="Ej: defecto, cabio de talla…" />
        <View style={{ marginTop: 10 }}>
          <Boton texto="Registrar devolución" onPress={registrar} grande />
        </View>
      </Tarjeta>

      <Tarjeta>
        <View style={[estilos.fila, { marginBottom: 6 }]}>
          <Text style={estilos.titulo}>Devoluciones de hoy</Text>
          <Text style={estilos.monto}>{fmtMoneda(totalDevuelto)}</Text>
        </View>
        {devolsDelDia.length === 0 ? (
          <SinDatos texto="Sin devoluciones registradas hoy." />
        ) : (
          devolsDelDia.map((d) => (
            <View
              key={d.id}
              style={[estilos.fila, { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colores.borde }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700" }}>{d.nombre}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {d.cantidad} u {d.motivo ? `· ${d.motivo}` : ""}
                </Text>
              </View>
              <Text style={{ fontWeight: "700", color: colores.peligro }}>{fmtMoneda(d.montoCents)}</Text>
            </View>
          ))
        )}
      </Tarjeta>
    </ScrollView>
  );
}
