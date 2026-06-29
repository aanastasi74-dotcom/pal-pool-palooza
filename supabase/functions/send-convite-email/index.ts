// Edge function: send-convite-email
// POST { invite_id: uuid } → envia e-mail de convite via Resend.

const RESEND_API_URL = "https://api.resend.com/emails";
import { requireAdmin } from "../_shared/require-admin.ts";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM = Deno.env.get("RESEND_FROM_EMAIL") || "Bolão dos Perebas <onboarding@resend.dev>";

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

interface Invite {
  id: string;
  email: string;
  nome: string;
  token: string;
  expira_em: string;
  mensagem: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.res;

    const { invite_id } = await req.json();
    if (!invite_id) return json({ error: "invite_id required" }, 400);

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/invites?id=eq.${invite_id}&select=id,email,nome,token,expira_em,mensagem`,
      {
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
      },
    );
    if (!r.ok) return json({ error: `Failed to fetch invite: ${r.status}` }, 500);
    const rows = (await r.json()) as Invite[];
    const invite = rows[0];
    if (!invite) return json({ error: "Invite not found" }, 404);

    // URL pública do app (fonte única: settings.app_url_publico)
    const APP_URL_FALLBACK = "https://pal-pool-palooza.lovable.app";
    let origin = APP_URL_FALLBACK;
    try {
      const sr = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.app_url_publico&select=value`, {
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
      });
      if (sr.ok) {
        const srows = (await sr.json()) as Array<{ value: unknown }>;
        const v = srows[0]?.value;
        if (typeof v === "string" && v) origin = v.replace(/\/+$/, "");
      }
    } catch (_) {}
    const link = `${origin}/cadastro/${invite.token}`;
    const expira = new Date(invite.expira_em).toLocaleDateString("pt-BR");
    const firstName = invite.nome.split(" ")[0];

    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">E aí, ${firstName}! 🏆</h1>
        <p style="font-size: 15px; line-height: 1.5;">Você foi chamado pro <strong>Bolão dos Perebas — Copa 2026</strong>. Palpites, ranking e zoeira garantidas.</p>
        ${invite.mensagem ? `<p style="font-size: 14px; padding: 12px; background:#f4f4f5; border-radius:8px; font-style: italic;">"${invite.mensagem}"</p>` : ""}
        <p style="font-size: 15px; line-height: 1.5;">Clica no botão pra criar sua senha e entrar:</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#16a34a; color:#fff; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: bold;">Aceitar convite</a>
        </p>
        <p style="font-size: 12px; color:#666;">Esse link vale até <strong>${expira}</strong>. Se não funcionar, copia e cola: <br/><span style="word-break: break-all;">${link}</span></p>
      </div>
    `;
    const text = `E aí, ${firstName}! Você foi chamado pro Bolão dos Perebas — Copa 2026.\n\nAceita aqui: ${link}\n\nEsse link vale até ${expira}.`;

    const sendRes = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [invite.email],
        subject: "Convite para o Bolão dos Perebas — Copa 2026",
        html,
        text,
      }),
    });
    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      return json({ error: `Resend ${sendRes.status}: ${errBody}` }, 500);
    }
    const sent = (await sendRes.json()) as { id: string };
    return json({ success: true, email_id: sent.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
