import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditarRescisao, textoAlerta, textoDiferenca } from "./auditoria.ts";
import type { ResultadoRescisao } from "./rescisao.ts";
import type { VerbasPagasEmpregador } from "./trct.ts";

function linha(id: ResultadoRescisao["proventos"][number]["id"], centavos: number) {
  return { id, rotulo: id, detalhe: "", centavos };
}

function resultadoParcial(valores: {
  saldo: number;
  aviso: number;
  decimo: number;
  ferias: number;
  liquido: number;
}): ResultadoRescisao {
  return {
    avisoDias: 0,
    anosCompletos: 0,
    meses13: 0,
    mesesFerias: 0,
    remuneracaoCentavos: 0,
    proventos: [
      linha("saldo", valores.saldo),
      linha("aviso", valores.aviso),
      linha("decimo", valores.decimo),
      linha("ferias", valores.ferias),
    ],
    descontos: [],
    proventosCentavos: 0,
    descontosCentavos: 0,
    liquidoCentavos: valores.liquido,
  };
}

const verbasZeradas = {
  saldoSalario: null,
  avisoPrevioIndenizado: null,
  decimoTerceiroProporcional: null,
  feriasProporcionais: null,
  tercoConstitucionalFerias: null,
  valorTotalLiquido: null,
} satisfies VerbasPagasEmpregador;

describe("auditarRescisao", () => {
  const base = resultadoParcial({
    saldo: 200_000,
    aviso: 180_000,
    decimo: 180_000,
    ferias: 80_000,
    liquido: 180_000,
  });

  it("marca 1.500 contra 1.800 como diferença de −300", () => {
    const auditoria = auditarRescisao(
      { ...verbasZeradas, decimoTerceiroProporcional: 1500, valorTotalLiquido: 1800 },
      base,
    );
    const decimo = auditoria.linhas.find((item) => item.id === "decimo");
    assert.equal(decimo?.diferencaCentavos, -30_000);
    assert.equal(decimo?.status, "divergente");
    assert.equal(textoDiferenca(decimo?.diferencaCentavos ?? 0), "−R$ 300,00");
  });

  it("reconhece um campo exato", () => {
    const auditoria = auditarRescisao(
      { ...verbasZeradas, saldoSalario: 2000, valorTotalLiquido: 1800 },
      base,
    );
    assert.equal(auditoria.linhas.find((item) => item.id === "saldo")?.status, "exato");
  });

  it("reconhece um campo favorável ao trabalhador", () => {
    const auditoria = auditarRescisao(
      { ...verbasZeradas, avisoPrevioIndenizado: 2000, valorTotalLiquido: 1800 },
      base,
    );
    const aviso = auditoria.linhas.find((item) => item.id === "aviso");
    assert.equal(aviso?.status, "favoravel");
    assert.equal(aviso?.diferencaCentavos, 20_000);
  });

  it("não transforma campo nulo em falta de zero", () => {
    const auditoria = auditarRescisao(verbasZeradas, base);
    const decimo = auditoria.linhas.find((item) => item.id === "decimo");
    assert.equal(decimo?.status, "naoLido");
    assert.equal(decimo?.empresaCentavos, null);
    assert.equal(decimo?.diferencaCentavos, null);
    assert.equal(auditoria.alerta, false);
    assert.equal(auditoria.faltaCentavos, null);
  });

  it("só acende o alerta quando o líquido da empresa é menor", () => {
    const curto = auditarRescisao({ ...verbasZeradas, valorTotalLiquido: 1500 }, base);
    assert.equal(curto.alerta, true);
    assert.equal(curto.faltaCentavos, 30_000);
    assert.equal(
      textoAlerta(curto.faltaCentavos ?? 0),
      "⚠️ Atenção SINDES: Identificamos que o trabalhador recebeu R$ 300,00 a menos do que o devido por lei.",
    );

    const igual = auditarRescisao({ ...verbasZeradas, valorTotalLiquido: 1800 }, base);
    assert.equal(igual.alerta, false);
    assert.equal(igual.faltaCentavos, null);

    const maior = auditarRescisao({ ...verbasZeradas, valorTotalLiquido: 1900 }, base);
    assert.equal(maior.alerta, false);
  });

  it("separa férias e 1/3 depois do arredondamento da linha combinada", () => {
    const auditoria = auditarRescisao(verbasZeradas, {
      ...base,
      proventos: base.proventos.map((item) =>
        item.id === "ferias" ? { ...item, centavos: 81_932 } : item,
      ),
    });
    assert.equal(auditoria.linhas.find((item) => item.id === "terco")?.sindesCentavos, 20_483);
    assert.equal(auditoria.linhas.find((item) => item.id === "ferias")?.sindesCentavos, 61_449);
  });
});
