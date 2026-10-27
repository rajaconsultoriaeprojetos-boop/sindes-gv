import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { emailNormalizado, papelValido, type PapelUsuario } from "./rbac/roles";
import { conferirSenha, hashSenha } from "./rbac/senha";

export type StatusUsuario = "ativo" | "desabilitado" | "convite_pendente";

export type Usuario = {
  id: string;
  email: string;
  role: PapelUsuario;
  status: StatusUsuario;
  passwordHash?: string;
  inviteToken?: string;
  inviteExpires?: string;
  createdAt: string;
  createdBy?: string;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let arquivo = path.join(process.cwd(), "data", "usuarios.json");
let fila: Promise<void> = Promise.resolve();

export function usarArquivoUsuarios(caminho: string) {
  arquivo = caminho;
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

function registroValido(valor: unknown): valor is Usuario {
  if (!valor || typeof valor !== "object") return false;
  const u = valor as Usuario;
  return (
    typeof u.id === "string" &&
    UUID.test(u.id) &&
    typeof u.email === "string" &&
    u.email.includes("@") &&
    papelValido(u.role) &&
    (u.status === "ativo" || u.status === "desabilitado" || u.status === "convite_pendente") &&
    typeof u.createdAt === "string"
  );
}

async function ler(): Promise<Usuario[]> {
  try {
    const texto = await readFile(arquivo, "utf8");
    const dados = JSON.parse(texto) as unknown;
    if (!Array.isArray(dados)) return [];
    return dados.filter(registroValido);
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw erro;
  }
}

async function gravar(lista: Usuario[]) {
  await mkdir(path.dirname(arquivo), { recursive: true });
  const tmp = `${arquivo}.tmp`;
  await writeFile(tmp, `${JSON.stringify(lista, null, 2)}\n`, "utf8");
  await rename(tmp, arquivo);
}

function superadminEmailsEnv() {
  const bruto = (process.env.SUPERADMIN_EMAILS ?? "rajaconsultoriaeprojetos@gmail.com").trim();
  return bruto
    .split(/[,;]/)
    .map((e) => emailNormalizado(e))
    .filter((e) => e.includes("@"));
}

/** Contas admin semeadas (convite/senha via Gestão de usuários). */
const ADMIN_EMAILS_SEED = ["sindesgvoficial@gmail.com"] as const;

async function semearUsuariosSeNecessario() {
    const lista = await ler();
    const porEmail = new Map(lista.map((u) => [u.email, u]));
    let alterou = false;

    for (const email of superadminEmailsEnv()) {
      if (porEmail.has(email)) {
        const existente = porEmail.get(email)!;
        if (existente.role !== "superadmin") {
          existente.role = "superadmin";
          existente.status = "ativo";
          alterou = true;
        }
        continue;
      }
      const novo: Usuario = {
        id: randomUUID(),
        email,
        role: "superadmin",
        status: "convite_pendente",
        createdAt: new Date().toISOString(),
        createdBy: "sistema",
      };
      lista.push(novo);
      porEmail.set(email, novo);
      alterou = true;
    }

    for (const bruto of ADMIN_EMAILS_SEED) {
      const adminEmail = emailNormalizado(bruto);
      if (!porEmail.has(adminEmail)) {
        lista.push({
          id: randomUUID(),
          email: adminEmail,
          role: "admin",
          status: "convite_pendente",
          createdAt: new Date().toISOString(),
          createdBy: "sistema",
        });
        porEmail.set(adminEmail, lista[lista.length - 1]!);
        alterou = true;
      } else {
        const adm = porEmail.get(adminEmail)!;
        if (adm.role !== "superadmin" && adm.role !== "admin") {
          adm.role = "admin";
          alterou = true;
        }
      }
    }

    if (alterou) await gravar(lista);
    return lista;
}

export function garantirUsuariosSemeados() {
  return emFila(() => semearUsuariosSeNecessario());
}

export function listarUsuarios() {
  return emFila(async () => {
    await semearUsuariosSeNecessario();
    return ler();
  });
}

export function buscarPorEmail(email: string) {
  return emFila(async () => {
    await semearUsuariosSeNecessario();
    const alvo = emailNormalizado(email);
    const lista = await ler();
    return lista.find((u) => u.email === alvo) ?? null;
  });
}

export function buscarPorId(id: string) {
  return emFila(async () => {
    if (!UUID.test(id)) return null;
    const lista = await ler();
    return lista.find((u) => u.id === id) ?? null;
  });
}

export function buscarPorConvite(token: string) {
  return emFila(async () => {
    if (!token.trim()) return null;
    const lista = await ler();
    return lista.find((u) => u.inviteToken === token) ?? null;
  });
}

export type EntradaNovoUsuario = {
  email: string;
  role: PapelUsuario;
  createdBy: string;
};

export function criarUsuarioConvite(entrada: EntradaNovoUsuario) {
  return emFila(async () => {
    await semearUsuariosSeNecessario();
    const email = emailNormalizado(entrada.email);
    if (!email.includes("@")) return { ok: false as const, erro: "E-mail inválido." };
    const lista = await ler();
    if (lista.some((u) => u.email === email)) {
      return { ok: false as const, erro: "Este e-mail já está cadastrado." };
    }
    const token = randomBytes(24).toString("base64url");
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const usuario: Usuario = {
      id: randomUUID(),
      email,
      role: entrada.role,
      status: "convite_pendente",
      inviteToken: token,
      inviteExpires: exp,
      createdAt: new Date().toISOString(),
      createdBy: entrada.createdBy,
    };
    lista.push(usuario);
    await gravar(lista);
    return { ok: true as const, usuario, inviteToken: token, inviteUrl: `/entrar/convite?token=${token}` };
  });
}

export function definirSenhaPorConvite(token: string, senha: string) {
  return emFila(async () => {
    if (senha.length < 8) return { ok: false as const, erro: "Use pelo menos 8 caracteres." };
    const lista = await ler();
    const indice = lista.findIndex((u) => u.inviteToken === token);
    if (indice < 0) return { ok: false as const, erro: "Convite inválido ou expirado." };
    const usuario = lista[indice];
    if (usuario.inviteExpires && new Date(usuario.inviteExpires).getTime() < Date.now()) {
      return { ok: false as const, erro: "Convite expirado. Peça um novo convite à administração." };
    }
    usuario.passwordHash = await hashSenha(senha);
    usuario.status = "ativo";
    usuario.inviteToken = undefined;
    usuario.inviteExpires = undefined;
    lista[indice] = usuario;
    await gravar(lista);
    return { ok: true as const, usuario };
  });
}

export function autenticarEmailSenha(email: string, senha: string) {
  return emFila(async () => {
    await semearUsuariosSeNecessario();
    const alvo = emailNormalizado(email);
    const lista = await ler();
    const usuario = lista.find((u) => u.email === alvo) ?? null;
    if (!usuario) return { ok: false as const, erro: "E-mail ou senha não conferem." };
    if (usuario.status === "desabilitado") return { ok: false as const, erro: "Conta desabilitada." };
    if (usuario.status === "convite_pendente" || !usuario.passwordHash) {
      return { ok: false as const, erro: "Ative sua conta pelo link de convite antes de entrar." };
    }
    const confere = await conferirSenha(senha, usuario.passwordHash);
    if (!confere) return { ok: false as const, erro: "E-mail ou senha não conferem." };
    return { ok: true as const, usuario };
  });
}

export function atualizarUsuario(
  id: string,
  ator: { email: string; role: PapelUsuario },
  patch: { role?: PapelUsuario; status?: StatusUsuario },
) {
  return emFila(async () => {
    const lista = await ler();
    const indice = lista.findIndex((u) => u.id === id);
    if (indice < 0) return { ok: false as const, erro: "Usuário não encontrado." };
    const alvo = lista[indice];
    if (alvo.role === "superadmin" && patch.role && patch.role !== "superadmin") {
      return { ok: false as const, erro: "Superadmin não pode ser rebaixado." };
    }
    if (patch.role && alvo.email !== ator.email) {
      if (ator.role !== "superadmin" && ator.role !== "admin") {
        return { ok: false as const, erro: "Sem permissão." };
      }
      if (patch.role === "superadmin") return { ok: false as const, erro: "Não é possível criar superadmin." };
      if (ator.role === "admin" && patch.role !== "juridico" && patch.role !== "contador") {
        return { ok: false as const, erro: "Admin só pode atribuir jurídico ou contador." };
      }
      alvo.role = patch.role;
    }
    if (patch.status && alvo.role === "superadmin" && patch.status === "desabilitado") {
      return { ok: false as const, erro: "Superadmin não pode ser desabilitado." };
    }
    if (patch.status) alvo.status = patch.status;
    lista[indice] = alvo;
    await gravar(lista);
    return { ok: true as const, usuario: alvo };
  });
}

export function usuarioPublico(u: Usuario) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt,
    createdBy: u.createdBy,
    precisaConvite: u.status === "convite_pendente" && !u.passwordHash,
  };
}
