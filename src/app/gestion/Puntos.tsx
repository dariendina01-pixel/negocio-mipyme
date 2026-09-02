// =============================================================
// Puntos.tsx — Gestión de puntos de venta (crear, renombrar, borrar)
// =============================================================
import React, { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Campo, Aviso, SinDatos, PantallaConTeclado } from "../../ui/components";

export function PuntosGestion() {
  const { gestDb: db, mutarGest } = useApp();
  const [editando, setEditando] = useState<string | null>(null); // id del punto que se edita
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");

  const puntos = [...db.puntos].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const guardarNuevo = () => {
    const n = nombre.trim();
    if (!n) return setError("El nombre del punto es obligatorio.");
    if (db.puntos.some((p) => p.nombre.toLowerCase() === n.toLowerCase())) {
      return setError(`Ya existe un punto llamado "${n}".`);
    }
    mutarGest((d) => {
      d.puntos.push({
        id: "PV-" + Date.now().toString(36).toUpperCase(),
        nombre: n,
        saldoCajaCents: 0,
      });
    });
    setCreando(false);
    setNombre("");
    setError("");
  };

  const renombrar = (id: string) => {
    const n = nombre.trim();
    if (!n) return setError("El nombre no puede quedar vacío.");
    mutarGest((d) => {
      const idx = d.puntos.findIndex((p) => p.id === id);
      if (idx >= 0) d.puntos[idx].nombre = n;
    });
    setEditando(null);
    setNombre("");
    setError("");
  };

  const borrar = (id: string) => {
    mutarGest((d) => {
      d.puntos = d.puntos.filter((p) => p.id !== id);
    });
    setEditando(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={estilos.contenido}>
        {error ? <Aviso texto={error} tipo="error" /> : null}

        {creando ? (
          <PantallaConTeclado>
            <Tarjeta>
              <Text style={estilos.titulo}>Nuevo punto de venta</Text>
              <Campo etiqueta="Nombre del punto" valor={nombre} onChange={setNombre} placeholder="Ej: Caja 1, Local, Puesto de la esquina…" />
              <View style={[estilos.fila, { gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Boton texto="Cancelar" variante="secundario" onPress={() => { setCreando(false); setNombre(""); setError(""); }} />
                </View>
                <View style={{ flex: 2 }}>
                  <Boton texto="Guardar punto" onPress={guardarNuevo} grande />
                </View>
              </View>
            </Tarjeta>
          </PantallaConTeclado>
        ) : (
          <>
            <Boton texto="+ Nuevo punto de venta" onPress={() => setCreando(true)} />

            {editando ? (
              <PantallaConTeclado>
                <Tarjeta>
                  <Text style={estilos.titulo}>Editar punto</Text>
                  <Campo etiqueta="Nombre" valor={nombre} onChange={setNombre} />
                  <View style={[estilos.fila, { gap: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Boton texto="Cancelar" variante="secundario" onPress={() => setEditando(null)} />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Boton texto="Guardar" onPress={() => renombrar(editando)} />
                    </View>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Boton texto="Eliminar punto" variante="peligro" onPress={() => borrar(editando)} />
                  </View>
                </Tarjeta>
              </PantallaConTeclado>
            ) : (
              <FlatList
                data={puntos}
                keyExtractor={(p) => p.id}
                style={{ marginTop: 10 }}
                ListEmptyComponent={<SinDatos texto="Aún no hay puntos de venta. Crea uno para empezar." />}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setEditando(item.id);
                      setNombre(item.nombre);
                      setError("");
                    }}
                  >
                    <Tarjeta>
                      <View style={[estilos.fila]}>
                        <View style={{ flex: 1 }}>
                          <Text style={estilos.titulo}>{item.nombre}</Text>
                          <Text style={estilos.subtitulo}>
                            {db.ventasRecibidas.filter((v) => v.punto === item.id).length} ventas recibidas
                          </Text>
                        </View>
                        <Text style={{ color: colores.textoSuave }}>editar ›</Text>
                      </View>
                    </Tarjeta>
                  </Pressable>
                )}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}
