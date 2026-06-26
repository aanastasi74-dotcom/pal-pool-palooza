/**
 * Formata data/hora de jogo no timezone local do navegador.
 * Centraliza a renderização de `matches.data_jogo` em todo o frontend
 * para que hora e label sempre sejam coerentes (BRT em SP, CDMX no México,
 * JST no Japão, etc.).
 */

export type DataJogoFormatada = {
  dataLonga: string; // ex.: "SÁB., 27/06"
  dataCurta: string; // ex.: "27/06"
  hora: string; // ex.: "18:00"
  labelTimezone: string; // ex.: "CIDADE DO MÉXICO", "BRASÍLIA"
  timezoneRaw: string; // ex.: "America/Mexico_City"
};

const MAPA_TZ: Record<string, string> = {
  "America/Sao_Paulo": "BRASÍLIA",
  "America/Bahia": "BRASÍLIA",
  "America/Fortaleza": "BRASÍLIA",
  "America/Recife": "BRASÍLIA",
  "America/Maceio": "BRASÍLIA",
  "America/Araguaina": "BRASÍLIA",
  "America/Mexico_City": "CIDADE DO MÉXICO",
  "America/New_York": "NOVA YORK",
  "America/Los_Angeles": "LOS ANGELES",
  "America/Toronto": "TORONTO",
  "America/Vancouver": "VANCOUVER",
  "America/Chicago": "CHICAGO",
  "America/Denver": "DENVER",
  "America/Phoenix": "PHOENIX",
  "America/Buenos_Aires": "BUENOS AIRES",
  "America/Argentina/Buenos_Aires": "BUENOS AIRES",
  "America/Bogota": "BOGOTÁ",
  "America/Lima": "LIMA",
  "America/Santiago": "SANTIAGO",
  "America/Manaus": "MANAUS",
  "America/Belem": "BELÉM",
  "America/Cuiaba": "CUIABÁ",
  "America/Porto_Velho": "PORTO VELHO",
  "America/Rio_Branco": "RIO BRANCO",
  "America/Noronha": "FERNANDO DE NORONHA",
  "Europe/London": "LONDRES",
  "Europe/Lisbon": "LISBOA",
  "Europe/Madrid": "MADRI",
  "Europe/Paris": "PARIS",
  "Europe/Berlin": "BERLIM",
  "Europe/Rome": "ROMA",
  "Asia/Tokyo": "TÓQUIO",
  "Asia/Seoul": "SEUL",
  "Asia/Shanghai": "PEQUIM",
  "Asia/Dubai": "DUBAI",
  "Australia/Sydney": "SYDNEY",
};

export function getLabelTimezone(tz?: string): string {
  let zone = tz;
  if (!zone) {
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "LOCAL";
    }
  }
  if (!zone) return "LOCAL";
  if (MAPA_TZ[zone]) return MAPA_TZ[zone];
  const partes = zone.split("/");
  const ultimo = partes[partes.length - 1]?.replace(/_/g, " ").toUpperCase();
  return ultimo || "LOCAL";
}

function detectarTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatarDataJogo(timestamp: string | Date): DataJogoFormatada {
  const data = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const tz = detectarTz();

  const dataLonga = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: tz,
  })
    .format(data)
    .toUpperCase();

  const dataCurta = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: tz,
  }).format(data);

  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(data);

  return {
    dataLonga,
    dataCurta,
    hora,
    labelTimezone: getLabelTimezone(tz),
    timezoneRaw: tz,
  };
}
