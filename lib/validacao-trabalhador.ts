import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { extensaoSalva, validarBytesDocumento, type TipoDocumentoSalvo } from "./documento-arquivo";
import { sincronizarNovoPedido, sincronizarStatusPedido } from "./google-sheets-sync";

export type TipoServicoValidacao = "juridico" | "voucher";
export type StatusValidacao = "pendente" | "aprovado" | "recusado";

export type RegistroValidacao = {
  id: string;
  createdAt: string;
  tipo: TipoServicoValidacao;
  servicoId: string;
  nomeCompleto: string;
  telefone: string;
  localTrabalho: string;
  cargo: string;
  status: StatusValidacao;
  contrachequeExt: "pdf" | "png" | "jpg";
  documentoExt: "pdf" | "png" | "jpg";
};

export type ResumoValidacao = {
  id: string;
  createdAt: string;
  tipo: TipoServicoValidacao;
  servicoId: string;
  nomeCompleto: string;
  telefone: string;
  localTrabalho: string;
  cargo: string;
  status: StatusValidacao;
  statusPublico: "aguardando_validacao" | "aprovado" | "recusado";
};

export type ItemRepositorio = ResumoValidacao;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let diretorioBase = path.join(process.cwd(), "data");
let fila: Promise<void> = Promise.resolve();

export function usarDiretorioValidacao(caminho: string) {
  diretorioBase = caminho;
  fila = Promise.resolve();
}

export function diretorioPadraoValidacao() {
  diretorioBase = path.join(process.cwd(), "data");
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

function arquivoIndice() {
  return path.join(diretorioBase, "validacoes-trabalhador.json");
}

function pastaDocumentos(id: string) {
  return path.join(diretorioBase, "validacao-trabalhador", id);
}

export function statusPublicoValidacao(status: StatusValidacao): ResumoValidacao["statusPublico"] {
  if (status === "pendente") return "aguardando_validacao";
  return status;
}

function registroValido(valor: unknown): valor is RegistroValidacao {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as RegistroValidacao;
  return (
    typeof item.id === "string" &&
    UUID.test(item.id) &&
    typeof item.createdAt === "string" &&
    (item.tipo === "juridico" || item.tipo === "voucher") &&
    typeof item.servicoId === "string" &&
    typeof item.nomeCompleto === "string" &&
    typeof item.telefone === "string" &&
    /^\d{10,11}$/.test(item.telefone) &&
    typeof item.localTrabalho === "string" &&
    typeof item.cargo === "string" &&
    (item.status === "pendente" || item.status === "aprovado" || item.status === "recusado") &&
    (item.contrachequeExt === "pdf" || item.contrachequeExt === "png" || item.contrachequeExt === "jpg") &&
    (item.documentoExt === "pdf" || item.documentoExt === "png" || item.documentoExt === "jpg")
  );
}

async function lerRegistros(): Promise<RegistroValidacao[]> {
  try {
    const texto = await readFile(arquivoIndice(), "utf8");
    const dados = JSON.parse(texto) as unknown;
    if (!Array.isArray(dados)) return [];
    return dados.filter(registroValido);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw erro;
  }
}

async function gravarRegistros(lista: RegistroValidacao[]) {
  await mkdir(diretorioBase, { recursive: true });
  const destino = arquivoIndice();
  const temporario = `${destino}.tmp`;
  await writeFile(temporario, `${JSON.stringify(lista, null, 2)}\n`, "utf8");
  await rename(temporario, destino);
}

function resumir(item: RegistroValidacao): ResumoValidacao {
  return {
    id: item.id,
    createdAt: item.createdAt,
    tipo: item.tipo,
    servicoId: item.servicoId,
    nomeCompleto: item.nomeCompleto,
    telefone: item.telefone,
    localTrabalho: item.localTrabalho,
    cargo: item.cargo,
    status: item.status,
    statusPublico: statusPublicoValidacao(item.status),
  };
}

async function salvarPar(
  id: string,
  nomeBase: "contracheque" | "documento",
  bytes: Buffer,
  metadados: { name: string; type: string; size: number },
) {
  const validado = validarBytesDocumento(bytes, metadados);
  if (!validado.ok) return validado;
  const ext = extensaoSalva(validado.tipo);
  const pasta = pastaDocumentos(id);
  await mkdir(pasta, { recursive: true });
  await writeFile(path.join(pasta, `${nomeBase}.${ext}`), bytes);
  return { ok: true as const, ext, tipo: validado.tipo };
}

export type EntradaNovaValidacao = {
  tipo: TipoServicoValidacao;
  servicoId: string;
  nomeCompleto: string;
  telefone: string;
  localTrabalho: string;
  cargo: string;
  contracheque: { bytes: Buffer; name: string; type: string; size: number };
  documento: { bytes: Buffer; name: string; type: string; size: number };
};

export function criarValidacaoTrabalhador(entrada: EntradaNovaValidacao) {
  return emFila(async () => {
    const id = randomUUID();
    const contracheque = await salvarPar(id, "contracheque", entrada.contracheque.bytes, entrada.contracheque);
    if (!contracheque.ok) return contracheque;
    const documento = await salvarPar(id, "documento", entrada.documento.bytes, entrada.documento);
    if (!documento.ok) return documento;

    const registro: RegistroValidacao = {
      id,
      createdAt: new Date().toISOString(),
      tipo: entrada.tipo,
      servicoId: entrada.servicoId,
      nomeCompleto: entrada.nomeCompleto,
      telefone: entrada.telefone,
      localTrabalho: entrada.localTrabalho,
      cargo: entrada.cargo,
      status: "pendente",
      contrachequeExt: contracheque.ext,
      documentoExt: documento.ext,
    };
    const lista = await lerRegistros();
    lista.push(registro);
    await gravarRegistros(lista);
    void sincronizarNovoPedido(registro);
    return { ok: true as const, registro: resumir(registro) };
  });
}

export function listarValidacoes(tipo: TipoServicoValidacao, status?: StatusValidacao) {
  return emFila(async () => {
    let lista = await lerRegistros();
    lista = lista.filter((item) => item.tipo === tipo);
    if (status) lista = lista.filter((item) => item.status === status);
    return lista
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(resumir);
  });
}

export function listarRepositorio(tipo?: TipoServicoValidacao) {
  return emFila(async () => {
    let lista = await lerRegistros();
    if (tipo) lista = lista.filter((item) => item.tipo === tipo);
    return lista
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(resumir);
  });
}

export function lerValidacao(id: string) {
  return emFila(async () => {
    if (!UUID.test(id)) return null;
    const lista = await lerRegistros();
    const item = lista.find((registro) => registro.id === id);
    return item ? resumir(item) : null;
  });
}

export function revisarValidacao(id: string, decisao: "aprovar" | "recusar") {
  return emFila(async () => {
    if (!UUID.test(id)) return { ok: false as const, status: 404, erro: "Não encontramos este pedido." };
    const lista = await lerRegistros();
    const indice = lista.findIndex((item) => item.id === id);
    if (indice < 0) return { ok: false as const, status: 404, erro: "Não encontramos este pedido." };
    const atual = lista[indice];
    if (atual.status !== "pendente") {
      return { ok: false as const, status: 400, erro: "Este pedido já foi revisado." };
    }
    atual.status = decisao === "aprovar" ? "aprovado" : "recusado";
    lista[indice] = atual;
    await gravarRegistros(lista);
    void sincronizarStatusPedido(atual.servicoId, atual.tipo, atual.status, atual);
    return { ok: true as const, registro: resumir(atual) };
  });
}

export function lerArquivoValidacao(id: string, qual: "contracheque" | "documento") {
  return emFila(async () => {
    if (!UUID.test(id)) return null;
    const lista = await lerRegistros();
    const item = lista.find((registro) => registro.id === id);
    if (!item) return null;
    const ext = qual === "contracheque" ? item.contrachequeExt : item.documentoExt;
    const nome = `${qual === "contracheque" ? "contracheque" : "documento"}.${ext}`;
    try {
      const bytes = await readFile(path.join(pastaDocumentos(id), nome));
      const tipo: TipoDocumentoSalvo = ext === "pdf" ? "pdf" : ext === "png" ? "png" : "jpeg";
      return { bytes, tipo };
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw erro;
    }
  });
}

export function parseConsentimento(valor: FormDataEntryValue | null) {
  if (valor === "true" || valor === "1" || valor === "on") return true;
  return false;
}

export async function arquivoDoFormulario(valor: FormDataEntryValue | null) {
  if (!(valor instanceof File) || valor.size === 0) return null;
  const bytes = Buffer.from(await valor.arrayBuffer());
  return {
    bytes,
    name: valor.name,
    type: valor.type,
    size: valor.size,
  };
}
