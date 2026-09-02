// =============================================================
// App.tsx — Punto de entrada de la app
// =============================================================
import React, { useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { colores } from "./src/ui/theme";
import { Proveedor, useApp } from "./src/app/estado";
import { Raiz } from "./src/app/Raiz";
import { AppDependiente } from "./src/app/dependiente/App";
import { AppGestion } from "./src/app/gestion/App";
import { IndicadorCarga } from "./src/ui/components";
import type { Rol } from "./src/app/helpersRN";

export default function App() {
  const [rol, setRol] = useState<Rol | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <StatusBar style="light" />
      <Interior rol={rol} onElegir={setRol} onCambiarApp={() => setRol(null)} />
    </View>
  );
}

function Interior(props: { rol: Rol | null; onElegir: (r: Rol) => void; onCambiarApp: () => void }) {
  if (!props.rol) {
    return <Raiz onElegir={props.onElegir} onCargado={() => undefined} />;
  }
  return (
    <Proveedor rol={props.rol}>
      <ContenidoApp onCambiarApp={props.onCambiarApp} />
    </Proveedor>
  );
}

function ContenidoApp({ onCambiarApp }: { onCambiarApp: () => void }) {
  const app = useApp();
  if (app.error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 30 }}>
        <IndicadorCarga />
      </View>
    );
  }
  if (!app.cargo) {
    return <IndicadorCarga />;
  }
  return (
    <View style={{ flex: 1 }}>
      {app.rol === "dependiente" ? <AppDependiente onCambiarApp={onCambiarApp} /> : <AppGestion onCambiarApp={onCambiarApp} />}
    </View>
  );
}