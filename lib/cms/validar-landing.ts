import type { ImpactStatCms, LandingCms } from "./landing-model";
import { INSTAGRAM_PERFIL, type DestaqueCct, type NoticiaFeed } from "@/components/landing/conteudo-instagram";

import {
  MAX_DATA_NOTICIA,
  MAX_RESUMO_NOTICIA,
  MAX_TITULO_NOTICIA,
  asTextoCampo,
  mensagemTextoCampo,
  textoObrigatorio,
  trimExternoTexto,
} from "./texto-campo";

export { MAX_DATA_NOTICIA, MAX_RESUMO_NOTICIA, MAX_TITULO_NOTICIA, asTextoCampo, trimExternoTexto };

const TIPOS: NoticiaFeed["tipo"][] = ["assembleia", "cct", "presidencia", "video"];

function urlOk(href: string) {
  const t = href.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Garante `resumo` (e não aliases legados) ao ler JSON ou estado parcial. */
export function coercNoticia(raw: NoticiaFeed | Record<string, unknown>): NoticiaFeed {
  const r = raw as Record<string, unknown>;
  const tipo = r.tipo;
  return {
    titulo: asTextoCampo(r.titulo ?? r.title),
    resumo: asTextoCampo(r.resumo ?? r.summary ?? r.resume),
    data: asTextoCampo(r.data),
    tipo: TIPOS.includes(tipo as NoticiaFeed["tipo"]) ? (tipo as NoticiaFeed["tipo"]) : "presidencia",
    href: asTextoCampo(r.href),
    confirmar: typeof r.confirmar === "boolean" ? r.confirmar : undefined,
  };
}

function trimNoticia(n: NoticiaFeed): NoticiaFeed {
  const c = coercNoticia(n);
  return {
    ...c,
    titulo: trimExternoTexto(c.titulo),
    resumo: trimExternoTexto(c.resumo),
    data: trimExternoTexto(c.data),
    href: trimExternoTexto(c.href),
  };
}

function hrefNoticiaVazio(href: string) {
  const t = href.trim();
  return !t || t === INSTAGRAM_PERFIL;
}

/** Link efetivo para validação/gravação quando o campo ficou em branco (placeholder Instagram). */
export function hrefNoticiaEfetivo(href: string): string {
  return hrefNoticiaVazio(href) ? INSTAGRAM_PERFIL : href.trim();
}

function completarNoticiaParaSalvar(n: NoticiaFeed): NoticiaFeed {
  const t = trimNoticia(coercNoticia(n));
  if (noticiaVazia(t)) return t;
  return hrefNoticiaVazio(t.href) ? { ...t, href: INSTAGRAM_PERFIL } : t;
}

export function noticiaVazia(n: NoticiaFeed) {
  const t = trimNoticia(n);
  return !t.titulo && !t.resumo && !t.data && hrefNoticiaVazio(t.href);
}

export function limparNoticiasVazias(lista: NoticiaFeed[]) {
  return lista.map((item) => trimNoticia(coercNoticia(item))).filter((n) => !noticiaVazia(n));
}

function trimConquista(item: LandingCms["conquistasLinhaDoTempo"][0]) {
  return { ...item, ano: item.ano.trim(), texto: item.texto.trim() };
}

export function conquistaVazia(item: LandingCms["conquistasLinhaDoTempo"][0]) {
  const t = trimConquista(item);
  return !t.ano && !t.texto;
}

export function limparConquistasVazias(lista: LandingCms["conquistasLinhaDoTempo"]) {
  return lista.map(trimConquista).filter((c) => !conquistaVazia(c));
}

function trimDepoimento(d: LandingCms["depoimentos"][0]) {
  return { ...d, nome: d.nome.trim(), texto: d.texto.trim() };
}

export function depoimentoVazio(d: LandingCms["depoimentos"][0]) {
  const t = trimDepoimento(d);
  return !t.nome && !t.texto;
}

export function limparDepoimentosVazios(lista: LandingCms["depoimentos"]) {
  return lista.map(trimDepoimento).filter((d) => !depoimentoVazio(d));
}

function trimCct(c: DestaqueCct): DestaqueCct {
  return {
    ...c,
    hospital: c.hospital.trim(),
    vigencia: c.vigencia.trim(),
    piso: c.piso.trim(),
    adicionais: c.adicionais.trim(),
    jornada: c.jornada.trim(),
  };
}

export function cctVazio(c: DestaqueCct) {
  const t = trimCct(c);
  return !t.hospital && !t.vigencia && !t.piso && !t.adicionais && !t.jornada;
}

export function limparCctVazios(lista: DestaqueCct[]) {
  return lista.map(trimCct).filter((c) => !cctVazio(c));
}

export function impactStatVazia(stat: ImpactStatCms) {
  return !stat.valor.trim() && !stat.rotulo.trim();
}

export function limparImpactStatsVazias(stats: ImpactStatCms[]): ImpactStatCms[] {
  return stats
    .map((s) => ({ ...s, valor: s.valor.trim(), rotulo: s.rotulo.trim() }))
    .filter((s) => !impactStatVazia(s));
}

export type ErroImpactStatObj = { indice: number; valor?: string; rotulo?: string };

export type ErroImpactStat = ErroImpactStatObj | "nenhuma";

export function isErroImpactStatObj(v: ErroImpactStat | ErroCampoLista | null | undefined): v is ErroImpactStatObj {
  return typeof v === "object" && v !== null && "indice" in v;
}

export type ErroCampoLista = {
  lista: "noticias" | "conquistasLinhaDoTempo" | "depoimentos" | "destaquesCct";
  indice: number;
  rotuloCard: string;
  campos: Record<string, string>;
  focoId: string;
};

export function isErroCampoLista(
  v: ErroImpactStat | ErroCampoLista | "impacto_nenhuma" | null | undefined,
): v is ErroCampoLista {
  return typeof v === "object" && v !== null && "lista" in v;
}

export function validarImpactStats(stats: ImpactStatCms[]): ErroImpactStat | null {
  for (const [i, stat] of stats.entries()) {
    if (impactStatVazia(stat)) continue;
    const valor = stat.valor.trim();
    const rotulo = stat.rotulo.trim();
    if (!valor) {
      return { indice: i, valor: "Informe o número ou texto do destaque." };
    }
    if (valor.length > 24) {
      return { indice: i, valor: "Use no máximo 24 caracteres no destaque." };
    }
    if (!rotulo) {
      return { indice: i, rotulo: "Informe a legenda abaixo do número." };
    }
    if (rotulo.length > 160) {
      return { indice: i, rotulo: "Legenda muito longa (máximo 160 caracteres)." };
    }
  }
  return null;
}

export function validarNoticias(lista: NoticiaFeed[]): ErroCampoLista | null {
  for (const [i, bruto] of lista.entries()) {
    const coerced = coercNoticia(bruto);
    if (noticiaVazia(coerced)) continue;
    const n = trimNoticia(coerced);
    const campos: Record<string, string> = {};
    const errTitulo = mensagemTextoCampo(n.titulo, MAX_TITULO_NOTICIA, {
      vazio: "Informe o título.",
      longo: (max) => `Título muito longo (máximo ${max} caracteres).`,
    });
    if (errTitulo) campos.titulo = errTitulo;
    const errResumo = mensagemTextoCampo(n.resumo, MAX_RESUMO_NOTICIA, {
      vazio: "Informe o resumo.",
      longo: (max) => `Resumo muito longo (máximo ${max} caracteres). Reduza ou publique em partes.`,
    });
    if (errResumo) campos.resumo = errResumo;
    const errData = mensagemTextoCampo(n.data, MAX_DATA_NOTICIA, {
      vazio: "Informe a data ou rótulo.",
      longo: (max) => `Data/rótulo muito longo (máximo ${max} caracteres).`,
    });
    if (errData) campos.data = errData;
    if (!TIPOS.includes(n.tipo)) campos.tipo = "Tipo inválido.";
    if (!urlOk(hrefNoticiaEfetivo(n.href))) {
      campos.href = "Link inválido (use https:// ou caminho /).";
    }
    if (Object.keys(campos).length > 0) {
      const focoId =
        campos.titulo !== undefined
          ? `not-tit-${i}`
          : campos.resumo !== undefined
            ? `not-res-${i}`
            : campos.data !== undefined
              ? `not-data-${i}`
              : campos.href !== undefined
                ? `not-href-${i}`
                : `not-tipo-${i}`;
      return {
        lista: "noticias",
        indice: i,
        rotuloCard: `Notícia ${i + 1}`,
        campos,
        focoId,
      };
    }
  }
  return null;
}

export function validarConquistas(lista: LandingCms["conquistasLinhaDoTempo"]): ErroCampoLista | null {
  for (const [i, bruto] of lista.entries()) {
    if (conquistaVazia(bruto)) continue;
    const item = trimConquista(bruto);
    const campos: Record<string, string> = {};
    if (!textoObrigatorio(item.ano, 32)) campos.ano = "Informe o ano ou período.";
    if (!textoObrigatorio(item.texto, 400)) campos.texto = "Informe o texto.";
    if (Object.keys(campos).length > 0) {
      return {
        lista: "conquistasLinhaDoTempo",
        indice: i,
        rotuloCard: `Marco ${i + 1}`,
        campos,
        focoId: campos.ano ? `conq-ano-${i}` : `conq-txt-${i}`,
      };
    }
  }
  return null;
}

export function validarDepoimentos(lista: LandingCms["depoimentos"]): ErroCampoLista | null {
  for (const [i, bruto] of lista.entries()) {
    if (depoimentoVazio(bruto)) continue;
    const d = trimDepoimento(bruto);
    const campos: Record<string, string> = {};
    if (!textoObrigatorio(d.nome, 120)) campos.nome = "Informe quem fala.";
    if (!textoObrigatorio(d.texto, 500)) campos.texto = "Informe a citação.";
    if (Object.keys(campos).length > 0) {
      return {
        lista: "depoimentos",
        indice: i,
        rotuloCard: `Depoimento ${i + 1}`,
        campos,
        focoId: campos.nome ? `dep-nome-${i}` : `dep-txt-${i}`,
      };
    }
  }
  return null;
}

export function validarDestaquesCct(lista: DestaqueCct[]): ErroCampoLista | null {
  for (const [i, bruto] of lista.entries()) {
    if (cctVazio(bruto)) continue;
    const c = trimCct(bruto);
    const campos: Record<string, string> = {};
    if (!textoObrigatorio(c.hospital, 160)) campos.hospital = "Informe o hospital.";
    if (!textoObrigatorio(c.vigencia, 200)) campos.vigencia = "Informe a vigência.";
    if (Object.keys(campos).length > 0) {
      return {
        lista: "destaquesCct",
        indice: i,
        rotuloCard: `CCT ${i + 1}`,
        campos,
        focoId: campos.hospital ? `cct-h-${i}` : `cct-vig-${i}`,
      };
    }
  }
  return null;
}

/** Validação estruturada (antes de remover linhas vazias). */
export function validarLandingCmsFormulario(dados: LandingCms): ErroImpactStat | ErroCampoLista | null {
  const impacto = validarImpactStats(dados.impactStats ?? []);
  if (impacto) return impacto;
  const noticias = validarNoticias(dados.noticias ?? []);
  if (noticias) return noticias;
  return (
    validarConquistas(dados.conquistasLinhaDoTempo ?? []) ??
    validarDepoimentos(dados.depoimentos ?? []) ??
    validarDestaquesCct(dados.destaquesCct ?? [])
  );
}

export function normalizarLandingCmsParaSalvar(dados: LandingCms): LandingCms {
  return {
    ...dados,
    impactStats: limparImpactStatsVazias(dados.impactStats ?? []),
    conquistasLinhaDoTempo: limparConquistasVazias(dados.conquistasLinhaDoTempo ?? []),
    depoimentos: limparDepoimentosVazios(dados.depoimentos ?? []),
    destaquesCct: limparCctVazios(dados.destaquesCct ?? []),
    noticias: limparNoticiasVazias((dados.noticias ?? []).map(completarNoticiaParaSalvar)),
  };
}

export function validarLandingCms(dados: LandingCms): string | null {
  const bruto = validarLandingCmsFormulario(dados);
  if (isErroImpactStatObj(bruto)) {
    if (bruto.valor) return `Estatística ${bruto.indice + 1}: ${bruto.valor}`;
    if (bruto.rotulo) return `Estatística ${bruto.indice + 1}: ${bruto.rotulo}`;
  }
  if (isErroCampoLista(bruto)) {
    const msg = Object.values(bruto.campos)[0];
    return `${bruto.rotuloCard}: ${msg}`;
  }
  void normalizarLandingCmsParaSalvar(dados);
  return null;
}

/** Converte "1200+" em número + sufixo para animação. */
export function parseValorImpacto(valor: string): { valor?: number; sufixo?: string; valorTexto?: string } {
  const t = valor.trim();
  const m = t.match(/^(\d+(?:[.,]\d+)?)(\+|%)?$/);
  if (m) {
    const n = Number(m[1].replace(",", "."));
    if (Number.isFinite(n)) return { valor: n, sufixo: m[2] ?? "" };
  }
  const soNumero = Number(t);
  if (t && Number.isFinite(soNumero) && String(soNumero) === t) return { valor: soNumero };
  return { valorTexto: t };
}
