import { randomUUID } from "node:crypto";
import { aplicarDecisaoValidacaoJuridico, criarAtendimento, type EntradaAtendimento } from "./atendimento";
import { aplicarDecisaoValidacaoVoucher, criarPedido, type EntradaPedido } from "./convenios";
import { digitosCpf, cpfValido } from "./cpf";
import { digitosTelefone, telefoneValido } from "./telefone";
import {
  arquivoDoFormulario,
  criarValidacaoTrabalhador,
  parseConsentimento,
  revisarValidacao,
  type TipoServicoValidacao,
} from "./validacao-trabalhador";

function textoCurto(valor: FormDataEntryValue | null, minimo: number, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (texto.length < minimo || texto.length > maximo) return null;
  return texto;
}

/** Garante contracheque + documento no agendamento/pedido (jurídico e voucher). */
export async function exigirDocumentosTrabalhador(form: FormData) {
  const contracheque = await arquivoDoFormulario(form.get("contracheque"));
  if (!contracheque) {
    return { ok: false as const, status: 400, erro: "Envie o contracheque (PDF, PNG ou JPG, até 5 MB)." };
  }
  const documento = await arquivoDoFormulario(form.get("documento"));
  if (!documento) {
    return { ok: false as const, status: 400, erro: "Envie o documento de identificação com foto." };
  }
  return { ok: true as const, contracheque, documento };
}

async function camposComuns(form: FormData) {
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
  const docs = await exigirDocumentosTrabalhador(form);
  if (!docs.ok) return docs;
  return {
    ok: true as const,
    name,
    telefone,
    localTrabalho,
    cargo,
    contracheque: docs.contracheque,
    documento: docs.documento,
  };
}

export async function processarPedidoJuridico(form: FormData) {
  if (!parseConsentimento(form.get("consent"))) {
    return { ok: false as const, status: 400, erro: "O consentimento é necessário para enviar o pedido." };
  }
  const cpf = digitosCpf(String(form.get("cpf") ?? ""));
  if (!cpfValido(cpf)) return { ok: false as const, status: 400, erro: "Informe os 11 números de um CPF válido." };
  const subject = textoCurto(form.get("subject"), 2, 280);
  if (!subject) return { ok: false as const, status: 400, erro: "Informe o assunto." };

  const comuns = await camposComuns(form);
  if (!comuns.ok) return comuns;

  const atendimentoId = randomUUID();
  const validacao = await criarValidacaoTrabalhador({
    tipo: "juridico",
    servicoId: atendimentoId,
    nomeCompleto: comuns.name,
    telefone: comuns.telefone,
    localTrabalho: comuns.localTrabalho,
    cargo: comuns.cargo,
    contracheque: comuns.contracheque,
    documento: comuns.documento,
  });
  if (!validacao.ok) return { ok: false as const, status: validacao.status, erro: validacao.erro };

  const entrada: EntradaAtendimento = {
    id: atendimentoId,
    name: comuns.name,
    cpf,
    subject,
    telefone: comuns.telefone,
    cargo: comuns.cargo,
    localTrabalho: comuns.localTrabalho,
    validacaoId: validacao.registro.id,
  };
  const criado = await criarAtendimento(entrada);
  if (!criado.ok) return { ok: false as const, status: 400, erro: criado.erro };
  return { ok: true as const, id: criado.registro.id };
}

export async function processarPedidoVoucher(form: FormData) {
  if (!parseConsentimento(form.get("consent"))) {
    return { ok: false as const, status: 400, erro: "O consentimento é necessário para enviar o pedido." };
  }
  const partnerId = form.get("partnerId");
  if (typeof partnerId !== "string" || !partnerId) {
    return { ok: false as const, status: 400, erro: "Escolha um convênio." };
  }

  const comuns = await camposComuns(form);
  if (!comuns.ok) return comuns;

  const pedidoId = randomUUID();
  const validacao = await criarValidacaoTrabalhador({
    tipo: "voucher",
    servicoId: pedidoId,
    nomeCompleto: comuns.name,
    telefone: comuns.telefone,
    localTrabalho: comuns.localTrabalho,
    cargo: comuns.cargo,
    contracheque: comuns.contracheque,
    documento: comuns.documento,
  });
  if (!validacao.ok) return { ok: false as const, status: validacao.status, erro: validacao.erro };

  const entrada: EntradaPedido = {
    id: pedidoId,
    partnerId,
    name: comuns.name,
    telefone: comuns.telefone,
    localTrabalho: comuns.localTrabalho,
    cargo: comuns.cargo,
    validacaoId: validacao.registro.id,
  };
  const criado = await criarPedido(entrada);
  if (!criado.ok) return { ok: false as const, status: 400, erro: criado.erro };
  return { ok: true as const, id: criado.id };
}

export async function revisarPedidoValidacao(tipo: TipoServicoValidacao, id: string, decisao: "aprovar" | "recusar") {
  const revisado = await revisarValidacao(id, decisao);
  if (!revisado.ok) return revisado;
  const aprovado = decisao === "aprovar";
  if (tipo === "juridico") {
    const atendimento = await aplicarDecisaoValidacaoJuridico(id, aprovado);
    if (!atendimento.ok) return { ok: false as const, status: atendimento.status, erro: atendimento.erro };
  } else {
    const pedido = await aplicarDecisaoValidacaoVoucher(id, aprovado);
    if (!pedido.ok) return { ok: false as const, status: pedido.status, erro: pedido.erro };
  }
  return revisado;
}
