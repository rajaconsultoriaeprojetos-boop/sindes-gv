export type Modalidade = "sem-justa-causa" | "pedido-demissao" | "acordo";

export type LinhaEstimativa = {
  rotulo: string;
  valor: number;
  detalhe: string;
};

export type Estimativa = {
  linhas: LinhaEstimativa[];
  totalVerbas: number;
  multaFgts: number | null;
  percentualMulta: number;
  soma: number;
  avisoDias: number;
  premissa: string;
};

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

function diasInclusivos(inicio: Date, fim: Date): number {
  const a = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const b = Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate());
  return Math.round((b - a) / 86400000) + 1;
}

function avosComQuinzeDias(inicio: Date, fim: Date): number {
  if (fim < inicio) return 0;
  let total = 0;
  let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
  while (cursor <= limite) {
    const inicioMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const fimMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const de = inicio > inicioMes ? inicio : inicioMes;
    const ate = fim < fimMes ? fim : fimMes;
    if (diasInclusivos(de, ate) >= 15) total += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return total;
}

function anosCompletos(inicio: Date, fim: Date): number {
  let anos = fim.getFullYear() - inicio.getFullYear();
  const mes = inicio.getMonth();
  const ultimoDia = new Date(fim.getFullYear(), mes + 1, 0).getDate();
  const dia = Math.min(inicio.getDate(), ultimoDia);
  const aniversario = new Date(fim.getFullYear(), mes, dia);
  if (fim < aniversario) anos -= 1;
  return Math.max(0, anos);
}

export function estimarRescisao(entrada: {
  salario: number;
  admissao: Date;
  desligamento: Date;
  diasTrabalhados: number;
  feriasVencidas: boolean;
  saldoFgts: number | null;
  modalidade: Modalidade;
}): Estimativa {
  const anos = anosCompletos(entrada.admissao, entrada.desligamento);
  const avisoCheio = Math.min(90, 30 + anos * 3);
  const projeta =
    entrada.modalidade === "sem-justa-causa"
      ? avisoCheio
      : entrada.modalidade === "acordo"
        ? Math.round(avisoCheio / 2)
        : 0;
  const fimProjetado = somarDias(entrada.desligamento, projeta);
  const anoSaida = entrada.desligamento.getFullYear();
  const inicioDecimo = new Date(
    Math.max(entrada.admissao.getTime(), new Date(anoSaida, 0, 1).getTime()),
  );
  const fimNoAno = new Date(
    Math.min(fimProjetado.getTime(), new Date(anoSaida, 11, 31).getTime()),
  );
  const avosDecimo = Math.min(12, avosComQuinzeDias(inicioDecimo, fimNoAno));
  let avosAnoSeguinte = 0;
  if (fimProjetado.getFullYear() > anoSaida) {
    avosAnoSeguinte = avosComQuinzeDias(new Date(anoSaida + 1, 0, 1), fimProjetado);
  }
  const avosFerias = avosComQuinzeDias(entrada.admissao, fimProjetado) % 12;
  const diaria = entrada.salario / 30;
  const saldo = diaria * entrada.diasTrabalhados;
  const aviso =
    entrada.modalidade === "pedido-demissao"
      ? 0
      : entrada.modalidade === "acordo"
        ? diaria * avisoCheio * 0.5
        : diaria * avisoCheio;
  const decimo = (entrada.salario / 12) * avosDecimo;
  const decimoSeguinte = (entrada.salario / 12) * avosAnoSeguinte;
  const feriasProp = (entrada.salario / 12) * avosFerias * (4 / 3);
  const feriasVenc = entrada.feriasVencidas ? entrada.salario * (4 / 3) : 0;

  const linhas: LinhaEstimativa[] = [
    {
      rotulo: "Saldo de salário",
      valor: saldo,
      detalhe: `${entrada.diasTrabalhados} dia(s) no mês da saída`,
    },
  ];

  if (entrada.modalidade === "pedido-demissao") {
    linhas.push({
      rotulo: "Aviso prévio indenizado",
      valor: 0,
      detalhe:
        "Não entra no pedido de demissão. Se o aviso não for cumprido, pode haver desconto — fora desta conta.",
    });
  } else if (entrada.modalidade === "acordo") {
    linhas.push({
      rotulo: "Aviso prévio indenizado (50%)",
      valor: aviso,
      detalhe: `${avisoCheio} dias de aviso, pagos pela metade (art. 484-A)`,
    });
  } else {
    linhas.push({
      rotulo: "Aviso prévio indenizado",
      valor: aviso,
      detalhe: `${avisoCheio} dias (30 + 3 por ano completo, teto de 90)`,
    });
  }

  linhas.push({
    rotulo: "13º proporcional",
    valor: decimo,
    detalhe: `${avosDecimo}/12 em ${anoSaida}`,
  });

  if (avosAnoSeguinte > 0) {
    linhas.push({
      rotulo: "13º do ano seguinte",
      valor: decimoSeguinte,
      detalhe: `${avosAnoSeguinte}/12 pela projeção do aviso`,
    });
  }

  linhas.push({
    rotulo: "Férias proporcionais + 1/3",
    valor: feriasProp,
    detalhe: `${avosFerias}/12 no período aquisitivo em aberto`,
  });

  if (entrada.feriasVencidas) {
    linhas.push({
      rotulo: "Férias vencidas + 1/3",
      valor: feriasVenc,
      detalhe: "1 período informado por você",
    });
  }

  const totalVerbas = linhas.reduce((soma, linha) => soma + linha.valor, 0);
  const percentualMulta =
    entrada.modalidade === "sem-justa-causa"
      ? 0.4
      : entrada.modalidade === "acordo"
        ? 0.2
        : 0;
  const multaFgts =
    entrada.saldoFgts === null ? null : entrada.saldoFgts * percentualMulta;

  const premissa =
    entrada.modalidade === "sem-justa-causa"
      ? "Demissão sem justa causa, com projeção do aviso prévio no 13º e nas férias."
      : entrada.modalidade === "acordo"
        ? "Acordo do art. 484-A: metade do aviso indenizado e multa de 20% sobre o FGTS informado."
        : "Pedido de demissão: sem aviso indenizado, sem multa de 40% e sem projeção do aviso.";

  return {
    linhas,
    totalVerbas,
    multaFgts,
    percentualMulta,
    soma: totalVerbas + (multaFgts ?? 0),
    avisoDias: avisoCheio,
    premissa,
  };
}
