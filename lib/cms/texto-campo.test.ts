import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_RESUMO_NOTICIA,
  asTextoCampo,
  mensagemTextoCampo,
  textoObrigatorio,
  trimExternoTexto,
} from "./texto-campo.ts";

describe("CMS resumo colado", () => {
  it("trim externo preserva quebras e emoji", () => {
    const bruto = "  \nPresidência 🏥\n\nParágrafo.\n  ";
    assert.equal(trimExternoTexto(bruto), "Presidência 🏥\n\nParágrafo.");
  });

  it("texto >500 chars não usa mensagem de vazio (limite CMS 4000)", () => {
    const resumo = "x".repeat(600);
    assert.equal(textoObrigatorio(resumo, MAX_RESUMO_NOTICIA), true);
    const legado500 = mensagemTextoCampo(resumo, 500, {
      vazio: "Informe o resumo.",
      longo: (max) => `Resumo muito longo (máximo ${max} caracteres).`,
    });
    assert.ok(legado500?.includes("muito longo"));
  });

  it("coerciona summary para string de resumo", () => {
    assert.equal(asTextoCampo(undefined), "");
    assert.equal(asTextoCampo("  ok  "), "  ok  ");
  });
});
