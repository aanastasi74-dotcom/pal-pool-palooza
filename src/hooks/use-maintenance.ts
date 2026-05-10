import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const RO_KEY = "perebas:readOnly";
const MT_KEY = "perebas:maintenance";
const BK_KEY = "perebas:autoBackup";

type Flags = { readOnly: boolean; maintenance: boolean; autoBackup: boolean };

function readCache(): Flags {
  if (typeof window === "undefined") return { readOnly: false, maintenance: false, autoBackup: true };
  return {
    readOnly: window.localStorage.getItem(RO_KEY) === "1",
    maintenance: window.localStorage.getItem(MT_KEY) === "1",
    autoBackup: window.localStorage.getItem(BK_KEY) !== "0",
  };
}

function writeCache(f: Flags) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RO_KEY, f.readOnly ? "1" : "0");
  window.localStorage.setItem(MT_KEY, f.maintenance ? "1" : "0");
  window.localStorage.setItem(BK_KEY, f.autoBackup ? "1" : "0");
  window.dispatchEvent(new Event("perebas:flags"));
}

async function fetchFromDb(): Promise<Flags | null> {
  const { data } = await supabase.from("settings").select("value").eq("key", "maintenance_mode").maybeSingle();
  if (!data?.value) return null;
  const v = data.value as any;
  return { readOnly: !!v.read_only, maintenance: !!v.total, autoBackup: v.auto_backup !== false };
}

async function persistToDb(f: Flags) {
  await supabase.from("settings").upsert(
    { key: "maintenance_mode", value: { read_only: f.readOnly, total: f.maintenance, auto_backup: f.autoBackup }, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
}

export function useMaintenanceMode() {
  const [state, setState] = useState<Flags>(readCache);

  useEffect(() => {
    let mounted = true;
    fetchFromDb().then((f) => {
      if (!mounted || !f) return;
      setState(f);
      writeCache(f);
    });
    const handler = () => setState(readCache());
    window.addEventListener("perebas:flags", handler);
    window.addEventListener("storage", handler);
    return () => {
      mounted = false;
      window.removeEventListener("perebas:flags", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return state;
}

export function useMaintenanceActions() {
  const qc = useQueryClient();
  const apply = async (patch: Partial<Flags>) => {
    const cur = readCache();
    const next = { ...cur, ...patch };
    writeCache(next);
    await persistToDb(next);
    qc.invalidateQueries({ queryKey: ["settings"] });
  };
  return {
    setReadOnly: (v: boolean) => apply({ readOnly: v }),
    setMaintenance: (v: boolean) => apply({ maintenance: v }),
    setAutoBackup: (v: boolean) => apply({ autoBackup: v }),
  };
}

// Backwards-compat helpers (sync, fire-and-forget DB upsert)
export function setReadOnly(v: boolean) {
  const cur = readCache();
  const next = { ...cur, readOnly: v };
  writeCache(next);
  persistToDb(next).catch(() => {});
}
export function setMaintenance(v: boolean) {
  const cur = readCache();
  const next = { ...cur, maintenance: v };
  writeCache(next);
  persistToDb(next).catch(() => {});
}
export function setAutoBackup(v: boolean) {
  const cur = readCache();
  const next = { ...cur, autoBackup: v };
  writeCache(next);
  persistToDb(next).catch(() => {});
}
