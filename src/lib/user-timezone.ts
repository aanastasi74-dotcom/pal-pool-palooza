const tzLabelMap: Record<string, string> = {
  "America/Sao_Paulo": "BRASÍLIA",
  "America/Mexico_City": "CIDADE DO MÉXICO",
  "America/Buenos_Aires": "BUENOS AIRES",
  "America/Argentina/Buenos_Aires": "BUENOS AIRES",
  "America/Bogota": "BOGOTÁ",
  "America/Lima": "LIMA",
  "America/Santiago": "SANTIAGO",
  "Europe/Lisbon": "LISBOA",
  "Europe/Madrid": "MADRI",
  "America/New_York": "NOVA YORK",
  "America/Los_Angeles": "LOS ANGELES",
  "Europe/London": "LONDRES",
};

export function getUserTimezoneLabel(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return "LOCAL";
    return (
      tzLabelMap[tz] ??
      tz.split("/").pop()?.replace(/_/g, " ").toUpperCase() ??
      "LOCAL"
    );
  } catch {
    return "LOCAL";
  }
}
