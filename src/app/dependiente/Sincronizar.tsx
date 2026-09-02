// =============================================================
// Sincronizar.tsx — Gestión de la sincronización (dependiente)
//  - Exportar ventas del día (archivo para enviar por WhatsApp/WiFi)
//  - Importar lista de precios / mercancía enviada por la gestión
//  - Sincronización WiFi con el puente local
//  - Cierre de día: resumen en texto para el dueño
// =============================================================
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import { Tarjeta, Boton, Aviso, Campo } from "../../ui/components";
import { fmtMoneda } from "../../core/money";
import { crearPaqueteVentas } from "../../core/sync/builders";
import { resumenDia, textoCierre, registrarCierre, marcarCierreEntregado, diaCerrado, cierreDeDia } from "../../core/operations";
import { hoyLocal, maxFolioRecibido } from "../../core/folio";
import { dirDatos, exportarYCompartir, seleccionarArchivoRespaldo, puenteWifi, guardarJsonEnCarpeta, compartirTexto } from "../helpersRN";
import { serializarJson } from "../../core/fs";
import { adapterExpo } from "../../core/fs/fs_expo";
import { aplicarPaquete } from "../../core/sync/merge";
import type { Paquete } from "../../core/types";

export function SincronizarDependiente() {
  const { depDb: db, mutarDep, guardarDep, dispositivo } = useApp();
  const [nombrePunto, setNombrePunto] = useState(db.meta.puntoNombre);
  const [mensaje, setMensaje] = useState<{ texto: string; tipo?: "ok" | "error" } | null>(null);
  const [urlPuente, setUrlPuente] = useState("");
  const [wifiEstado, setWifiEstado] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const dia = hoyLocal();
  const resumen = resumenDia(db, dia);

  const idMiBase = db.meta.punto || nombrePunto || dispositivo;

  useEffect(() => {
    (async () => {
      const fs = adapterExpo(dirDatos("dependiente"));
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

  const guardarIdentidad = () => {
    mutarDep((d) => {
      d.meta.puntoNombre = nombrePunto.trim() || d.meta.puntoNombre;
      if (!d.meta.punto) d.meta.punto = nombrePunto.trim();
    });
    setMensaje({ texto: "Identidad del punto guardada", tipo: "ok" });
  };

  const exportarVentas = async () => {
    setOcupado(true);
    try {
      // crearPaqueteVentas actualiza las marcas del modelo en memoria
      const paquete = crearPaqueteVentas(db);
      await guardarDep(); // persiste marcas (lo ya enviado)
      const nombre = await exportarYCompartir("dependiente", paquete);
      setMensaje({
        texto: nombre
          ? `Paquete exportado. Envíalo por WhatsApp/Bluetooth/correo. (${nombre}) ${(paquete.contendido.ventas as unknown[]).length} ventas, ${(paquete.contendido.gastos as unknown[]).length} gastos.`
          : "Paquete creado pero no se pudo compartir.",
        tipo: "ok",
      });
    } catch (e) {
      setMensaje({ texto: "Error al exportar: " + String(e), tipo: "error" });
    } finally {
      setOcupado(false);
    }
  };

  const importarArchivo = async () => {
    setOcupado(true);
    try {
      const res = await seleccionarArchivoRespaldo();
      if (!res.ok) {
        setMensaje({ texto: res.mensaje });
        return;
      }
      const texto = res.texto;
      if (!texto) {
        setMensaje({ texto: "El archivo elegido no contiene texto.", tipo: "error" });
        return;
      }
      const paquete = JSON.parse(texto) as Paquete;
      const resultado = aplicarPaquete(db, paquete, idMiBase);
      await guardarDep();
      if (resultado.aplicado) {
        setMensaje({
          texto: `Actualización aplicada (${resultado.productosActualizados ?? 0} productos, ${resultado.nuevosVentas ?? 0} ventas, ${resultado.nuevosGastos ?? 0} gastos).`,
          tipo: "ok",
        });
      } else {
        setMensaje({ texto: "Paquete ya aplicado o para otro destino.", tipo: "error" });
      }
    } catch (e) {
      setMensaje({ texto: "Archivo no válido: " + String(e), tipo: "error" });
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
    const fs = adapterExpo(dirDatos("dependiente"));
    await fs.escribir("puente.json", JSON.stringify({ url: urlPuente.trim() }, null, 2));
    const puente = puenteWifi(urlPuente.trim());
    setWifiEstado("Conectando…");
    try {
      const ok = await puente.ping();
      if (!ok) {
        setWifiEstado("No se puede alcanzar el puente. Revisa que esté encendido y en la misma red.");
        return;
      }
      // Bajar lo que haya para mí
      const lista = await puente.descargar(idMiBase, maxFolioRecibido(db.meta, "PRODUCTOS"));
      let aplicados = 0;
      for (const p of lista.entrantes) {
        const r = aplicarPaquete(db, p, idMiBase);
        if (r.aplicado) aplicados += 1;
      }
      await guardarDep();
      // Subir el paquete de ventas pendiente
      const paqueteVentas = crearPaqueteVentas(db);
      await guardarDep();
      const subido = await puente.enviar(paqueteVentas);
      setWifiEstado(
        `Puente OK. Bajados ${aplicados} paquetes. Ventas subidas: ${subido ? "sí" : "no"}.`
      );
    } catch (e) {
      setWifiEstado("Error de sincronización WiFi: " + String(e));
    } finally {
      setOcupado(false);
    }
  };

  const cerrarDia = async () => {
    // Registrar cierre (primera vez) y marcarlo entregado (inmutable)
    const cierre = registrarCierre(db, dia);
    marcarCierreEntregado(db, dia);
    await guardarDep();

    const resumen_ = resumenDia(db, dia);
    const objetoCierre = {
      tipo: "CIERRE_ENTREGADO",
      version: 1,
      negocio: "Negocio - Mipyme",
      punto: db.meta.puntoNombre || db.meta.punto || db.meta.dispositivo,
      dispositivo: db.meta.dispositivo,
      dia,
      cierre,
      resumen: resumen_,
      ventas: db.ventas.filter((v) => v.fecha.slice(0, 10) === dia),
      devoluciones: db.devoluciones.filter((d) => d.fecha.slice(0, 10) === dia),
      gastos: db.gastos.filter((g) => g.fecha.slice(0, 10) === dia),
      generado: new Date().toISOString(),
      inmutable: true,
    };
    const texto = serializarJson(objetoCierre);
    const res = await guardarJsonEnCarpeta("dependiente", `cierre_entregado_${dia}.json`, texto);
    // También texto legible para enviar por WhatsApp
    const txtResumen = textoCierre({ dia, resumen: resumen_ });
    await compartirTexto("dependiente", "cierre_" + dia + ".txt", txtResumen, "Cierre del día");

    setMensaje({
      texto: res.ok
        ? "Día cerrado y ENTREGADO. El archivo del cierre es inmutable. " + res.mensaje
        : "Cierre generado pero no se pudo guardar en carpeta: " + res.mensaje,
      tipo: res.ok ? "ok" : "error",
    });
  };

  const enviarResumenWhatsaapp = async () => {
    const texto = textoCierre({ dia, resumen });
    const nombre = await compartirTexto("dependiente", "cierre_" + dia + ".txt", texto, "Enviar cierre del día");
    setMensaje({
      texto: nombre
        ? "Resumen generado y listo para enviar."
        : "No se pudo compartir el resumen.",
      tipo: "ok",
    });
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={estilos.contenido}>
      {mensaje ? <Aviso texto={mensaje.texto} tipo={mensaje.tipo} /> : null}

      <Tarjeta>
        <Text style={estilos.titulo}>Mi punto de venta</Text>
        <Text style={estilos.subtitulo}>Nombre que verá el dueño en la gestión.</Text>
        <View style={{ marginTop: 10 }}>
          <Campo etiqueta="Nombre del punto" valor={nombrePunto} onChange={setNombrePunto} placeholder="Ej: Punto La Esquina" />
        </View>
        <Boton texto="Guardar identidad" onPress={guardarIdentidad} variante="secundario" />
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Ventas del día ({dia})</Text>
        <View style={[estilos.fila, { marginVertical: 8 }]}>
          <Text style={estilos.etiqueta}>Total vendido</Text>
          <Text style={estilos.monto}>{fmtMoneda(resumen.totalVentasCents)}</Text>
        </View>
        <View style={[estilos.fila, { marginBottom: 10 }]}>
          <Text style={estilos.etiqueta}>Caja esperada</Text>
          <Text style={estilos.monto}>{fmtMoneda(resumen.esperadoCajaCents)}</Text>
        </View>
        <Boton texto="Exportar ventas (para enviar a la gestión)" onPress={exportarVentas} grande deshabilitado={ocupado} />
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Recibir actualizaciones de la gestión</Text>
        <Text style={estilos.subtitulo}>Importa el archivo con los precios o la mercancía que te envió el dueño.</Text>
        <View style={{ marginTop: 10 }}>
          <Boton texto="Elegir archivo de actualización…" onPress={importarArchivo} variante="secundario" deshabilitado={ocupado} />
        </View>
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Sincronización WiFi (puente local)</Text>
        <Text style={estilos.subtitulo}>Usa el puente en la PC del dueño. Dirección ejemplo: http://192.168.1.10:4477</Text>
        <View style={{ marginTop: 10 }}>
          <TextInput
            value={urlPuente}
            onChangeText={setUrlPuente}
            placeholder="http://192.168.1.10:4477"
            keyboardType="url"
            autoCapitalize="none"
            style={estilos.cajaInput}
          />
        </View>
        <View style={{ marginTop: 10 }}>
          <Boton texto="Sincronizar por WiFi" onPress={sincronizarWifi} variante="primario" deshabilitado={ocupado} />
        </View>
        {wifiEstado ? <Aviso texto={wifiEstado} /> : null}
      </Tarjeta>

      <Tarjeta>
        <Text style={estilos.titulo}>Cierre de día</Text>
        {diaCerrado(db, dia) ? (
          <Aviso texto={`El día ${dia} ya está cerrado y ENTREGADO. El archivo es inmutable, no se puede modificar.`} />
        ) : (
          <>
            <Text style={estilos.subtitulo}>Cierra el día: genera el archivo JSON "entregado" y lo guarda en la carpeta que elijas. El día queda inmutable.</Text>
            <View style={{ marginTop: 10 }}>
              <Boton texto="Cerrar día y generar JSON (entregado)" onPress={cerrarDia} variante="acento" deshabilitado={ocupado} />
            </View>
            <View style={{ marginTop: 10 }}>
              <Boton texto="Solo enviar resumen por WhatsApp" onPress={enviarResumenWhatsaapp} variante="secundario" deshabilitado={ocupado} />
            </View>
          </>
        )}
      </Tarjeta>
    </ScrollView>
  );
}