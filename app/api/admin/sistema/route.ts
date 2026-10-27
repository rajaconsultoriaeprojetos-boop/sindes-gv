import { connection } from "next/server";
import { calendarConfigurado } from "@/lib/google-credenciais";
import { credenciaisGoogleConfiguradas } from "@/lib/google-sheets-sync";
import { lerConfigGestaoSheets } from "@/lib/gestao-sheets-config";
import { negarSemSuperadmin } from "@/lib/rbac/autorizacao";
import { jsonSemCache } from "@/lib/http";
import { codigoConfigurado } from "@/lib/sessao";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemSuperadmin(request);
  if (negado) return negado;
  const config = await lerConfigGestaoSheets();
  return jsonSemCache({
    flags: {
      googleCredenciais: credenciaisGoogleConfiguradas(),
      googleCalendar: calendarConfigurado(),
      sheetsSync: config.syncEnabled && credenciaisGoogleConfiguradas(),
      legadoCodigos: codigoConfigurado("admin") || codigoConfigurado("assessoria"),
    },
  });
}
