// =============================================================
// Envios.tsx — Enviar mercancía de bodega a un punto de venta
// Genera el paquete INVENTARIO listo para enviar al dependiente.
// =============================================================
import React, { useState } from "react";
import { View, Text, TextInput, FlatList } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Aviso, SinDatos } from "../../ui/components";
import { enviarMercanciaAPunto } from "../../core/operations";
import { crearPaqueteInventario } from "../../core/sync/builders";
import { exportarYCompartir } from "../helpersRN";

export function EnviosGestion() {
  const { gestDb: db, gestRepo, reemplazarGest } = useApp();
  const [puntoId, setPuntoId] = useState<string>(db.puntos[0]?.id ?? "");
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<{ texto: string; tipo?: "ok" | "error" } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const puntos = db.puntos.length > 0 ? db.puntos : [];

  const items = Object.entries(cantidades)
    .map(([productoId, txt]) => ({ productoId, cantidad: parseInt(txt, 10) || 0 }))
    .filter((i) => i.cantidad > 0);

  const enviar = async () => {
    if (!puntoId || items.length === 0) {
      setMensaje({
        texto: !puntoId ? "Elige un punto de venta destino." : "Pon cantidades en al menos un producto.",
        tipo: "error",
      });
      return;
    }
    setOcupado(true);
    try {
      const gestion = JSON.parse(JSON.stringify(db)) as import("../../core/types").GestionDb;
      const recepcion = enviarMercanciaAPunto({
        gestion,
        puntoId,
        items: items.map((i) => ({ ...i })),
      });
      const paquete = crearPaqueteInventario(gestion, puntoId, recepcion);
      await gestRepo.guardarGestion(gestion);
      reemplazarGest(gestion);
      const nombre = await exportarYCompartir("gestion", paquete);
      setMensaje({
        texto: nombre
          ? `Mercancía enviada a ${puntoId}. Paquete ${nombre} listo para WhatsApp/WiFi.`
          : "Mercancía registrada pero no se pudo compartir.",
        tipo: "ok",
      });
      setCantidades({});
    } catch (e) {
      setMensaje({ texto: "Error al enviar: " + String(e), tipo: "error" });
    } finally {
      setOcupado(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={estilos.contenido}>
        {mensaje ? <Aviso texto={mensaje.texto} tipo={mensaje.tipo} /> : null}
        <Tarjeta>
          <Text style={estilos.titulo}>Destino</Text>
          <Text style={estilos.subtitulo}>Toca para elegir el punto de venta.</Text>
          <FlatList
            data={puntos}
            keyExtractor={(p) => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
            renderItem={({ item }) => {
              const activo = item.id === puntoId;
              return (
                <Boton
                  texto={item.id === "bodega" ? item.nombre : item.nombre}
                  variante={activo ? "primario" : "secundario"}
                  onPress={() => setPuntoId(item.id)}
                />
              );
            }}
          />
        </Tarjeta>

        <Tarjeta>
          <Text style={estilos.titulo}>Mercancía a enviar</Text>
          <Text style={estilos.subtitulo}>Escribe cuántas unidades van a {puntoId}.</Text>
          <FlatList
            data={db.productos}
            keyExtractor={(p) => p.id}
            style={{ marginTop: 6, maxHeight: 400 }}
            ListEmptyComponent={<SinDatos texto="No hay productos. Añádelos primero en la pestaña Productos." />}
            renderItem={({ item }) => {
              const enBodega = item.inventario["bodega"] ?? 0;
              return (
                <View style={[estilos.fila, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colores.borde }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600" }} numberOfLines={1}>{item.nombre}</Text>
                    <Text style={{ color: colores.textoSuave, fontSize: 12 }}>En bodega: {enBodega} u</Text>
                  </View>
                  <TextInput
                    keyboardType="number-pad"
                    placeholder="0"
                    style={[estilos.cajaInput, { width: 90, textAlign: "right" }]}
                    value={cantidades[item.id] ?? ""}
                    onChangeText={(t) => setCantidades((prev) => ({ ...prev, [item.id]: t.replace(/[^\d]/g, "") }))}
                  />
                </View>
              );
            }}
          />
        </Tarjeta>

        <Boton texto="Enviar mercancía al punto" onPress={enviar} grande deshabilitado={ocupado} />
      </View>
    </View>
  );
}