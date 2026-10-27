import { NextResponse } from "next/server";
import {
  SESSAO_SEGUNDOS,
  codigoConfigurado,
  conferirCodigo,
  emitirSessao,
  ipDaRequisicao,
  nomeDoCookie,
  sessaoDoPedido,
  type Papel,
} from "./sessao";
import { sessaoUsuarioDoPedido } from "./rbac/sessao-usuario";
import { papelInclui } from "./rbac/roles";

export function jsonSemCache(corpo: unknown, status = 200) {
  return NextResponse.json(corpo, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function negarSemSessaoEquipe(request: Request) {
  const usuario = sessaoUsuarioDoPedido(request);
  if (usuario && papelInclui(usuario.role, ["superadmin", "admin", "juridico", "contador"])) {
    return null;
  }
  if (!negarSemSessao(request, "admin")) return null;
  if (!negarSemSessao(request, "assessoria")) return null;
  return jsonSemCache({ erro: "Entre em /entrar ou use o código legado.", configurado: true }, 401);
}

export function negarSemSessao(request: Request, papel: Papel) {
  const usuario = sessaoUsuarioDoPedido(request);
  if (papel === "admin" && usuario && papelInclui(usuario.role, ["superadmin", "admin"])) {
    return null;
  }
  if (papel === "assessoria" && usuario && papelInclui(usuario.role, ["superadmin", "admin", "juridico"])) {
    return null;
  }
  if (!codigoConfigurado(papel)) {
    return jsonSemCache({ erro: "O código não foi configurado.", configurado: false }, 401);
  }
  if (!sessaoDoPedido(request, papel)) {
    return jsonSemCache({ erro: "Entre com o código ou em /entrar.", configurado: true }, 401);
  }
  return null;
}

export async function abrirSessao(request: Request, papel: Papel) {
  let codigo = "";
  try {
    const corpo = (await request.json()) as { codigo?: unknown };
    codigo = typeof corpo.codigo === "string" ? corpo.codigo : "";
  } catch {
    codigo = "";
  }
  const resultado = conferirCodigo(ipDaRequisicao(request), papel, codigo);
  if (!resultado.ok) {
    return jsonSemCache(
      { erro: resultado.erro, configurado: resultado.motivo !== "ausente" },
      resultado.status,
    );
  }
  const token = emitirSessao(papel);
  if (!token) {
    return jsonSemCache({ erro: "O código não foi configurado.", configurado: false }, 401);
  }
  const resposta = jsonSemCache({ ok: true });
  resposta.cookies.set({
    name: nomeDoCookie(papel),
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: SESSAO_SEGUNDOS,
  });
  return resposta;
}
