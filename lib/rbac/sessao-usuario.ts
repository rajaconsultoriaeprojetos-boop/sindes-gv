import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PapelUsuario } from "./roles";
import { chaveSessaoRbac, COOKIE_USUARIO, SESSAO_USUARIO_SEGUNDOS } from "./chave-sessao";

export { COOKIE_USUARIO, SESSAO_USUARIO_SEGUNDOS };

function chaveSessao() {
  return chaveSessaoRbac();
}

export type PayloadSessao = {
  sub: string;
  email: string;
  role: PapelUsuario;
  exp: number;
};

export function emitirTokenUsuario(payload: Omit<PayloadSessao, "exp">) {
  const exp = Date.now() + SESSAO_USUARIO_SEGUNDOS * 1000;
  const corpo = JSON.stringify({ ...payload, exp });
  const mac = createHmac("sha256", chaveSessao()).update(corpo).digest("base64url");
  return `${Buffer.from(corpo).toString("base64url")}.${mac}`;
}

export function lerTokenUsuario(token: string | undefined): PayloadSessao | null {
  if (!token) return null;
  const [corpoB64, mac] = token.split(".");
  if (!corpoB64 || !mac) return null;
  let corpo = "";
  try {
    corpo = Buffer.from(corpoB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const esperado = createHmac("sha256", chaveSessao()).update(corpo).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let dados: PayloadSessao;
  try {
    dados = JSON.parse(corpo) as PayloadSessao;
  } catch {
    return null;
  }
  if (!dados.sub || !dados.email || !dados.role || !dados.exp) return null;
  if (dados.exp <= Date.now()) return null;
  return dados;
}

export function lerCookieHeader(header: string | null, nome: string) {
  if (!header) return undefined;
  for (const parte of header.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return decodeURIComponent(resto.join("="));
  }
  return undefined;
}

export function sessaoUsuarioDoPedido(request: Request) {
  const token = lerCookieHeader(request.headers.get("cookie"), COOKIE_USUARIO);
  return lerTokenUsuario(token);
}

export function cookieSessaoUsuario(token: string, secure: boolean) {
  return {
    name: COOKIE_USUARIO,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSAO_USUARIO_SEGUNDOS,
  };
}

export function tokenConviteUrl() {
  return randomBytes(24).toString("base64url");
}
