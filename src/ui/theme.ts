// =============================================================
// theme.ts — Paleta y estilos base de la app
// =============================================================
import { StyleSheet } from "react-native";

export const colores = {
  fondo: "#F4F6F9",
  tarjeta: "#FFFFFF",
  primario: "#0B6B4F",
  primarioOscuro: "#084C38",
  primarioClaro: "#E4F2EC",
  acento: "#E8A013",
  peligro: "#B3261E",
  texto: "#1C2024",
  textoSuave: "#5B6470",
  borde: "#DFE4EA",
  ok: "#1E8E3E",
  blanco: "#FFFFFF",
  negro: "#000000",
};

export const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  encabezado: {
    backgroundColor: colores.primario,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  tituloEncabezado: {
    color: colores.blanco,
    fontSize: 20,
    fontWeight: "700",
  },
  subtituloEncabezado: {
    color: "#CFE8DD",
    fontSize: 13,
    marginTop: 2,
  },
  contenido: {
    padding: 14,
    paddingBottom: 90,
  },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titulo: {
    fontSize: 17,
    fontWeight: "700",
    color: colores.texto,
  },
  subtitulo: {
    fontSize: 13,
    color: colores.textoSuave,
    marginTop: 2,
  },
  monto: {
    fontSize: 24,
    fontWeight: "800",
    color: colores.texto,
  },
  montoGrande: {
    fontSize: 38,
    fontWeight: "900",
    color: colores.texto,
  },
  etiqueta: {
    fontSize: 12,
    color: colores.textoSuave,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cajaInput: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: colores.blanco,
    color: colores.texto,
  },
});