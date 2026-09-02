// =============================================================
// Puntos.tsx — Gestión de puntos de venta: datos del punto
// (nombre, dirección, cuenta) que el dependiente hereda al abrir su día.
// =============================================================
import React, { useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Campo, Aviso, SinDatos, PantallaConTeclado } from "../../ui/components";
import { crearPaqueteBaseDia } from "../../core/sync/builders";
import { exportarYCarpetaYCompartir } from "../helpersRN";

export function PuntosGestion() {
  const { gestDb: db, mutarGest } = useApp();
  const [editando, setEditando] = useState<string | null>(null); // id del punto que se edita
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [cuenta, setCuenta] = useState("");
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
        direccion: direccion.trim() || undefined,
        cuentaTransferencia: cuenta.trim() || undefined,
        saldoCajaCents: 0,
      });
    });
    setCreando(false);
    setNombre("");
    setDireccion("");
    setCuenta("");
    setError("");
  };

  const guardarEditado = (id: string) => {
    const n = nombre.trim();
    if (!n) return setError("El nombre no puede quedar vacío.");
    mutarGest((d) => {
      const idx = d.puntos.findIndex((p) => p.id === id);
      if (idx >= 0) {
        d.puntos[idx].nombre = n;
        d.puntos[idx].direccion = direccion.trim() || undefined;
        d.puntos[idx].cuentaTransferencia = cuenta.trim() || undefined;
      }
    });
    setEditando(null);
    setNombre("");
    setDireccion("");
    setCuenta("");
    setError("");
  };

  const borrar = (id: string) => {
    mutarGest((d) => {
      d.puntos = d.puntos.filter((p) => p.id !== id);
    });
    setEditando(null);
  };

  const generarBaseDia = async (id: string, nombrePunto: string) => {
    setError("");
    setAviso("");
    try {
      const paquete = crearPaqueteBaseDia(db, id);
      const dia = new Date().toISOString().slice(0, 10);
      const nombreSeguro = "base_dia_" + nombrePunto.replace(/[^\w\-.]/g, "_") + "_" + dia + ".json";
      const res = await exportarYCarpetaYCompartir("gestion", paquete, nombreSeguro, "Enviar base del día al punto");
      if (!res.guardo) {
        setAviso(res.mensaje);
        setError(res.mensaje);
        return;
      }
      setAviso(
        `Base del día de "${nombrePunto}" guardada en la carpeta que elegiste.` +
          (res.compartio ? " Luego se abrió para compartirla." : " Ya puedes enviarla desde tu explorador.")
      );
    } catch (e) {
      setError("No se pudo generar la base del día: " + String(e));
    }
  };

  const [aviso, setAviso] = useState("");

  if (creando) {
    return (
      <PantallaConTeclado>
        <Tarjeta>
          <Text style={estilos.titulo}>Nuevo punto de venta</Text>
          {error ? <Aviso texto={error} tipo="error" /> : null}
          <Campo
            etiqueta="Nombre del punto"
            valor={nombre}
            onChange={setNombre}
            placeholder="Ej: Caja 1, Local, Puesto de la esquina…"
            autoFocus
          />
          <Campo etiqueta="Dirección" valor={direccion} onChange={setDireccion} placeholder="Dirección del punto (opcional)" />
          <Campo etiqueta="Cuenta de transferencia" valor={cuenta} onChange={setCuenta} placeholder="N° de cuenta (opcional)" />
          <View style={[estilos.fila, { gap: 10 }]}>
            <View style={{ flex: 1 }}>
              <Boton texto="Cancelar" variante="secundario" onPress={() => { setCreando(false); setNombre(""); setDireccion(""); setCuenta(""); setError(""); }} />
            </View>
            <View style={{ flex: 2 }}>
              <Boton texto="Guardar punto" onPress={guardarNuevo} grande />
            </View>
          </View>
        </Tarjeta>
      </PantallaConTeclado>
    );
  }

  if (editando) {
    const nombrePunto = db.puntos.find((p) => p.id === editando)?.nombre ?? "";
    return (
      <PantallaConTeclado>
        <Tarjeta>
          <Text style={estilos.titulo}>Editar punto</Text>
          {error ? <Aviso texto={error} tipo="error" /> : null}
          <Campo etiqueta="Nombre" valor={nombre} onChange={setNombre} />
          <Campo etiqueta="Dirección" valor={direccion} onChange={setDireccion} placeholder="Dirección del punto" />
          <Campo etiqueta="Cuenta de transferencia" valor={cuenta} onChange={setCuenta} placeholder="N° de cuenta" />
          <View style={[estilos.fila, { gap: 10 }]}>
            <View style={{ flex: 1 }}>
              <Boton texto="Cancelar" variante="secundario" onPress={() => { setEditando(null); setNombre(""); setDireccion(""); setCuenta(""); setError(""); }} />
            </View>
            <View style={{ flex: 2 }}>
              <Boton texto="Guardar" onPress={() => guardarEditado(editando)} />
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Boton texto={`Generar base del día para "${nombrePunto}"`} onPress={() => generarBaseDia(editando, nombrePunto)} variante="acento" />
          </View>
          <View style={{ marginTop: 10 }}>
            <Boton texto="Eliminar punto" variante="peligro" onPress={() => borrar(editando)} />
          </View>
        </Tarjeta>
      </PantallaConTeclado>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={estilos.contenido}>
        {aviso ? <Aviso texto={aviso} tipo="ok" /> : null}
        <Boton texto="+ Nuevo punto de venta" onPress={() => { setError(""); setAviso(""); setCreando(true); }} />
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
                setDireccion(item.direccion ?? "");
                setCuenta(item.cuentaTransferencia ?? "");
                setError("");
              }}
            >
              <Tarjeta>
                <View style={[estilos.fila]}>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.titulo}>{item.nombre}</Text>
                    <Text style={estilos.subtitulo}>
                      {db.ventasRecibidas.filter((v) => v.punto === item.id).length} ventas recibidas
                      {item.direccion ? ` · ${item.direccion}` : ""}
                    </Text>
                  </View>
                  <Text style={{ color: colores.textoSuave }}>editar ›</Text>
                </View>
              </Tarjeta>
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}
