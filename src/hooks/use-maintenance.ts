import { useEffect, useState } from "react";

const RO_KEY = "perebas:readOnly";
const MT_KEY = "perebas:maintenance";
const BK_KEY = "perebas:autoBackup";

function read(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) === "1";
}

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("perebas:flags"));
  }
}

export function setReadOnly(v: boolean) {
  localStorage.setItem(RO_KEY, v ? "1" : "0");
  emit();
}
export function setMaintenance(v: boolean) {
  localStorage.setItem(MT_KEY, v ? "1" : "0");
  emit();
}
export function setAutoBackup(v: boolean) {
  localStorage.setItem(BK_KEY, v ? "1" : "0");
  emit();
}

export function useMaintenanceMode() {
  const [state, setState] = useState(() => ({
    readOnly: read(RO_KEY),
    maintenance: read(MT_KEY),
    autoBackup: read(BK_KEY, true),
  }));

  useEffect(() => {
    const handler = () =>
      setState({
        readOnly: read(RO_KEY),
        maintenance: read(MT_KEY),
        autoBackup: read(BK_KEY, true),
      });
    window.addEventListener("perebas:flags", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("perebas:flags", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return state;
}
