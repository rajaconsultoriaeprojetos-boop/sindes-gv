import { jsonSemCache, negarSemSessao } from "../http";
import { sessaoDoPedido, type Papel as PapelLegado } from "../sessao";
import { listarAgendamentos, type ResumoAgendamento } from "../agendamentos";
import type { TipoAgendamento } from "../tipos-agendamento";
import { papelInclui, type PapelUsuario } from "./roles";
import { sessaoUsuarioDoPedido } from "./sessao-usuario";

export type ContextoAuth =
  | { tipo: "usuario"; email: string; role: PapelUsuario; id: string }
  | { tipo: "legado"; papel: PapelLegado };

export function contextoAuth(request: Request): ContextoAuth | null {
  const usuario = sessaoUsuarioDoPedido(request);
  if (usuario) {
    return { tipo: "usuario", email: usuario.email, role: usuario.role, id: usuario.sub };
  }
  if (sessaoDoPedido(request, "admin")) return { tipo: "legado", papel: "admin" };
  if (sessaoDoPedido(request, "assessoria")) return { tipo: "legado", papel: "assessoria" };
  return null;
}

function roleEfetivo(ctx: ContextoAuth): PapelUsuario | null {
  if (ctx.tipo === "usuario") return ctx.role;
  if (ctx.papel === "admin") return "admin";
  if (ctx.papel === "assessoria") return "admin";
  return null;
}

export function negarSemPapeis(request: Request, permitidos: PapelUsuario[]) {
  const ctx = contextoAuth(request);
  if (!ctx) {
    return jsonSemCache({ erro: "Entre em /entrar com seu e-mail.", configurado: true }, 401);
  }
  const role = roleEfetivo(ctx);
  if (!role) {
    return jsonSemCache({ erro: "Use o login unificado em /entrar.", configurado: true }, 401);
  }
  const expandido: PapelUsuario[] = [...permitidos];
  if (permitidos.includes("admin") && !expandido.includes("superadmin")) {
    expandido.push("superadmin");
  }
  if (!papelInclui(role, expandido)) {
    return jsonSemCache({ erro: "Sem permissão para esta área.", configurado: true }, 403);
  }
  return null;
}

/** Compatível com APIs que usavam negarSemSessao(admin). */
export function negarSemAdmin(request: Request) {
  return negarSemPapeis(request, ["admin"]);
}

export function negarSemEquipeOperacional(request: Request) {
  return negarSemPapeis(request, ["admin", "juridico", "contador"]);
}

export function negarSemSuperadmin(request: Request) {
  return negarSemPapeis(request, ["superadmin"]);
}

export function legadoAdminOuAssessoria(request: Request) {
  const negado = negarSemSessao(request, "admin");
  if (!negado) return null;
  const negadoAss = negarSemSessao(request, "assessoria");
  if (!negadoAss) return null;
  return negarSemAdmin(request);
}

/** Assessória jurídica: admin, jurídico, superadmin ou cookie legado assessoria. */
export function negarSemPainelAssessoria(request: Request) {
  const rbac = negarSemPapeis(request, ["admin", "juridico"]);
  if (!rbac) return null;
  const legado = negarSemSessao(request, "assessoria");
  if (!legado) return null;
  return jsonSemCache({ erro: "Entre em /entrar." }, 401);
}

/** Calculadora / TRCT: admin, contador, superadmin ou legado assessoria. */
export function negarSemCalculadoraApi(request: Request) {
  const rbac = negarSemPapeis(request, ["admin", "contador"]);
  if (!rbac) return null;
  const legado = negarSemSessao(request, "assessoria");
  if (!legado) return null;
  return jsonSemCache({ erro: "Entre em /entrar." }, 401);
}

export async function agendamentosVisiveis(request: Request): Promise<ResumoAgendamento[] | Response> {
  const ctx = contextoAuth(request);
  if (!ctx) return jsonSemCache({ erro: "Entre em /entrar." }, 401);
  const role = roleEfetivo(ctx);
  if (!role) return jsonSemCache({ erro: "Entre em /entrar." }, 401);
  const todos = await listarAgendamentos();
  if (role === "superadmin" || role === "admin") return todos;
  if (role === "juridico") return todos.filter((a) => a.tipo === "juridico");
  if (role === "contador") return todos.filter((a) => a.tipo === "homologacao");
  return [];
}

export function tiposAgendamentoPermitidos(role: PapelUsuario): TipoAgendamento[] | "todos" {
  if (role === "superadmin" || role === "admin") return "todos";
  if (role === "juridico") return ["juridico"];
  if (role === "contador") return ["homologacao"];
  return [];
}
