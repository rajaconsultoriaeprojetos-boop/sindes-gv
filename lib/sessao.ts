import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type Papel = "admin" | "assessoria";

export const COOKIE_ADMIN = "sindes_admin";
export const COOKIE_ASSESSORIA = "sindes_assessoria";
export const SESSAO_SEGUNDOS = 8 * 60 * 60;

const BLOQUEIO_MS = 15 * 60 * 1000;
const MAX_ERROS = 5;

type Tentativa = { erros: number; bloqueadoAte: number };

const tentativas = new Map<string, Tentativa>();

export function reiniciarBloqueios() {
  tentativas.clear();
}

export function nomeDoCookie(papel: Papel) {
  return papel === "admin" ? COOKIE_ADMIN : COOKIE_ASSESSORIA;
}

export function codigoConfigurado(papel: Papel) {
  return segredo(papel) !== null;
}

function segredo(papel: Papel) {
  const valor = papel === "admin" ? process.env.ADMIN_CODIGO : process.env.ASSESSORIA_CODIGO;
  const texto = (valor ?? "").trim();
  return texto.length > 0 ? texto : null;
}

function iguais(informado: string, esperado: string) {
  const a = createHash("sha256").update(informado).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

export function ipDaRequisicao(request: Request) {
  const direto = request.headers.get("x-real-ip")?.trim();
  if (direto) return direto.slice(0, 80);
  const forwarded = request.headers.get("x-forwarded-for");
  const primeiro = forwarded?.split(",")[0]?.trim();
  if (primeiro) return primeiro.slice(0, 80);
  return "local";
}

export function lerCookie(request: Request, nome: string) {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const parte of header.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return decodeURIComponent(resto.join("="));
  }
  return undefined;
}

export type ResultadoCodigo =
  | { ok: true }
  | { ok: false; status: 401 | 429; motivo: "ausente" | "errado" | "bloqueado"; erro: string };

export function conferirCodigo(ip: string, papel: Papel, informado: string): ResultadoCodigo {
  const esperado = segredo(papel);
  if (!esperado) {
    return { ok: false, status: 401, motivo: "ausente", erro: "O código não foi configurado." };
  }
  const agora = Date.now();
  const atual = tentativas.get(ip);
  if (atual && atual.bloqueadoAte > agora) {
    return {
      ok: false,
      status: 429,
      motivo: "bloqueado",
      erro: "Acesso bloqueado por 15 minutos depois de cinco códigos errados.",
    };
  }
  if (atual && atual.bloqueadoAte > 0 && atual.bloqueadoAte <= agora) {
    tentativas.delete(ip);
  }
  if (!iguais(informado, esperado)) {
    const erros = (tentativas.get(ip)?.erros ?? 0) + 1;
    if (erros >= MAX_ERROS) {
      tentativas.set(ip, { erros, bloqueadoAte: Date.now() + BLOQUEIO_MS });
      return {
        ok: false,
        status: 429,
        motivo: "bloqueado",
        erro: "Acesso bloqueado por 15 minutos depois de cinco códigos errados.",
      };
    }
    tentativas.set(ip, { erros, bloqueadoAte: 0 });
    return { ok: false, status: 401, motivo: "errado", erro: "Código não confere." };
  }
  tentativas.delete(ip);
  return { ok: true };
}

export function emitirSessao(papel: Papel) {
  const chave = segredo(papel);
  if (!chave) return null;
  const exp = Date.now() + SESSAO_SEGUNDOS * 1000;
  const nonce = randomBytes(16).toString("base64url");
  const corpo = `${papel}.${exp}.${nonce}`;
  const mac = createHmac("sha256", chave).update(corpo).digest("base64url");
  return `${corpo}.${mac}`;
}

export function sessaoValida(papel: Papel, cookie: string | undefined) {
  const chave = segredo(papel);
  if (!chave || !cookie) return false;
  const partes = cookie.split(".");
  if (partes.length !== 4) return false;
  const [papelCookie, expTexto, nonce, mac] = partes;
  if (papelCookie !== papel || !/^\d+$/.test(expTexto) || !nonce || !mac) return false;
  const exp = Number(expTexto);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  const corpo = `${papelCookie}.${expTexto}.${nonce}`;
  const esperado = createHmac("sha256", chave).update(corpo).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function sessaoDoPedido(request: Request, papel: Papel) {
  if (!codigoConfigurado(papel)) return false;
  return sessaoValida(papel, lerCookie(request, nomeDoCookie(papel)));
}
