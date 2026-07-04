import { Radio } from "lucide-react";

type Props = {
  status_api: string | null | undefined;
  minuto_atual: number | null | undefined;
  minuto_extra: number | null | undefined;
  status: string;
  className?: string;
};

function fmtMinuto(min: number | null | undefined, extra: number | null | undefined) {
  const m = min ?? 0;
  if (extra && extra > 0) return `${m}'+${extra}`;
  return `${m}'`;
}

export function TempoJogoLive({ status_api, minuto_atual, minuto_extra, status, className }: Props) {
  if (status !== "ao-vivo" || !status_api) return null;

  let label: string | null = null;
  let pulse = false;

  switch (status_api) {
    case "1H":
      label = `${fmtMinuto(minuto_atual, minuto_extra)} 1T`;
      break;
    case "2H":
      label = `${fmtMinuto(minuto_atual, minuto_extra)} 2T`;
      break;
    case "HT":
      label = "Intervalo";
      break;
    case "ET":
      label = `${fmtMinuto(minuto_atual, minuto_extra)} Prorr.`;
      break;
    case "BT":
      label = "Intervalo Prorr.";
      break;
    case "P":
    case "PEN":
      label = "Pênaltis";
      pulse = true;
      break;
    case "LIVE":
    case "INT":
      label = fmtMinuto(minuto_atual, minuto_extra);
      break;
    default:
      return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive ${className ?? ""}`}
    >
      <Radio className={`h-3 w-3 ${pulse ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
