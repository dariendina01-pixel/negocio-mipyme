// =============================================================
// Venta.tsx — Pantalla de venta: catálogo + carrito + cobro/cambio
// =============================================================
import React, { useState } from "react";
import { View, Text, Pressable, FlatList, TextInput } from "react-native";
import { useApp } from "../estado";
import { estilos, colores } from "../../ui/theme";
import {
  Boton,
  Tarjeta,
  Aviso,
  SinDatos,
  TecladoNumerico,
} from "../../ui/components";
import { fmt, fmtMoneda, aCentavos } from "../../core/money";
import { productosDisponibles, registrarVenta, validarExistencias, diaCerrado } from "../../core/operations";
import { desgloseCambio } from "../../core/denominations";
import { hoyLocal } from "../../core/folio";
import type { LineaCarrito } from "./modelo";
import { cambiarCantidad, quitarLinea, fijarCantidad, totalCarrito, convertirLineas } from "./modelo";

export function PantallaVenta(props: {
  carrito: LineaCarrito[];
  onCambiarCarrito: (nuevo: LineaCarrito[]) => void;
  onIrACobro: () => void;
}) {
  const { depDb: db, mutarDep, gestDb } = useApp();
  const [busqueda, setBusqueda] = useState("");
  const productos = productosDisponibles(db).filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );
  const total = totalCarrito(props.carrito);

  // Punto de trabajo activo: el dependiente elige dónde trabaja hoy.
  const puntosTrabajo = gestDb.puntos;
  const puntoTrabajo = db.meta.punto || db.meta.puntoNombre || (puntosTrabajo[0]?.id ?? "");
  const elegirPunto = (id: string) => {
    const pj = puntosTrabajo.find((p) => p.id === id);
    mutarDep((d) => {
      d.meta.punto = id;
      d.meta.puntoNombre = pj?.nombre || id;
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[estilos.contenido, { flex: 1 }]}>
        {puntosTrabajo.length > 0 ? (
          <View style={{ marginBottom: 8 }}>
            <Text style={estilos.etiqueta}>Punto de trabajo</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {puntosTrabajo.map((p) => {
                const activo = (db.meta.punto || db.meta.puntoNombre) &&
                  (db.meta.punto === p.id || db.meta.puntoNombre === p.nombre);
                return (
                  <Boton
                    key={p.id}
                    texto={p.nombre}
                    variante={activo ? "primario" : "secundario"}
                    onPress={() => elegirPunto(p.id)}
                  />
                );
              })}
            </View>
          </View>
        ) : null}
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar producto…"
          style={estilos.cajaInput}
        />
        <FlatList
          data={productos}
          numColumns={2}
          keyExtractor={(p) => p.id}
          style={{ marginTop: 10, flex: 1 }}
          contentContainerStyle={{ paddingBottom: 12 }}
          ListEmptyComponent={<SinDatos texto="No hay productos disponibles. Recibe la lista de precios en Sincronizar." />}
          renderItem={({ item }) => {
            const actual = props.carrito.find((l) => l.producto.id === item.id)?.cantidad ?? 0;
            const escrito = actual > 0 ? String(actual) : "";
            return (
              <View style={[s.producto, { flex: 1, maxWidth: "48%" }]}>
                <Pressable
                  onPress={() => props.onCambiarCarrito(cambiarCantidad(props.carrito, item, 1))}
                  style={({ pressed }) => [
                    { flex: 1 },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={s.productoNombre} numberOfLines={2}>{item.nombre}</Text>
                  <Text style={s.productoPrecio}>{fmtMoneda(item.precioCents)}</Text>
                  <Text style={s.productoStock}>
                    {item.stock > 0 ? `Disponible: ${item.stock}` : "Agotado"}
                  </Text>
                </Pressable>
                <View style={[estilos.fila, { gap: 6, marginTop: 6 }]}>
                  <Pressable
                    onPress={() => props.onCambiarCarrito(cambiarCantidad(props.carrito, item, -1))}
                    style={s.botonCantidad}
                  >
                    <Text style={s.masMenos}>−</Text>
                  </Pressable>
                  <TextInput
                    value={escrito}
                    onChangeText={(t) => {
                      const n = parseInt(t.replace(/[^\d]/g, ""), 10) || 0;
                      props.onCambiarCarrito(fijarCantidad(props.carrito, item, n));
                    }}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    style={[s.cantidadInput, actual > 0 && { borderColor: colores.primario }]}
                  />
                  <Pressable
                    onPress={() => props.onCambiarCarrito(cambiarCantidad(props.carrito, item, 1))}
                    style={s.botonCantidad}
                  >
                    <Text style={s.masMenos}>+</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      </View>

      {/* Panel del carrito */}
      <View style={s.panelCarrito}>
        {props.carrito.length === 0 ? (
          <Text style={{ color: colores.textoSuave }}>Carrito vacío. Toca un producto para añadirlo.</Text>
        ) : (
          <>
            {props.carrito.map((l, i) => (
              <View key={l.producto.id} style={[estilos.fila, { paddingVertical: 3 }]}>
                <Text style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{l.producto.nombre}</Text>
                <View style={[estilos.fila, { gap: 8 }]}>
                  <Pressable onPress={() => props.onCambiarCarrito(quitarLinea(props.carrito, i, false))}>
                    <Text style={s.masMenos}>−</Text>
                  </Pressable>
                  <Text style={{ minWidth: 30, textAlign: "center", fontWeight: "700" }}>{l.cantidad}</Text>
                  <Pressable onPress={() => props.onCambiarCarrito(cambiarCantidad(props.carrito, l.producto, 1))}>
                    <Text style={s.masMenos}>+</Text>
                  </Pressable>
                </View>
                <Text style={{ width: 92, textAlign: "right", fontWeight: "600" }}>
                  {fmtMoneda(Math.round(l.producto.precioCents * l.cantidad))}
                </Text>
              </View>
            ))}
            <View style={[estilos.fila, { marginTop: 8 }]}>
              <Text style={estilos.titulo}>Total a cobrar</Text>
              <Text style={estilos.monto}>{fmtMoneda(total)}</Text>
            </View>
            <View style={[estilos.fila, { marginTop: 8, gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <Boton texto="Vaciar" variante="secundario" onPress={() => props.onCambiarCarrito([])} />
              </View>
              <View style={{ flex: 2 }}>
                <Boton texto="Cobrar →" onPress={props.onIrACobro} grande />
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export function PantallaCobro(props: {
  carrito: LineaCarrito[];
  onConfirmado: () => void;
  onCancelar: () => void;
}) {
  const { depDb: db, mutarDep, gestDb } = useApp();
  const total = totalCarrito(props.carrito);
  const [recibido, setRecibido] = useState("0,00");
  const [descuento, setDescuento] = useState("0");
  const recibidoCents = aCentavos(recibido);
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  // Punto de venta para anotar la venta (se puede elegir entre todos los puntos)
  const puntosVenta = gestDb.puntos.length > 0 ? gestDb.puntos : [];
  const puntoInicial = db.meta.punto || db.meta.puntoNombre || (puntosVenta[0]?.id ?? "");
  const [puntoSel, setPuntoSel] = useState<string>(puntoInicial);

  if (props.carrito.length === 0) {
    return (
      <View style={estilos.contenido}>
        <SinDatos texto="No hay venta pendiente. Pasa por la pestaña Venta." />
      </View>
    );
  }

  const descPorciento = Math.max(0, Math.min(100, parseFloat(descuento) || 0));
  const pctDescuento = Math.round((total * descPorciento) / 100);
  const neto = total - pctDescuento;
  const cambio = recibidoCents >= neto ? recibidoCents - neto : 0;
  const falta = neto > recibidoCents ? neto - recibidoCents : 0;
  const desglose = desgloseCambio(cambio, db.config.denominaciones);

  const confirmar = () => {
    const items = convertirLineas(props.carrito);
    if (diaCerrado(db, hoyLocal())) {
      setMensaje("El día de hoy ya está cerrado y entregado. No se pueden registrar más ventas.");
      return;
    }
    const check = validarExistencias(db, items);
    if (!check.ok) {
      setMensaje("No alcanzan las existencias: " + check.faltantes.map((f) => `${f.nombre} (hay ${f.disponible})`).join(", "));
      return;
    }
    if (recibidoCents < neto) {
      setMensaje(`Faltan ${fmtMoneda(falta)} al cliente.`);
      return;
    }
    setConfirmando(true);
    mutarDep((d) => {
      registrarVenta(d, {
        punto: puntoSel || d.meta.punto || d.meta.puntoNombre || db.meta.dispositivo,
        items,
        descuentoPorciento: descPorciento,
        recibidoCents,
      });
    });
    setMensaje("");
    setConfirmando(false);
    props.onConfirmado();
  };

  return (
    <View style={estilos.contenido}>
      {mensaje ? <Aviso texto={mensaje} tipo="error" /> : null}
      {puntosVenta.length > 0 ? (
        <Tarjeta>
          <Text style={estilos.etiqueta}>Punto de venta</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {puntosVenta.map((p) => {
              const activo = p.id === puntoSel;
              return (
                <Boton
                  key={p.id}
                  texto={p.nombre}
                  variante={activo ? "primario" : "secundario"}
                  onPress={() => setPuntoSel(p.id)}
                />
              );
            })}
          </View>
        </Tarjeta>
      ) : null}
      <Tarjeta>
        <Text style={estilos.etiqueta}>Venta pendiente</Text>
        {props.carrito.map((l) => (
          <View key={l.producto.id} style={[estilos.fila, { paddingVertical: 2 }]}>
            <Text style={{ flex: 1 }} numberOfLines={1}>{l.producto.nombre} × {l.cantidad}</Text>
            <Text>{fmtMoneda(Math.round(l.producto.precioCents * l.cantidad))}</Text>
          </View>
        ))}
        <View style={[estilos.fila, { marginTop: 8 }]}>
          <View style={{ width: "45%" }}>
            <Text style={estilos.etiqueta}>Descuento %</Text>
            <TextInput
              value={descuento}
              onChangeText={(t) => setDescuento(t.replace(/[^\d]/g, ""))}
              keyboardType="number-pad"
              style={estilos.cajaInput}
            />
          </View>
          <View style={{ alignItems: "flex-end", marginTop: 8 }}>
            {pctDescuento > 0 ? <Text style={{ color: colores.peligro }}>− {fmtMoneda(pctDescuento)}</Text> : null}
            <Text style={estilos.montoGrande}>{fmtMoneda(neto)}</Text>
          </View>
        </View>
      </Tarjeta>

      <Tarjeta>
        <View style={[estilos.fila, { marginBottom: 8 }]}>
          <Text style={estilos.etiqueta}>Recibió el cliente</Text>
          <Text style={estilos.monto}>{fmtMoneda(recibidoCents)}</Text>
        </View>
        {falta > 0 ? (
          <Aviso texto={`Faltan ${fmtMoneda(falta)}`} tipo="error" />
        ) : (
          <Aviso texto={`Cambio a devolver: ${fmtMoneda(cambio)}`} tipo="ok" />
        )}
        <TecladoNumerico valor={recibido} onCambiar={setRecibido} />
        {cambio > 0 && desglose.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={estilos.etiqueta}>Con estos billetes</Text>
            <View style={[estilos.fila, { flexWrap: "wrap", gap: 6, marginTop: 4 }]}>
              {desglose.map((d) => (
                <View key={d.unidad} style={s.chipDesglose}>
                  <Text style={s.chipTexto}>{d.piezas}× {d.unidad}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Tarjeta>

      <View style={[estilos.fila, { gap: 10 }]}>
        <View style={{ flex: 1 }}>
          <Boton texto="Cancelar" variante="secundario" onPress={props.onCancelar} />
        </View>
        <View style={{ flex: 2 }}>
          <Boton
            texto={confirmando ? "Guardando…" : "Confirmar venta"}
            onPress={confirmar}
            deshabilitado={confirmando || recibidoCents < neto}
            grande
          />
        </View>
      </View>
    </View>
  );
}

const s = {
  producto: {
    backgroundColor: colores.tarjeta,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 10,
    margin: 4,
    minHeight: 92,
    justifyContent: "space-between",
  },
  productoNombre: { fontSize: 14, fontWeight: "600", color: colores.texto },
  productoPrecio: { fontSize: 15, fontWeight: "800", color: colores.primario, marginTop: 6 },
  productoStock: { fontSize: 12, color: colores.textoSuave, marginTop: 4 },
  botonCantidad: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.blanco,
  },
  cantidadInput: {
    flex: 1,
    height: 30,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: colores.texto,
    backgroundColor: colores.blanco,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  panelCarrito: {
    backgroundColor: colores.blanco,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    padding: 12,
    paddingBottom: 18,
  },
  masMenos: { fontSize: 20, fontWeight: "800", color: colores.primario, paddingHorizontal: 8 },
  chipDesglose: {
    backgroundColor: colores.primarioClaro,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTexto: { color: colores.primario, fontWeight: "700" },
} as const;