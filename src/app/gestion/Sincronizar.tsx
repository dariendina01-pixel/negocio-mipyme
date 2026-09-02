// =============================================================
// Sincronizar.tsx (gestión) — Configuración, exportar precios,
// importar ventas y sincronización WiFi.
// =============================================================
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Aviso, Campo } from "../../ui/components";
import { crearPaqueteProductos, crearPaqueteConfig } from "../../core/sync/builders";
import { dirDatos, exportarYCarpetaYCompartir, seleccionarArchivoRespaldo, puenteWifi, guardarJsonEnCarpeta } from "../helpersRN";
import { adapterExpo } from "../../core/fs/fs_expo";
import { serializarJson } from "../../core/fs";
import { aplicarPaquete } from "../../core/sync/merge";
import { maxFolioRecibido } from "../../core/folio";
import type { Paquete, GestionDb } from "../../core/types";
import { plantillaGestion } from "../../core/types";
import { fmtMoneda } from "../../core/money";

export function SincronizarGestion() {
  const { gestDb: db, mutarGest, gestRepo, reemplazarGest, guardarGest } = useApp();
  const [nombreNegocio, setNombreNegocio] = useState(db.meta.nombreNegocio);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo?: "ok" | "error" } | null>(null);
  const [urlPuente, setUrlPuente] = useState("");
  const [wifiEstado, setWifiEstado] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    (async () => {
      const fs = adapterExpo(dirDatos("gestion"));
      const t = await fs.leer("puente.json");
      if (t) {
        try {
          setUrlPuente((JSON.parse(t) as { url: string }).url ?? "");
        } catch {
          /* no importa */
        }
      }
    })();
  }, []);

  const guardarConfig = () => {
    mutarGest((d) => {
      d.meta.nombreNegocio = nombreNegocio.trim() || d.meta.nombreNegocio;
    });
    setMensaje({ texto: "Configuración guardada", tipo: "ok" });
  };

  const exportarPrecios = async () => {
    setOcupado(true);
    try {
      const copia = JSON.parse(JSON.stringify(db)) as typeof db;
      const paquete = crearPaqueteProductos(copia);
      await gestRepo.guardarGestion(copia);
      const dia = new Date().toISOString().slice(0, 10);
      const nombreSeguro = "precios_catalogo_" + dia + ".json";
      const res = await exportarYCarpetaYCompartir(
        "gestion",
        paquete,
        nombreSeguro,
        "Enviar precios y catálogo al punto"
      );
      reemplazarGest(copia);
      if (!res.guardo) {
        setMensaje({ texto: res.mensaje, tipo: "error" });
        return;
      }
      setMensaje({
        texto: `Catálogo de ${(paquete.contendido.productos as unknown[]).length} productos guardado en tu carpeta.` +
          (res.compartio ? " Se abrió para compartirlo con el punto." : " Ya puedes enviarlo desde tu explorador."),
        tipo: "ok",
      });
    } catch (e) {
      setMensaje({ texto: "Error: " + String(e), tipo: "error" });
    } finally {
      setOcupado(false);
    }
  };

  const exportarConfig = async () => {
    setOcupado(true);
    try {
      const copia = JSON.parse(JSON.stringify(db)) as typeof db;
      const paquete = crearPaqueteConfig(copia);
      await gestRepo.guardarGestion(copia);
      const dia = new Date().toISOString().slice(0, 10);
      const res = await exportarYCarpetaYCompartir(
        "gestion",
        paquete,
        "config_" + dia + ".json",
        "Enviar configuración al punto"
      );
      reemplazarGest(copia);
      setMensaje({
        texto: res.guardo
          ? "Paquete de configuración guardado en tu carpeta." + (res.compartio ? " Se abrió para compartir." : "")
          : res.mensaje,
        tipo: res.guardo ? "ok" : "error",
      });
    } catch (e) {
      setMensaje({ texto: "Error: " + String(e), tipo: "error" });
    } finally {
      setOcupado(false);
    }
  };

  const exportarRespaldo = async () => {
    setOcupado(true);
    try {
      const texto = serializarJson(db);
      const fecha = new Date().toISOString().slice(0, 10);
      const res = await guardarJsonEnCarpeta(
        "gestion",
        `respaldo_gestion_${fecha}.json`,
        texto
      );
      setMensaje({
        texto: res.ok
          ? res.mensaje + " Se guardó también una copia local."
          : "No se pudo exportar el respaldo: " + res.mensaje,
        tipo: res.ok ? "ok" : "error",
      });
    } catch (e) {
      setMensaje({ texto: "Error al exportar respaldo: " + String(e), tipo: "error" });
    } finally {
      setOcupado(false);
    }
  };

  const importarVentas = async () => {
    setOcupado(true);
    try {
      const res = await seleccionarArchivoRespaldo();
      if (!res.ok) {
        setMensaje({ texto: res.mensaje });
        return;
      }
      const texto = res.texto;
      if (!texto) {
        setMensaje({ texto: "Archivo sin contenido.", tipo: "error" });
        return;
      }
      const paquete = JSON.parse(texto) as Paquete;
      const resultado = aplicarPaquete(db, paquete, "gestion");
      await guardarGest();
      if (resultado.aplicado) {
        setMensaje({
          texto: `Ventas/gastos aplicados (${resultado.nuevosVentas ?? 0} ventas, ${resultado.nuevosGastos ?? 0} gastos).`,
          tipo: "ok",
        });
      } else {
        setMensaje({ texto: "Paquete ya aplicado o no válido.", tipo: "error" });
      }
    } catch (e) {
      setMensaje({ texto: "Archivo no válido: " + String(e), tipo: "error" });
    } finally {
      setOcupado(false);
    }
  };

  const importarRespaldo = async () => {
    setOcupado(true);
    try {
      const res = await seleccionarArchivoRespaldo();
      if (!res.ok) {
        setMensaje({ texto: res.mensaje });
        return;
      }
      if (!res.texto) {
        setMensaje({ texto: "El archivo no contiene texto.", tipo: "error" });
        return;
      }
      const dato = JSON.parse(res.texto) as Partial<GestionDb> & Record<string, unknown>;
      const arrays: (keyof GestionDb)[] = [
        "productos", "puntos", "ventasRecibidas", "devolucionesRecibidas",
        "gastosRecibidos", "recepcionesRecibidas", "arqueosRecibidos", "movimientosInventario",
      ];
      const esValido =
        dato && typeof dato === "object" &&
        typeof dato.meta === "object" && dato.meta !== null &&
        typeof dato.config === "object" && dato.config !== null &&
        arrays.every((k) => Array.isArray(dato[k]));
      if (!esValido) {
        setMensaje({ texto: "El archivo no es un respaldo de gestión válido.", tipo: "error" });
        return;
      }
      const nueva = { ...plantillaGestion(), ...dato } as GestionDb;
      nueva.config = { ...plantillaGestion().config, ...(dato.config as object) };
      reemplazarGest(nueva);
      setMensaje({
        texto: `Respaldo restaurado: ${(nueva.productos as unknown[]).length} productos, ${(nueva.puntos ?? []).length} puntos, ${(nueva.ventasRecibidas ?? []).length} ventas.`,
        tipo: "ok",
      });
    } catch (e) {
      setMensaje({ texto: "No se pudo importar el respaldo: " + String(e), tipo: "error" });
    } finally {
      setOcupado(false);
    }
  };

  const sincronizarWifi = async () => {
    if (!urlPuente.trim()) {
      setWifiEstado("Escribe la dirección del puente (ej: http://192.168.1.10:4477).");
      return;
    }
    setOcupado(true);
    const fs = adapterExpo(dirDatos("gestion"));
    await fs.escribir("puente.json", JSON.stringify({ url: urlPuente.trim() }, null, 2));
    const puente = puenteWifi(urlPuente.trim());
    setWifiEstado("Conectando…");
    try {
      const ok = await puente.ping();
      if (!ok) {
        setWifiEstado("No se alcanza el puente.");
        return;
      }
      // Sube precios (destino "cualquiera") para que los puntos bajen la lista
      const copia = JSON.parse(JSON.stringify(db)) as typeof db;
      const paquetePre = crearPaqueteProductos(copia);
      await gestRepo.guardarGestion(copia);
      await puente.enviar(paquetePre);
      // Baja ventas/inventario enviadas por los puntos
      const lista = await puente.descargar("gestion", maxFolioRecibido(db.meta, "VENTAS"));
      let aplicados = 0;
      for (const p of lista.entrantes) {
        const r = aplicarPaquete(db, p, "gestion");
        if (r.aplicado) aplicados += 1;
      }
      await guardarGest();
      reemplazarGest(copia);
      setWifiEstado(`Puente OK. Ventas aplicadas: ${aplicados}. Precios subidos.`);
    } catch (e) {
      setWifiEstado("Error de WiFi: " + String(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={estilos.contenido}>
      {mensaje ? <Aviso texto={mensaje.texto} tipo={mensaje.tipo} /> : null}

      <Tarjeta>
        <Text style={estilos.titulo}>Mi negocio</Text>
        <View style={{ marginTop: 10 }}>
          <Campo etiqueta="Nombre del negocio" valor={nombreNegocio} onChange={setNombreNegocio} placeholder="Ej: Mercado La Familia" />
        </View>
        <Boton texto="Guardar configuración" onPress={guardarConfig} variante="secundario" />
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Enviar precios y catálogo</Text>
        <Text style={estilos.subtitulo}>Exporta la lista de productos para que el dependiente la importe.</Text>
        <View style={[estilos.fila, { gap: 8, marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <Boton texto="Exportar precios" onPress={exportarPrecios} variante="secundario" deshabilitado={ocupado} />
          </View>
          <View style={{ flex: 1 }}>
            <Boton texto="Exportar config" onPress={exportarConfig} variante="secundario" deshabilitado={ocupado} />
          </View>
        </View>
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Recibir ventas de los puntos</Text>
        <Text style={estilos.subtitulo}>Importa el archivo que te envió la tienda (por WhatsApp/Bluetooth/email).</Text>
        <View style={{ marginTop: 10 }}>
          <Boton texto="Elegir archivo de ventas…" onPress={importarVentas} deshabilitado={ocupado} />
        </View>
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Respaldo completo</Text>
        <Text style={estilos.subtitulo}>Copia de seguridad de TODA la información de la gestión (productos, puntos, ventas, gastos, movimientos). Guárdalo fuera del teléfono por si se rompe o se pierde.</Text>
        <View style={{ marginTop: 10 }}>
          <Boton texto="Exportar respaldo JSON" onPress={exportarRespaldo} variante="acento" deshabilitado={ocupado} />
        </View>
        <Text style={[estilos.subtitulo, { marginTop: 14 }]}>Para restaurar en un teléfono nuevo (o si se perdió la información), elige el respaldo que guardaste.</Text>
        <View style={{ marginTop: 10 }}>
          <Boton texto="Importar respaldo (restaurar)" onPress={importarRespaldo} variante="acento" deshabilitado={ocupado} />
        </View>
        <Aviso texto="Importar un respaldo REEMPLAZA la información actual de la gestión por la del archivo. Hazlo con cuidado." />
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Sincronización WiFi (puente local)</Text>
        <TextInput
          value={urlPuente}
          onChangeText={setUrlPuente}
          placeholder="http://192.168.1.10:4477"
          keyboardType="url"
          autoCapitalize="none"
          style={[estilos.cajaInput, { marginTop: 8 }]}
        />
        <View style={{ marginTop: 10 }}>
          <Boton texto="Sincronizar por WiFi" onPress={sincronizarWifi} variante="acento" deshabilitado={ocupado} />
        </View>
        {wifiEstado ? <Aviso texto={wifiEstado} /> : null}
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Mis puntos de venta</Text>
        {db.puntos.length === 0 ? (
          <Text style={estilos.subtitulo}>Se crearán automáticamente cuando recibas ventas de un punto.</Text>
        ) : (
          db.puntos.map((p) => (
            <View key={p.id} style={[estilos.fila, { paddingVertical: 6 }]}>
              <Text style={{ flex: 1, fontWeight: "700" }}>{p.nombre}</Text>
              <Text style={{ color: colores.textoSuave }}>{p.id}</Text>
            </View>
          ))
        )}
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.etiqueta}>Resumen de lo recibido</Text>
        <View style={[estilos.fila, { paddingVertical: 5 }]}>
          <Text style={{ color: colores.textoSuave }}>Ventas</Text>
          <Text style={{ fontWeight: "700" }}>{db.ventasRecibidas.length} ({fmtMoneda(db.ventasRecibidas.reduce((a, v) => a + v.totalCents, 0))})</Text>
        </View>
        <View style={[estilos.fila, { paddingVertical: 5 }]}>
          <Text style={{ color: colores.textoSuave }}>Gastos</Text>
          <Text style={{ fontWeight: "700" }}>{db.gastosRecibidos.length}</Text>
        </View>
      </Tarjeta>
    </ScrollView>
  );
}