import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import path from "node:path";
import { google } from "googleapis";

const ESCOPO_CALENDARIO = "https://www.googleapis.com/auth/calendar";

export function credenciaisGoogleConfiguradas() {
  const inline = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? "").trim();
  const caminho = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH ?? "").trim();
  return inline.length > 0 || caminho.length > 0;
}

export async function lerCredenciaisServico() {
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
    bruto = await readFile(caminho, "utf8");
  } else {
    return null;
  }
  const json = JSON.parse(bruto) as { client_email?: string; private_key?: string };
  if (!json.client_email || !json.private_key) return null;
  return json;
}

export async function authGoogle(scopes: string[]) {
  const credentials = await lerCredenciaisServico();
  if (!credentials) return null;
  return new google.auth.GoogleAuth({ credentials, scopes });
}

export function oauthClientIdEfetivo() {
  return (process.env.GOOGLE_OAUTH_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "").trim();
}

export function oauthClientSecretEfetivo() {
  return (process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
}

export function oauthTokenPathEfetivo() {
  const custom = (process.env.GOOGLE_OAUTH_TOKEN_PATH ?? "").trim();
  if (custom) return custom;
  return path.join(process.cwd(), "secrets", "google-oauth-token.json");
}

export function oauthRedirectUriEfetivo() {
  const custom = (process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "").trim();
  if (custom) return custom;
  return "https://www.sindesgv.com.br/api/admin/google-oauth/callback";
}

export function oauthClienteConfigurado() {
  return oauthClientIdEfetivo().length > 0 && oauthClientSecretEfetivo().length > 0;
}

export type TokenOAuthArmazenado = {
  refresh_token: string;
  access_token?: string;
  expiry_date?: number;
  scope?: string;
  token_type?: string;
  updated_at?: string;
};

export async function lerTokenOAuthArquivo(): Promise<TokenOAuthArmazenado | null> {
  try {
    const bruto = await readFile(oauthTokenPathEfetivo(), "utf8");
    const parsed = JSON.parse(bruto) as TokenOAuthArmazenado;
    if (!parsed.refresh_token?.trim()) return null;
    return parsed;
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw erro;
  }
}

export async function lerRefreshTokenOAuth() {
  const envToken = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? "").trim();
  if (envToken) return envToken;
  const arquivo = await lerTokenOAuthArquivo();
  return arquivo?.refresh_token?.trim() ?? null;
}

export async function oauthRefreshTokenDisponivel() {
  return !!(await lerRefreshTokenOAuth());
}

export async function salvarTokenOAuth(dados: TokenOAuthArmazenado) {
  const destino = oauthTokenPathEfetivo();
  await mkdir(path.dirname(destino), { recursive: true, mode: 0o700 });
  const payload: TokenOAuthArmazenado = {
    ...dados,
    refresh_token: dados.refresh_token.trim(),
    updated_at: new Date().toISOString(),
  };
  await writeFile(destino, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  try {
    await chmod(destino, 0o600);
  } catch {
    /* Windows / FS without chmod */
  }
  return payload;
}

export function criarClienteOAuth2() {
  if (!oauthClienteConfigurado()) return null;
  return new google.auth.OAuth2(oauthClientIdEfetivo(), oauthClientSecretEfetivo(), oauthRedirectUriEfetivo());
}

export async function authGoogleOAuthCalendar() {
  const refreshToken = await lerRefreshTokenOAuth();
  if (!refreshToken) return null;
  const cliente = criarClienteOAuth2();
  if (!cliente) return null;
  cliente.setCredentials({ refresh_token: refreshToken });
  return cliente;
}

/** Calendar API: OAuth when refresh token exists (Meet), else service account. */
export async function authGoogleCalendar() {
  const oauth = await authGoogleOAuthCalendar();
  if (oauth) return oauth;
  return authGoogle([ESCOPO_CALENDARIO]);
}

/** Google Meet on consumer Gmail requires user OAuth — never service account. */
export async function authGoogleCalendarMeet() {
  return authGoogleOAuthCalendar();
}

export function calendarIdEfetivo() {
  return (process.env.GOOGLE_CALENDAR_ID ?? "sindesoficial@gmail.com").trim();
}

export function calendarConfigurado() {
  return credenciaisGoogleConfiguradas() && calendarIdEfetivo().length > 0;
}

export async function calendarMeetConfigurado() {
  return calendarIdEfetivo().length > 0 && oauthClienteConfigurado() && (await oauthRefreshTokenDisponivel());
}

export function urlAutorizacaoOAuthCalendar(state: string) {
  const cliente = criarClienteOAuth2();
  if (!cliente) return null;
  return cliente.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [ESCOPO_CALENDARIO],
    state,
    include_granted_scopes: true,
  });
}
