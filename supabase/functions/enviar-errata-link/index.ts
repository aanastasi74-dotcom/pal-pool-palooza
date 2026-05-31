// Edge function: enviar-errata-link
// POST {} → manda errata para todos os perebas que receberam o último lote de lembretes
// (último valor de data_referencia em lembretes_enviados, somente status='enviado').
// Idempotente via UNIQUE (profile_id, tipo, data_referencia) com tipo='errata_link_url'.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Bolão dos Perebas <onboarding@resend.dev>";
const APP_URL_FALLBACK = "https://pal-pool-palooza.lovable.app";

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

async function sbGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbPost(path: string, body: unknown) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok && r.status !== 409) {
    throw new Error(`POST ${path}: ${r.status} ${await r.text()}`);
  }
  return r;
}

async function getAppUrl(): Promise<string> {
  try {
    const rows = await sbGet(`settings?key=eq.app_url_publico&select=value`);
    const v = (rows as Array<{ value: unknown }>)[0]?.value;
    if (typeof v === "string" && v) return v.replace(/\/+$/, "");
  } catch (_) {}
  return APP_URL_FALLBACK;
}

async function requireAdmin(req: Request): Promise<{ ok: true; userId: string } | { ok: false; res: Response }> {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return { ok: false, res: json({ error: "missing auth" }, 401) };
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${jwt}` },
  });
  if (!userRes.ok) return { ok: false, res: json({ error: "invalid jwt" }, 401) };
  const { id } = (await userRes.json()) as { id: string };
  const rows = await sbGet(`profiles?id=eq.${id}&select=role`);
  const role = (rows as Array<{ role: string }>)[0]?.role;
  if (role !== "admin") return { ok: false, res: json({ error: "forbidden" }, 403) };
  return { ok: true, userId: id };
}

function buildEmail(apelido: string, appUrl: string): { subject: string; html: string } {
  const subject = "Errata — link correto do Bolão dos Perebas";
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h1 style="font-size:20px;margin:0 0 12px;">Errata, ${apelido} 🙏</h1>
      <p style="font-size:15px;line-height:1.5;">
        O link do email anterior apontava pra nossa área de desenvolvimento e não dava acesso ao app — culpa nossa, foi um deslize de configuração.
      </p>
      <p style="font-size:15px;line-height:1.5;">O link correto do bolão é este:</p>
      <p style="margin:20px 0;">
        <a href="${appUrl}/app" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">
          Entrar no bolão
        </a>
      </p>
      <p style="font-size:13px;color:#666;word-break:break-all;">Se o botão não funcionar, copia e cola: ${appUrl}/app</p>
      <p style="font-size:14px;line-height:1.5;margin-top:24px;">Bora palpitar.</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0 12px;">
      <p style="font-size:11px;color:#999;">Bolão dos Perebas — errata automática.</p>
    </div>`;
  return { subject, html };
}

async function enviarEmailResend(to: string, subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

const ERRATA_TIPO = "errata_link_url";

async function descobrirUltimoLote(): Promise<{ data_referencia: string; profile_ids: string[] } | null> {
  // pega o maior data_referencia de envios bem-sucedidos
  const ultimos = await sbGet(
    `lembretes_enviados?status=eq.enviado&select=data_referencia&order=data_referencia.desc&limit=1`,
  );
  const ref = (ultimos as Array<{ data_referencia: string }>)[0]?.data_referencia;
  if (!ref) return null;
  const rows = await sbGet(
    `lembretes_enviados?status=eq.enviado&data_referencia=eq.${ref}&tipo=neq.${ERRATA_TIPO}&select=profile_id`,
  );
  const ids = Array.from(new Set((rows as Array<{ profile_id: string }>).map((r) => r.profile_id).filter(Boolean)));
  return { data_referencia: ref, profile_ids: ids };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") {
    // Endpoint de preview: quantos destinatários o último lote tem
    try {
      const lote = await descobrirUltimoLote();
      if (!lote) return json({ data_referencia: null, total: 0, pendentes: 0 });
      const jaEnviados = await sbGet(
        `lembretes_enviados?tipo=eq.${ERRATA_TIPO}&data_referencia=eq.${lote.data_referencia}&select=profile_id`,
      );
      const setEnviados = new Set((jaEnviados as Array<{ profile_id: string }>).map((r) => r.profile_id));
      const pendentes = lote.profile_ids.filter((id) => !setEnviados.has(id)).length;
      return json({
        data_referencia: lote.data_referencia,
        total: lote.profile_ids.length,
        pendentes,
      });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const lote = await descobrirUltimoLote();
    if (!lote) return json({ ok: true, total_enviados: 0, msg: "sem lote anterior" });

    const appUrl = await getAppUrl();

    // Busca perfis
    const ids = lote.profile_ids;
    if (ids.length === 0) return json({ ok: true, total_enviados: 0, data_referencia: lote.data_referencia });
    const perfis = await sbGet(
      `profiles?id=in.(${ids.join(",")})&ativo=eq.true&select=id,nome,apelido,email`,
    );

    let totalEnviados = 0;
    let totalPulados = 0;
    const erros: any[] = [];

    for (const p of perfis as Array<{ id: string; nome: string; apelido: string | null; email: string | null }>) {
      if (!p.email) { totalPulados++; continue; }
      // Idempotência: pula se já tem registro
      const ja = await sbGet(
        `lembretes_enviados?profile_id=eq.${p.id}&tipo=eq.${ERRATA_TIPO}&data_referencia=eq.${lote.data_referencia}&select=id`,
      );
      if ((ja as any[]).length > 0) { totalPulados++; continue; }

      const apelido = p.apelido || p.nome.split(" ")[0];
      const { subject, html } = buildEmail(apelido, appUrl);
      try {
        await enviarEmailResend(p.email, subject, html);
        await sbPost("lembretes_enviados", {
          profile_id: p.id,
          tipo: ERRATA_TIPO,
          data_referencia: lote.data_referencia,
          status: "enviado",
        });
        totalEnviados++;
      } catch (e) {
        erros.push({ profile_id: p.id, erro: (e as Error).message });
        await sbPost("lembretes_enviados", {
          profile_id: p.id,
          tipo: ERRATA_TIPO,
          data_referencia: lote.data_referencia,
          status: "falhou",
          erro: (e as Error).message,
        });
      }
    }

    await sbPost("audit_log", {
      acao: "enviou_errata_link",
      entidade: "sistema",
      entidade_id: lote.data_referencia,
      ator_id: auth.userId,
      ator_nome: "admin",
      payload: { total_enviados: totalEnviados, total_pulados: totalPulados, erros: erros.length },
    });

    return json({
      ok: true,
      data_referencia: lote.data_referencia,
      total_enviados: totalEnviados,
      total_pulados: totalPulados,
      erros: erros.length,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
