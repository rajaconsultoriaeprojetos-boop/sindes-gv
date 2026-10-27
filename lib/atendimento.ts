import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { cpfValido, digitosCpf, ocultarCpf } from "./cpf";

export type StatusAtendimento = "aguardando_validacao" | "aguardando" | "em_atendimento" | "encerrado";

export type MensagemAtendimento = {
  at: string;
  author: string;
  text: string;
};

export type Atendimento = {
  id: string;
  createdAt: string;
  name: string;
  cpf: string;
  subject: string;
  telefone: string;
  cargo: string;
  localTrabalho: string;
  validacaoId: string;
  validacaoStatus: "pendente" | "aprovado" | "recusado";
  status: StatusAtendimento;
  notes: string;
  messages: MensagemAtendimento[];
};

export type AtendimentoPublico = {
  id: string;
  createdAt: string;
  name: string;
  cpfMascarado: string;
  subject: string;
  cargo: string;
  localTrabalho: string;
  validacaoStatus: "pendente" | "aprovado" | "recusado";
  status: StatusAtendimento;
  notes: string;
  messages: MensagemAtendimento[];
};

export type ResumoAtendimento = {
  id: string;
  createdAt: string;
  name: string;
  cpfMascarado: string;
  subject: string;
  telefone: string;
  cargo: string;
  localTrabalho: string;
  validacaoId: string;
  validacaoStatus: "pendente" | "aprovado" | "recusado";
  status: StatusAtendimento;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ARQUIVO_PADRAO = path.join(process.cwd(), "data", "atendimentos.json");

let arquivoAtual = ARQUIVO_PADRAO;
let fila: Promise<void> = Promise.resolve();

export function usarArquivoDeAtendimentos(caminho: string) {
  arquivoAtual = caminho;
  fila = Promise.resolve();
}

export function arquivoPadraoDeAtendimentos() {
  arquivoAtual = ARQUIVO_PADRAO;
  fila = Promise.resolve();
}

function emFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const resultado = fila.then(tarefa, tarefa);
  fila = resultado.then(
    () => undefined,
    () => undefined,
  );
  return resultado;
}

function idValido(id: string): boolean {
  return UUID.test(id);
}

function registroValido(valor: unknown): valor is Atendimento {
  if (!valor || typeof valor !== "object") return false;
  const registro = valor as Atendimento;
  return (
    typeof registro.id === "string" &&
    idValido(registro.id) &&
    typeof registro.createdAt === "string" &&
    typeof registro.name === "string" &&
    typeof registro.cpf === "string" &&
    /^\d{11}$/.test(registro.cpf) &&
    typeof registro.subject === "string" &&
    typeof registro.cargo === "string" &&
    typeof registro.telefone === "string" &&
    /^\d{10,11}$/.test(registro.telefone) &&
    typeof registro.localTrabalho === "string" &&
    typeof registro.validacaoId === "string" &&
    (registro.validacaoStatus === "pendente" ||
      registro.validacaoStatus === "aprovado" ||
      registro.validacaoStatus === "recusado") &&
    (registro.status === "aguardando_validacao" ||
      registro.status === "aguardando" ||
      registro.status === "em_atendimento" ||
      registro.status === "encerrado") &&
    typeof registro.notes === "string" &&
    Array.isArray(registro.messages) &&
    registro.messages.every(
      (mensagem) =>
        !!mensagem &&
        typeof mensagem.at === "string" &&
        typeof mensagem.author === "string" &&
        typeof mensagem.text === "string",
    )
  );
}

function publicar(registro: Atendimento): AtendimentoPublico {
  return {
    id: registro.id,
    createdAt: registro.createdAt,
    name: registro.name,
    cpfMascarado: ocultarCpf(registro.cpf),
    subject: registro.subject,
    cargo: registro.cargo,
    localTrabalho: registro.localTrabalho,
    validacaoStatus: registro.validacaoStatus,
    status: registro.status,
    notes: registro.notes,
    messages: registro.messages,
  };
}

function resumir(registro: Atendimento): ResumoAtendimento {
  return {
    id: registro.id,
    createdAt: registro.createdAt,
    name: registro.name,
    cpfMascarado: ocultarCpf(registro.cpf),
    subject: registro.subject,
    cargo: registro.cargo,
    localTrabalho: registro.localTrabalho,
    validacaoId: registro.validacaoId,
    validacaoStatus: registro.validacaoStatus,
    status: registro.status,
    telefone: registro.telefone,
  };
}

async function ler(): Promise<Atendimento[]> {
  try {
    const texto = await readFile(arquivoAtual, "utf8");
    const dados = JSON.parse(texto) as unknown;
    if (!Array.isArray(dados)) return [];
    return dados.filter(registroValido);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw erro;
  }
}

async function gravar(lista: Atendimento[]) {
  await mkdir(path.dirname(arquivoAtual), { recursive: true });
  const temporario = `${arquivoAtual}.tmp`;
  await writeFile(temporario, `${JSON.stringify(lista, null, 2)}\n`, "utf8");
  await rename(temporario, arquivoAtual);
}

function textoCurto(valor: unknown, minimo: number, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (texto.length < minimo || texto.length > maximo) return null;
  return texto;
}

export type EntradaAtendimento = {
  id: string;
  name: string;
  cpf: string;
  subject: string;
  telefone: string;
  cargo: string;
  localTrabalho: string;
  validacaoId: string;
};

export function criarAtendimento(entrada: EntradaAtendimento) {
  return emFila(async () => {
    if (!idValido(entrada.id)) {
      return { ok: false as const, erro: "Não foi possível abrir o atendimento." };
    }
    const name = textoCurto(entrada.name, 2, 120);
    if (!name) return { ok: false as const, erro: "Informe o nome completo." };
    const cpf = digitosCpf(entrada.cpf);
    if (!cpfValido(cpf)) return { ok: false as const, erro: "Informe os 11 números de um CPF válido." };
    const subject = textoCurto(entrada.subject, 2, 280);
    if (!subject) return { ok: false as const, erro: "Informe o assunto." };
    const cargo = textoCurto(entrada.cargo, 2, 120);
    if (!cargo) return { ok: false as const, erro: "Informe o cargo." };
    const localTrabalho = textoCurto(entrada.localTrabalho, 2, 160);
    if (!localTrabalho) return { ok: false as const, erro: "Informe o local de trabalho." };
    const telefone = entrada.telefone.replace(/\D/g, "");
    if (!/^\d{10,11}$/.test(telefone)) {
      return { ok: false as const, erro: "Informe um telefone válido." };
    }
    if (!UUID.test(entrada.validacaoId)) {
      return { ok: false as const, erro: "Não foi possível registrar os documentos." };
    }

    const registro: Atendimento = {
      id: entrada.id,
      createdAt: new Date().toISOString(),
      name,
      cpf,
      subject,
      telefone,
      cargo,
      localTrabalho,
      validacaoId: entrada.validacaoId,
      validacaoStatus: "pendente",
      status: "aguardando_validacao",
      notes: "",
      messages: [],
    };
    const lista = await ler();
    lista.push(registro);
    await gravar(lista);
    return { ok: true as const, registro: publicar(registro) };
  });
}

export function aplicarDecisaoValidacaoJuridico(validacaoId: string, aprovado: boolean) {
  return emFila(async () => {
    const lista = await ler();
    const indice = lista.findIndex((item) => item.validacaoId === validacaoId);
    if (indice < 0) return { ok: false as const, status: 404, erro: "Não encontramos o atendimento." };
    const registro = lista[indice];
    if (registro.status !== "aguardando_validacao") {
      return { ok: false as const, status: 400, erro: "Este atendimento já foi revisado." };
    }
    registro.validacaoStatus = aprovado ? "aprovado" : "recusado";
    registro.status = aprovado ? "aguardando" : "encerrado";
    lista[indice] = registro;
    await gravar(lista);
    return { ok: true as const, registro: publicar(registro) };
  });
}

export function listarAtendimentos() {
  return emFila(async () => {
    const lista = await ler();
    return lista
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      .map(resumir);
  });
}

export function lerAtendimento(id: string) {
  return emFila(async () => {
    if (!idValido(id)) return null;
    const lista = await ler();
    const registro = lista.find((item) => item.id === id);
    return registro ? publicar(registro) : null;
  });
}

export function atualizarAtendimento(id: string, entrada: unknown) {
  return emFila(async () => {
    if (!idValido(id)) return { ok: false as const, status: 404, erro: "Não encontramos este atendimento." };
    if (!entrada || typeof entrada !== "object") {
      return { ok: false as const, status: 400, erro: "Nada para guardar." };
    }
    const corpo = entrada as { notes?: unknown; status?: unknown; message?: unknown };
    const chaves = ["notes", "status", "message"].filter((chave) => chave in corpo);
    if (chaves.length !== 1) {
      return { ok: false as const, status: 400, erro: "Envie notas, uma mensagem ou o status, um de cada vez." };
    }
    const lista = await ler();
    const indice = lista.findIndex((item) => item.id === id);
    if (indice < 0) return { ok: false as const, status: 404, erro: "Não encontramos este atendimento." };
    const registro = lista[indice];

    if ("notes" in corpo) {
      if (typeof corpo.notes !== "string" || corpo.notes.length > 8000) {
        return { ok: false as const, status: 400, erro: "As notas não puderam ser guardadas." };
      }
      registro.notes = corpo.notes;
    }

    if ("status" in corpo) {
      if (corpo.status !== "em_atendimento" && corpo.status !== "encerrado") {
        return { ok: false as const, status: 400, erro: "Status inválido." };
      }
      if (registro.status === "aguardando_validacao") {
        return { ok: false as const, status: 403, erro: "A equipe ainda não confirmou este pedido." };
      }
      if (registro.validacaoStatus === "recusado") {
        return { ok: false as const, status: 403, erro: "Este pedido foi recusado." };
      }
      registro.status = corpo.status;
    }

    if ("message" in corpo) {
      const mensagem = corpo.message;
      if (!mensagem || typeof mensagem !== "object") {
        return { ok: false as const, status: 400, erro: "Escreva a mensagem antes de enviar." };
      }
      const campos = mensagem as { author?: unknown; text?: unknown };
      const author = textoCurto(campos.author, 2, 120);
      const text = textoCurto(campos.text, 1, 2000);
      if (!author || !text) {
        return { ok: false as const, status: 400, erro: "Escreva a mensagem antes de enviar." };
      }
      if (author !== registro.name && author !== "Assessoria") {
        return { ok: false as const, status: 400, erro: "Não foi possível identificar quem escreveu." };
      }
      registro.messages.push({ at: new Date().toISOString(), author, text });
    }

    lista[indice] = registro;
    await gravar(lista);
    return { ok: true as const, registro: publicar(registro) };
  });
}
