import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TOLERANCIA_SOMA_LIQUIDO_REAIS,
  auditarConsistenciaInterna,
} from "./consistencia-interna-trct.ts";
import type { LeituraTrct } from "./trct.ts";

const leituraBase: LeituraTrct = {
  dadosContratuais: {
    dataAdmissao: "2020-01-10",
    dataDemissao: "2024-06-15",
    motivoAfastamento: "sem justa causa",
    salarioBase: 3000,
    grauInsalubridade: 20,
    mediaHorasExtras: 0,
    adicionalNoturno: 0,
  },
  verbasPagasEmpregador: {
    saldoSalario: 1500,
    avisoPrevioIndenizado: 3000,
    decimoTerceiroProporcional: 1500,
    feriasProporcionais: 1200,
    tercoConstitucionalFerias: 400,
    valorTotalLiquido: 7600,
  },
};

describe("auditarConsistenciaInterna", () => {
  it("aceita soma igual ao líquido dentro da tolerância", () => {
    const soma = 1500 + 3000 + 1500 + 1200 + 400;
    const leitura: LeituraTrct = {
      ...leituraBase,
      verbasPagasEmpregador: {
        ...leituraBase.verbasPagasEmpregador,
        valorTotalLiquido: soma,
      },
    };
    const achados = auditarConsistenciaInterna(leitura);
    assert.ok(!achados.some((a) => a.id === "soma-liquido-diverge"));
  });

  it("marca soma divergente do líquido", () => {
    const leitura: LeituraTrct = {
      ...leituraBase,
      verbasPagasEmpregador: {
        ...leituraBase.verbasPagasEmpregador,
        valorTotalLiquido: 100,
      },
    };
    const achados = auditarConsistenciaInterna(leitura);
    assert.ok(achados.some((a) => a.id === "soma-liquido-diverge" && a.severidade === "alta"));
  });

  it("interpreta diferença típica de INSS como baixa", () => {
    const soma = 4000;
    const liquido = soma * 0.9;
    const leitura: LeituraTrct = {
      ...leituraBase,
      verbasPagasEmpregador: {
        saldoSalario: 4000,
        avisoPrevioIndenizado: null,
        decimoTerceiroProporcional: null,
        feriasProporcionais: null,
        tercoConstitucionalFerias: null,
        valorTotalLiquido: liquido,
      },
    };
    const achados = auditarConsistenciaInterna(leitura);
    assert.ok(achados.some((a) => a.id === "soma-liquido-inss"));
    assert.ok(!achados.some((a) => a.id === "soma-liquido-diverge"));
  });

  it("sinaliza datas invertidas", () => {
    const leitura: LeituraTrct = {
      ...leituraBase,
      dadosContratuais: {
        ...leituraBase.dadosContratuais,
        dataAdmissao: "2024-06-15",
        dataDemissao: "2020-01-10",
      },
    };
    const achados = auditarConsistenciaInterna(leitura);
    assert.ok(achados.some((a) => a.id === "datas-invertidas"));
  });

  it("sinaliza 13º ausente", () => {
    const leitura: LeituraTrct = {
      ...leituraBase,
      verbasPagasEmpregador: {
        ...leituraBase.verbasPagasEmpregador,
        decimoTerceiroProporcional: null,
      },
    };
    const achados = auditarConsistenciaInterna(leitura);
    assert.ok(achados.some((a) => a.mensagem.includes("13º proporcional ausente")));
  });

  it("exporta tolerância esperada", () => {
    assert.equal(TOLERANCIA_SOMA_LIQUIDO_REAIS, 0.05);
  });
});
