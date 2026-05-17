// Placar no padrão UOL: tempo normal + prorrogação somados, com pênaltis entre parênteses
// e linha auxiliar mostrando o placar do tempo normal quando houve prorrogação.
//
// Convenção: matches.placar_casa/placar_fora = SEMPRE tempo normal (90 + acréscimos).
// Prorrogação fica em placar_casa_prorrogacao/placar_fora_prorrogacao (nullable).
// Pênaltis em penaltis_casa/penaltis_fora (nullable).

type PlacarJogoProps = {
  placar_casa: number | null;
  placar_fora: number | null;
  placar_casa_prorrogacao?: number | null;
  placar_fora_prorrogacao?: number | null;
  penaltis_casa?: number | null;
  penaltis_fora?: number | null;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function PlacarJogo({
  placar_casa,
  placar_fora,
  placar_casa_prorrogacao,
  placar_fora_prorrogacao,
  penaltis_casa,
  penaltis_fora,
  className,
  size = "md",
}: PlacarJogoProps) {
  if (placar_casa == null || placar_fora == null) {
    return <span className={className}>—</span>;
  }
  const teveProrr =
    placar_casa_prorrogacao != null && placar_fora_prorrogacao != null;
  const tevePen = penaltis_casa != null && penaltis_fora != null;

  const finalCasa = placar_casa + (placar_casa_prorrogacao ?? 0);
  const finalFora = placar_fora + (placar_fora_prorrogacao ?? 0);

  const sizeCls =
    size === "lg"
      ? "text-4xl"
      : size === "sm"
        ? "text-xl"
        : "text-3xl";

  return (
    <div className={className}>
      <p className={`font-display ${sizeCls} font-black leading-tight`}>
        {tevePen && (
          <span className="mr-1 text-muted-foreground">({penaltis_casa})</span>
        )}
        {finalCasa} <span className="text-muted-foreground">×</span> {finalFora}
        {tevePen && (
          <span className="ml-1 text-muted-foreground">({penaltis_fora})</span>
        )}
      </p>
      {teveProrr && (
        <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          Tempo normal: {placar_casa}×{placar_fora}
        </p>
      )}
    </div>
  );
}
