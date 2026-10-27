import type { LandingCms } from "./landing-model";
import { coercNoticia } from "./validar-landing";

/** Lê valores visíveis do formulário (evita validar state React desatualizado após colar). */
export function mesclarNoticiasDoDom(estado: LandingCms): LandingCms {
  const noticiasBase = estado.noticias.map((item) => coercNoticia(item));
  if (typeof document === "undefined") {
    return { ...estado, noticias: noticiasBase };
  }
  const noticias = noticiasBase.map((n, i) => {
    const titulo = document.getElementById(`not-tit-${i}`);
    const resumo = document.getElementById(`not-res-${i}`);
    const data = document.getElementById(`not-data-${i}`);
    const href = document.getElementById(`not-href-${i}`);
    return {
      ...n,
      titulo: titulo instanceof HTMLInputElement ? titulo.value : n.titulo,
      resumo: resumo instanceof HTMLTextAreaElement ? resumo.value : n.resumo,
      data: data instanceof HTMLInputElement ? data.value : n.data,
      href: href instanceof HTMLInputElement ? href.value : n.href,
    };
  });
  return { ...estado, noticias };
}

/** Estado que o usuário vê no momento de publicar (DOM + coerção de campos). */
export function prepararLandingParaPublicar(estado: LandingCms): LandingCms {
  return mesclarNoticiasDoDom(estado);
}
