import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mesclarLeituras } from "./mesclar-leitura-trct.ts";
import type { LeituraTrct } from "./trct.ts";

describe("mesclarLeituras", () => {
  it("preenche nulos do principal com extras", () => {
    const principal: LeituraTrct = {
      dadosContratuais: {
        dataAdmissao: "2020-01-01",
        dataDemissao: null,
        motivoAfastamento: null,
        salarioBase: 2500,
      },
      verbasPagasEmpregador: {
        saldoSalario: 1000,
        avisoPrevioIndenizado: null,
        decimoTerceiroProporcional: null,
        feriasProporcionais: null,
        tercoConstitucionalFerias: null,
        valorTotalLiquido: null,
      },
    };
    const extra: LeituraTrct = {
      dadosContratuais: {
        dataAdmissao: "2019-01-01",
        dataDemissao: "2024-03-01",
        motivoAfastamento: "sem justa causa",
        salarioBase: 9999,
      },
      verbasPagasEmpregador: {
        saldoSalario: 500,
        avisoPrevioIndenizado: 2000,
        decimoTerceiroProporcional: 800,
        feriasProporcionais: 600,
        tercoConstitucionalFerias: 200,
        valorTotalLiquido: 4500,
      },
    };
    const mesclado = mesclarLeituras(principal, extra);
    assert.equal(mesclado.dadosContratuais.dataAdmissao, "2020-01-01");
    assert.equal(mesclado.dadosContratuais.dataDemissao, "2024-03-01");
    assert.equal(mesclado.dadosContratuais.salarioBase, 2500);
    assert.equal(mesclado.verbasPagasEmpregador.saldoSalario, 1000);
    assert.equal(mesclado.verbasPagasEmpregador.valorTotalLiquido, 4500);
  });
});
