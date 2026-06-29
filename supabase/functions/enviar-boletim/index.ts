// Edge function: enviar-boletim
// POST { boletim_id: uuid, force_resend?: boolean }
// Envia o publicado_md por email pra todos os perebas com quota ativa.

import { marked } from "https://esm.sh/marked@12.0.2";
import { requireAdmin } from "../_shared/require-admin.ts";

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

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

async function sbGet(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
  if (!r.ok) throw new Error(`GET ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbPatch(path: string, body: unknown) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${path}: ${r.status} ${await r.text()}`);
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
}

async function getAppUrl(): Promise<string> {
  try {
    const rows = await sbGet(`settings?key=eq.app_url_publico&select=value`);
    const v = rows[0]?.value;
    if (typeof v === "string" && v) return v.replace(/\/+$/, "");
  } catch (_) {}
  return APP_URL_FALLBACK;
}

function formatarData(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

function emailShell(htmlConteudo: string, appUrl: string, dataLabel: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1a1a1a;background:#fff;">
  <div style="border-bottom:2px solid #16a34a;padding-bottom:12px;margin-bottom:20px;">
    <p style="margin:0;font-size:12px;color:#16a34a;font-weight:bold;letter-spacing:1px;">BOLETIM DO DIA</p>
    <h1 style="margin:4px 0 0;font-size:22px;">${dataLabel}</h1>
  </div>
  <div style="font-size:15px;line-height:1.6;">
    ${htmlConteudo}
  </div>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px;">
  <p style="margin:0 0 8px;"><a href="${appUrl}/app" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block;font-size:13px;">Entrar no bolão</a></p>
  <p style="font-size:11px;color:#999;margin-top:16px;">Boletim automático do Bolão dos Perebas. Achou algo errado? <a href="${appUrl}/app" style="color:#16a34a;">Reportar problema</a>.</p>
</div>`;
}

async function enviarResend(to: string, subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { boletim_id, force_resend } = await req.json();
    if (!boletim_id) return json({ error: "boletim_id required" }, 400);

    const [boletim] = await sbGet(
      `boletins?id=eq.${boletim_id}&select=id,data_referencia,status,publicado_md,enviado_em,publicado_por`,
    );
    if (!boletim) return json({ error: "Boletim não encontrado" }, 404);
    if (boletim.status !== "publicado") return json({ error: "Boletim não publicado" }, 400);
    if (!boletim.publicado_md || !boletim.publicado_md.trim()) {
      return json({ error: "Conteúdo vazio" }, 400);
    }

    if (boletim.enviado_em && !force_resend) {
      return json({
        ok: true,
        skipped: true,
        motivo: `já enviado em ${boletim.enviado_em}`,
        boletim_id,
      });
    }

    // Destinatários: perebas com pelo menos uma quota ativa (filtra 'sistema')
    const quotasAtivas = await sbGet(`quotas?status=eq.ativa&select=user_id`);
    const userIds = Array.from(new Set((quotasAtivas as any[]).map((q) => q.user_id))).filter(Boolean);
    let destinatarios: Array<{ id: string; email: string; nome: string; apelido: string }> = [];
    if (userIds.length > 0) {
      const perebasRaw = await sbGet(
        `profiles?id=in.(${userIds.join(",")})&role=not.eq.sistema&select=id,nome,apelido,email`,
      );
      destinatarios = (perebasRaw as any[]).filter((p) => !!p.email);
    }

    const appUrl = await getAppUrl();
    const dataLabel = formatarData(boletim.data_referencia);
    const subject = `Boletim do dia ${dataLabel} — Bolão dos Perebas`;
    const htmlConteudo = await marked.parse(boletim.publicado_md);
    const html = emailShell(htmlConteudo as string, appUrl, dataLabel);

    let sucessos = 0;
    const falhas_detalhe: Array<{ email: string; erro: string }> = [];
    for (const p of destinatarios) {
      try {
        await enviarResend(p.email, subject, html);
        sucessos++;
      } catch (e) {
        falhas_detalhe.push({ email: p.email, erro: (e as Error).message });
      }
    }

    await sbPatch(`boletins?id=eq.${boletim_id}`, { enviado_em: new Date().toISOString() });

    await sbPost("audit_log", {
      acao: "enviou_boletim",
      entidade: "boletim",
      entidade_id: boletim_id,
      ator_id: boletim.publicado_por ?? null,
      ator_nome: "admin",
      payload: {
        data_referencia: boletim.data_referencia,
        destinatarios_total: destinatarios.length,
        sucessos,
        falhas: falhas_detalhe.length,
        force_resend: !!force_resend,
      },
    });

    return json({
      ok: true,
      boletim_id,
      data_referencia: boletim.data_referencia,
      destinatarios_total: destinatarios.length,
      sucessos,
      falhas: falhas_detalhe.length,
      falhas_detalhe,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
