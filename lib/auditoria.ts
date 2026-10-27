export type ResultadoParaAuditoria = {
  proventos: readonly { id: string; centavos: number }[];
  liquidoCentavos: number;
};

export type VerbasParaAuditoria = {
  saldoSalario: number | null;
  avisoPrevioIndenizado: number | null;
  decimoTerceiroProporcional: number | null;
  feriasProporcionais: number | null;
  tercoConstitucionalFerias: number | null;
  valorTotalLiquido: number | null;
};

function reaisParaCentavos(valor: number): number {
  const sinal = valor < 0 ? -1 : 1;
  const milesimos = Math.round(Math.abs(valor) * 1000);
  return sinal * Math.floor((milesimos + 5) / 10);
}

export type StatusAuditoria = "exato" | "favoravel" | "divergente" | "naoLido";

export type LinhaAuditoria = {
  id: "saldo" | "aviso" | "decimo" | "ferias" | "terco" | "liquido";
  verba: string;
  empresaCentavos: number | null;
  sindesCentavos: number;
  diferencaCentavos: number | null;
  status: StatusAuditoria;
};

export type AuditoriaRescisao = {
  linhas: LinhaAuditoria[];
  alerta: boolean;
  faltaCentavos: number | null;
};

function centavosDaLinha(resultado: ResultadoParaAuditoria, id: string): number {
  const linha = resultado.proventos.find((item) => item.id === id);
  if (!linha) {
    throw new Error(`Linha ausente na rescisão: ${id}`);
  }
  return linha.centavos;
}

function partirFerias(combinadoCentavos: number): { ferias: number; terco: number } {
  const sinal = combinadoCentavos < 0 ? -1 : 1;
  const terco = sinal * Math.floor((Math.abs(combinadoCentavos) + 2) / 4);
  return { terco, ferias: combinadoCentavos - terco };
}

function statusDe(empresaCentavos: number | null, sindesCentavos: number): StatusAuditoria {
  if (empresaCentavos === null) return "naoLido";
  if (empresaCentavos === sindesCentavos) return "exato";
  if (empresaCentavos > sindesCentavos) return "favoravel";
  return "divergente";
}

function centavosDaEmpresa(valor: number | null): number | null {
  if (valor === null) return null;
  return reaisParaCentavos(valor);
}

export function auditarRescisao(
  verbas: VerbasParaAuditoria,
  resultado: ResultadoParaAuditoria,
): AuditoriaRescisao {
  const partes = partirFerias(centavosDaLinha(resultado, "ferias"));
  const pares: {
    id: LinhaAuditoria["id"];
    verba: string;
    empresa: number | null;
    sindes: number;
  }[] = [
    {
      id: "saldo",
      verba: "Saldo de salário",
      empresa: verbas.saldoSalario,
      sindes: centavosDaLinha(resultado, "saldo"),
    },
    {
      id: "aviso",
      verba: "Aviso prévio indenizado",
      empresa: verbas.avisoPrevioIndenizado,
      sindes: centavosDaLinha(resultado, "aviso"),
    },
    {
      id: "decimo",
      verba: "13º proporcional",
      empresa: verbas.decimoTerceiroProporcional,
      sindes: centavosDaLinha(resultado, "decimo"),
    },
    {
      id: "ferias",
      verba: "Férias proporcionais",
      empresa: verbas.feriasProporcionais,
      sindes: partes.ferias,
    },
    {
      id: "terco",
      verba: "1/3 de férias",
      empresa: verbas.tercoConstitucionalFerias,
      sindes: partes.terco,
    },
    {
      id: "liquido",
      verba: "Valor líquido",
      empresa: verbas.valorTotalLiquido,
      sindes: resultado.liquidoCentavos,
    },
  ];

  const linhas: LinhaAuditoria[] = pares.map((par) => {
    const empresaCentavos = centavosDaEmpresa(par.empresa);
    return {
      id: par.id,
      verba: par.verba,
      empresaCentavos,
      sindesCentavos: par.sindes,
      diferencaCentavos: empresaCentavos === null ? null : empresaCentavos - par.sindes,
      status: statusDe(empresaCentavos, par.sindes),
    };
  });

  const liquidoEmpresa = centavosDaEmpresa(verbas.valorTotalLiquido);
  const alerta = liquidoEmpresa !== null && liquidoEmpresa < resultado.liquidoCentavos;

  return {
    linhas,
    alerta,
    faltaCentavos: alerta && liquidoEmpresa !== null ? resultado.liquidoCentavos - liquidoEmpresa : null,
  };
}

export function textoAlerta(faltaCentavos: number): string {
  const valor = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(faltaCentavos / 100);
  return `⚠️ Atenção SINDES: Identificamos que o trabalhador recebeu R$ ${valor} a menos do que o devido por lei.`;
}

export function textoDinheiro(centavos: number): string {
  const valor = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(centavos) / 100);
  return `R$ ${valor}`;
}

export function textoDiferenca(centavos: number): string {
  if (centavos < 0) return `−${textoDinheiro(centavos)}`;
  return textoDinheiro(centavos);
}
