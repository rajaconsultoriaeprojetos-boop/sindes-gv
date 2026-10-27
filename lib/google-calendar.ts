import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { ROTULO_TIPO_AGENDAMENTO } from "./tipos-agendamento";
import type { Agendamento } from "./agendamentos";
import {
  authGoogleCalendar,
  authGoogleCalendarMeet,
  calendarConfigurado,
  calendarIdEfetivo,
  calendarMeetConfigurado,
} from "./google-credenciais";
import { salvarConfigGestaoSheets } from "./gestao-sheets-config";

function mensagemErroCalendar(erro: unknown) {
  const gaxios = erro as { response?: { data?: { error?: { message?: string } } }; message?: string };
  const api = gaxios.response?.data?.error?.message;
  if (api) return api;
  if (erro instanceof Error && erro.message) return erro.message;
  return "Não foi possível criar o evento no Google Calendar.";
}

export async function criarEventoAgendamento(agendamento: Agendamento) {
  if (!calendarConfigurado()) {
    return { ok: false as const, erro: "Calendário Google não configurado no servidor." };
  }
  const precisaMeet = agendamento.tipo === "juridico";
  if (precisaMeet && !(await calendarMeetConfigurado())) {
    await salvarConfigGestaoSheets({
      lastCalendarError:
        "Google Meet exige OAuth da conta sindesgvoficial@gmail.com (conta de serviço não cria Meet). Conecte em Admin → Google ou configure GOOGLE_OAUTH_* e refresh token.",
      lastCalendarSyncAt: new Date().toISOString(),
    });
    return {
      ok: false as const,
      erro: "Google Meet não configurado. Conecte o Google Calendar (OAuth) no painel admin.",
    };
  }
  try {
    const auth = precisaMeet ? await authGoogleCalendarMeet() : await authGoogleCalendar();
    if (!auth) {
      return { ok: false as const, erro: "Credenciais Google indisponíveis." };
    }
    const calendar = google.calendar({ version: "v3", auth });
    const titulo = `${ROTULO_TIPO_AGENDAMENTO[agendamento.tipo]} — ${agendamento.nome}`;
    const linhas = [
      `Tipo: ${ROTULO_TIPO_AGENDAMENTO[agendamento.tipo]}`,
      `Telefone: ${agendamento.telefone}`,
      `Local de trabalho: ${agendamento.localTrabalho}`,
      `Cargo: ${agendamento.cargo}`,
    ];
    if (agendamento.assunto) linhas.push(`Assunto: ${agendamento.assunto}`);
    if (agendamento.partnerName) linhas.push(`Convênio: ${agendamento.partnerName}`);
    if (agendamento.preferencias) linhas.push(`Observações: ${agendamento.preferencias}`);
    if (agendamento.servicoId) linhas.push(`ID serviço: ${agendamento.servicoId}`);

    if (precisaMeet) {
      linhas.unshift("Modalidade: videoatendimento (Google Meet)");
    }
    const requestBody: {
      summary: string;
      description: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      conferenceData?: {
        createRequest: { requestId: string; conferenceSolutionKey: { type: string } };
      };
    } = {
      summary: titulo,
      description: linhas.join("\n"),
      start: { dateTime: agendamento.inicio, timeZone: "America/Sao_Paulo" },
      end: { dateTime: agendamento.fim, timeZone: "America/Sao_Paulo" },
    };
    const insertParams: {
      calendarId: string;
      requestBody: typeof requestBody;
      conferenceDataVersion?: number;
    } = { calendarId: calendarIdEfetivo(), requestBody };
    if (precisaMeet) {
      insertParams.conferenceDataVersion = 1;
      requestBody.conferenceData = {
        createRequest: {
          requestId: `sindes-${agendamento.id}-${randomUUID()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }
    const resposta = await calendar.events.insert(insertParams);
    await salvarConfigGestaoSheets({ lastCalendarError: "", lastCalendarSyncAt: new Date().toISOString() });
    const eventId = resposta.data.id ?? undefined;
    if (!eventId) return { ok: false as const, erro: "Evento criado sem identificador." };
    const meetLink =
      resposta.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
      resposta.data.hangoutLink ??
      undefined;
    return { ok: true as const, eventId, meetLink };
  } catch (erro) {
    const texto = mensagemErroCalendar(erro);
    await salvarConfigGestaoSheets({
      lastCalendarError: texto,
      lastCalendarSyncAt: new Date().toISOString(),
    });
    return { ok: false as const, erro: texto };
  }
}
