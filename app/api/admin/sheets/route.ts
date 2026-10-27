import { connection } from "next/server";
import { credenciaisGoogleConfiguradas } from "@/lib/google-sheets-sync";
import {
  calendarConfigurado,
  calendarIdEfetivo,
  calendarMeetConfigurado,
  oauthClienteConfigurado,
  oauthRedirectUriEfetivo,
  oauthRefreshTokenDisponivel,
} from "@/lib/google-credenciais";
import { lerConfigGestaoSheets, salvarConfigGestaoSheets } from "@/lib/gestao-sheets-config";
import { jsonSemCache, negarSemSessao } from "@/lib/http";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  const config = await lerConfigGestaoSheets();
  return jsonSemCache({
    credenciaisConfiguradas: credenciaisGoogleConfiguradas(),
    spreadsheetId: config.spreadsheetId,
    syncEnabled: config.syncEnabled,
    lastError: config.lastError,
    lastSyncAt: config.lastSyncAt,
    calendarConfigurado: calendarConfigurado(),
    calendarId: calendarIdEfetivo(),
    lastCalendarError: config.lastCalendarError,
    lastCalendarSyncAt: config.lastCalendarSyncAt,
    oauthClienteConfigurado: oauthClienteConfigurado(),
    oauthConectado: await oauthRefreshTokenDisponivel(),
    calendarMeetConfigurado: await calendarMeetConfigurado(),
    oauthRedirectUri: oauthRedirectUriEfetivo(),
  });
}

export async function PATCH(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return jsonSemCache({ erro: "Nada para salvar." }, 400);
  }
  const campos = corpo as { spreadsheetId?: unknown; syncEnabled?: unknown };
  const config = await salvarConfigGestaoSheets({
    spreadsheetId: typeof campos.spreadsheetId === "string" ? campos.spreadsheetId : undefined,
    syncEnabled: typeof campos.syncEnabled === "boolean" ? campos.syncEnabled : undefined,
  });
  return jsonSemCache({
    credenciaisConfiguradas: credenciaisGoogleConfiguradas(),
    spreadsheetId: config.spreadsheetId,
    syncEnabled: config.syncEnabled,
    lastError: config.lastError,
    lastSyncAt: config.lastSyncAt,
    calendarConfigurado: calendarConfigurado(),
    calendarId: calendarIdEfetivo(),
    lastCalendarError: config.lastCalendarError,
    lastCalendarSyncAt: config.lastCalendarSyncAt,
    oauthClienteConfigurado: oauthClienteConfigurado(),
    oauthConectado: await oauthRefreshTokenDisponivel(),
    calendarMeetConfigurado: await calendarMeetConfigurado(),
    oauthRedirectUri: oauthRedirectUriEfetivo(),
  });
}
