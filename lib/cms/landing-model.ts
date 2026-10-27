import type { DestaqueCct, NoticiaFeed } from "@/components/landing/conteudo-instagram";

export type ImpactStatCms = {
  valor: string;
  rotulo: string;
  confirmar?: boolean;
};

export type LandingCms = {
  noticias: NoticiaFeed[];
  destaquesCct: DestaqueCct[];
  conquistasLinhaDoTempo: { ano: string; texto: string; confirmar?: boolean }[];
  depoimentos: { nome: string; texto: string; confirmar?: boolean }[];
  impactStats: ImpactStatCms[];
  atualizadoEm: string;
};

export function landingCmsPadrao(): LandingCms {
  return {
    noticias: [],
    destaquesCct: [],
    conquistasLinhaDoTempo: [],
    depoimentos: [],
    impactStats: [],
    atualizadoEm: "",
  };
}

export function mesclarLandingCms(parcial: Partial<LandingCms>): LandingCms {
  const base = landingCmsPadrao();
  return {
    noticias: parcial.noticias ?? base.noticias,
    destaquesCct: parcial.destaquesCct ?? base.destaquesCct,
    conquistasLinhaDoTempo: parcial.conquistasLinhaDoTempo ?? base.conquistasLinhaDoTempo,
    depoimentos: parcial.depoimentos ?? base.depoimentos,
    impactStats: parcial.impactStats ?? base.impactStats,
    atualizadoEm: parcial.atualizadoEm ?? base.atualizadoEm,
  };
}
