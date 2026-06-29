// Edge function: enviar-lembretes-diarios
// Cron diário às 23h UTC (20h BRT). Decide e envia lembretes pré-Copa e véspera-de-jogo.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Bolão dos Perebas <onboarding@resend.dev>";
// SITE_URL é resolvido em runtime a partir do setting `app_url_publico` (fonte única).
let SITE_URL = "https://pal-pool-palooza.lovable.app";

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

async function sbRpc(name: string, params: unknown) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error(`RPC ${name}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function getSetting(key: string): Promise<any> {
  const rows = await sbGet(`settings?key=eq.${key}&select=value`);
  return rows[0]?.value ?? null;
}

function todayBRT(): string {
  // Date YYYY-MM-DD em America/Sao_Paulo
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(new Date());
}
function addDays(yyyymmdd: string, n: number): string {
  const d = new Date(`${yyyymmdd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00Z`).getTime();
  const db = new Date(`${b}T12:00:00Z`).getTime();
  return Math.round((db - da) / 86400000);
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

function emailShell(inner: string, apelido: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
${inner}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px;">
<p style="font-size:11px;color:#999;">Oi ${apelido}, esse é um lembrete automático do Bolão dos Perebas. <a href="${SITE_URL}/app/perfil" style="color:#16a34a;">Ajustar preferências de email</a>.</p>
</div>`;
}

type EstadoPereba = {
  quotas_ativas: number;
  tem_top4: boolean;
  palpites_faltantes_total: number;
};

async function coletarEstadoPereba(userId: string): Promise<EstadoPereba> {
  const quotas = await sbGet(`quotas?user_id=eq.${userId}&status=eq.ativa&select=id`);
  const quotasAtivas = quotas.length;
  let temTop4 = false;
  let faltantesTotal = 0;
  if (quotasAtivas > 0) {
    const ids = quotas.map((q: any) => q.id).join(",");
    const top4 = await sbGet(`top4_predictions?quota_id=in.(${ids})&select=quota_id&limit=1`);
    temTop4 = top4.length > 0;
    // jogos agendados ainda não travados
    const jogos = await sbGet(`matches?status=eq.agendado&select=id`);
    const totalSlots = jogos.length * quotasAtivas;
    if (totalSlots > 0) {
      const matchIds = jogos.map((m: any) => m.id).join(",");
      const preds = await sbGet(
        `predictions?quota_id=in.(${ids})&match_id=in.(${matchIds})&submetido_em=not.is.null&select=id`,
      );
      faltantesTotal = Math.max(0, totalSlots - preds.length);
    }
  }
  return { quotas_ativas: quotasAtivas, tem_top4: temTop4, palpites_faltantes_total: faltantesTotal };
}

function montarEmailPreCopa(
  dias: number,
  pereba: { nome: string; apelido: string },
  estado: EstadoPereba,
): { subject: string; html: string } {
  const apelido = pereba.apelido || pereba.nome.split(" ")[0];
  const subjects: Record<number, string> = {
    14: "Faltam 2 semanas pra Copa começar — você tá pronto?",
    7: "Última semana! Hora de revisar seus palpites",
    3: "Faltam 3 dias — última chance pra encarar a Copa de cabeça erguida",
    2: "Daqui a 2 dias começa — você palpitou?",
    1: "É amanhã, peraba! Última chance de fingir confiança nos palpites",
  };
  const subject = subjects[dias] ?? `Faltam ${dias} dias pra Copa`;

  const blocos: string[] = [];
  if (estado.quotas_ativas === 0) {
    blocos.push(`<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:8px;">
      <p style="margin:0;font-weight:bold;">🚨 Você se cadastrou mas ainda não comprou quota.</p>
      <p style="margin:8px 0 0;">Vai perder essa? <a href="${SITE_URL}/app/comprar-quota" style="color:#dc2626;font-weight:bold;">Adquira sua quota agora</a>.</p>
    </div>`);
  } else {
    if (!estado.tem_top4) {
      blocos.push(`<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0;border-radius:8px;">
        <p style="margin:0;font-weight:bold;">🏆 Você ainda não fez o palpite Top 4!</p>
        <p style="margin:8px 0 0;">Vale até 4.000 pontos. <a href="${SITE_URL}/app/palpites/top4" style="color:#f59e0b;font-weight:bold;">Palpitar Top 4</a>.</p>
      </div>`);
    }
    if (estado.palpites_faltantes_total > 0) {
      blocos.push(`<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 16px;margin:16px 0;border-radius:8px;">
        <p style="margin:0;">Você tem <strong>${estado.palpites_faltantes_total}</strong> palpite${estado.palpites_faltantes_total > 1 ? "s" : ""} faltante${estado.palpites_faltantes_total > 1 ? "s" : ""} nos próximos jogos.</p>
        <p style="margin:8px 0 0;"><a href="${SITE_URL}/app/palpites" style="color:#3b82f6;font-weight:bold;">Palpitar agora</a></p>
      </div>`);
    }
    if (estado.tem_top4 && estado.palpites_faltantes_total === 0) {
      blocos.push(`<div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;margin:16px 0;border-radius:8px;">
        <p style="margin:0;">✅ Tá tudo no jeito, peraba. Só revisar antes de cada jogo travar.</p>
      </div>`);
    }
  }

  const inner = `
    <h1 style="font-size:22px;margin:0 0 12px;">Olá, ${apelido}!</h1>
    <p style="font-size:15px;line-height:1.5;">${dias === 1 ? "É amanhã" : `Faltam <strong>${dias} dia${dias > 1 ? "s" : ""}</strong>`} pra Copa começar.</p>
    ${blocos.join("\n")}
    <p style="margin:24px 0;"><a href="${SITE_URL}/app" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">Entrar no bolão</a></p>
  `;
  return { subject, html: emailShell(inner, apelido) };
}

function montarEmailVespera(
  pereba: { nome: string; apelido: string },
  faltantes: number,
  jogos: any[],
): { subject: string; html: string } {
  const apelido = pereba.apelido || pereba.nome.split(" ")[0];
  const subject = `${apelido}, você tem ${faltantes} palpite${faltantes > 1 ? "s" : ""} faltante${faltantes > 1 ? "s" : ""} pros jogos de amanhã`;
  const listaJogos = jogos.map((j) => `<li>${j.casa} × ${j.fora}</li>`).join("");
  const inner = `
    <h1 style="font-size:22px;margin:0 0 12px;">Olá, ${apelido}!</h1>
    <p style="font-size:15px;line-height:1.5;">Amanhã tem jogo, peraba! Você ainda tá com <strong>${faltantes}</strong> palpite${faltantes > 1 ? "s" : ""} em aberto.</p>
    <p style="font-size:14px;margin:16px 0 8px;font-weight:bold;">Jogos de amanhã:</p>
    <ul style="font-size:14px;line-height:1.8;padding-left:20px;margin:0;">${listaJogos}</ul>
    <p style="margin:24px 0;"><a href="${SITE_URL}/app/palpites" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;">Palpitar agora</a></p>
    <p style="font-size:13px;color:#666;">Tá esperando o quê?</p>
  `;
  return { subject, html: emailShell(inner, apelido) };
}

import { requireCronSecret } from "../_shared/require-cron-secret.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const cronGate = requireCronSecret(req);
  if (cronGate) return cronGate;


  try {
    const appUrl = (await getSetting("app_url_publico")) as string | null;
    if (typeof appUrl === "string" && appUrl) SITE_URL = appUrl.replace(/\/+$/, "");

    const hoje = todayBRT();
    const amanha = addDays(hoje, 1);
    const copaInicio = ((await getSetting("copa_data_inicio")) as string) ?? "2026-06-11";
    const diasParaCopa = daysBetween(hoje, copaInicio);

    let totalEnviados = 0;
    const erros: any[] = [];

    if (diasParaCopa > 0) {
      const marcos = ((await getSetting("lembrete_pre_copa_marcos")) as number[]) ?? [14, 7, 3, 2, 1];
      if (marcos.includes(diasParaCopa)) {
        const tipo = `pre_copa_${diasParaCopa}d`;
        const perebas = await sbGet(
          `profiles?recebe_lembretes_email=eq.true&ativo=eq.true&select=id,nome,apelido,email`,
        );

        for (const p of perebas) {
          if (!p.email) continue;
          const ja = await sbGet(
            `lembretes_enviados?profile_id=eq.${p.id}&tipo=eq.${tipo}&data_referencia=eq.${hoje}&select=id`,
          );
          if (ja.length > 0) continue;

          try {
            const estado = await coletarEstadoPereba(p.id);
            const { subject, html } = montarEmailPreCopa(diasParaCopa, p, estado);
            await enviarEmailResend(p.email, subject, html);
            await sbPost("lembretes_enviados", {
              profile_id: p.id, tipo, data_referencia: hoje, status: "enviado",
            });
            totalEnviados++;
          } catch (e) {
            erros.push({ profile_id: p.id, erro: (e as Error).message });
            await sbPost("lembretes_enviados", {
              profile_id: p.id, tipo, data_referencia: hoje, status: "falhou", erro: (e as Error).message,
            });
          }
        }
      }
    } else {
      const tipo = "palpite_vespera";
      const jogosAmanha = await sbGet(
        `matches?status=eq.agendado&data_jogo=gte.${amanha}T00:00:00&data_jogo=lt.${addDays(amanha, 1)}T00:00:00&select=id,casa,fora,data_jogo`,
      );
      if (jogosAmanha.length > 0) {
        const perebas = await sbRpc("get_perebas_com_palpite_faltante", { p_data_alvo: amanha });
        for (const p of perebas) {
          if (!p.recebe_lembretes_email || !p.email) continue;
          const ja = await sbGet(
            `lembretes_enviados?profile_id=eq.${p.id}&tipo=eq.${tipo}&data_referencia=eq.${hoje}&select=id`,
          );
          if (ja.length > 0) continue;

          try {
            const { subject, html } = montarEmailVespera(p, p.palpites_faltantes, jogosAmanha);
            await enviarEmailResend(p.email, subject, html);
            await sbPost("lembretes_enviados", {
              profile_id: p.id, tipo, data_referencia: hoje, status: "enviado",
            });
            totalEnviados++;
          } catch (e) {
            erros.push({ profile_id: p.id, erro: (e as Error).message });
            await sbPost("lembretes_enviados", {
              profile_id: p.id, tipo, data_referencia: hoje, status: "falhou", erro: (e as Error).message,
            });
          }
        }
      }
    }

    await sbPost("audit_log", {
      acao: "enviou_lembretes",
      entidade: "sistema",
      entidade_id: hoje,
      ator_nome: "sistema",
      payload: { total_enviados: totalEnviados, erros: erros.length, dias_para_copa: diasParaCopa },
    });

    return json({ ok: true, total_enviados: totalEnviados, erros: erros.length, dias_para_copa: diasParaCopa });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
