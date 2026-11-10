import { connection } from "next/server";
import {
  agendamentoNovoParaAdmin,
  instanteUltimaVisualizacaoAdmin,
  marcarAgendamentosVistosPeloAdmin,
} from "@/lib/agendamentos-admin-visto";
import { listarAgendamentos } from "@/lib/agendamentos";
import { calendarConfigurado, calendarIdEfetivo } from "@/lib/google-credenciais";
import { credenciaisGoogleConfiguradas } from "@/lib/google-sheets-sync";
import { lerConfigGestaoSheets } from "@/lib/gestao-sheets-config";
import { jsonSemCache } from "@/lib/http";
import { negarSemPapeis } from "@/lib/rbac/autorizacao";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemPapeis(request, ["admin"]);
  if (negado) return negado;

  const vistoEm = await instanteUltimaVisualizacaoAdmin();
  const agendamentos = await listarAgendamentos();
  const comIndicador = agendamentos.map((item) => ({
    ...item,
    novo: agendamentoNovoParaAdmin(item.createdAt, vistoEm),
  }));
  const novosPendentes = comIndicador.filter((a) => a.novo).length;

  const config = await lerConfigGestaoSheets();
  const calendarId = calendarIdEfetivo();
  const calendarLink =
    calendarConfigurado() && calendarId.includes("@")
      ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`
      : calendarConfigurado()
        ? `https://calendar.google.com/calendar/u/0/r`
        : null;

  return jsonSemCache({
    agendamentos: comIndicador,
    novosPendentes,
    integracao: {
      credenciais: credenciaisGoogleConfiguradas(),
      calendarConfigurado: calendarConfigurado(),
      calendarLink,
      lastCalendarError: config.lastCalendarError,
      lastCalendarSyncAt: config.lastCalendarSyncAt,
    },
  });
}

export async function POST(request: Request) {
  await connection();
  const negado = negarSemPapeis(request, ["admin"]);
  if (negado) return negado;

  let acao = "visto";
  try {
    const corpo = (await request.json()) as { acao?: unknown };
    if (typeof corpo.acao === "string" && corpo.acao.trim()) acao = corpo.acao.trim();
  } catch {
    /* corpo vazio é ok */
  }

  if (acao === "visto") {
    await marcarAgendamentosVistosPeloAdmin();
    return jsonSemCache({ ok: true, vistoEm: new Date().toISOString() });
  }

  return jsonSemCache({ erro: "Ação inválida." }, 400);
}
