// =============================================================
// Resumen.tsx — Dashboard del dueño
// =============================================================
import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, SinDatos } from "../../ui/components";
import { fmtMoneda } from "../../core/money";
import { dashboardGestion } from "../../core/operations";

export function ResumenGestion() {
  const { gestDb: db } = useApp();
  const d = dashboardGestion(db);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={estilos.contenido}>
      <Tarjeta>
        <Text style={estilos.etiqueta}>Nombre del negocio</Text>
        <Text style={[estilos.titulo, { marginTop: 2 }]}>{db.meta.nombreNegocio || "Sin nombre configurado"}</Text>
      </Tarjeta>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <EtiquetaGrande etiqueta="Ventas totales" valor={fmtMoneda(d.ventasTotales)} />
        <EtiquetaGrande etiqueta="Unidades" valor={String(d.unidadesVendidas)} />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <EtiquetaGrande etiqueta="Ventas registradas" valor={String(d.numVentas)} />
        <EtiquetaGrande etiqueta="Gastos recibidos" valor={fmtMoneda(d.gastosTotales)} />
      </View>

      <Tarjeta>
        <Text style={estilos.titulo}>Por punto de venta</Text>
        {d.porPunto.length === 0 ? (
          <SinDatos texto="Todavía no has recibido ventas de ningún punto." />
        ) : (
          d.porPunto.map((p) => (
            <View key={p.punto} style={[estilos.fila, { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colores.borde }]}>
              <Text style={{ flex: 1 }}>{p.punto}</Text>
              <Text style={{ color: colores.textoSuave, marginRight: 10 }}>{p.numVentas} ventas</Text>
              <Text style={{ fontWeight: "800" }}>{fmtMoneda(p.ventas)}</Text>
            </View>
          ))
        )}
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Inventario general</Text>
        <View style={[estilos.fila, { paddingVertical: 7 }]}>
          <Text style={{ color: colores.textoSuave }}>Productos registrados</Text>
          <Text style={{ fontWeight: "800" }}>{d.totalProductos}</Text>
        </View>
        <View style={[estilos.fila, { paddingVertical: 7 }]}>
          <Text style={{ color: colores.textoSuave }}>Puntos de venta</Text>
          <Text style={{ fontWeight: "800" }}>{d.totalPuntos}</Text>
        </View>
        <View style={[estilos.fila, { paddingVertical: 7 }]}>
          <Text style={{ color: colores.textoSuave }}>Movimientos de inventario</Text>
          <Text style={{ fontWeight: "800" }}>{d.movimientosRecientes}</Text>
        </View>
      </Tarjeta>
    </ScrollView>
  );
}

function EtiquetaGrande({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Tarjeta estilo={{ flex: 1 }}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text style={[estilos.monto, { marginTop: 4, fontSize: 20 }]}>{valor}</Text>
    </Tarjeta>
  );
}