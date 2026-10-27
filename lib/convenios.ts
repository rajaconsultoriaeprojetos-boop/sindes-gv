import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { ocultarCpf } from "./cpf";
import { categoriaValida, primeiroNome, rotuloCategoria, type CategoriaId } from "./convenios-publico";

export type Parceiro = {
  id: string;
  name: string;
  category: CategoriaId;
  discountPercent: number;
  benefit: string;
  logoFile: string | null;
  example: boolean;
};

export type PedidoDesconto = {
  id: string;
  createdAt: string;
  partnerId: string;
  name: string;
  telefone: string;
  cargo: string;
  localTrabalho: string;
  validacaoId: string;
  validacaoStatus: "pendente" | "aprovado" | "recusado";
};

export type StatusVoucher = "valido" | "utilizado" | "cancelado";

export type Voucher = {
  code: string;
  partnerId: string;
  partnerName: string;
  category: CategoriaId;
  discountPercent: number;
  benefit: string;
  logoFile: string | null;
  workerName: string;
  cpf: string;
  workerTelefone?: string;
  issuedAt: string;
  validUntil: string;
  status: StatusVoucher;
  requestId: string | null;
  validacaoId?: string | null;
  issuedByEmail?: string;
};

export type SituacaoVoucher = StatusVoucher | "expirado";

const DIAS = 30;
const MS_DIA = 24 * 60 * 60 * 1000;
const MAX_LOGO = 1_048_576;

let diretorio = path.join(process.cwd(), "data");
let fila: Promise<void> = Promise.resolve();

export function usarDiretorioDeConvenios(caminho: string) {
  diretorio = caminho;
  fila = Promise.resolve();
}

export function diretorioPadraoDeConvenios() {
  diretorio = path.join(process.cwd(), "data");
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

function arquivo(nome: string) {
  return path.join(diretorio, nome);
}

function textoCurto(valor: unknown, minimo: number, maximo: number): string | null {
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (texto.length < minimo || texto.length > maximo) return null;
  return texto;
}

function parceiroValido(valor: unknown): valor is Parceiro {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Parceiro;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    categoriaValida(item.category) &&
    Number.isInteger(item.discountPercent) &&
    item.discountPercent >= 1 &&
    item.discountPercent <= 100 &&
    typeof item.benefit === "string" &&
    (item.logoFile === null || typeof item.logoFile === "string") &&
    typeof item.example === "boolean"
  );
}

async function lerJson<T>(nome: string, aceitar: (valor: unknown) => valor is T): Promise<T[]> {
  try {
    const texto = await readFile(arquivo(nome), "utf8");
    const dados = JSON.parse(texto) as unknown;
    if (!Array.isArray(dados)) return [];
    return dados.filter(aceitar);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw erro;
  }
}

async function gravarJson(nome: string, lista: unknown[]) {
  await mkdir(diretorio, { recursive: true });
  const destino = arquivo(nome);
  const temporario = `${destino}.tmp`;
  await writeFile(temporario, `${JSON.stringify(lista, null, 2)}\n`, "utf8");
  await rename(temporario, destino);
}

async function lerParceiros(): Promise<Parceiro[]> {
  return lerJson("parceiros.json", parceiroValido);
}

function pedidoValido(valor: unknown): valor is PedidoDesconto {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as PedidoDesconto;
  return (
    typeof item.id === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.partnerId === "string" &&
    typeof item.name === "string" &&
    typeof item.telefone === "string" &&
    /^\d{10,11}$/.test(item.telefone) &&
    typeof item.cargo === "string" &&
    typeof item.localTrabalho === "string" &&
    typeof item.validacaoId === "string" &&
    (item.validacaoStatus === "pendente" || item.validacaoStatus === "aprovado" || item.validacaoStatus === "recusado")
  );
}

function voucherValido(valor: unknown): valor is Voucher {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Voucher;
  return (
    typeof item.code === "string" &&
    typeof item.partnerId === "string" &&
    typeof item.partnerName === "string" &&
    categoriaValida(item.category) &&
    typeof item.discountPercent === "number" &&
    typeof item.workerName === "string" &&
    typeof item.cpf === "string" &&
    typeof item.issuedAt === "string" &&
    typeof item.validUntil === "string" &&
    (item.status === "valido" || item.status === "utilizado" || item.status === "cancelado") &&
    (item.requestId === null || typeof item.requestId === "string") &&
    (item.workerTelefone === undefined || /^\d{10,11}$/.test(item.workerTelefone)) &&
    (item.validacaoId === undefined || item.validacaoId === null || typeof item.validacaoId === "string") &&
    (item.issuedByEmail === undefined || typeof item.issuedByEmail === "string")
  );
}

export function publicarParceiro(parceiro: Parceiro) {
  return {
    id: parceiro.id,
    name: parceiro.name,
    category: parceiro.category,
    categoryLabel: rotuloCategoria(parceiro.category),
    discountPercent: parceiro.discountPercent,
    benefit: parceiro.benefit,
    example: parceiro.example,
    logoUrl: parceiro.logoFile ? `/api/convenios/logo/${parceiro.id}` : null,
  };
}

export function listarParceirosPublicos() {
  return emFila(async () => {
    const lista = await lerParceiros();
    return lista.filter((p) => !p.example).map(publicarParceiro);
  });
}

export type EntradaPedido = {
  id: string;
  partnerId: string;
  name: string;
  telefone: string;
  cargo: string;
  localTrabalho: string;
  validacaoId: string;
};

export function criarPedido(entrada: EntradaPedido) {
  return emFila(async () => {
    if (!/^[0-9a-f-]{36}$/i.test(entrada.id)) {
      return { ok: false as const, erro: "Não foi possível registrar o pedido." };
    }
    const name = textoCurto(entrada.name, 2, 120);
    if (!name) return { ok: false as const, erro: "Informe o nome completo." };
    const cargo = textoCurto(entrada.cargo, 2, 120);
    if (!cargo) return { ok: false as const, erro: "Informe o cargo." };
    const localTrabalho = textoCurto(entrada.localTrabalho, 2, 160);
    if (!localTrabalho) return { ok: false as const, erro: "Informe o local de trabalho." };
    const telefone = entrada.telefone.replace(/\D/g, "");
    if (!/^\d{10,11}$/.test(telefone)) {
      return { ok: false as const, erro: "Informe um telefone válido." };
    }
    if (typeof entrada.partnerId !== "string") return { ok: false as const, erro: "Escolha um convênio." };
    if (!/^[0-9a-f-]{36}$/i.test(entrada.validacaoId)) {
      return { ok: false as const, erro: "Não foi possível registrar os documentos." };
    }
    const parceiros = await lerParceiros();
    if (!parceiros.some((item) => item.id === entrada.partnerId)) {
      return { ok: false as const, erro: "Escolha um convênio." };
    }
    const pedido: PedidoDesconto = {
      id: entrada.id,
      createdAt: new Date().toISOString(),
      partnerId: entrada.partnerId,
      name,
      telefone,
      cargo,
      localTrabalho,
      validacaoId: entrada.validacaoId,
      validacaoStatus: "pendente",
    };
    const pedidos = await lerJson("pedidos-desconto.json", pedidoValido);
    pedidos.push(pedido);
    await gravarJson("pedidos-desconto.json", pedidos);
    return { ok: true as const, id: pedido.id };
  });
}

export function aplicarDecisaoValidacaoVoucher(validacaoId: string, aprovado: boolean) {
  return emFila(async () => {
    const pedidos = await lerJson("pedidos-desconto.json", pedidoValido);
    const indice = pedidos.findIndex((item) => item.validacaoId === validacaoId);
    if (indice < 0) return { ok: false as const, status: 404, erro: "Não encontramos o pedido." };
    const pedido = pedidos[indice];
    if (pedido.validacaoStatus !== "pendente") {
      return { ok: false as const, status: 400, erro: "Este pedido já foi revisado." };
    }
    pedido.validacaoStatus = aprovado ? "aprovado" : "recusado";
    pedidos[indice] = pedido;
    await gravarJson("pedidos-desconto.json", pedidos);
    return { ok: true as const, pedido };
  });
}

function resumoPedido(pedido: PedidoDesconto, parceiros: Parceiro[], vouchers: Voucher[]) {
  const parceiro = parceiros.find((item) => item.id === pedido.partnerId);
  const voucher = vouchers.find((item) => item.requestId === pedido.id);
  return {
    id: pedido.id,
    createdAt: pedido.createdAt,
    name: pedido.name,
    telefone: pedido.telefone,
    cargo: pedido.cargo,
    localTrabalho: pedido.localTrabalho,
    validacaoId: pedido.validacaoId,
    validacaoStatus: pedido.validacaoStatus,
    partnerId: pedido.partnerId,
    partnerName: parceiro?.name ?? "Convênio removido",
    voucherCode: voucher?.code ?? null,
  };
}

function resumoVoucher(voucher: Voucher) {
  return {
    code: voucher.code,
    partnerName: voucher.partnerName,
    discountPercent: voucher.discountPercent,
    benefit: voucher.benefit,
    workerName: voucher.workerName,
    workerTelefone: voucher.workerTelefone ?? "",
    firstName: primeiroNome(voucher.workerName),
    cpfMascarado: ocultarCpf(voucher.cpf),
    issuedAt: voucher.issuedAt,
    validUntil: voucher.validUntil,
    status: voucher.status,
    situacao: situacaoDoVoucher(voucher),
    requestId: voucher.requestId,
    validacaoId: voucher.validacaoId ?? null,
    issuedByEmail: voucher.issuedByEmail ?? "",
  };
}

export function painelAdmin() {
  return emFila(async () => {
    const parceiros = await lerParceiros();
    const pedidos = await lerJson("pedidos-desconto.json", pedidoValido);
    const vouchers = await lerJson("vouchers.json", voucherValido);
    return {
      parceiros: parceiros.map(publicarParceiro),
      pedidos: pedidos
        .slice()
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .map((pedido) => resumoPedido(pedido, parceiros, vouchers)),
      vouchers: vouchers
        .slice()
        .sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1))
        .map(resumoVoucher),
    };
  });
}

function percentual(valor: unknown): number | null {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  if (!Number.isInteger(numero) || numero < 1 || numero > 100) return null;
  return numero;
}

export function salvarParceiro(entrada: unknown) {
  return emFila(async () => {
    if (!entrada || typeof entrada !== "object") return { ok: false as const, erro: "Informe o convênio." };
    const corpo = entrada as {
      id?: unknown;
      name?: unknown;
      category?: unknown;
      discountPercent?: unknown;
      benefit?: unknown;
    };
    const name = textoCurto(corpo.name, 2, 80);
    if (!name) return { ok: false as const, erro: "Informe o nome do convênio." };
    if (typeof corpo.category !== "string" || !categoriaValida(corpo.category)) {
      return { ok: false as const, erro: "Escolha uma categoria." };
    }
    const discountPercent = percentual(corpo.discountPercent);
    if (discountPercent === null) return { ok: false as const, erro: "O desconto fica entre 1% e 100%." };
    const benefit = textoCurto(corpo.benefit, 2, 140);
    if (!benefit) return { ok: false as const, erro: "Informe o benefício em uma linha." };
    const parceiros = await lerParceiros();
    let indice = parceiros.length;
    if (typeof corpo.id === "string" && corpo.id) {
      indice = parceiros.findIndex((item) => item.id === corpo.id);
      if (indice < 0) return { ok: false as const, erro: "Não encontramos este convênio." };
      const atual = parceiros[indice];
      parceiros[indice] = {
        ...atual,
        name,
        category: corpo.category,
        discountPercent,
        benefit,
        example: false,
      };
    } else {
      parceiros.push({
        id: randomUUID(),
        name,
        category: corpo.category,
        discountPercent,
        benefit,
        logoFile: null,
        example: false,
      });
      indice = parceiros.length - 1;
    }
    await gravarJson("parceiros.json", parceiros);
    const salvo = parceiros[indice];
    return { ok: true as const, parceiro: publicarParceiro(salvo) };
  });
}

export function validarLogo(bytes: Buffer): "png" | "jpeg" | null {
  if (bytes.length === 0 || bytes.length > MAX_LOGO) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  return null;
}

export function gravarLogo(id: string, bytes: Buffer) {
  return emFila(async () => {
    const tipo = validarLogo(bytes);
    if (!tipo) return { ok: false as const, erro: "Envie um PNG ou JPG de até 1 MB." };
    const parceiros = await lerParceiros();
    const indice = parceiros.findIndex((item) => item.id === id);
    if (indice < 0) return { ok: false as const, erro: "Não encontramos este convênio." };
    const nome = `${id}.${tipo === "png" ? "png" : "jpg"}`;
    const pasta = path.join(diretorio, "parceiros");
    await mkdir(pasta, { recursive: true });
    await writeFile(path.join(pasta, nome), bytes);
    parceiros[indice] = { ...parceiros[indice], logoFile: nome, example: false };
    await gravarJson("parceiros.json", parceiros);
    return { ok: true as const, parceiro: publicarParceiro(parceiros[indice]) };
  });
}

export function lerLogo(id: string) {
  return emFila(async () => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const parceiros = await lerParceiros();
    const parceiro = parceiros.find((item) => item.id === id);
    if (!parceiro?.logoFile || !/^[0-9a-f-]{36}\.(png|jpg)$/i.test(parceiro.logoFile)) return null;
    try {
      const bytes = await readFile(path.join(diretorio, "parceiros", parceiro.logoFile));
      const tipo = parceiro.logoFile.endsWith(".png") ? "png" : "jpeg";
      return { bytes, tipo: tipo as "png" | "jpeg" };
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw erro;
    }
  });
}

function novoCodigo(existentes: Set<string>): string {
  let code = "";
  do {
    code = randomBytes(9).toString("base64url");
  } while (existentes.has(code));
  return code;
}

function montarVoucher(
  parceiro: Parceiro,
  name: string,
  cpf: string,
  requestId: string | null,
  opcoes?: {
    validUntil?: Date;
    workerTelefone?: string;
    validacaoId?: string | null;
    issuedByEmail?: string;
  },
): Voucher {
  const issuedAt = new Date();
  const validUntil =
    opcoes?.validUntil ?? new Date(issuedAt.getTime() + DIAS * MS_DIA);
  return {
    code: "",
    partnerId: parceiro.id,
    partnerName: parceiro.name,
    category: parceiro.category,
    discountPercent: parceiro.discountPercent,
    benefit: parceiro.benefit,
    logoFile: parceiro.logoFile,
    workerName: name,
    cpf,
    workerTelefone: opcoes?.workerTelefone,
    issuedAt: issuedAt.toISOString(),
    validUntil: validUntil.toISOString(),
    status: "valido",
    requestId,
    validacaoId: opcoes?.validacaoId ?? null,
    issuedByEmail: opcoes?.issuedByEmail,
  };
}

function diasValidade(valor: unknown) {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n) || n < 1 || n > 365) return DIAS;
  return Math.floor(n);
}

export type EmitirVoucherContexto = { issuedByEmail?: string };

export function emitirVoucher(entrada: unknown, contexto?: EmitirVoucherContexto) {
  return emFila(async () => {
    if (!entrada || typeof entrada !== "object") {
      return { ok: false as const, status: 400, erro: "Informe o pedido ou os dados do voucher." };
    }
    const corpo = entrada as Record<string, unknown>;
    const parceiros = await lerParceiros();
    const pedidos = await lerJson("pedidos-desconto.json", pedidoValido);
    const vouchers = await lerJson("vouchers.json", voucherValido);
    const issuedByEmail = contexto?.issuedByEmail?.trim().slice(0, 120) || undefined;

    const gravarNovo = async (voucher: Voucher) => {
      voucher.code = novoCodigo(new Set(vouchers.map((item) => item.code)));
      vouchers.push(voucher);
      await gravarJson("vouchers.json", vouchers);
      return { ok: true as const, voucher: resumoVoucher(voucher) };
    };

    if (typeof corpo.requestId === "string" && corpo.requestId) {
      const pedido = pedidos.find((item) => item.id === corpo.requestId);
      if (!pedido) return { ok: false as const, status: 404, erro: "Não encontramos este pedido." };
      if (pedido.validacaoStatus !== "aprovado") {
        return { ok: false as const, status: 403, erro: "A equipe ainda não confirmou este pedido." };
      }
      if (vouchers.some((item) => item.requestId === pedido.id)) {
        return { ok: false as const, status: 400, erro: "Este pedido já tem voucher." };
      }
      const parceiro = parceiros.find((item) => item.id === pedido.partnerId);
      if (!parceiro) return { ok: false as const, status: 404, erro: "Não encontramos este convênio." };
      const issuedAt = new Date();
      const validUntil = new Date(issuedAt.getTime() + diasValidade(corpo.validUntilDays) * MS_DIA);
      const voucher = montarVoucher(parceiro, pedido.name, "", pedido.id, {
        validUntil,
        workerTelefone: pedido.telefone,
        validacaoId: pedido.validacaoId,
        issuedByEmail,
      });
      return gravarNovo(voucher);
    }

    const partnerId = typeof corpo.partnerId === "string" ? corpo.partnerId : "";
    if (!partnerId) {
      return { ok: false as const, status: 400, erro: "Escolha o convênio parceiro." };
    }
    const parceiro = parceiros.find((item) => item.id === partnerId);
    if (!parceiro) return { ok: false as const, status: 404, erro: "Não encontramos este convênio." };

    const validacaoId =
      typeof corpo.validacaoId === "string" && corpo.validacaoId.trim() ? corpo.validacaoId.trim() : null;

    let validacaoAprovada: Awaited<ReturnType<typeof import("./validacao-trabalhador").lerValidacao>> = null;
    if (validacaoId) {
      if (vouchers.some((item) => item.validacaoId === validacaoId)) {
        return { ok: false as const, status: 400, erro: "Já existe voucher para esta validação." };
      }
      const { lerValidacao } = await import("./validacao-trabalhador");
      validacaoAprovada = await lerValidacao(validacaoId);
      if (!validacaoAprovada) {
        return { ok: false as const, status: 404, erro: "Validação não encontrada." };
      }
      if (validacaoAprovada.tipo !== "voucher" || validacaoAprovada.status !== "aprovado") {
        return { ok: false as const, status: 403, erro: "A validação precisa estar aprovada (voucher)." };
      }
    }

    let name = textoCurto(corpo.workerName, 2, 120) ?? (validacaoAprovada?.nomeCompleto ?? null);
    let telefone = String(corpo.workerTelefone ?? "").replace(/\D/g, "");
    if (!/^\d{10,11}$/.test(telefone) && validacaoAprovada) telefone = validacaoAprovada.telefone;
    if (!name) return { ok: false as const, status: 400, erro: "Informe o nome do trabalhador." };
    if (!/^\d{10,11}$/.test(telefone)) {
      return { ok: false as const, status: 400, erro: "Informe um telefone válido do trabalhador." };
    }

    const cpfRaw = String(corpo.cpf ?? "").replace(/\D/g, "");
    const cpf = cpfRaw.length === 11 ? cpfRaw : "";

    const issuedAt = new Date();
    const validUntil = new Date(issuedAt.getTime() + diasValidade(corpo.validUntilDays) * MS_DIA);
    const voucher = montarVoucher(parceiro, name, cpf, null, {
      validUntil,
      workerTelefone: telefone,
      validacaoId,
      issuedByEmail,
    });
    return gravarNovo(voucher);
  });
}

export function alterarVoucher(code: string, entrada: unknown) {
  return emFila(async () => {
    if (!entrada || typeof entrada !== "object") return { ok: false as const, status: 400, erro: "Informe o status." };
    const status = (entrada as { status?: unknown }).status;
    if (status !== "utilizado" && status !== "cancelado") {
      return { ok: false as const, status: 400, erro: "O voucher só pode ser marcado como utilizado ou cancelado." };
    }
    const vouchers = await lerJson("vouchers.json", voucherValido);
    const indice = vouchers.findIndex((item) => item.code === code);
    if (indice < 0) return { ok: false as const, status: 404, erro: "Não encontramos este voucher." };
    vouchers[indice] = { ...vouchers[indice], status };
    await gravarJson("vouchers.json", vouchers);
    return { ok: true as const, voucher: resumoVoucher(vouchers[indice]) };
  });
}

export function situacaoDoVoucher(voucher: Pick<Voucher, "status" | "validUntil">, agora = new Date()): SituacaoVoucher {
  if (voucher.status !== "valido") return voucher.status;
  if (new Date(voucher.validUntil).getTime() <= agora.getTime()) return "expirado";
  return "valido";
}

export function lerVoucherPublico(code: string) {
  return emFila(async () => {
    if (!/^[A-Za-z0-9_-]{8,32}$/.test(code)) return null;
    const vouchers = await lerJson("vouchers.json", voucherValido);
    const voucher = vouchers.find((item) => item.code === code);
    if (!voucher) return null;
    return {
      code: voucher.code,
      partnerName: voucher.partnerName,
      categoryLabel: rotuloCategoria(voucher.category),
      discountPercent: voucher.discountPercent,
      benefit: voucher.benefit,
      logoUrl: voucher.logoFile ? `/api/convenios/logo/${voucher.partnerId}` : null,
      firstName: primeiroNome(voucher.workerName),
      cpfMascarado: ocultarCpf(voucher.cpf),
      issuedAt: voucher.issuedAt,
      validUntil: voucher.validUntil,
      situacao: situacaoDoVoucher(voucher),
    };
  });
}
