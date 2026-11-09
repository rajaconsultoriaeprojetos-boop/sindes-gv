import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INSTAGRAM_PERFIL } from "../../components/landing/conteudo-instagram.ts";
import {
  hrefNoticiaEfetivo,
  limparNoticiasVazias,
  normalizarLandingCmsParaSalvar,
  noticiaVazia,
  validarLandingCms,
  validarLandingCmsFormulario,
} from "./validar-landing.ts";
import { landingCmsPadrao } from "./landing-model.ts";

describe("CMS notícias persistência", () => {
  it("href vazio usa Instagram na validação", () => {
    assert.equal(hrefNoticiaEfetivo(""), INSTAGRAM_PERFIL);
    assert.equal(hrefNoticiaEfetivo("  "), INSTAGRAM_PERFIL);
  });

  it("notícia preenchida com href vazio passa validação e grava link Instagram", () => {
    const base = landingCmsPadrao();
    const dados = {
      ...base,
      noticias: [
        {
          titulo: "Mensagem da presidência",
          resumo: "Texto de teste com conteúdo.",
          data: "2026",
          tipo: "presidencia" as const,
          href: "",
          confirmar: false,
        },
      ],
    };
    assert.equal(validarLandingCmsFormulario(dados), null);
    assert.equal(validarLandingCms(dados), null);
    const salvo = normalizarLandingCmsParaSalvar(dados);
    assert.equal(salvo.noticias.length, 1);
    assert.equal(salvo.noticias[0]?.href, INSTAGRAM_PERFIL);
  });

  it("aceita data legível por extenso", () => {
    const base = landingCmsPadrao();
    const dados = {
      ...base,
      noticias: [
        {
          titulo: "Informe SINDES",
          resumo: "Texto ".repeat(80).trim(),
          data: "23 de outubro de 2026",
          tipo: "video" as const,
          href: INSTAGRAM_PERFIL,
        },
      ],
    };
    assert.equal(validarLandingCmsFormulario(dados), null);
    assert.equal(validarLandingCms(dados), null);
  });

  it("só remove linha totalmente vazia", () => {
    const vazia = {
      titulo: "",
      resumo: "",
      data: "",
      tipo: "presidencia" as const,
      href: "",
    };
    assert.equal(noticiaVazia(vazia), true);
    const lista = limparNoticiasVazias([
      vazia,
      {
        titulo: "Ok",
        resumo: "Resumo",
        data: "2026",
        tipo: "video" as const,
        href: "https://example.com/p",
      },
    ]);
    assert.equal(lista.length, 1);
    assert.equal(lista[0]?.titulo, "Ok");
  });
});

describe("CMS vídeo do dia", () => {
  it("URL vazia passa validação e não grava destaque", () => {
    const base = landingCmsPadrao();
    const dados = {
      ...base,
      videoDestaque: { url: "", titulo: "", data: "", legenda: "" },
    };
    assert.equal(validarLandingCmsFormulario(dados), null);
    const salvo = normalizarLandingCmsParaSalvar(dados);
    assert.equal(salvo.videoDestaque.url, "");
  });

  it("aceita reel Instagram (normaliza /reels/)", () => {
    const base = landingCmsPadrao();
    const dados = {
      ...base,
      videoDestaque: {
        url: "https://www.instagram.com/reels/DfgDl0QgZF5/",
        titulo: "Plantão",
        data: "Nov/2026",
        legenda: "",
      },
    };
    assert.equal(validarLandingCmsFormulario(dados), null);
    const salvo = normalizarLandingCmsParaSalvar(dados);
    assert.equal(salvo.videoDestaque.url, "https://www.instagram.com/reel/DfgDl0QgZF5/");
  });

  it("aceita MP4 HTTPS", () => {
    const base = landingCmsPadrao();
    const dados = {
      ...base,
      videoDestaque: {
        url: "https://cdn.example.com/clipe.mp4",
        titulo: "",
        data: "",
        legenda: "",
      },
    };
    assert.equal(validarLandingCmsFormulario(dados), null);
  });

  it("rejeita URL inválida", () => {
    const base = landingCmsPadrao();
    const dados = {
      ...base,
      videoDestaque: {
        url: "https://youtube.com/watch?v=abc",
        titulo: "",
        data: "",
        legenda: "",
      },
    };
    const err = validarLandingCmsFormulario(dados);
    assert.ok(err && typeof err === "object" && "lista" in err && err.lista === "videoDestaque");
  });
});
