/** Perfil oficial — único conteúdo editorial fixo neste módulo. */
export const INSTAGRAM_PERFIL = "https://www.instagram.com/sindesgv/";

export type DestaqueCct = {
  hospital: string;
  vigencia: string;
  piso: string;
  adicionais: string;
  jornada: string;
  confirmar: boolean;
};

export type NoticiaFeed = {
  titulo: string;
  resumo: string;
  data: string;
  tipo: "assembleia" | "cct" | "presidencia" | "video";
  href: string;
  confirmar?: boolean;
};

/** @deprecated Use CMS (`data/cms/landing.json`); mantido vazio para compatibilidade de import. */
export const DESTAQUES_CCT_2026: DestaqueCct[] = [];

/** @deprecated Use CMS; vazio. */
export const NOTICIAS_SINDES: NoticiaFeed[] = [];

/** @deprecated Use CMS; vazio. */
export const CONQUISTAS_LINHA_DO_TEMPO: { ano: string; texto: string; confirmar?: boolean }[] = [];

/** @deprecated Use CMS; vazio. */
export const DEPOIMENTOS: { nome: string; texto: string; confirmar?: boolean }[] = [];
