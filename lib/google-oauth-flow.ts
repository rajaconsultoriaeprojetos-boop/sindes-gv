import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  criarClienteOAuth2,
  oauthClienteConfigurado,
  oauthRedirectUriEfetivo,
  oauthRefreshTokenDisponivel,
  salvarTokenOAuth,
  urlAutorizacaoOAuthCalendar,
} from "./google-credenciais";

export const COOKIE_OAUTH_STATE = "google_oauth_state";

const OAUTH_STATE_FILE = path.join(process.cwd(), "data", "google-oauth-pending-state.json");

/** URL pública do site (nginx); evita redirect para 0.0.0.0:3000 atrás do proxy. */
function origemPublicaSite(fallbackRequest?: Request) {
  const bruto = (
    process.env.PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.OPENROUTER_SITE_URL ??
    ""
  ).trim();
  if (bruto) {
    try {
      const comProtocolo = bruto.startsWith("http") ? bruto : `https://${bruto}`;
      return new URL(comProtocolo).origin;
    } catch {
      /* usa fallback */
    }
  }
  if (fallbackRequest) {
    const host = fallbackRequest.headers.get("x-forwarded-host") ?? fallbackRequest.headers.get("host");
    const proto = fallbackRequest.headers.get("x-forwarded-proto") ?? "https";
    if (host && !host.startsWith("0.0.0.0") && !host.startsWith("127.0.0.1")) {
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }
  return "https://www.sindesgv.com.br";
}

function urlAdminPosOAuth(request: Request, query: string) {
  return new URL(`/admin?${query}`, origemPublicaSite(request));
}

async function gravarStateOAuth(state: string) {
  await mkdir(path.dirname(OAUTH_STATE_FILE), { recursive: true });
  await writeFile(
    OAUTH_STATE_FILE,
    JSON.stringify({ state, exp: Date.now() + 10 * 60 * 1000 }),
    "utf8",
  );
}

async function consumirStateOAuth(state: string) {
  try {
    const bruto = await readFile(OAUTH_STATE_FILE, "utf8");
    const parsed = JSON.parse(bruto) as { state?: string; exp?: number };
    await unlink(OAUTH_STATE_FILE).catch(() => undefined);
    if (!parsed.state || parsed.state !== state) return false;
    if (typeof parsed.exp === "number" && Date.now() > parsed.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export async function statusOAuthCalendarAdmin() {
  return {
    oauthClienteConfigurado: oauthClienteConfigurado(),
    oauthConectado: await oauthRefreshTokenDisponivel(),
    redirectUri: oauthRedirectUriEfetivo(),
  };
}

export function iniciarFluxoOAuthCalendar(request: Request) {
  if (!oauthClienteConfigurado()) {
    return { erro: "Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no servidor (.env.local).", status: 400 as const };
  }
  const state = randomBytes(24).toString("hex");
  const url = urlAutorizacaoOAuthCalendar(state);
  if (!url) {
    return { erro: "Não foi possível montar a URL de autorização.", status: 500 as const };
  }
  void gravarStateOAuth(state);
  const resposta = NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  resposta.cookies.set({
    name: COOKIE_OAUTH_STATE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: origemPublicaSite(request).startsWith("https:"),
    path: "/",
    maxAge: 600,
  });
  return { resposta };
}

export async function concluirOAuthCalendarCallback(request: Request) {
  const url = new URL(request.url);
  const erroGoogle = url.searchParams.get("error");
  if (erroGoogle) {
    return NextResponse.redirect(urlAdminPosOAuth(request, `google_oauth=erro&motivo=${encodeURIComponent(erroGoogle)}`));
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers.get("cookie")?.match(new RegExp(`${COOKIE_OAUTH_STATE}=([^;]+)`))?.[1];
  const stateOk =
    !!state &&
    !!code &&
    (state === cookieState || (await consumirStateOAuth(state)));
  if (!stateOk) {
    return NextResponse.redirect(urlAdminPosOAuth(request, "google_oauth=erro&motivo=state"));
  }
  const cliente = criarClienteOAuth2();
  if (!cliente) {
    return NextResponse.redirect(urlAdminPosOAuth(request, "google_oauth=erro&motivo=config"));
  }
  try {
    const { tokens } = await cliente.getToken(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(urlAdminPosOAuth(request, "google_oauth=erro&motivo=sem_refresh"));
    }
    await salvarTokenOAuth({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
      scope: tokens.scope ?? undefined,
      token_type: tokens.token_type ?? undefined,
    });
    const destino = NextResponse.redirect(urlAdminPosOAuth(request, "google_oauth=ok"));
    destino.cookies.set({ name: COOKIE_OAUTH_STATE, value: "", path: "/", maxAge: 0 });
    return destino;
  } catch {
    return NextResponse.redirect(urlAdminPosOAuth(request, "google_oauth=erro&motivo=token"));
  }
}
