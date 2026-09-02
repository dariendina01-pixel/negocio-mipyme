// =============================================================
// Dia.tsx — Gastos del día, mercancía recibida y resumen de caja
// =============================================================
import React, { useState } from "react";
import { View, Text, FlatList, Pressable, TextInput } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Campo, Aviso, SinDatos, TecladoNumerico, aFormato } from "../../ui/components";
import { fmtMoneda } from "../../core/money";
import { registrarGasto, registrarRecepcionDirecta, resumenDia, diaCerrado } from "../../core/operations";
import { hoyLocal } from "../../core/folio";

type Seccion = "gastos" | "mercancia" | "resumen";

export function PantallaDia() {
  const { depDb: db, mutarDep } = useApp();
  const [seccion, setSeccion] = useState<Seccion>("gastos");
  const dia = hoyLocal();
  const resumen = resumenDia(db, dia);

  return (
    <View style={estilos.contenido}>
      <View style={[s.pestanas, { marginBottom: 12 }]}>
        {([
          ["gastos", "Gastos"],
          ["mercancia", "Mercancía"],
          ["resumen", "Resumen"],
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

      {seccion === "gastos" && <GastosDelDia />}
      {seccion === "mercancia" && <MercanciaDelDia />}
      {seccion === "resumen" && <Resumen resumen={resumen} />}
    </View>
  );
}

function GastosDelDia() {
  const { depDb: db, mutarDep } = useApp();
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("0,00");
  const [error, setError] = useState("");
  const lista = db.gastos.filter((g) => g.fecha.slice(0, 10) === hoyLocal());

  const agregar = () => {
    const montoC = parseInt(monto.replace(/[^\d]/g, "") || "0", 10);
    if (!concepto.trim()) return setError("Escribe el concepto del gasto.");
    if (montoC <= 0) return setError("El monto debe ser mayor que 0.");
    if (diaCerrado(db, hoyLocal())) return setError("El día de hoy ya está cerrado y entregado.");
    mutarDep((d) =>
      registrarGasto(d, {
        punto: d.meta.punto || d.meta.puntoNombre || d.meta.dispositivo,
        concepto: concepto.trim(),
        montoCents: montoC,
      })
    );
    setConcepto("");
    setMonto("0,00");
    setError("");
  };

  const total = lista.reduce((a, g) => a + g.montoCents, 0);

  return (
    <>
      {error ? <Aviso texto={error} tipo="error" /> : null}
      <Tarjeta>
        <Campo etiqueta="Concepto del gasto" valor={concepto} onChange={setConcepto} placeholder="Ej: luz, transporte…" />
        <Text style={estilos.etiqueta}>Monto</Text>
        <Text style={estilos.montoGrande}>{fmtMoneda(parseInt(monto.replace(/[^\d]/g, "") || "0", 10))}</Text>
        <TecladoNumerico valor={monto} onCambiar={setMonto} />
        <View style={{ marginTop: 10 }}>
          <Boton texto="Anotar gasto" onPress={agregar} grande />
        </View>
      </Tarjeta>
      <Tarjeta>
        <View style={[estilos.fila, { marginBottom: 6 }]}>
          <Text style={estilos.titulo}>Gastos de hoy</Text>
          <Text style={estilos.monto}>{fmtMoneda(total)}</Text>
        </View>
        {lista.length === 0 ? (
          <SinDatos texto="Sin gastos anotados hoy." />
        ) : (
          lista.map((g) => (
            <View key={g.id} style={[estilos.fila, { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colores.borde }]}>
              <Text style={{ flex: 1 }}>{g.concepto}</Text>
              <Text style={{ fontWeight: "700" }}>{fmtMoneda(g.montoCents)}</Text>
            </View>
          ))
        )}
      </Tarjeta>
    </>
  );
}

function MercanciaDelDia() {
  const { depDb: db, mutarDep } = useApp();
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [origen, setOrigen] = useState("");
  const [error, setError] = useState("");
  const productos = db.productos.filter((p) => p.activo);

  const agregar = () => {
    const items = Object.entries(cantidades)
      .map(([productoId, txt]) => ({ productoId, cantidad: parseInt(txt, 10) || 0 }))
      .filter((i) => i.cantidad > 0);
    if (items.length === 0) return setError("Pon al menos una cantidad en algún producto.");
    if (!origen.trim()) return setError("Escribe de dónde llegó la mercancía (ej: proveedor, otro punto).");
    mutarDep((d) =>
      registrarRecepcionDirecta(d, {
        punto: d.meta.punto || d.meta.puntoNombre || d.meta.dispositivo,
        origen: origen.trim(),
        items,
      })
    );
    setCantidades({});
    setOrigen("");
    setError("");
  };

  return (
    <>
      <Aviso texto="Usa esto si el punto recibe mercancía durante el día (no enviada por la gestión). Quedará registrada para el dueño." />
      {error ? <Aviso texto={error} tipo="error" /> : null}
      <Tarjeta>
        <Campo etiqueta="Origen de la mercancía" valor={origen} onChange={setOrigen} placeholder="Proveedor / bodega / otro punto…" />
        <Text style={estilos.etiqueta}>Productos recibidos</Text>
        <FlatList
          data={productos}
          keyExtractor={(p) => p.id}
          style={{ marginTop: 6, maxHeight: 320 }}
          ListEmptyComponent={<SinDatos texto="Sin productos cargados. Importa la lista de precios en Sincronizar." />}
          renderItem={({ item }) => (
            <View style={[estilos.fila, { paddingVertical: 6 }]}>
              <Text style={{ flex: 1 }} numberOfLines={1}>
                {item.nombre}
              </Text>
              <TextInput
                keyboardType="number-pad"
                placeholder="0"
                style={[estilos.cajaInput, { width: 80, textAlign: "right" }]}
                value={cantidades[item.id] ?? ""}
                onChangeText={(t) => setCantidades((prev) => ({ ...prev, [item.id]: t.replace(/[^\d]/g, "") }))}
              />
            </View>
          )}
        />
      </Tarjeta>
      <Boton texto="Registrar recepción" onPress={agregar} grande />
    </>
  );
}

function Resumen({ resumen }: { resumen: ReturnType<typeof resumenDia> }) {
  return (
    <Tarjeta>
      <Text style={estilos.etiqueta}>Resumen del día {resumen.dia}</Text>
      <FilaResumen etiqueta="Ventas del día" valor={`${resumen.ventas} (${resumen.unidades} unidades)`} />
      <FilaResumen etiqueta="Total vendido" valor={fmtMoneda(resumen.totalVentasCents)} />
      <FilaResumen etiqueta="Gastos del día" valor={fmtMoneda(resumen.totalGastosCents)} />
      <FilaResumen etiqueta="Esperado en caja" valor={fmtMoneda(resumen.esperadoCajaCents)} />
      {resumen.detalleProductos.length > 0 ? (
        <>
          <View style={{ height: 1, backgroundColor: colores.borde, marginVertical: 8 }} />
          <Text style={estilos.etiqueta}>Por producto</Text>
          {resumen.detalleProductos.map((p) => (
            <FilaResumen key={p.producto} etiqueta={p.producto} valor={`${p.unidades} u = ${fmtMoneda(p.montoCents)}`} />
          ))}
        </>
      ) : null}
    </Tarjeta>
  );
}

function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={[estilos.fila, { paddingVertical: 6 }]}>
      <Text style={{ color: colores.textoSuave }}>{etiqueta}</Text>
      <Text style={{ fontWeight: "700" }}>{valor}</Text>
    </View>
  );
}

const s = {
  pestanas: {
    flexDirection: "row",
    backgroundColor: colores.tarjeta,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 3,
  },
  pestana: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  pestanaTexto: { fontSize: 14, fontWeight: "700", color: colores.textoSuave },
} as const;