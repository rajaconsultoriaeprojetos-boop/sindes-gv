import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { slotAindaDisponivel } from "./slots-agendamento";
import type { TipoAgendamento } from "./tipos-agendamento";
import { criarEventoAgendamento } from "./google-calendar";
import { sincronizarAgendamentoPlanilha, sincronizarTrabalhadorPlanilha } from "./google-sheets-sync";

export type Agendamento = {
  id: string;
  createdAt: string;
  tipo: TipoAgendamento;
  inicio: string;
  fim: string;
  nome: string;
  telefone: string;
  localTrabalho: string;
  cargo: string;
  cpf?: string;
  assunto?: string;
  preferencias?: string;
  partnerId?: string;
  partnerName?: string;
  servicoId?: string;
  validacaoId?: string;
  googleEventId?: string;
  googleMeetLink?: string;
  googleSyncErro?: string;
  status: "confirmado" | "cancelado";
};

export type ResumoAgendamento = Omit<Agendamento, "cpf"> & { cpfMascarado?: string };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let arquivoAtual = path.join(process.cwd(), "data", "agendamentos.json");
let fila: Promise<void> = Promise.resolve();

export function usarArquivoAgendamentos(caminho: string) {
  arquivoAtual = caminho;
  fila = Promise.resolve();
}

export function arquivoPadraoAgendamentos() {
  arquivoAtual = path.join(process.cwd(), "data", "agendamentos.json");
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

function registroValido(valor: unknown): valor is Agendamento {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Agendamento;
  return (
    typeof item.id === "string" &&
    UUID.test(item.id) &&
    typeof item.createdAt === "string" &&
    typeof item.tipo === "string" &&
    typeof item.inicio === "string" &&
    typeof item.fim === "string" &&
    typeof item.nome === "string" &&
    typeof item.telefone === "string" &&
    typeof item.localTrabalho === "string" &&
    typeof item.cargo === "string" &&
    (item.status === "confirmado" || item.status === "cancelado")
  );
}

async function ler(): Promise<Agendamento[]> {
  try {
    const texto = await readFile(arquivoAtual, "utf8");
    const dados = JSON.parse(texto) as unknown;
    if (!Array.isArray(dados)) return [];
    return dados.filter(registroValido);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") {
      await mkdir(path.dirname(arquivoAtual), { recursive: true });
      await writeFile(arquivoAtual, "[]\n", "utf8");
      return [];
    }
    throw erro;
  }
}

async function gravar(lista: Agendamento[]) {
  await mkdir(path.dirname(arquivoAtual), { recursive: true });
  const temporario = `${arquivoAtual}.tmp`;
  await writeFile(temporario, `${JSON.stringify(lista, null, 2)}\n`, "utf8");
  await rename(temporario, arquivoAtual);
}

function mascararCpf(cpf?: string) {
  if (!cpf || cpf.length !== 11) return undefined;
  return `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

function resumir(item: Agendamento): ResumoAgendamento {
  const { cpf, ...resto } = item;
  return { ...resto, cpfMascarado: mascararCpf(cpf) };
}

export function listarOcupacaoConfirmada() {
  return emFila(async () => {
    const lista = await ler();
    return lista
      .filter((a) => a.status === "confirmado")
      .map((a) => ({ inicio: a.inicio, fim: a.fim }));
  });
}

export function listarAgendamentos() {
  return emFila(async () => {
    const lista = await ler();
    return lista
      .slice()
      .sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0))
      .map(resumir);
  });
}

export type EntradaAgendamento = Omit<
  Agendamento,
  "id" | "createdAt" | "googleEventId" | "googleMeetLink" | "googleSyncErro" | "status"
>;

export function reservarAgendamento(entrada: EntradaAgendamento) {
  return emFila(async () => {
    const lista = await ler();
    const ocupados = lista.filter((a) => a.status === "confirmado").map((a) => ({ inicio: a.inicio, fim: a.fim }));
    if (!slotAindaDisponivel(entrada.inicio, entrada.fim, entrada.tipo, ocupados)) {
      return { ok: false as const, status: 409, erro: "Este horário acabou de ser reservado. Escolha outro." };
    }

    const registro: Agendamento = {
      ...entrada,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "confirmado",
    };

    const evento = await criarEventoAgendamento(registro);
    if (evento.ok) {
      registro.googleEventId = evento.eventId;
      if (evento.meetLink) registro.googleMeetLink = evento.meetLink;
    } else if (evento.erro) registro.googleSyncErro = evento.erro;

    lista.push(registro);
    await gravar(lista);

    void sincronizarTrabalhadorPlanilha(registro);
    void sincronizarAgendamentoPlanilha(registro);

    return { ok: true as const, agendamento: resumir(registro) };
  });
}

export function buscarGoogleMeetPorServicoId(servicoId: string) {
  return emFila(async () => {
    if (typeof servicoId !== "string" || !servicoId.trim()) return null;
    const lista = await ler();
    const item = lista.find((a) => a.servicoId === servicoId && a.status === "confirmado");
    return item?.googleMeetLink ?? null;
  });
}
