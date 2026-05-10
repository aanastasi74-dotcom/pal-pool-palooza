// Edge function: lembrete-palpite
// POST {} → envia e-mail aos usuários com quotas ativas que ainda não palpitaram em jogos travando em ~1h.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const FROM = "Bolão dos Perebas <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

async function sb(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const now = new Date();
    const min = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const max = new Date(now.getTime() + 90 * 60 * 1000).toISOString();

    const matches = await sb(
      `matches?travado_em=gte.${min}&travado_em=lte.${max}&select=id,casa,fora,travado_em`,
    );
    if (!matches.length) return json({ success: true, lembretes: 0, matches: 0 });

    const quotas = await sb(`quotas?status=eq.ativa&select=id,numero,user_id`);
    const userIds = Array.from(new Set(quotas.map((q: any) => q.user_id)));
    if (!userIds.length) return json({ success: true, lembretes: 0, matches: matches.length });

    const profiles = await sb(`profiles?id=in.(${userIds.join(",")})&ativo=eq.true&select=id,email,nome,notificacoes`);
    const profilesMap: Record<string, any> = Object.fromEntries(profiles.map((p: any) => [p.id, p]));

    let enviados = 0;
    for (const m of matches) {
      const preds = await sb(
        `predictions?match_id=eq.${m.id}&submetido_em=not.is.null&select=quota_id`,
      );
      const palpitadas = new Set(preds.map((p: any) => p.quota_id));
      const pendentes = quotas.filter((q: any) => !palpitadas.has(q.id));

      for (const q of pendentes) {
        const prof = profilesMap[q.user_id];
        if (!prof || !prof.email) continue;
        if (prof.notificacoes?.antesDeTravar === false) continue;

        const link = `${SITE_URL}/app/palpites`;
        const html = `
          <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <h1 style="font-size:20px;">Falta ~1h, ${prof.nome.split(" ")[0]}!</h1>
            <p>O jogo <strong>${m.casa} × ${m.fora}</strong> trava daqui a pouco e sua <strong>Quota #${q.numero}</strong> ainda não palpitou. Vai lá, peraba.</p>
            <p style="margin:24px 0;"><a href="${link}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;">Palpitar agora</a></p>
          </div>`;
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: FROM,
            to: [prof.email],
            subject: `Faltam ~1h pra ${m.casa} x ${m.fora} — palpita aí, peraba`,
            html,
          }),
        });
        if (r.ok) enviados++;
      }
    }
    return json({ success: true, lembretes: enviados, matches: matches.length });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
