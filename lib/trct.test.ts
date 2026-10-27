import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decidirEnvio, validarLeitura } from "./trct.ts";

describe("decidirEnvio", () => {
  it("rejeita arquivo maior que 5 MB sem chamar a rede", () => {
    const decisao = decidirEnvio(
      { name: "holerite.png", type: "image/png", size: 5 * 1024 * 1024 + 1 },
      true,
    );
    assert.equal(decisao?.status, 413);
    assert.equal(decisao?.error, "O arquivo passa de 5 MB.");
  });

  it("rejeita tipo que não é PDF, PNG ou JPG", () => {
    const decisao = decidirEnvio({ name: "nota.txt", type: "text/plain", size: 12 }, true);
    assert.equal(decisao?.status, 400);
    assert.equal(decisao?.error, "Envie apenas PDF, PNG ou JPG.");
  });

  it("não inventa números quando não há leitor configurado", () => {
    const decisao = decidirEnvio({ name: "folha.png", type: "image/png", size: 128 }, false);
    assert.equal(decisao?.status, 503);
    assert.match(decisao?.error ?? "", /Nenhum leitor de TRCT está configurado/);
    assert.equal("dadosContratuais" in (decisao ?? {}), false);
  });
});

const leituraBase = {
  dadosContratuais: {
    dataAdmissao: "2024-02-01",
    dataDemissao: "2024-08-15",
    motivoAfastamento: "Dispensa sem justa causa",
    salarioBase: 2500,
  },
  verbasPagasEmpregador: {
    saldoSalario: 1500,
    avisoPrevioIndenizado: 1000,
    decimoTerceiroProporcional: 800,
    feriasProporcionais: null,
    tercoConstitucionalFerias: null,
    valorTotalLiquido: 4000,
  },
};

describe("validarLeitura", () => {
  it("recusa JSON incompleto", () => {
    assert.equal(validarLeitura({ dadosContratuais: { salarioBase: 3000 } }), null);
  });

  it("aceita a leitura antiga e deixa os campos opcionais de fora", () => {
    const leitura = validarLeitura(leituraBase);
    assert.equal(leitura?.dadosContratuais.salarioBase, 2500);
    assert.equal("grauInsalubridade" in (leitura?.dadosContratuais ?? {}), false);
    assert.equal("mediaHorasExtras" in (leitura?.dadosContratuais ?? {}), false);
    assert.equal("adicionalNoturno" in (leitura?.dadosContratuais ?? {}), false);
  });

  it("guarda grau, horas e noturno quando o número veio impresso", () => {
    const leitura = validarLeitura({
      ...leituraBase,
      dadosContratuais: {
        ...leituraBase.dadosContratuais,
        grauInsalubridade: 10,
        mediaHorasExtras: 4,
        adicionalNoturno: 50,
      },
    });
    assert.equal(leitura?.dadosContratuais.grauInsalubridade, 10);
    assert.equal(leitura?.dadosContratuais.mediaHorasExtras, 4);
    assert.equal(leitura?.dadosContratuais.adicionalNoturno, 50);
  });

  it("trata nulo como ausência de preenchimento e recusa texto no lugar de número", () => {
    const leitura = validarLeitura({
      ...leituraBase,
      dadosContratuais: {
        ...leituraBase.dadosContratuais,
        grauInsalubridade: null,
        mediaHorasExtras: null,
        adicionalNoturno: null,
      },
    });
    assert.equal(leitura?.dadosContratuais.grauInsalubridade, null);
    assert.equal(leitura?.dadosContratuais.mediaHorasExtras, null);
    assert.equal(
      validarLeitura({
        ...leituraBase,
        dadosContratuais: { ...leituraBase.dadosContratuais, mediaHorasExtras: "10" },
      }),
      null,
    );
  });

  it("não usa um grau fora de 0, 10, 20 e 40", () => {
    const leitura = validarLeitura({
      ...leituraBase,
      dadosContratuais: { ...leituraBase.dadosContratuais, grauInsalubridade: 15 },
    });
    assert.equal(leitura?.dadosContratuais.grauInsalubridade, null);
    assert.equal(leitura?.dadosContratuais.salarioBase, 2500);
  });
});
