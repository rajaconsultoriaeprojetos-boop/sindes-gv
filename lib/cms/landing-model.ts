import type { DestaqueCct, NoticiaFeed } from "@/components/landing/conteudo-instagram";

export type ImpactStatCms = {
  valor: string;
  rotulo: string;
  confirmar?: boolean;
};

export type VideoDestaqueCms = {
  url: string;
  titulo: string;
  data: string;
  legenda: string;
  confirmar?: boolean;
};

export type LandingCms = {
  noticias: NoticiaFeed[];
  destaquesCct: DestaqueCct[];
  conquistasLinhaDoTempo: { ano: string; texto: string; confirmar?: boolean }[];
  depoimentos: { nome: string; texto: string; confirmar?: boolean }[];
  impactStats: ImpactStatCms[];
  videoDestaque: VideoDestaqueCms;
  atualizadoEm: string;
};

export function videoDestaquePadrao(): VideoDestaqueCms {
  return { url: "", titulo: "", data: "", legenda: "" };
}

export function landingCmsPadrao(): LandingCms {
  return {
    noticias: [],
    destaquesCct: [],
    conquistasLinhaDoTempo: [],
    depoimentos: [],
    impactStats: [],
    videoDestaque: videoDestaquePadrao(),
    atualizadoEm: "",
  };
}

export function mesclarLandingCms(parcial: Partial<LandingCms>): LandingCms {
  const base = landingCmsPadrao();
  const videoBruto = parcial.videoDestaque;
  const videoDestaque: VideoDestaqueCms = videoBruto
    ? { ...base.videoDestaque, ...videoBruto }
    : base.videoDestaque;
  return {
    noticias: parcial.noticias ?? base.noticias,
    destaquesCct: parcial.destaquesCct ?? base.destaquesCct,
    conquistasLinhaDoTempo: parcial.conquistasLinhaDoTempo ?? base.conquistasLinhaDoTempo,
    depoimentos: parcial.depoimentos ?? base.depoimentos,
    impactStats: parcial.impactStats ?? base.impactStats,
    videoDestaque,
    atualizadoEm: parcial.atualizadoEm ?? base.atualizadoEm,
  };
}
