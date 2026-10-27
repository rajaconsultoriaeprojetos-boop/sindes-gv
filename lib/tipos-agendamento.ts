export type TipoAgendamento = "juridico" | "presencial" | "voucher" | "homologacao";

export const ROTULO_TIPO_AGENDAMENTO: Record<TipoAgendamento, string> = {
  juridico: "Atendimento jurídico",
  presencial: "Atendimento presencial — outros assuntos",
  voucher: "Retirada de voucher (convênios)",
  homologacao: "Homologação de rescisão de contrato",
};

export const DESCRICAO_TIPO_AGENDAMENTO: Record<TipoAgendamento, string> = {
  juridico: "Videoatendimento jurídico (Google Meet), às sextas-feiras, 13h–17h. Envie contracheque e documento para validação antes do horário.",
  presencial: "Outros assuntos no sindicato, com horário reservado para você.",
  voucher: "Retirada do cartão de convênio após validação de filiação.",
  homologacao: "Homologação de rescisão com a equipe — traga documentos no dia.",
};

export function tipoAgendamentoValido(valor: string): valor is TipoAgendamento {
  return valor === "juridico" || valor === "presencial" || valor === "voucher" || valor === "homologacao";
}

export function exigeValidacaoDocumentos(tipo: TipoAgendamento) {
  return tipo === "juridico" || tipo === "voucher";
}

export function duracaoMinutos(tipo: TipoAgendamento) {
  return 30;
}
