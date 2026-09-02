// =============================================================
// estado.tsx — Estado global de la app: identidad + bases de datos.
// Monta el modelo en memoria y lo persiste automáticamente con cada
// cambio (guardado atómico JSON, igual que el otro sistema).
// =============================================================
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DependienteDb, GestionDb, plantillaDependiente, plantillaGestion } from "../core/types";
import { Repo } from "../core/repo";
import { Rol, crearRepo, identidad } from "./helpersRN";

interface AppEstado {
  rol: Rol;
  dispositivo: string;
  cargo: boolean;
  error: string;
  // Dependiente
  depRepo: Repo;
  depDb: DependienteDb;
  mutarDep: (fn: (db: DependienteDb) => void) => void;
  reemplazarDep: (db: DependienteDb) => void;
  guardarDep: () => Promise<void>;
  // Gestión
  gestRepo: Repo;
  gestDb: GestionDb;
  mutarGest: (fn: (db: GestionDb) => void) => void;
  reemplazarGest: (db: GestionDb) => void;
  guardarGest: () => Promise<void>;
}

const Ctx = createContext<AppEstado | null>(null);

export function Proveedor({ rol, children }: { rol: Rol; children: React.ReactNode }) {
  const depRepoMemo = useMemo(() => crearRepo("dependiente"), []);
  const gestRepoMemo = useMemo(() => crearRepo("gestion"), []);
  const [depDb, setDepDb] = useState<DependienteDb>(plantillaDependiente());
  const [gestDb, setGestDb] = useState<GestionDb>(plantillaGestion());
  const [dispositivo, setDispositivo] = useState("");
  const [cargo, setCargo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const ide = await identidad(rol);
        if (!activo) return;
        setDispositivo(ide.dispositivo);
        if (rol === "dependiente") {
          if (!depDb.meta.dispositivo) depDb.meta.dispositivo = ide.dispositivo;
          const cargada = await depRepoMemo.cargarDependiente();
          if (!cargada.meta.dispositivo) cargada.meta.dispositivo = ide.dispositivo;
          setDepDb(cargada);
        } else {
          const cargada = await gestRepoMemo.cargarGestion();
          setGestDb(cargada);
        }
        setCargo(true);
      } catch (e) {
        if (activo) setError(String(e));
      }
    })();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  const mutarDep = (fn: (db: DependienteDb) => void) => {
    setDepDb((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as DependienteDb;
      fn(copia);
      depRepoMemo.guardarDependiente(copia).catch((e) => console.warn("guardar dep", e));
      return copia;
    });
  };

  const reemplazarDep = (nueva: DependienteDb) => {
    depRepoMemo.guardarDependiente(nueva).catch((e) => console.warn("guardar dep", e));
    setDepDb(nueva);
  };

  const mutarGest = (fn: (db: GestionDb) => void) => {
    setGestDb((prev) => {
      const copia = JSON.parse(JSON.stringify(prev)) as GestionDb;
      fn(copia);
      gestRepoMemo.guardarGestion(copia).catch((e) => console.warn("guardar gest", e));
      return copia;
    });
  };

  const reemplazarGest = (nueva: GestionDb) => {
    gestRepoMemo.guardarGestion(nueva).catch((e) => console.warn("guardar gest", e));
    setGestDb(nueva);
  };

  const valor: AppEstado = {
    rol,
    dispositivo,
    cargo,
    error,
    depRepo: depRepoMemo,
    depDb,
    mutarDep,
    reemplazarDep,
    guardarDep: () => depRepoMemo.guardarDependiente(depDb),
    gestRepo: gestRepoMemo,
    gestDb,
    mutarGest,
    reemplazarGest,
    guardarGest: () => gestRepoMemo.guardarGestion(gestDb),
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useApp(): AppEstado {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp debe usarse dentro de <Proveedor>");
  return ctx;
}