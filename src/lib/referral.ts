const STORAGE_KEY = "perebas_referral";
const codigoPattern = /^[A-Za-z0-9_-]{2,80}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Referral = {
  codigo: string;
  competicao?: string;
};

function referralValido(value: unknown): value is Referral {
  if (!value || typeof value !== "object") return false;
  const referral = value as Partial<Referral>;
  return (
    typeof referral.codigo === "string" &&
    codigoPattern.test(referral.codigo) &&
    (referral.competicao === undefined ||
      (typeof referral.competicao === "string" && slugPattern.test(referral.competicao)))
  );
}

export function getStoredReferral(): Referral | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return referralValido(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function captureReferral(defaultCompetition?: string): Referral | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const codigoUrl = params.get("ref")?.trim();
  const competicaoUrl = params.get("comp")?.trim().toLowerCase();
  const armazenado = getStoredReferral();
  const codigo = codigoUrl && codigoPattern.test(codigoUrl) ? codigoUrl : armazenado?.codigo;
  if (!codigo) return null;

  const candidatoCompeticao = competicaoUrl || armazenado?.competicao || defaultCompetition;
  const competicao =
    candidatoCompeticao && slugPattern.test(candidatoCompeticao)
      ? candidatoCompeticao
      : undefined;
  const referral: Referral = { codigo, ...(competicao ? { competicao } : {}) };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(referral));
  return referral;
}