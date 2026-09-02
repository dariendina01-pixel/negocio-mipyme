// =============================================================
// Raiz.tsx — Pantalla de inicio: elige qué app abrir.
// Recuerda la última app usada para abrirla directamente.
// =============================================================
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { colores } from "../ui/theme";
import type { Rol } from "./helpersRN";
import { adapterExpo } from "../core/fs/fs_expo";

export function Raiz(props: { onElegir: (rol: Rol) => void; onCargado: () => void }) {
  const [ultimo, setUltimo] = useState<Rol | null>(null);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const fs = adapterExpo("datos");
        const t = await fs.leer("ultimo_rol.txt");
        if (t === "dependiente" || t === "gestion") setUltimo(t);
      } catch {
        /* sin problema */
      } finally {
        setCargado(true);
        props.onCargado();
      }
    })();
  }, []);

  const elegir = async (rol: Rol) => {
    try {
      const fs = adapterExpo("datos");
      await fs.escribir("ultimo_rol.txt", rol);
    } catch {
      /* sin problema */
    }
    props.onElegir(rol);
  };

  if (!cargado) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View style={{ backgroundColor: colores.primario, alignItems: "center", paddingTop: 80, paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ color: colores.blanco, fontSize: 26, fontWeight: "900" }}>Negocio en Casa</Text>
        <Text style={{ color: "#CFE8DD", fontSize: 14, marginTop: 4, textAlign: "center" }}>
          Ventas, inventario y caja en tus manos
        </Text>
      </View>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 12, color: colores.textoSuave, textAlign: "center", marginBottom: 16, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" }}>
          Elige tu puesto de trabajo
        </Text>
        {ultimo ? (
          <Text style={{ textAlign: "center", color: colores.textoSuave, marginBottom: 16 }}>
            Última app usada: {ultimo === "dependiente" ? "Dependiente" : "Gestión"}
          </Text>
        ) : null}

        <BotonRol
          titulo="Dependiente"
          descripcion="Vender, cobrar, devolver cambio, contar dinero y anotar gastos."
          onPress={() => elegir("dependiente")}
          color={colores.primario}
        />
        <BotonRol
          titulo="Gestión"
          descripcion="Inventario general, precios, puntos de venta y cierre del día."
          onPress={() => elegir("gestion")}
          color={colores.acento}
        />
      </View>
    </View>
  );
}

function BotonRol(props: { titulo: string; descripcion: string; onPress: () => void; color: string }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={({ pressed }) => [
        {
          backgroundColor: colores.blanco,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colores.borde,
          padding: 18,
          marginBottom: 14,
          borderLeftWidth: 6,
          borderLeftColor: props.color,
        },
        pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
      ]}
    >
      <Text style={{ fontSize: 19, fontWeight: "800", color: colores.texto }}>{props.titulo}</Text>
      <Text style={{ marginTop: 4, color: colores.textoSuave }}>{props.descripcion}</Text>
    </Pressable>
  );
}