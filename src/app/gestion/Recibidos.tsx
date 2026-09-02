// =============================================================
// Recibidos.tsx — Ventas, gastos y arqueos recibidos de los puntos
// =============================================================
import React, { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, SinDatos } from "../../ui/components";
import { fmtMoneda } from "../../core/money";

type Seccion = "ventas" | "gastos" | "arqueos";

export function RecibidosGestion() {
  const { gestDb: db } = useApp();
  const [seccion, setSeccion] = useState<Seccion>("ventas");

  const resumenPuntos = new Map<string, number>();
  for (const v of db.ventasRecibidas) {
    resumenPuntos.set(v.punto, (resumenPuntos.get(v.punto) ?? 0) + v.totalCents);
  }

  return (
    <View style={estilos.contenido}>
      <View style={[s.pestanas, { marginBottom: 12 }]}>
        {([
          ["ventas", "Ventas"],
          ["gastos", "Gastos"],
          ["arqueos", "Arqueos"],
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

      {seccion === "ventas" && <VentasRecibidas />}
      {seccion === "gastos" && <GastosRecibidos />}
      {seccion === "arqueos" && <ArqueosRecibidos />}
    </View>
  );
}

function VentasRecibidas() {
  const { gestDb: db } = useApp();
  const ordenadas = [...db.ventasRecibidas].reverse();
  return (
    <>
      <Tarjeta>
        <Text style={estilos.titulo}>Total recibido de ventas</Text>
        <Text style={estilos.montoGrande}>{fmtMoneda(db.ventasRecibidas.reduce((a, v) => a + v.totalCents, 0))}</Text>
        <Text style={estilos.subtitulo}>{db.ventasRecibidas.length} ventas registradas</Text>
      </Tarjeta>
      <FlatList
        data={ordenadas}
        keyExtractor={(v) => v.id}
        style={{ minHeight: 40 }}
        ListEmptyComponent={<SinDatos texto="Aún no recibes ventas. Importa el archivo en Sincronizar." />}
        renderItem={({ item }) => {
          const puntoNombre = db.puntos.find((p) => p.id === item.punto)?.nombre ?? item.punto;
          return (
            <Tarjeta>
              <View style={[estilos.fila]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800" }}>{puntoNombre}</Text>
                  <Text style={estilos.subtitulo}>{item.fecha.slice(0, 16).replace("T", " ")} · {item.items.reduce((a, i) => a + i.cantidad, 0)} unidades</Text>
                </View>
                <Text style={estilos.monto}>{fmtMoneda(item.totalCents)}</Text>
              </View>
              {item.items.map((linea) => (
                <View key={linea.productoId} style={s.linea}>
                  <Text style={{ flex: 1 }} numberOfLines={1}>{linea.nombre} × {linea.cantidad}</Text>
                  <Text style={{ color: colores.textoSuave }}>{fmtMoneda(Math.round(linea.precioCents * linea.cantidad))}</Text>
                </View>
              ))}
            </Tarjeta>
          );
        }}
      />
    </>
  );
}

function GastosRecibidos() {
  const { gestDb: db } = useApp();
  const total = db.gastosRecibidos.reduce((a, g) => a + g.montoCents, 0);
  return (
    <>
      <Tarjeta>
        <Text style={estilos.titulo}>Gastos recibidos</Text>
        <Text style={estilos.montoGrande}>{fmtMoneda(total)}</Text>
      </Tarjeta>
      <FlatList
        data={[...db.gastosRecibidos].reverse()}
        keyExtractor={(g) => g.id}
        ListEmptyComponent={<SinDatos texto="Sin gastos recibidos." />}
        renderItem={({ item }) => (
          <Tarjeta>
            <View style={[estilos.fila]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700" }}>{item.concepto}</Text>
                <Text style={estilos.subtitulo}>{item.fecha.slice(0, 10)} · {db.puntos.find((p) => p.id === item.punto)?.nombre ?? item.punto}</Text>
              </View>
              <Text style={{ fontWeight: "800" }}>{fmtMoneda(item.montoCents)}</Text>
            </View>
          </Tarjeta>
        )}
      />
    </>
  );
}

function ArqueosRecibidos() {
  const { gestDb: db } = useApp();
  return (
    <FlatList
      data={[...db.arqueosRecibidos].reverse()}
      keyExtractor={(a) => a.id}
      ListEmptyComponent={<SinDatos texto="Sin arqueos recibidos todavía." />}
      renderItem={({ item }) => (
        <Tarjeta>
          <View style={[estilos.fila]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700" }}>{db.puntos.find((p) => p.id === item.punto)?.nombre ?? item.punto}</Text>
              <Text style={estilos.subtitulo}>{item.fecha.slice(0, 16).replace("T", " ")}</Text>
            </View>
            <Text style={estilos.monto}>{fmtMoneda(item.totalCents)}</Text>
          </View>
          {item.nota ? <Text style={{ marginTop: 6, color: colores.textoSuave }}>{item.nota}</Text> : null}
        </Tarjeta>
      )}
    />
  );
}

const s = {
  pestanas: { flexDirection: "row", backgroundColor: colores.tarjeta, borderRadius: 10, borderWidth: 1, borderColor: colores.borde, padding: 3 },
  pestana: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  pestanaTexto: { fontSize: 14, fontWeight: "700", color: colores.textoSuave },
  linea: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 8 },
} as const;