import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularRescisao, diasAvisoPrevio, divisorDaJornada } from "./rescisao.ts";

const casoReferencia = {
  admissao: "2022-03-10",
  demissao: "2026-03-20",
  motivo: "sem-justa-causa" as const,
  salarioBase: 3000,
  grauInsalubridade: 20 as const,
  mediaHorasExtras: 10,
  adicionalNoturno: 200,
};

describe("calcularRescisao", () => {
  it("não paga aviso no pedido de demissão", () => {
    const resultado = calcularRescisao({
      ...casoReferencia,
      motivo: "pedido-demissao",
    });
    const aviso = resultado.proventos.find((linha) => linha.id === "aviso");
    assert.equal(resultado.avisoDias, 0);
    assert.equal(aviso?.centavos, 0);
    assert.match(
      aviso?.detalhe ?? "",
      /No pedido de demissão o empregador não paga aviso prévio indenizado/,
    );
  });

  it("limita o aviso a 90 dias depois de 30 anos", () => {
    assert.equal(diasAvisoPrevio(30, "sem-justa-causa"), 90);
    const resultado = calcularRescisao({
      admissao: "1996-03-20",
      demissao: "2026-03-20",
      motivo: "sem-justa-causa",
      salarioBase: 3000,
      grauInsalubridade: 0,
      mediaHorasExtras: 0,
      adicionalNoturno: 0,
    });
    assert.equal(resultado.anosCompletos, 30);
    assert.equal(resultado.avisoDias, 90);
    assert.notEqual(resultado.avisoDias, 120);
  });

  it("inclui insalubridade de 40% na base e no reflexo de 13º e férias", () => {
    const comQuarenta = calcularRescisao({ ...casoReferencia, grauInsalubridade: 40 });
    const semAdicional = calcularRescisao({ ...casoReferencia, grauInsalubridade: 0 });
    const linha = (resultado: ReturnType<typeof calcularRescisao>, id: string) =>
      [...resultado.proventos, ...resultado.descontos].find((item) => item.id === id)?.centavos;

    assert.equal(comQuarenta.remuneracaoCentavos - semAdicional.remuneracaoCentavos, 56_480);
    assert.equal(linha(comQuarenta, "saldo"), 200_000);
    assert.equal(linha(comQuarenta, "insalubridade"), 37_653);
    assert.equal(linha(comQuarenta, "horas-extras"), 13_637);
    assert.equal(linha(comQuarenta, "noturno"), 13_333);
    assert.equal(linha(comQuarenta, "aviso"), 555_709);
    assert.equal(linha(comQuarenta, "decimo"), 132_312);
    assert.equal(linha(comQuarenta, "ferias"), 88_208);
    assert.equal(linha(comQuarenta, "inss-mes"), 21_698);
    assert.equal(linha(comQuarenta, "inss-decimo"), 9_923);

    assert.equal(linha(semAdicional, "saldo"), 200_000);
    assert.equal(linha(semAdicional, "insalubridade"), 0);
    assert.equal(linha(semAdicional, "horas-extras"), 13_637);
    assert.equal(linha(semAdicional, "noturno"), 13_333);
    assert.equal(linha(semAdicional, "aviso"), 476_637);
    assert.equal(linha(semAdicional, "decimo"), 113_485);
    assert.equal(linha(semAdicional, "ferias"), 75_657);
    assert.equal(linha(semAdicional, "inss-mes"), 18_309);
    assert.equal(linha(semAdicional, "inss-decimo"), 8_511);

    assert.equal(
      (linha(comQuarenta, "decimo") ?? 0) - (linha(semAdicional, "decimo") ?? 0),
      18_827,
    );
    assert.equal(
      (linha(comQuarenta, "ferias") ?? 0) - (linha(semAdicional, "ferias") ?? 0),
      12_551,
    );
  });

  it("usa divisor 180 e a Súmula 60 na escala 12x36", () => {
    assert.equal(divisorDaJornada(undefined), 220);
    assert.equal(divisorDaJornada("padrao"), 220);
    assert.equal(divisorDaJornada("12x36"), 180);

    const escala = calcularRescisao({
      admissao: "2024-01-01",
      demissao: "2024-01-30",
      motivo: "sem-justa-causa",
      salarioBase: 1800,
      grauInsalubridade: 0,
      mediaHorasExtras: 10,
      adicionalNoturno: 0,
      jornada: "12x36",
      horasNoturnas: 8,
      horasAposCinco: 2,
    });
    const soOitoHoras = calcularRescisao({
      admissao: "2024-01-01",
      demissao: "2024-01-30",
      motivo: "sem-justa-causa",
      salarioBase: 1800,
      grauInsalubridade: 0,
      mediaHorasExtras: 10,
      adicionalNoturno: 0,
      jornada: "12x36",
      horasNoturnas: 8,
    });
    const divisorPadrao = calcularRescisao({
      admissao: "2024-01-01",
      demissao: "2024-01-30",
      motivo: "sem-justa-causa",
      salarioBase: 1800,
      grauInsalubridade: 0,
      mediaHorasExtras: 10,
      adicionalNoturno: 0,
    });
    const linha = (resultado: ReturnType<typeof calcularRescisao>, id: string) =>
      [...resultado.proventos, ...resultado.descontos].find((item) => item.id === id)?.centavos;

    assert.equal(linha(escala, "saldo"), 180_000);
    assert.equal(linha(escala, "insalubridade"), 0);
    assert.equal(linha(escala, "horas-extras"), 15_000);
    assert.equal(linha(escala, "noturno"), 2_000);
    assert.equal(linha(soOitoHoras, "noturno"), 1_600);
    assert.equal(linha(divisorPadrao, "horas-extras"), 12_273);
    assert.notEqual(linha(escala, "horas-extras"), linha(divisorPadrao, "horas-extras"));
    assert.equal(escala.avisoDias, 30);
    assert.equal(linha(escala, "aviso"), 197_000);
    assert.equal(linha(escala, "decimo"), 32_833);
    assert.equal(linha(escala, "ferias"), 43_778);
    assert.equal(linha(escala, "inss-mes"), 15_612);
    assert.equal(linha(escala, "inss-decimo"), 2_462);
  });

  it("desconta faltas do saldo e só reduz férias a partir de seis", () => {
    const tres = calcularRescisao({ ...casoReferencia, faltasInjustificadas: 3 });
    const seis = calcularRescisao({ ...casoReferencia, faltasInjustificadas: 6 });
    const linha = (resultado: ReturnType<typeof calcularRescisao>, id: string) =>
      [...resultado.proventos, ...resultado.descontos].find((item) => item.id === id)?.centavos;
    const referencia = calcularRescisao(casoReferencia);

    assert.equal(linha(tres, "saldo"), 170_000);
    assert.equal(linha(referencia, "saldo")! - linha(tres, "saldo")!, 30_000);
    assert.equal(linha(tres, "insalubridade"), 18_827);
    assert.equal(linha(tres, "horas-extras"), 13_637);
    assert.equal(linha(tres, "noturno"), 13_333);
    assert.equal(linha(tres, "aviso"), 516_173);
    assert.equal(linha(tres, "decimo"), 122_898);
    assert.equal(linha(tres, "ferias"), 81_932);
    assert.equal(tres.mesesFerias, referencia.mesesFerias);
    assert.equal(linha(tres, "inss-mes"), 17_304);
    assert.equal(linha(tres, "inss-decimo"), 9_217);

    assert.equal(linha(seis, "saldo"), 140_000);
    assert.equal(linha(seis, "insalubridade"), 18_827);
    assert.equal(linha(seis, "horas-extras"), 13_637);
    assert.equal(linha(seis, "noturno"), 13_333);
    assert.equal(linha(seis, "aviso"), 516_173);
    assert.equal(linha(seis, "decimo"), 122_898);
    assert.equal(linha(seis, "ferias"), 65_546);
    assert.equal(linha(seis, "inss-mes"), 14_604);
    assert.equal(linha(seis, "inss-decimo"), 9_217);
    assert.equal(Math.round((81_932 * 24) / 30), 65_546);
  });
});
