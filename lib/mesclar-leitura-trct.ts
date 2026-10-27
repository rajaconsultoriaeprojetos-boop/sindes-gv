import type { DadosContratuais, LeituraTrct, VerbasPagasEmpregador } from "./trct";

function mesclarDados(principal: DadosContratuais, extra: DadosContratuais): DadosContratuais {
  return {
    dataAdmissao: principal.dataAdmissao ?? extra.dataAdmissao,
    dataDemissao: principal.dataDemissao ?? extra.dataDemissao,
    motivoAfastamento: principal.motivoAfastamento ?? extra.motivoAfastamento,
    salarioBase: principal.salarioBase ?? extra.salarioBase,
    grauInsalubridade: principal.grauInsalubridade ?? extra.grauInsalubridade ?? null,
    mediaHorasExtras: principal.mediaHorasExtras ?? extra.mediaHorasExtras ?? null,
    adicionalNoturno: principal.adicionalNoturno ?? extra.adicionalNoturno ?? null,
  };
}

function mesclarVerbas(principal: VerbasPagasEmpregador, extra: VerbasPagasEmpregador): VerbasPagasEmpregador {
  return {
    saldoSalario: principal.saldoSalario ?? extra.saldoSalario,
    avisoPrevioIndenizado: principal.avisoPrevioIndenizado ?? extra.avisoPrevioIndenizado,
    decimoTerceiroProporcional: principal.decimoTerceiroProporcional ?? extra.decimoTerceiroProporcional,
    feriasProporcionais: principal.feriasProporcionais ?? extra.feriasProporcionais,
    tercoConstitucionalFerias: principal.tercoConstitucionalFerias ?? extra.tercoConstitucionalFerias,
    valorTotalLiquido: principal.valorTotalLiquido ?? extra.valorTotalLiquido,
  };
}

/** Preenche campos nulos do documento principal com leituras de anexos (recibo / discriminativo). */
export function mesclarLeituras(principal: LeituraTrct, ...extras: LeituraTrct[]): LeituraTrct {
  return extras.reduce(
    (atual, extra) => ({
      dadosContratuais: mesclarDados(atual.dadosContratuais, extra.dadosContratuais),
      verbasPagasEmpregador: mesclarVerbas(atual.verbasPagasEmpregador, extra.verbasPagasEmpregador),
    }),
    principal,
  );
}
