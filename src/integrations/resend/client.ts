/**
 * Resend client for sending emails from edge functions.
 *
 * Usage (inside a Supabase edge function):
 *
 *   import { sendEmail } from "../../../src/integrations/resend/client.ts";
 *   // or copy/import depending on your function setup
 *
 *   await sendEmail({
 *     from: "Perebas <noreply@seu-dominio.com>",
 *     to: "fulano@example.com",
 *     subject: "Olá!",
 *     html: "<p>Mensagem</p>",
 *   });
 *
 * The RESEND_API_KEY must be set as an environment variable / secret.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

export interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}

export interface ResendResponse {
  id: string;
}

export interface ResendErrorResponse {
  name?: string;
  message?: string;
  statusCode?: number;
}

function getApiKey(): string {
  // Works in both Deno (edge functions) and Node-like envs.
  const key =
    (typeof Deno !== "undefined" && Deno.env?.get?.("RESEND_API_KEY")) ||
    (typeof process !== "undefined" && process.env?.RESEND_API_KEY);

  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return key;
}

export async function sendEmail(params: SendEmailParams): Promise<ResendResponse> {
  const apiKey = getApiKey();

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ResendErrorResponse;
    throw new Error(
      `Resend error (${response.status}): ${error.message ?? response.statusText}`,
    );
  }

  return (await response.json()) as ResendResponse;
}

export const resend = { sendEmail };

// Minimal Deno typing shim so this file typechecks in a Node/Vite project too.
declare const Deno:
  | { env: { get: (k: string) => string | undefined } }
  | undefined;
