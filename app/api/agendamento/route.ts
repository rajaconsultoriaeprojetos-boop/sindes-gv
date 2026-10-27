import { connection } from "next/server";
import { processarAgendamentoPortal } from "@/lib/envio-agendamento";
import { jsonSemCache } from "@/lib/http";

export async function POST(request: Request) {
  await connection();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonSemCache({ erro: "Envie o formulário completo." }, 400);
  }
  const criado = await processarAgendamentoPortal(form);
  if (!criado.ok) return jsonSemCache({ erro: criado.erro }, criado.status);
  return jsonSemCache(
    {
      id: criado.agendamento.id,
      inicio: criado.agendamento.inicio,
      fim: criado.agendamento.fim,
      tipo: criado.agendamento.tipo,
      servicoId: criado.servicoId,
      aguardandoValidacao: criado.aguardandoValidacao,
      avisoGoogle: criado.agendamento.googleSyncErro ?? null,
      googleMeetLink: criado.agendamento.googleMeetLink ?? null,
    },
    201,
  );
}
