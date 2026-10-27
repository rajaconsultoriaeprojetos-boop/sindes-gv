import { connection } from "next/server";
import {
  atualizarUsuario,
  criarUsuarioConvite,
  listarUsuarios,
  usuarioPublico,
} from "@/lib/usuarios";
import { negarSemAdmin } from "@/lib/rbac/autorizacao";
import { jsonSemCache } from "@/lib/http";
import { sessaoUsuarioDoPedido } from "@/lib/rbac/sessao-usuario";
import { podeAtribuirPapel, papelValido } from "@/lib/rbac/roles";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemAdmin(request);
  if (negado) return negado;
  const lista = await listarUsuarios();
  return jsonSemCache({ usuarios: lista.map(usuarioPublico) });
}

export async function POST(request: Request) {
  await connection();
  const negado = negarSemAdmin(request);
  if (negado) return negado;
  const ator = sessaoUsuarioDoPedido(request);
  if (!ator) return jsonSemCache({ erro: "Sessão inválida." }, 401);

  let corpo: { email?: unknown; role?: unknown };
  try {
    corpo = (await request.json()) as { email?: unknown; role?: unknown };
  } catch {
    return jsonSemCache({ erro: "JSON inválido." }, 400);
  }
  const email = typeof corpo.email === "string" ? corpo.email : "";
  const roleRaw = typeof corpo.role === "string" ? corpo.role : "";
  if (!papelValido(roleRaw)) return jsonSemCache({ erro: "Papel inválido." }, 400);
  if (!podeAtribuirPapel(ator.role, roleRaw)) {
    return jsonSemCache({ erro: "Você não pode atribuir este papel." }, 403);
  }

  const criado = await criarUsuarioConvite({ email, role: roleRaw, createdBy: ator.email });
  if (!criado.ok) return jsonSemCache({ erro: criado.erro }, 400);
  return jsonSemCache(
    {
      usuario: usuarioPublico(criado.usuario),
      inviteUrl: criado.inviteUrl,
    },
    201,
  );
}

export async function PATCH(request: Request) {
  await connection();
  const negado = negarSemAdmin(request);
  if (negado) return negado;
  const ator = sessaoUsuarioDoPedido(request);
  if (!ator) return jsonSemCache({ erro: "Sessão inválida." }, 401);

  let corpo: { id?: unknown; role?: unknown; status?: unknown };
  try {
    corpo = (await request.json()) as { id?: unknown; role?: unknown; status?: unknown };
  } catch {
    return jsonSemCache({ erro: "JSON inválido." }, 400);
  }
  const id = typeof corpo.id === "string" ? corpo.id : "";
  if (!id) return jsonSemCache({ erro: "Informe o usuário." }, 400);

  const patch: { role?: import("@/lib/rbac/roles").PapelUsuario; status?: import("@/lib/usuarios").StatusUsuario } =
    {};
  if (typeof corpo.role === "string" && papelValido(corpo.role)) patch.role = corpo.role;
  if (corpo.status === "ativo" || corpo.status === "desabilitado" || corpo.status === "convite_pendente") {
    patch.status = corpo.status;
  }

  const atualizado = await atualizarUsuario(id, { email: ator.email, role: ator.role }, patch);
  if (!atualizado.ok) return jsonSemCache({ erro: atualizado.erro }, 400);
  return jsonSemCache({ usuario: usuarioPublico(atualizado.usuario) });
}
