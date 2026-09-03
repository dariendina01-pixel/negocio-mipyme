// =============================================================
// App.tsx (gestión) — Contenedor con pestañas del dueño
// =============================================================
import React, { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useApp } from "../estado";
import { Encabezado } from "../../ui/components";
import { BotonNavegacion, PestanaNavegacion } from "../../ui/nav";
import { ResumenGestion } from "./Resumen";
import { ProductosGestion } from "./Productos";
import { EnviosGestion } from "./Envios";
import { RecibidosGestion } from "./Recibidos";
import { PuntosGestion } from "./Puntos";
import { SincronizarGestion } from "./Sincronizar";
import { AjustesGestion } from "./Ajustes";

type Pestana = "resumen" | "productos" | "envios" | "recibidos" | "puntos" | "ajustes" | "sync";

const PESTANAS: PestanaNavegacion<Pestana>[] = [
  { clave: "resumen", etiqueta: "Resumen", forma: "circulo" },
  { clave: "productos", etiqueta: "Productos", forma: "cuadrado" },
  { clave: "envios", etiqueta: "Envíos", forma: "capsula" },
  { clave: "recibidos", etiqueta: "Recibidos", forma: "rombo" },
  { clave: "puntos", etiqueta: "Puntos", forma: "triangulo" },
  { clave: "ajustes", etiqueta: "Inventarios", forma: "semiluna" },
  { clave: "sync", etiqueta: "Sync", forma: "circulo", color: "#167DB5" },
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
      {pestana === "ajustes" && <AjustesGestion />}
      {pestana === "sync" && <SincronizarGestion />}

      <BotonNavegacion pestanas={PESTANAS} activa={pestana} onCambiar={setPestana} />
    </View>
  );
}