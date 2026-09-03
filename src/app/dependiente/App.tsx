// =============================================================
// App.tsx (dependiente) — Contenedor con pestañas
// =============================================================
import React, { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useApp } from "../estado";
import { Encabezado } from "../../ui/components";
import { BotonNavegacion, PestanaNavegacion } from "../../ui/nav";
import { PantallaVenta, PantallaCobro } from "./Venta";
import { Calculadora } from "./Calculadora";
import { PantallaDia } from "./Dia";
import { PantallaDevoluciones } from "./Devoluciones";
import { SincronizarDependiente } from "./Sincronizar";
import type { LineaCarrito } from "./modelo";

type Pestana = "venta" | "cobro" | "calculadora" | "dia" | "devoluciones" | "sync";

const PESTANAS: PestanaNavegacion<Pestana>[] = [
  { clave: "venta", etiqueta: "Venta", forma: "circulo" },
  { clave: "cobro", etiqueta: "Cobro", forma: "cuadrado" },
  { clave: "calculadora", etiqueta: "Calc.", forma: "capsula" },
  { clave: "dia", etiqueta: "Día", forma: "rombo" },
  { clave: "devoluciones", etiqueta: "Dev.", forma: "triangulo" },
  { clave: "sync", etiqueta: "Sync", forma: "semiluna" },
];

export function AppDependiente({ onCambiarApp }: { onCambiarApp: () => void }) {
  const { depDb: db } = useApp();
  const [pestana, setPestana] = useState<Pestana>("venta");
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);

  const tituloPunto = db.meta.puntoNombre || db.meta.punto || "En espera de identidad";

  return (
    <View style={{ flex: 1 }}>
      <Encabezado
        titulo="Dependiente"
        subtitulo={tituloPunto}
        derecho={
          <Pressable onPress={onCambiarApp} style={{ padding: 6 }}>
            <Text style={{ color: "white", fontWeight: "700" }}>Cambiar</Text>
          </Pressable>
        }
      />
      {pestana === "venta" && (
        <View style={{ flex: 1 }}>
          <PantallaVenta
            carrito={carrito}
            onCambiarCarrito={setCarrito}
            onIrACobro={() => setPestana("cobro")}
          />
        </View>
      )}
      {pestana === "cobro" && (
        <PantallaCobro
          carrito={carrito}
          onConfirmado={() => {
            setCarrito([]);
            setPestana("venta");
          }}
          onCancelar={() => setPestana("venta")}
        />
      )}
      {pestana === "calculadora" && <Calculadora />}
      {pestana === "dia" && <PantallaDia />}
      {pestana === "devoluciones" && <PantallaDevoluciones />}
      {pestana === "sync" && <SincronizarDependiente />}

      <BotonNavegacion pestanas={PESTANAS} activa={pestana} onCambiar={setPestana} />
    </View>
  );
}