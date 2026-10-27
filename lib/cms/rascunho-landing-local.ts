import type { LandingCms } from "./landing-model";

const CHAVE = "sindes:cms:landing:rascunho:v1";

export type RascunhoLandingLocal = {
  dados: LandingCms;
  salvoEm: string;
  servidorAtualizadoEm: string;
};

function storageOk() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function lerRascunhoLandingLocal(): RascunhoLandingLocal | null {
  if (!storageOk()) return null;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const parsed = JSON.parse(bruto) as RascunhoLandingLocal;
    if (!parsed?.dados || typeof parsed.salvoEm !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function gravarRascunhoLandingLocal(dados: LandingCms, servidorAtualizadoEm = "") {
  if (!storageOk()) return;
  try {
    const payload: RascunhoLandingLocal = {
      dados,
      salvoEm: new Date().toISOString(),
      servidorAtualizadoEm,
    };
    window.localStorage.setItem(CHAVE, JSON.stringify(payload));
  } catch {
    /* quota / modo privado */
  }
}

export function limparRascunhoLandingLocal() {
  if (!storageOk()) return;
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    /* ignore */
  }
}

/** Mantém rascunho local se o servidor ainda não refletiu edições não publicadas. */
export function preferirRascunhoLocal(rascunho: RascunhoLandingLocal, servidor: LandingCms): boolean {
  const tsRascunho = Date.parse(rascunho.salvoEm);
  const tsServidor = Date.parse(servidor.atualizadoEm || "");
  if (Number.isFinite(tsRascunho) && Number.isFinite(tsServidor) && tsRascunho > tsServidor) {
    return true;
  }
  if (rascunho.servidorAtualizadoEm && rascunho.servidorAtualizadoEm !== (servidor.atualizadoEm || "")) {
    return true;
  }
  const noticiasR = rascunho.dados.noticias?.length ?? 0;
  const noticiasS = servidor.noticias?.length ?? 0;
  if (noticiasR > noticiasS) return true;
  const textoR = JSON.stringify(rascunho.dados.noticias ?? []);
  const textoS = JSON.stringify(servidor.noticias ?? []);
  if (textoR !== textoS && textoR.length > textoS.length) return true;
  return false;
}
