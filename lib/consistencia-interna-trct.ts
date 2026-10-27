import type { DadosContratuais, LeituraTrct, VerbasPagasEmpregador } from "./trct";

export const TOLERANCIA_SOMA_LIQUIDO_REAIS = 0.05;

export type SeveridadeAchado = "alta" | "media" | "baixa";

export type AchadoConsistencia = {
  id: string;
  severidade: SeveridadeAchado;
  mensagem: string;
  detalhe?: string;
};

const ROTULOS_VERBA: { chave: keyof VerbasPagasEmpregador; rotulo: string; critico: boolean }[] = [
  { chave: "saldoSalario", rotulo: "Saldo de salário", critico: false },
  { chave: "avisoPrevioIndenizado", rotulo: "Aviso prévio indenizado", critico: false },
  { chave: "decimoTerceiroProporcional", rotulo: "13º proporcional", critico: true },
  { chave: "feriasProporcionais", rotulo: "Férias proporcionais", critico: false },
  { chave: "tercoConstitucionalFerias", rotulo: "1/3 de férias", critico: false },
  { chave: "valorTotalLiquido", rotulo: "Valor líquido", critico: true },
];

function somaVerbasLidasReais(verbas: VerbasPagasEmpregador): number | null {
  const parcelas = [
    verbas.saldoSalario,
    verbas.avisoPrevioIndenizado,
    verbas.decimoTerceiroProporcional,
    verbas.feriasProporcionais,
    verbas.tercoConstitucionalFerias,
  ];
  if (parcelas.every((valor) => valor === null)) return null;
  return parcelas.reduce<number>((total, valor) => total + (valor ?? 0), 0);
}

function temAlgumaVerbaPreenchida(verbas: VerbasPagasEmpregador): boolean {
  return ROTULOS_VERBA.some(({ chave }) => verbas[chave] !== null);
}

function diasEntreDatas(admissao: string, demissao: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(admissao) || !/^\d{4}-\d{2}-\d{2}$/.test(demissao)) return null;
  const [aY, aM, aD] = admissao.split("-").map(Number);
  const [dY, dM, dD] = demissao.split("-").map(Number);
  const inicio = Date.UTC(aY, aM - 1, aD);
  const fim = Date.UTC(dY, dM - 1, dD);
  if (fim < inicio) return null;
  return Math.floor((fim - inicio) / 86_400_000) + 1;
}

function achadosCamposCriticos(dados: DadosContratuais, verbas: VerbasPagasEmpregador): AchadoConsistencia[] {
  const achados: AchadoConsistencia[] = [];
  if (!dados.dataAdmissao) {
    achados.push({
      id: "campo-admissao",
      severidade: "alta",
      mensagem: "Data de admissão ausente na leitura",
    });
  }
  if (!dados.dataDemissao) {
    achados.push({
      id: "campo-demissao",
      severidade: "alta",
      mensagem: "Data de demissão ausente na leitura",
    });
  }
  if (dados.salarioBase === null || dados.salarioBase <= 0) {
    achados.push({
      id: "campo-salario",
      severidade: "alta",
      mensagem: "Salário base não lido ou inválido",
    });
  }
  if (verbas.valorTotalLiquido === null && temAlgumaVerbaPreenchida(verbas)) {
    achados.push({
      id: "campo-liquido",
      severidade: "media",
      mensagem: "Valor líquido não lido no TRCT",
    });
  }
  return achados;
}

function achadosDatas(dados: DadosContratuais): AchadoConsistencia[] {
  if (!dados.dataAdmissao || !dados.dataDemissao) return [];
  if (dados.dataDemissao < dados.dataAdmissao) {
    return [
      {
        id: "datas-invertidas",
        severidade: "alta",
        mensagem: "Data de demissão anterior à admissão",
        detalhe: `${dados.dataDemissao} < ${dados.dataAdmissao}`,
      },
    ];
  }
  const dias = diasEntreDatas(dados.dataAdmissao, dados.dataDemissao);
  if (dias !== null && dias > 365 * 60) {
    return [
      {
        id: "contrato-longo",
        severidade: "baixa",
        mensagem: "Tempo de contrato muito longo — confira as datas",
        detalhe: `${dias} dias entre admissão e demissão`,
      },
    ];
  }
  return [];
}

function achadosVerbasAusentes(verbas: VerbasPagasEmpregador): AchadoConsistencia[] {
  if (!temAlgumaVerbaPreenchida(verbas)) return [];
  const achados: AchadoConsistencia[] = [];
  for (const { chave, rotulo, critico } of ROTULOS_VERBA) {
    if (chave === "valorTotalLiquido") continue;
    if (verbas[chave] === null) {
      achados.push({
        id: `verba-ausente-${chave}`,
        severidade: critico ? "media" : "baixa",
        mensagem: `${rotulo} ausente no TRCT`,
      });
    }
  }
  return achados;
}

function achadoSomaVsLiquido(verbas: VerbasPagasEmpregador): AchadoConsistencia[] {
  const soma = somaVerbasLidasReais(verbas);
  const liquido = verbas.valorTotalLiquido;
  if (soma === null || liquido === null) return [];

  const diff = soma - liquido;
  const absDiff = Math.abs(diff);
  if (absDiff <= TOLERANCIA_SOMA_LIQUIDO_REAIS) return [];

  if (liquido > soma + TOLERANCIA_SOMA_LIQUIDO_REAIS) {
    return [
      {
        id: "liquido-maior-soma",
        severidade: "alta",
        mensagem: "Líquido impresso é maior que a soma das verbas lidas",
        detalhe: `Soma R$ ${soma.toFixed(2)} · Líquido R$ ${liquido.toFixed(2)}`,
      },
    ];
  }

  if (soma > 0) {
    const proporcao = diff / soma;
    if (proporcao >= 0.075 && proporcao <= 0.2) {
      return [
        {
          id: "soma-liquido-inss",
          severidade: "baixa",
          mensagem: "Diferença entre soma das verbas e líquido compatível com INSS",
          detalhe: `Diferença R$ ${diff.toFixed(2)} (${(proporcao * 100).toFixed(1)}% da soma)`,
        },
      ];
    }
  }

  return [
    {
      id: "soma-liquido-diverge",
      severidade: "alta",
      mensagem: "Soma das verbas não confere com o líquido",
      detalhe: `Soma R$ ${soma.toFixed(2)} · Líquido R$ ${liquido.toFixed(2)} · Diferença R$ ${diff.toFixed(2)}`,
    },
  ];
}

function achadosPlausibilidade(dados: DadosContratuais, verbas: VerbasPagasEmpregador): AchadoConsistencia[] {
  const achados: AchadoConsistencia[] = [];
  const salario = dados.salarioBase;
  if (salario === null || salario <= 0) return achados;

  const tetoMensal = salario * 1.5;
  if (verbas.saldoSalario !== null && verbas.saldoSalario > tetoMensal) {
    achados.push({
      id: "saldo-alto",
      severidade: "media",
      mensagem: "Saldo de salário muito acima do salário base lido",
      detalhe: `Saldo R$ ${verbas.saldoSalario.toFixed(2)} · Base R$ ${salario.toFixed(2)}`,
    });
  }

  const tetoRescisao = salario * 24;
  const soma = somaVerbasLidasReais(verbas);
  if (soma !== null && soma > tetoRescisao) {
    achados.push({
      id: "soma-muito-alta",
      severidade: "media",
      mensagem: "Soma das verbas parece desproporcional ao salário",
      detalhe: `Soma R$ ${soma.toFixed(2)} · Base R$ ${salario.toFixed(2)}`,
    });
  }

  if (
    verbas.feriasProporcionais !== null &&
    verbas.tercoConstitucionalFerias !== null &&
    verbas.feriasProporcionais > 0 &&
    verbas.tercoConstitucionalFerias > verbas.feriasProporcionais * 0.34 + 0.05
  ) {
    achados.push({
      id: "terco-ferias",
      severidade: "baixa",
      mensagem: "1/3 de férias não parece ~33% das férias proporcionais",
    });
  }

  return achados;
}

/** Checagens determinísticas só com o JSON lido (sem SINDES). */
export function auditarConsistenciaInterna(leitura: LeituraTrct): AchadoConsistencia[] {
  const { dadosContratuais: dados, verbasPagasEmpregador: verbas } = leitura;
  return [
    ...achadosCamposCriticos(dados, verbas),
    ...achadosDatas(dados),
    ...achadosVerbasAusentes(verbas),
    ...achadoSomaVsLiquido(verbas),
    ...achadosPlausibilidade(dados, verbas),
  ];
}

const ORDEM_SEVERIDADE: Record<SeveridadeAchado, number> = { alta: 0, media: 1, baixa: 2 };

export function ordenarAchados(achados: AchadoConsistencia[]): AchadoConsistencia[] {
  return [...achados].sort(
    (a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade] || a.mensagem.localeCompare(b.mensagem, "pt-BR"),
  );
}

export function contagemPorSeveridade(achados: AchadoConsistencia[]): Record<SeveridadeAchado, number> {
  return achados.reduce(
    (acc, item) => {
      acc[item.severidade] += 1;
      return acc;
    },
    { alta: 0, media: 0, baixa: 0 },
  );
}
