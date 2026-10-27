import { randomUUID } from "node:crypto";
import { reservarAgendamento } from "./agendamentos";
import { digitosCpf, cpfValido } from "./cpf";
import { digitosTelefone, telefoneValido } from "./telefone";
import { exigirDocumentosTrabalhador, processarPedidoJuridico, processarPedidoVoucher } from "./envio-validacao";
import { tipoAgendamentoValido, exigeValidacaoDocumentos } from "./tipos-agendamento";
import { slotAindaDisponivel } from "./slots-agendamento";
import { listarOcupacaoConfirmada } from "./agendamentos";
import { parseConsentimento } from "./validacao-trabalhador";

function textoCurto(valor: FormDataEntryValue | null, minimo: number, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (texto.length < minimo || texto.length > maximo) return null;
  return texto;
}

async function validarHorario(form: FormData) {
  const inicio = form.get("slotInicio");
  const fim = form.get("slotFim");
  const tipoRaw = form.get("tipo");
  if (typeof inicio !== "string" || typeof fim !== "string" || typeof tipoRaw !== "string") {
    return { ok: false as const, status: 400, erro: "Escolha um horário disponível." };
  }
  if (!tipoAgendamentoValido(tipoRaw)) {
    return { ok: false as const, status: 400, erro: "Tipo de atendimento inválido." };
  }
  const ocupados = await listarOcupacaoConfirmada();
  if (!slotAindaDisponivel(inicio, fim, tipoRaw, ocupados)) {
    return { ok: false as const, status: 409, erro: "Este horário não está mais disponível." };
  }
  return { ok: true as const, inicio, fim, tipo: tipoRaw };
}

export async function processarAgendamentoPortal(form: FormData) {
  if (!parseConsentimento(form.get("consent"))) {
    return { ok: false as const, status: 400, erro: "O consentimento é necessário para agendar." };
  }

  const horario = await validarHorario(form);
  if (!horario.ok) return horario;

  const name = textoCurto(form.get("name"), 2, 120);
  if (!name) return { ok: false as const, status: 400, erro: "Informe o nome completo." };
  const telefone = digitosTelefone(String(form.get("telefone") ?? ""));
  if (!telefoneValido(telefone)) {
    return { ok: false as const, status: 400, erro: "Informe um telefone válido." };
  }
  const localTrabalho = textoCurto(form.get("localTrabalho"), 2, 160);
  if (!localTrabalho) return { ok: false as const, status: 400, erro: "Informe o local de trabalho." };
  const cargo = textoCurto(form.get("cargo"), 2, 120);
  if (!cargo) return { ok: false as const, status: 400, erro: "Informe o cargo." };
  const preferencias = textoCurto(form.get("preferencias"), 0, 500) ?? "";

  let servicoId: string | undefined;
  let validacaoId: string | undefined;
  let cpf: string | undefined;
  let assunto: string | undefined;
  let partnerId: string | undefined;
  let partnerName: string | undefined;

  if (exigeValidacaoDocumentos(horario.tipo)) {
    const docs = await exigirDocumentosTrabalhador(form);
    if (!docs.ok) return docs;
  }

  if (horario.tipo === "juridico") {
    const juridico = await processarPedidoJuridico(form);
    if (!juridico.ok) return juridico;
    servicoId = juridico.id;
    cpf = digitosCpf(String(form.get("cpf") ?? ""));
    assunto = textoCurto(form.get("subject"), 2, 280) ?? undefined;
  } else if (horario.tipo === "voucher") {
    const partnerRaw = form.get("partnerId");
    partnerId = typeof partnerRaw === "string" ? partnerRaw : undefined;
    partnerName = textoCurto(form.get("partnerName"), 2, 160) ?? undefined;
    if (!partnerId) {
      return { ok: false as const, status: 400, erro: "Escolha um convênio." };
    }
    const voucher = await processarPedidoVoucher(form);
    if (!voucher.ok) return voucher;
    servicoId = voucher.id;
  } else {
    if (exigeValidacaoDocumentos(horario.tipo)) {
      return { ok: false as const, status: 400, erro: "Tipo de atendimento inválido." };
    }
    const cpfDigitos = digitosCpf(String(form.get("cpf") ?? ""));
    if (horario.tipo === "homologacao" && !cpfValido(cpfDigitos)) {
      return { ok: false as const, status: 400, erro: "Informe um CPF válido para homologação." };
    }
    if (cpfDigitos.length === 11 && cpfValido(cpfDigitos)) cpf = cpfDigitos;
    assunto =
      horario.tipo === "presencial"
        ? textoCurto(form.get("subject"), 2, 280) ?? "Atendimento presencial"
        : "Homologação de rescisão";
    servicoId = randomUUID();
  }

  const reserva = await reservarAgendamento({
    tipo: horario.tipo,
    inicio: horario.inicio,
    fim: horario.fim,
    nome: name,
    telefone,
    localTrabalho,
    cargo,
    cpf,
    assunto,
    preferencias,
    partnerId,
    partnerName,
    servicoId,
    validacaoId,
  });

  if (!reserva.ok) return reserva;
  return {
    ok: true as const,
    agendamento: reserva.agendamento,
    servicoId,
    aguardandoValidacao: horario.tipo === "juridico" || horario.tipo === "voucher",
  };
}
