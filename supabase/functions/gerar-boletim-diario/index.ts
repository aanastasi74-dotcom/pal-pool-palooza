// Edge function: gerar-boletim-diario
// POST {} → gera boletim do dia (rascunho) usando template fixo.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function sb(path: string, init: RequestInit = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

function gerarTexto(quotas: any[], perfis: any[]): { titulo: string; conteudo: string } {
  if (!quotas.length) return { titulo: "Boletim do dia", conteudo: "Sem movimentação na perebada hoje." };
  const top3 = quotas.slice(0, 3);
  const refDe = (q: any) => {
    const p = perfis.find((x) => x.participante_id === q.user_id);
    if (!p) return q.profile?.nome ?? `Quota #${q.numero}`;
    const alt = p.apelidos_alternativos?.[0];
    return alt ? `${p.apelido_principal} (${alt})` : p.apelido_principal;
  };
  const brincadeira = (q: any) => {
    const p = perfis.find((x) => x.participante_id === q.user_id);
    return p?.tracos?.[0]?.brincadeira ?? "sem comentários hoje";
  };

  const partes: string[] = [];
  const lider = top3[0];
  partes.push(`${refDe(lider)} segue na ponta com ${(lider.pontos ?? 0).toLocaleString("pt-BR")} pts — ${brincadeira(lider)}.`);
  if (top3[1] && top3[2]) partes.push(`${refDe(top3[1])} cola em segundo, e ${refDe(top3[2])} fecha o pódio.`);
  return {
    titulo: `${refDe(lider)} na ponta, perebada acompanha`,
    conteudo: partes.join(" "),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const cfg = await sb(`settings?key=eq.boletim_config&select=value`);
    const config = cfg[0]?.value ?? { auto_geracao: true };
    if (config.auto_geracao === false) return json({ skipped: true });

    const quotas = await sb(`quotas?select=id,user_id,numero,pontos&order=pontos.desc&limit=5`);
    const perfis = await sb(`personality_profiles?select=*`);
    // tentativa best-effort de buscar nomes
    const userIds = quotas.map((q: any) => q.user_id).filter(Boolean);
    let profilesMap: Record<string, any> = {};
    if (userIds.length) {
      const profs = await sb(`profiles?id=in.(${userIds.join(",")})&select=id,nome,apelido`);
      profilesMap = Object.fromEntries(profs.map((p: any) => [p.id, p]));
    }
    const enriched = quotas.map((q: any) => ({ ...q, profile: profilesMap[q.user_id] }));

    const { titulo, conteudo } = gerarTexto(enriched, perfis);
    const hoje = new Date().toISOString().slice(0, 10);

    const inserted = await sb(`bulletins`, {
      method: "POST",
      body: JSON.stringify({ data: hoje, titulo, conteudo, conteudo_original: conteudo, status: "rascunho" }),
    });
    return json({ success: true, boletim_id: inserted[0]?.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
