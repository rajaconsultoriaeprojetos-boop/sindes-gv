import { connection } from "next/server";
import { listarOcupacaoConfirmada } from "@/lib/agendamentos";
import { resumoHorariosTipo, destinoAtendimento, modalidadeAtendimento } from "@/lib/agendamento-horarios";
import { jsonSemCache } from "@/lib/http";
import { calendarConfigurado, calendarMeetConfigurado } from "@/lib/google-credenciais";
import { explicarSlotsVazios, listarSlotsDisponiveis } from "@/lib/slots-agendamento";
import { MODALIDADE_TIPO_AGENDAMENTO, tipoAgendamentoValido } from "@/lib/tipos-agendamento";

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "";
  if (!tipoAgendamentoValido(tipo)) {
    return jsonSemCache({ erro: "Informe o tipo de atendimento." }, 400);
  }
  const ocupados = await listarOcupacaoConfirmada();
  const slots = listarSlotsDisponiveis(tipo, ocupados, 21);
  const googleCalendario = calendarConfigurado();
  const googleMeet = tipo === "juridico" ? await calendarMeetConfigurado() : googleCalendario;

  return jsonSemCache({
    slots,
    horarios: {
      resumo: resumoHorariosTipo(tipo),
      destino: destinoAtendimento(tipo),
      modalidade: MODALIDADE_TIPO_AGENDAMENTO[tipo] ?? modalidadeAtendimento(tipo),
    },
    google: {
      calendarioConfigurado: googleCalendario,
      meetConfigurado: googleMeet,
    },
    avisoVazio: slots.length === 0 ? explicarSlotsVazios(tipo, ocupados) : null,
    avisoMeet:
      tipo === "juridico" && slots.length > 0 && !googleMeet
        ? "O agendamento será salvo neste servidor. O link do Google Meet depende da conexão OAuth do calendário no painel admin — a equipe pode enviar o convite manualmente."
        : null,
  });
}
