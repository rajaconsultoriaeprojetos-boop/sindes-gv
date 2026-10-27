import { auditarRescisao, textoAlerta, type ResultadoParaAuditoria } from "./auditoria";
import {
  auditarConsistenciaInterna,
  contagemPorSeveridade,
  ordenarAchados,
  type AchadoConsistencia,
  type SeveridadeAchado,
} from "./consistencia-interna-trct";
import { calcularRescisao, type EntradaRescisao, type MotivoRescisao } from "./rescisao";
import { classificarMotivo, type DadosContratuais, type LeituraTrct, type VerbasPagasEmpregador } from "./trct";

export {
  TOLERANCIA_SOMA_LIQUIDO_REAIS,
  auditarConsistenciaInterna,
  contagemPorSeveridade,
  ordenarAchados,
  type AchadoConsistencia,
  type SeveridadeAchado,
} from "./consistencia-interna-trct";

function entradaRescisaoDeLeitura(dados: DadosContratuais): EntradaRescisao | null {
  if (!dados.dataAdmissao || !dados.dataDemissao || dados.salarioBase === null || dados.salarioBase <= 0) {
    return null;
  }
  const motivo: MotivoRescisao =
    dados.motivoAfastamento && classificarMotivo(dados.motivoAfastamento)
      ? classificarMotivo(dados.motivoAfastamento)!
      : "sem-justa-causa";
  const grau = dados.grauInsalubridade ?? 0;
  if (grau !== 0 && grau !== 10 && grau !== 20 && grau !== 40) return null;
  return {
    admissao: dados.dataAdmissao,
    demissao: dados.dataDemissao,
    motivo,
    salarioBase: dados.salarioBase,
    grauInsalubridade: grau,
    mediaHorasExtras: dados.mediaHorasExtras ?? 0,
    adicionalNoturno: dados.adicionalNoturno ?? 0,
  };
}

function achadosCruzamentoSindes(
  verbas: VerbasPagasEmpregador,
  resultado: ResultadoParaAuditoria,
): AchadoConsistencia[] {
  const achados: AchadoConsistencia[] = [];
  const auditoria = auditarRescisao(verbas, resultado);

  if (auditoria.alerta && auditoria.faltaCentavos !== null) {
    achados.push({
      id: "liquido-abaixo-sindes",
      severidade: "alta",
      mensagem: "Líquido pago abaixo da estimativa SINDES",
      detalhe: textoAlerta(auditoria.faltaCentavos).replace(/^⚠️\s*/, ""),
    });
  }

  for (const linha of auditoria.linhas) {
    if (linha.id === "liquido") continue;
    if (linha.status === "divergente") {
      achados.push({
        id: `sindes-${linha.id}`,
        severidade: "media",
        mensagem: `${linha.verba}: valor no TRCT abaixo do estimado SINDES`,
      });
    }
  }

  return achados;
}

export type RelatorioConsistencia = {
  achados: AchadoConsistencia[];
  resultadoSindes: ResultadoParaAuditoria | null;
  entradaUsada: EntradaRescisao | null;
};

/** Consistência interna + cruzamento SINDES quando der para calcular a partir da leitura. */
export function montarRelatorioConsistencia(leitura: LeituraTrct): RelatorioConsistencia {
  const achados = auditarConsistenciaInterna(leitura);
  const entrada = entradaRescisaoDeLeitura(leitura.dadosContratuais);
  if (!entrada) {
    return { achados, resultadoSindes: null, entradaUsada: null };
  }
  const resultado = calcularRescisao(entrada);
  achados.push(...achadosCruzamentoSindes(leitura.verbasPagasEmpregador, resultado));
  return { achados, resultadoSindes: resultado, entradaUsada: entrada };
}
