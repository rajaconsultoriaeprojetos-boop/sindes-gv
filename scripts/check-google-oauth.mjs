#!/usr/bin/env node
/**
 * Diagnóstico Google SA + OAuth (Meet jurídico). Não imprime segredos.
 * Uso: cd /var/www/sindes && node scripts/check-google-oauth.mjs
 */
import { readFile, access } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(__dirname, "..");

async function carregarEnvLocal() {
  try {
    const texto = await readFile(path.join(raiz, ".env.local"), "utf8");
    for (const linha of texto.split("\n")) {
      const t = linha.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const chave = t.slice(0, i).trim();
      let valor = t.slice(i + 1).trim();
      if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
        valor = valor.slice(1, -1);
      }
      if (!process.env[chave]) process.env[chave] = valor;
    }
  } catch (erro) {
    if ((erro).code === "ENOENT") {
      console.log("env_local: ausente");
    } else {
      console.log("env_local: erro ao ler");
    }
  }
}

function oauthClientId() {
  return (process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "").trim();
}

function oauthClientSecret() {
  return (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
}

function oauthTokenPath() {
  const custom = (process.env.GOOGLE_OAUTH_TOKEN_PATH ?? "").trim();
  if (custom) return custom;
  return path.join(raiz, "secrets", "google-oauth-token.json");
}

function calendarId() {
  return (process.env.GOOGLE_CALENDAR_ID ?? "sindesgvoficial@gmail.com").trim();
}

async function testarServiceAccount() {
  const inline = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "").trim();
  const caminho = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH ?? "").trim();
  let bruto = "";
  if (inline) {
    try {
      bruto = Buffer.from(inline, "base64").toString("utf8");
      JSON.parse(bruto);
    } catch {
      bruto = inline;
    }
  } else if (caminho) {
    try {
      await access(caminho);
      bruto = await readFile(caminho, "utf8");
    } catch {
      return { ok: false, detalhe: "arquivo SA inacessível ou ausente" };
    }
  } else {
    return { ok: false, detalhe: "GOOGLE_SERVICE_ACCOUNT_JSON(_PATH) não definido" };
  }
  try {
    const json = JSON.parse(bruto);
    if (!json.client_email || !json.private_key) {
      return { ok: false, detalhe: "JSON SA incompleto" };
    }
    const auth = new google.auth.GoogleAuth({
      credentials: json,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const id = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "").trim();
    if (id) {
      await sheets.spreadsheets.get({ spreadsheetId: id, fields: "spreadsheetId" });
    }
    return { ok: true, detalhe: `client_email=${json.client_email}` };
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    return { ok: false, detalhe: msg.slice(0, 160) };
  }
}

async function lerRefreshToken() {
  const envToken = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? "").trim();
  if (envToken) return { token: envToken, origem: "env" };
  try {
    const bruto = await readFile(oauthTokenPath(), "utf8");
    const parsed = JSON.parse(bruto);
    const token = parsed.refresh_token?.trim();
    if (token) return { token, origem: "arquivo" };
  } catch (erro) {
    if ((erro).code !== "ENOENT") {
      return { token: null, origem: "erro", detalhe: "token file unreadable" };
    }
  }
  return { token: null, origem: "ausente" };
}

async function testarMeetJuridico(refreshToken) {
  const clientId = oauthClientId();
  const clientSecret = oauthClientSecret();
  if (!clientId || !clientSecret) {
    return { ok: false, skipped: true, detalhe: "oauth client não configurado" };
  }
  if (!refreshToken) {
    return { ok: false, skipped: true, detalhe: "refresh token ausente" };
  }
  const redirect =
    (process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "").trim() ||
    "https://www.sindesgv.com.br/api/admin/google-oauth/callback";
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirect);
  oauth2.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2 });
  const calId = calendarId();
  const agora = new Date();
  const inicio = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
  inicio.setUTCHours(14, 0, 0, 0);
  const fim = new Date(inicio.getTime() + 30 * 60 * 1000);
  const requestId = `sindes-check-${randomUUID()}`;
  let eventId = null;
  try {
    const resposta = await calendar.events.insert({
      calendarId: calId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: "[SINDES check] Jurídico Meet (apagar automaticamente)",
        description: "Teste automático scripts/check-google-oauth.mjs",
        start: { dateTime: inicio.toISOString(), timeZone: "America/Sao_Paulo" },
        end: { dateTime: fim.toISOString(), timeZone: "America/Sao_Paulo" },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });
    eventId = resposta.data.id ?? null;
    const meet =
      resposta.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
      resposta.data.hangoutLink ??
      null;
    if (!eventId) {
      return { ok: false, detalhe: "evento sem id" };
    }
    if (!meet) {
      await calendar.events.delete({ calendarId: calId, eventId });
      return { ok: false, detalhe: "evento criado sem link Meet" };
    }
    await calendar.events.delete({ calendarId: calId, eventId });
    return { ok: true, detalhe: "evento com Meet criado e removido" };
  } catch (erro) {
    if (eventId) {
      try {
        await calendar.events.delete({ calendarId: calId, eventId });
      } catch {
        /* noop */
      }
    }
    const msg = erro instanceof Error ? erro.message : String(erro);
    return { ok: false, detalhe: msg.slice(0, 200) };
  }
}

await carregarEnvLocal();

console.log("check-google-oauth");
console.log("==================");
console.log(`calendar_id: ${calendarId()}`);

const sa = await testarServiceAccount();
console.log(`service_account: ${sa.ok ? "ok" : "fail"} — ${sa.detalhe}`);

const oauthOk = oauthClientId().length > 0 && oauthClientSecret().length > 0;
console.log(`oauth_client: ${oauthOk ? "configured" : "missing"}`);

const refresh = await lerRefreshToken();
if (refresh.token) {
  console.log(`refresh_token: present (${refresh.origem})`);
} else {
  console.log(`refresh_token: missing${refresh.detalhe ? ` — ${refresh.detalhe}` : ""}`);
}

const meet = await testarMeetJuridico(refresh.token);
if (meet.skipped) {
  console.log(`calendar_meet_juridico: skipped — ${meet.detalhe}`);
} else {
  console.log(`calendar_meet_juridico: ${meet.ok ? "ok" : "fail"} — ${meet.detalhe}`);
}

let exitCode = 0;
const saEsperado =
  (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH ?? "").trim() ||
  (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "").trim();
if (saEsperado && !sa.ok) exitCode = 1;
if (!meet.skipped && !meet.ok) exitCode = 1;
process.exit(exitCode);
