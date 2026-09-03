// =============================================================
// nav.tsx — Navegación por botón flotante + menú desplegable.
// Cada página tiene un botón con forma y color propios; el botón
// flotante (esquina inferior derecha) cambia de forma según la
// página activa y al tocarlo despliega el menú para ir a otra.
// =============================================================
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { colores } from "./theme";

export interface Pestana<T extends string> {
  clave: T;
  etiqueta: string;
}

export type FormaBoton = "circulo" | "cuadrado" | "capsula" | "rombo" | "triangulo" | "semiluna";

export interface PestanaNavegacion<T extends string> extends Pestana<T> {
  forma: FormaBoton;
  color?: string;
  icono?: string;
}

/** Formas de botón para distinguir cada página. Repite la paleta según necesidad. */
export const FORMAS_BOTON: Record<FormaBoton, { color: string; icono: string }> = {
  circulo: { color: colores.primario, icono: "◉" },
  cuadrado: { color: "#2E5FA3", icono: "◼" },
  capsula: { color: "#B9386B", icono: "⬭" },
  rombo: { color: colores.acento, icono: "◆" },
  triangulo: { color: "#7A4FBF", icono: "▲" },
  semiluna: { color: "#1E8E9E", icono: "◐" },
};

/** Devuelve los estilos de forma/jitter para una forma dada. */
function estiloForma(forma: FormaBoton): {
  borderRadius: number;
  transform?: { rotate: string }[];
  width?: number;
  height?: number;
} {
  switch (forma) {
    case "circulo":
      return { width: 44, height: 44, borderRadius: 22 };
    case "cuadrado":
      return { width: 40, height: 40, borderRadius: 8 };
    case "capsula":
      return { width: 52, height: 32, borderRadius: 16 };
    case "rombo":
      return { width: 38, height: 38, borderRadius: 8, transform: [{ rotate: "45deg" }] };
    case "triangulo": {
      // Triángulo apuntando arriba: contenedor con área táctil, la figura son los bordes
      return { width: 48, height: 48, borderRadius: 0 };
    }
    case "semiluna":
      return { width: 44, height: 40, borderRadius: 22, transform: [{ rotate: "-20deg" }] };
  }
}

function IconoForma({ forma, color, activo }: { forma: FormaBoton; color: string; activo: boolean }) {
  if (forma === "triangulo") {
    return (
      <View
        style={{
          width: 0,
          height: 0,
          backgroundColor: "transparent",
          borderStyle: "solid",
          borderLeftWidth: 12,
          borderRightWidth: 12,
          borderBottomWidth: 22,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
          opacity: activo ? 1 : 0.75,
        }}
      />
    );
  }
  let estChico: {
    width: number;
    height: number;
    borderRadius: number;
    transform?: { rotate: string }[];
  };
  if (forma === "cuadrado") estChico = { width: 26, height: 26, borderRadius: 5 };
  else if (forma === "capsula") estChico = { width: 34, height: 22, borderRadius: 11 };
  else if (forma === "rombo") estChico = { width: 24, height: 24, borderRadius: 5, transform: [{ rotate: "45deg" }] };
  else if (forma === "semiluna") estChico = { width: 30, height: 26, borderRadius: 15 };
  else estChico = { width: 30, height: 30, borderRadius: 15 };
  return (
    <View
      style={[
        { backgroundColor: color, opacity: activo ? 1 : 0.75, alignItems: "center", justifyContent: "center" },
        estChico,
      ]}
    />
  );
}

export function BotonNavegacion<T extends string>(props: {
  pestanas: PestanaNavegacion<T>[];
  activa: T;
  onCambiar: (p: T) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const activaObj = props.pestanas.find((p) => p.clave === props.activa) ?? props.pestanas[0];
  const colorActivo = activaObj.color ?? FORMAS_BOTON[activaObj.forma].color;

  const ir = (p: T) => {
    props.onCambiar(p);
    setAbierto(false);
  };

  return (
    <>
      {/* Overlay que cierra el menú */}
      {abierto ? (
        <Pressable
          onPress={() => setAbierto(false)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            zIndex: 20,
          }}
        />
      ) : null}

      {/* Menú desplegable */}
      {abierto ? (
        <View
          style={{
            position: "absolute",
            right: 16,
            bottom: 96,
            backgroundColor: colores.blanco,
            borderRadius: 16,
            padding: 8,
            zIndex: 30,
            elevation: 8,
            minWidth: 220,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {props.pestanas.map((p) => {
            const es = p.clave === props.activa;
            const color = p.color ?? FORMAS_BOTON[p.forma].color;
            return (
              <Pressable
                key={p.clave}
                onPress={() => ir(p.clave)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: es ? colores.primarioClaro : "transparent",
                }}
              >
                <View style={{ width: 40, alignItems: "center" }}>
                  <IconoForma forma={p.forma} color={color} activo={es} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: es ? "800" : "600", color: es ? colores.primario : colores.texto, marginLeft: 10 }}>
                  {p.etiqueta}
                </Text>
                {es ? <Text style={{ marginLeft: 10, fontSize: 16, color: colores.primario }}>●</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Botón flotante grande, forma según la página activa */}
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        style={({ pressed }) => [
          {
            position: "absolute",
            right: 18,
            bottom: 22,
            zIndex: 25,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: activaObj.forma === "triangulo" ? "transparent" : colorActivo,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          },
          estiloForma(activaObj.forma),
          pressed && { opacity: 0.85 },
        ]}
      >
        {activaObj.forma === "triangulo" ? (
          // Triángulo apuntando arriba: el contenedor solo posiciona, la forma es el borde
          <View
            style={{
              width: 0,
              height: 0,
              backgroundColor: "transparent",
              borderStyle: "solid",
              borderLeftWidth: 16,
              borderRightWidth: 16,
              borderBottomWidth: 28,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: colorActivo,
            }}
          />
        ) : (
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", transform: activaObj.forma === "rombo" ? [{ rotate: "-45deg" }] : [] }}>
              {activaObj.icono ?? FORMAS_BOTON[activaObj.forma].icono}
            </Text>
          </View>
        )}
        {activaObj.forma !== "triangulo" && activaObj.forma !== "capsula" ? (
          <Text
            numberOfLines={1}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              textAlign: "center",
              color: "#fff",
              fontSize: 9,
              fontWeight: "800",
            }}
          >
            {activaObj.etiqueta}
          </Text>
        ) : null}
      </Pressable>
    </>
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
