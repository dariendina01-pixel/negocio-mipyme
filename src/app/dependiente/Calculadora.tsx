// =============================================================
// Calculadora.tsx — 4 herramientas: cambio rápido, devolución,
// contador de dinero por denominaciones y desglose en billetes
// =============================================================
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, TecladoNumerico, EntradaDenominacion, Aviso } from "../../ui/components";
import { fmtMoneda } from "../../core/money";
import { desgloseCambio, totalConteo } from "../../core/denominations";

type Modo = "cambio" | "devolucion" | "contador" | "desglose";

export function Calculadora() {
  const { depDb: db } = useApp();
  const [modo, setModo] = useState<Modo>("cambio");
  const modos: { clave: Modo; etiqueta: string }[] = [
    { clave: "cambio", etiqueta: "Cambio" },
    { clave: "devolucion", etiqueta: "Devolución" },
    { clave: "contador", etiqueta: "Contar" },
    { clave: "desglose", etiqueta: "Billetes" },
  ];
  return (
    <View style={estilos.contenido}>
      <View style={[s.pestanas, { marginBottom: 12 }]}>
        {modos.map((m) => (
          <Pressable
            key={m.clave}
            onPress={() => setModo(m.clave)}
            style={[
              s.pestana,
              modo === m.clave && { backgroundColor: colores.primario },
            ]}
          >
            <Text style={[s.pestanaTexto, modo === m.clave && { color: colores.blanco }]}>{m.etiqueta}</Text>
          </Pressable>
        ))}
      </View>
      {modo === "cambio" && <HerramientaCambio />}
      {modo === "devolucion" && <HerramientaDevolucion />}
      {modo === "contador" && <HerramientaContador denom={db.config.denominaciones} />}
      {modo === "desglose" && <HerramientaDesglose denom={db.config.denominaciones} />}
    </View>
  );
}

// ---------- Cambio rápido ----------
function HerramientaCambio() {
  const [total, setTotal] = useState("0,00");
  const [recibido, setRecibido] = useState("0,00");
  const totalC = parseInt(total.replace(/[^\d]/g, "") || "0", 10);
  const recC = parseInt(recibido.replace(/[^\d]/g, "") || "0", 10);
  const cambio = Math.max(0, recC - totalC);
  const falta = Math.max(0, totalC - recC);
  return (
    <>
      <Tarjeta>
        <Text style={estilos.etiqueta}>Total de la venta</Text>
        <Text style={estilos.montoGrande}>{fmtMoneda(totalC)}</Text>
        <TecladoNumerico valor={total} onCambiar={setTotal} />
      </Tarjeta>
      <Tarjeta>
        <Text style={estilos.etiqueta}>Dinero recibido</Text>
        <Text style={estilos.montoGrande}>{fmtMoneda(recC)}</Text>
        <TecladoNumerico valor={recibido} onCambiar={setRecibido} />
      </Tarjeta>
      {falta > 0 ? (
        <Aviso texto={`Faltan ${fmtMoneda(falta)}`} tipo="error" />
      ) : (
        <Aviso texto={`Cambio a devolver: ${fmtMoneda(cambio)}`} tipo="ok" />
      )}
      <ResumenBilletes cambioC={cambio} denom={undefined} />
    </>
  );
}

// ---------- Devolución ----------
function HerramientaDevolucion() {
  const [compra, setCompra] = useState("0,00");
  const [porciento, setPorciento] = useState("0");
  const compraC = parseInt(compra.replace(/[^\d]/g, "") || "0", 10);
  const pct = Math.max(0, Math.min(100, parseFloat(porciento) || 0));
  const darC = Math.round((compraC * (100 - pct)) / 100);
  return (
    <Tarjeta>
      <Text style={estilos.etiqueta}>Monto de la compra a devolver</Text>
      <Text style={estilos.montoGrande}>{fmtMoneda(compraC)}</Text>
      <TecladoNumerico valor={compra} onCambiar={setCompra} />
      <View style={{ marginTop: 10 }}>
        <Text style={estilos.etiqueta}>Si la venta tuvo descuento (%)</Text>
        <Boton
          texto={porciento === "0" ? "Sin descuento" : `Descuento ${porciento}%`}
          variante="secundario"
          onPress={() => setPorciento(porciento === "0" ? "10" : "0")}
        />
      </View>
      <View style={[estilos.fila, { marginTop: 12 }]}>
        <Text style={estilos.titulo}>Dinero a devolver al cliente</Text>
        <Text style={estilos.montoGrande}>{fmtMoneda(darC)}</Text>
      </View>
    </Tarjeta>
  );
}

// ---------- Contador de dinero por denominaciones ----------
function HerramientaContador({ denom }: { denom: number[] }) {
  const [conteo, setConteo] = useState<Record<string, string>>({});
  const conteoNumerico: Record<string, number> = Object.fromEntries(
    Object.entries(conteo).map(([k, v]) => [k, Number(v) || 0])
  );
  const total = totalConteo(conteoNumerico);
  const cambiar = (d: number, t: string) => {
    setConteo((prev) => ({ ...prev, [String(d)]: t.replace(/[^\d]/g, "") }));
  };
  const limpiar = () => setConteo({});
  return (
    <Tarjeta>
      <View style={[estilos.fila, { marginBottom: 8 }]}>
        <Text style={estilos.titulo}>Contar dinero</Text>
        <Boton texto="Limpiar" variante="secundario" onPress={limpiar} />
      </View>
      <EntradaDenominacion denominaciones={denom} conteo={conteo} onCambiar={cambiar} />
      <View style={[estilos.fila, { marginTop: 12 }]}>
        <Text style={estilos.etiqueta}>Total contado</Text>
        <Text style={estilos.montoGrande}>{fmtMoneda(total)}</Text>
      </View>
    </Tarjeta>
  );
}

// ---------- Desglose de un monto en billetes ----------
function HerramientaDesglose({ denom }: { denom: number[] }) {
  const [monto, setMonto] = useState("0,00");
  const montoC = parseInt(monto.replace(/[^\d]/g, "") || "0", 10);
  return (
    <Tarjeta>
      <Text style={estilos.etiqueta}>Monto a desglosar</Text>
      <Text style={estilos.montoGrande}>{fmtMoneda(montoC)}</Text>
      <TecladoNumerico valor={monto} onCambiar={setMonto} />
      <ResumenBilletes cambioC={montoC} denom={denom} />
    </Tarjeta>
  );
}

function ResumenBilletes({ cambioC, denom }: { cambioC: number; denom?: number[] }) {
  if (cambioC <= 0) return null;
  const desglose = desgloseCambio(cambioC, denom ?? [1000, 500, 200, 100, 50, 20, 10, 5, 3, 1]);
  if (desglose.length === 0) return null;
  return (
    <Tarjeta>
      <Text style={estilos.etiqueta}>En billetes</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {desglose.map((d) => (
          <View key={d.unidad} style={s.chip}>
            <Text style={s.chipTexto}>{d.piezas}× {d.unidad}</Text>
          </View>
        ))}
      </View>
    </Tarjeta>
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
  pestana: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
  },
  pestanaTexto: { fontSize: 14, fontWeight: "700", color: colores.textoSuave },
  chip: {
    backgroundColor: colores.primarioClaro,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTexto: { color: colores.primario, fontWeight: "700" },
} as const;