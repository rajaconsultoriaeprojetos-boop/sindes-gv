export type TipoAgendamento = "juridico" | "presencial" | "voucher" | "homologacao";

export const ROTULO_TIPO_AGENDAMENTO: Record<TipoAgendamento, string> = {
  juridico: "Assessoria jurídica",
  presencial: "Secretaria — outros assuntos",
  voucher: "Convênio / voucher",
  homologacao: "Homologação de rescisão",
};

export const DESTINO_TIPO_AGENDAMENTO: Record<TipoAgendamento, string> = {
  juridico: "Assessoria jurídica",
  presencial: "Secretaria / administração",
  voucher: "Secretaria / administração",
  homologacao: "Secretaria / administração",
};

export const MODALIDADE_TIPO_AGENDAMENTO: Record<TipoAgendamento, string> = {
  juridico: "Online — vídeo (Google Meet)",
  presencial: "Presencial na sede",
  voucher: "Presencial na sede",
  homologacao: "Presencial na sede",
};

export const DESCRICAO_TIPO_AGENDAMENTO: Record<TipoAgendamento, string> = {
  juridico:
    "Consulta com a advogada do sindicato por vídeo (Google Meet). Horários em dias úteis conforme a grade da assessoria. Envie contracheque e documento para validação antes do horário.",
  presencial:
    "Demandas gerais na secretaria (documentos, dúvidas, outros assuntos não jurídicos). Atendimento presencial com horário reservado.",
  voucher: "Retirada de cartão de convênio parceiro na secretaria, após validação de filiação.",
  homologacao: "Homologação de rescisão com a equipe na sede — traga documentos no dia marcado.",
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
