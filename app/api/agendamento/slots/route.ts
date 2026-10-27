import { connection } from "next/server";
import { listarOcupacaoConfirmada } from "@/lib/agendamentos";
import { jsonSemCache } from "@/lib/http";
import { listarSlotsDisponiveis } from "@/lib/slots-agendamento";
import { tipoAgendamentoValido } from "@/lib/tipos-agendamento";

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "";
  if (!tipoAgendamentoValido(tipo)) {
    return jsonSemCache({ erro: "Informe o tipo de atendimento." }, 400);
  }
  const ocupados = await listarOcupacaoConfirmada();
  const slots = listarSlotsDisponiveis(tipo, ocupados, 21);
  return jsonSemCache({ slots });
}
