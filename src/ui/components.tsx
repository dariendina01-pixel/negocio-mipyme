// =============================================================
// components.tsx — Componentes UI reutilizables
// =============================================================
import React, { useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { colores, estilos } from "./theme";

// ---------- Botón ----------
export function Boton(props: {
  texto: string;
  onPress: () => void;
  variante?: "primario" | "secundario" | "peligro" | "acento";
  grande?: boolean;
  deshabilitado?: boolean;
}) {
  const { variante = "primario", grande = false, deshabilitado = false } = props;
  const coloresBoton: Record<string, { bg: string; tx: string }> = {
    primario: { bg: colores.primario, tx: colores.blanco },
    secundario: { bg: colores.primarioClaro, tx: colores.primario },
    peligro: { bg: colores.peligro, tx: colores.blanco },
    acento: { bg: colores.acento, tx: colores.negro },
  };
  const c = coloresBoton[variante] ?? coloresBoton.primario;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        s.boton,
        { backgroundColor: c.bg },
        grande && s.botonGrande,
        deshabilitado && { opacity: 0.45 },
        pressed && !deshabilitado && { opacity: 0.85 },
      ]}
    >
      <Text style={[s.botonTexto, { color: c.tx }]}>{props.texto}</Text>
    </Pressable>
  );
}

// ---------- Tarjeta ----------
export function Tarjeta(props: { children: React.ReactNode; estilo?: object }) {
  return <View style={[estilos.tarjeta, props.estilo]}>{props.children}</View>;
}

// ---------- Encabezado ----------
export function Encabezado(props: { titulo: string; subtitulo?: string; derecho?: React.ReactNode }) {
  return (
    <View style={estilos.encabezado}>
      <View style={[estilos.fila, { alignItems: "flex-start" }]}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.tituloEncabezado}>{props.titulo}</Text>
          {props.subtitulo ? <Text style={estilos.subtituloEncabezado}>{props.subtitulo}</Text> : null}
        </View>
        {props.derecho}
      </View>
    </View>
  );
}

// ---------- Campo de texto ----------
export function Campo(props: {
  etiqueta: string;
  valor: string;
  onChange: (t: string) => void;
  teclado?: "default" | "numeric" | "decimal-pad" | "phone-pad";
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.etiquetaCampo}>{props.etiqueta}</Text>
      <TextInput
        value={props.valor}
        onChangeText={props.onChange}
        keyboardType={props.teclado ?? "default"}
        placeholder={props.placeholder}
        multiline={props.multiline}
        autoFocus={props.autoFocus}
        style={[estilos.cajaInput, props.multiline && { minHeight: 64, textAlignVertical: "top" }]}
      />
    </View>
  );
}

// ---------- Conteo de denominación (entrada de piezas) ----------
export function EntradaDenominacion(props: {
  denominaciones: number[];
  conteo: Record<string, string>;
  onCambiar: (denom: number, texto: string) => void;
}) {
  return (
    <View>
      {props.denominaciones.map((d) => (
        <View key={d} style={[estilos.fila, { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colores.borde }]}>
          <Text style={{ fontSize: 16, fontWeight: "700", flex: 1 }}>{String(d)}</Text>
          <TextInput
            style={[s.denominacionInput]}
            keyboardType="number-pad"
            value={props.conteo[String(d)] ?? ""}
            onChangeText={(t) => props.onCambiar(d, t)}
            placeholder="0"
          />
        </View>
      ))}
    </View>
  );
}

// ---------- Teclado numérico (para cobro rápido) ----------
const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

export function TecladoNumerico(props: { valor: string; onCambiar: (v: string) => void }) {
  const pulsar = (t: string) => {
    if (t === "C") return props.onCambiar("0,00");
    if (t === "⌫") {
      const v = props.valor.replace(/[^\d]/g, "");
      const nv = v.length > 1 ? v.slice(0, -1) : "";
      return props.onCambiar(nv ? aFormato(nv) : "0,00");
    }
    const sinSimbolos = props.valor.replace(/[^\d]/g, "");
    const nuevo = sinSimbolos === "0" || sinSimbolos === "" ? t : sinSimbolos + t;
    props.onCambiar(aFormato(nuevo));
  };
  return (
    <View style={s.teclado}>
      {TECLAS.map((t) => (
        <Pressable
          key={t}
          onPress={() => pulsar(t)}
          style={({ pressed }) => [s.tecla, pressed && { backgroundColor: colores.primarioClaro }]}
        >
          <Text style={s.teclaTexto}>{t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** "1500" -> "15,00"; "150050" -> "1.500,50" */
export function aFormato(digitos: string): string {
  const n = parseInt(digitos || "0", 10);
  const cent = Math.abs(n) % 100;
  const ent = Math.floor(Math.abs(n) / 100);
  const entero = ent.toLocaleString("es-CU").replace(/\s/g, ".");
  return `${n < 0 ? "-" : ""}${entero},${cent < 10 ? "0" + cent : cent}`;
}

// ---------- Pantalla con teclado y scroll ----------
export function PantallaConTeclado(props: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.contenido}>
        {props.children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---------- Cargando / vacío ----------
export function IndicadorCarga() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
      <ActivityIndicator size="large" color={colores.primario} />
    </View>
  );
}

export function SinDatos(props: { texto: string }) {
  return (
    <View style={{ alignItems: "center", padding: 24 }}>
      <Text style={{ color: colores.textoSuave }}>{props.texto}</Text>
    </View>
  );
}

export function Aviso(props: { texto: string; tipo?: "ok" | "error" }) {
  const bg = props.tipo === "error" ? "#FDECEA" : "#E7F6EC";
  const tx = props.tipo === "error" ? colores.peligro : colores.ok;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, padding: 10, marginBottom: 10 }}>
      <Text style={{ color: tx, fontWeight: "600" }}>{props.texto}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  boton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  botonGrande: { paddingVertical: 18 },
  botonTexto: { fontSize: 16, fontWeight: "700" },
  etiquetaCampo: {
    fontSize: 12,
    fontWeight: "600",
    color: colores.textoSuave,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  denominacionInput: {
    width: 90,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    textAlign: "right",
    backgroundColor: colores.blanco,
  },
  teclado: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  tecla: {
    width: "30%",
    aspectRatio: 1.7,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  teclaTexto: { fontSize: 22, fontWeight: "700", color: colores.texto },
});