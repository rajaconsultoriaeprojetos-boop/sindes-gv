import type { PapelUsuario } from "./roles";
import { chaveSessaoRbac } from "./chave-sessao";

export type PayloadSessao = {
  sub: string;
  email: string;
  role: PapelUsuario;
  exp: number;
};

function base64UrlToBytes(value: string) {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64Url(bytes: ArrayBuffer) {
  const view = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < view.length; i++) bin += String.fromCharCode(view[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function hmacSha256Base64Url(secret: string, message: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bytesToBase64Url(sig);
}

/** Valida token RBAC no Edge (middleware). */
export async function lerTokenUsuarioEdge(token: string | undefined): Promise<PayloadSessao | null> {
  if (!token) return null;
  const [corpoB64, mac] = token.split(".");
  if (!corpoB64 || !mac) return null;
  let corpo = "";
  try {
    corpo = new TextDecoder().decode(base64UrlToBytes(corpoB64));
  } catch {
    return null;
  }
  const esperado = await hmacSha256Base64Url(chaveSessaoRbac(), corpo);
  try {
    const a = base64UrlToBytes(mac);
    const b = base64UrlToBytes(esperado);
    if (!timingSafeEqualBytes(a, b)) return null;
  } catch {
    return null;
  }
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
