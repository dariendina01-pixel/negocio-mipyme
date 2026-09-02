// =============================================================
// nav.tsx — Barra de pestañas simple (sin librerías de navegación)
// =============================================================
import React from "react";
import { Pressable, Text, View } from "react-native";
import { colores } from "./theme";

export interface Pestana<T extends string> {
  clave: T;
  etiqueta: string;
}

export function BarraTabs<T extends string>(props: {
  pestanas: Pestana<T>[];
  activa: T;
  onCambiar: (p: T) => void;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colores.blanco,
        borderTopWidth: 1,
        borderTopColor: colores.borde,
        flexDirection: "row",
        paddingTop: 6,
        paddingBottom: 12,
      }}
    >
      {props.pestanas.map((p) => {
        const activa = p.clave === props.activa;
        return (
          <Pressable
            key={p.clave}
            onPress={() => props.onCambiar(p.clave)}
            style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: activa ? colores.primario : "transparent",
                marginBottom: 6,
              }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: activa ? "800" : "500",
                color: activa ? colores.primario : colores.textoSuave,
              }}
            >
              {p.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BotonVolver(props: { texto: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        {
          paddingVertical: 8,
          paddingHorizontal: 6,
          flexDirection: "row",
          alignItems: "center",
        },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={{ color: colores.primario, fontWeight: "800", fontSize: 15 }}>{"< " + props.texto}</Text>
    </Pressable>
  );
}