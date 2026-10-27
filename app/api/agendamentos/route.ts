import { connection } from "next/server";
import { calendarConfigurado, calendarIdEfetivo } from "@/lib/google-credenciais";
import { credenciaisGoogleConfiguradas } from "@/lib/google-sheets-sync";
import { agendamentosVisiveis } from "@/lib/rbac/autorizacao";
import { jsonSemCache } from "@/lib/http";
import { lerConfigGestaoSheets } from "@/lib/gestao-sheets-config";

export async function GET(request: Request) {
  await connection();
  const agendamentos = await agendamentosVisiveis(request);
  if (agendamentos instanceof Response) return agendamentos;
  const config = await lerConfigGestaoSheets();
  const calendarId = calendarIdEfetivo();
  const calendarLink =
    calendarConfigurado() && calendarId.includes("@")
      ? `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`
      : calendarConfigurado()
        ? `https://calendar.google.com/calendar/u/0/r`
        : null;
  return jsonSemCache({
    agendamentos,
    integracao: {
      credenciais: credenciaisGoogleConfiguradas(),
      calendarConfigurado: calendarConfigurado(),
      calendarLink,
      lastCalendarError: config.lastCalendarError,
      lastCalendarSyncAt: config.lastCalendarSyncAt,
    },
  });
}
