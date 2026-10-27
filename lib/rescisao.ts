export const SALARIO_MINIMO_2024_CENTAVOS = 141_200;
export const TETO_INSS_2024_CENTAVOS = 778_602;

export type MotivoRescisao = "sem-justa-causa" | "pedido-demissao";
export type GrauInsalubridade = 0 | 10 | 20 | 40;
export type JornadaRescisao = "padrao" | "12x36";

export type EntradaRescisao = {
  admissao: string;
  demissao: string;
  motivo: MotivoRescisao;
  salarioBase: number;
  grauInsalubridade: GrauInsalubridade;
  mediaHorasExtras: number;
  adicionalNoturno: number;
  jornada?: JornadaRescisao;
  horasNoturnas?: number;
  horasAposCinco?: number;
  faltasInjustificadas?: number;
};

export type LinhaRescisao = {
  id:
    | "saldo"
    | "insalubridade"
    | "horas-extras"
    | "noturno"
    | "aviso"
    | "decimo"
    | "ferias"
    | "inss-mes"
    | "inss-decimo";
  rotulo: string;
  detalhe: string;
  centavos: number;
};

export type ResultadoRescisao = {
  avisoDias: number;
  anosCompletos: number;
  meses13: number;
  mesesFerias: number;
  remuneracaoCentavos: number;
  proventos: LinhaRescisao[];
  descontos: LinhaRescisao[];
  proventosCentavos: number;
  descontosCentavos: number;
  liquidoCentavos: number;
};

const FAIXAS_INSS = [
  { ate: 141_200, numerador: 75, denominador: 1000 },
  { ate: 266_668, numerador: 9, denominador: 100 },
  { ate: 400_003, numerador: 12, denominador: 100 },
  { ate: TETO_INSS_2024_CENTAVOS, numerador: 14, denominador: 100 },
] as const;

function dividirMeioParaCima(numerador: number, denominador: number): number {
  if (denominador <= 0) {
    throw new Error("Denominador inválido.");
  }
  const sinal = numerador < 0 ? -1 : 1;
  const absoluto = Math.abs(numerador);
  return sinal * Math.floor((absoluto + Math.floor(denominador / 2)) / denominador);
}

export function reaisParaCentavos(valor: number): number {
  return dividirMeioParaCima(Math.round(valor * 1000), 10);
}

export function formatarCentavos(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

function dataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

function aniversarioNoAno(admissao: Date, ano: number): Date {
  const mes = admissao.getMonth();
  const dia = Math.min(admissao.getDate(), ultimoDiaDoMes(ano, mes));
  return new Date(ano, mes, dia);
}

export function anosCompletos(admissaoIso: string, demissaoIso: string): number {
  const admissao = dataLocal(admissaoIso);
  const demissao = dataLocal(demissaoIso);
  let anos = demissao.getFullYear() - admissao.getFullYear();
  if (demissao < aniversarioNoAno(admissao, demissao.getFullYear())) {
    anos -= 1;
  }
  return Math.max(0, anos);
}

export function diasAvisoPrevio(anos: number, motivo: MotivoRescisao): number {
  if (motivo === "pedido-demissao") return 0;
  return Math.min(90, 30 + 3 * anos);
}

function diasInclusivos(inicio: Date, fim: Date): number {
  const a = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const b = Date.UTC(fim.getFullYear(), fim.getMonth(), fim.getDate());
  return Math.round((b - a) / 86_400_000) + 1;
}

function mesesComQuinzeDias(inicio: Date, fim: Date): number {
  if (fim < inicio) return 0;
  let total = 0;
  let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
  while (cursor <= limite) {
    const inicioMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const fimMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const de = inicio > inicioMes ? inicio : inicioMes;
    const ate = fim < fimMes ? fim : fimMes;
    if (ate >= de && diasInclusivos(de, ate) >= 15) total += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return total;
}

function inicioPeriodoAquisitivo(admissao: Date, demissao: Date): Date {
  let aniversario = aniversarioNoAno(admissao, demissao.getFullYear());
  if (aniversario > demissao) {
    aniversario = aniversarioNoAno(admissao, demissao.getFullYear() - 1);
  }
  return aniversario < admissao ? admissao : aniversario;
}

function inicioDecimoTerceiro(admissao: Date, demissao: Date): Date {
  if (admissao.getFullYear() === demissao.getFullYear()) return admissao;
  return new Date(demissao.getFullYear(), 0, 1);
}

export function divisorDaJornada(jornada: JornadaRescisao | undefined): number {
  return jornada === "12x36" ? 180 : 220;
}

function diasFeriasArt130(faltas: number): number {
  if (faltas <= 5) return 30;
  if (faltas <= 14) return 24;
  if (faltas <= 23) return 18;
  if (faltas <= 32) return 12;
  return 0;
}

export function inssProgressivo2024(baseCentavos: number): number {
  const limitada = Math.min(Math.max(0, Math.round(baseCentavos)), TETO_INSS_2024_CENTAVOS);
  let anterior = 0;
  let total = 0;
  for (const faixa of FAIXAS_INSS) {
    if (limitada <= anterior) break;
    const topo = Math.min(limitada, faixa.ate);
    total += dividirMeioParaCima((topo - anterior) * faixa.numerador, faixa.denominador);
    anterior = faixa.ate;
  }
  return total;
}

export function calcularRescisao(entrada: EntradaRescisao): ResultadoRescisao {
  const admissao = dataLocal(entrada.admissao);
  const demissao = dataLocal(entrada.demissao);
  const salario = reaisParaCentavos(entrada.salarioBase);
  const divisor = divisorDaJornada(entrada.jornada);
  const faltas = entrada.faltasInjustificadas ?? 0;
  const usaHorasNoturnas = entrada.horasNoturnas !== undefined || entrada.horasAposCinco !== undefined;
  const horasNoturnasContadas = (entrada.horasNoturnas ?? 0) + (entrada.horasAposCinco ?? 0);
  const noturnoMensal = usaHorasNoturnas
    ? dividirMeioParaCima(salario * 20 * Math.round(horasNoturnasContadas * 1000), divisor * 100 * 1000)
    : reaisParaCentavos(entrada.adicionalNoturno);
  const insalubridade = dividirMeioParaCima(
    SALARIO_MINIMO_2024_CENTAVOS * entrada.grauInsalubridade,
    100,
  );
  const milesimosHoras = Math.round(entrada.mediaHorasExtras * 1000);
  const horasExtras = dividirMeioParaCima(salario * 3 * milesimosHoras, divisor * 2 * 1000);
  const remuneracao = salario + insalubridade + horasExtras + noturnoMensal;
  const anos = anosCompletos(entrada.admissao, entrada.demissao);
  const avisoDias = diasAvisoPrevio(anos, entrada.motivo);
  const diasMes = Math.min(30, demissao.getDate());
  const fimProjetado = somarDias(demissao, avisoDias);
  const meses13 = mesesComQuinzeDias(inicioDecimoTerceiro(admissao, demissao), fimProjetado);
  const mesesFerias = mesesComQuinzeDias(inicioPeriodoAquisitivo(admissao, demissao), fimProjetado);

  const saldo = dividirMeioParaCima(salario * diasMes, 30) - faltas * dividirMeioParaCima(salario, 30);
  const insalubridadeProp = dividirMeioParaCima(insalubridade * diasMes, 30);
  const horasProp = dividirMeioParaCima(horasExtras * diasMes, 30);
  const noturnoProp = dividirMeioParaCima(noturnoMensal * diasMes, 30);
  const aviso = dividirMeioParaCima(remuneracao * avisoDias, 30);
  const decimo = dividirMeioParaCima(remuneracao * meses13, 12);
  const ferias = dividirMeioParaCima(
    remuneracao * mesesFerias * 4 * diasFeriasArt130(faltas),
    36 * 30,
  );
  const baseMes = saldo + insalubridadeProp + horasProp + noturnoProp;
  const inssMes = inssProgressivo2024(baseMes);
  const inssDecimo = inssProgressivo2024(decimo);

  const avisoTexto =
    entrada.motivo === "pedido-demissao"
      ? "No pedido de demissão o empregador não paga aviso prévio indenizado."
      : `${avisoDias} dias: 30 + 3 por ano completo, com teto de 90. Lei 12.506/2011.`;

  const proventos: LinhaRescisao[] = [
    {
      id: "saldo",
      rotulo: "Saldo de salário",
      detalhe:
        faltas > 0
          ? `${diasMes} dias do mês da demissão, menos ${faltas} ${faltas === 1 ? "falta" : "faltas"} injustificada${faltas === 1 ? "" : "s"} a salário/30.`
          : `${diasMes} dias do mês da demissão sobre o salário base.`,
      centavos: saldo,
    },
    {
      id: "insalubridade",
      rotulo: "Insalubridade proporcional",
      detalhe: `Grau de ${entrada.grauInsalubridade}% sobre o salário mínimo de 2024, R$ 1.412,00.`,
      centavos: insalubridadeProp,
    },
    {
      id: "horas-extras",
      rotulo: "Horas extras proporcionais",
      detalhe: `Média mensal com divisor ${divisor} e adicional de 50% (art. 59 da CLT).`,
      centavos: horasProp,
    },
    {
      id: "noturno",
      rotulo: "Adicional noturno proporcional",
      detalhe: usaHorasNoturnas
        ? `TST Súmula 60: hora noturna mais as horas depois das 5h, com divisor ${divisor}.`
        : "Valor mensal informado, proporcional aos dias do mês da demissão.",
      centavos: noturnoProp,
    },
    {
      id: "aviso",
      rotulo: "Aviso prévio indenizado",
      detalhe: avisoTexto,
      centavos: aviso,
    },
    {
      id: "decimo",
      rotulo: "13º proporcional",
      detalhe: `${meses13} ${meses13 === 1 ? "mês" : "meses"} com a regra dos 15 dias, até o fim projetado do contrato.`,
      centavos: decimo,
    },
    {
      id: "ferias",
      rotulo: "Férias proporcionais + 1/3",
      detalhe: `${mesesFerias} ${mesesFerias === 1 ? "mês" : "meses"} do período aquisitivo em curso, sobre ${diasFeriasArt130(faltas)}/30 do direito de férias (art. 130 da CLT). Férias vencidas ficam fora desta estimativa.`,
      centavos: ferias,
    },
  ];

  const descontos: LinhaRescisao[] = [
    {
      id: "inss-mes",
      rotulo: "INSS do mês",
      detalhe: "Tabela progressiva do empregado em 2024, sobre saldo, insalubridade, horas extras e noturno.",
      centavos: inssMes,
    },
    {
      id: "inss-decimo",
      rotulo: "INSS do 13º",
      detalhe: "Mesma tabela, calculada em separado sobre o 13º. Teto de R$ 7.786,02.",
      centavos: inssDecimo,
    },
  ];

  const proventosCentavos = proventos.reduce((soma, linha) => soma + linha.centavos, 0);
  const descontosCentavos = descontos.reduce((soma, linha) => soma + linha.centavos, 0);

  return {
    avisoDias,
    anosCompletos: anos,
    meses13,
    mesesFerias,
    remuneracaoCentavos: remuneracao,
    proventos,
    descontos,
    proventosCentavos,
    descontosCentavos,
    liquidoCentavos: proventosCentavos - descontosCentavos,
  };
}
