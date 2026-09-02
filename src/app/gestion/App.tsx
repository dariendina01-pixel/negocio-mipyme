// =============================================================
// App.tsx (gestión) — Contenedor con pestañas del dueño
// =============================================================
import React, { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useApp } from "../estado";
import { Encabezado } from "../../ui/components";
import { BarraTabs } from "../../ui/nav";
import { ResumenGestion } from "./Resumen";
import { ProductosGestion } from "./Productos";
import { EnviosGestion } from "./Envios";
import { RecibidosGestion } from "./Recibidos";
import { PuntosGestion } from "./Puntos";
import { SincronizarGestion } from "./Sincronizar";

type Pestana = "resumen" | "productos" | "envios" | "recibidos" | "puntos" | "sync";

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: "resumen", etiqueta: "Resumen" },
  { clave: "productos", etiqueta: "Productos" },
  { clave: "envios", etiqueta: "Envíos" },
  { clave: "recibidos", etiqueta: "Recibidos" },
  { clave: "puntos", etiqueta: "Puntos" },
  { clave: "sync", etiqueta: "Sync" },
];

export function AppGestion({ onCambiarApp }: { onCambiarApp: () => void }) {
  const { gestDb: db } = useApp();
  const [pestana, setPestana] = useState<Pestana>("resumen");

  return (
    <View style={{ flex: 1 }}>
      <Encabezado
        titulo="Gestión"
        subtitulo={db.meta.nombreNegocio || "Sin nombre de negocio"}
        derecho={
          <Pressable onPress={onCambiarApp} style={{ padding: 6 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>Cambiar</Text>
          </Pressable>
        }
      />
      {pestana === "resumen" && <ResumenGestion />}
      {pestana === "productos" && <ProductosGestion />}
      {pestana === "envios" && <EnviosGestion />}
      {pestana === "recibidos" && <RecibidosGestion />}
      {pestana === "puntos" && <PuntosGestion />}
      {pestana === "sync" && <SincronizarGestion />}

      <View style={{ marginBottom: 56 }} />
      <BarraTabs pestanas={PESTANAS} activa={pestana} onCambiar={setPestana} />
    </View>
  );
}