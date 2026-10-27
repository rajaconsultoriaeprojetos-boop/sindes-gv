import { connection } from "next/server";
import { atualizarAtendimento, lerAtendimento } from "@/lib/atendimento";
import { buscarGoogleMeetPorServicoId } from "@/lib/agendamentos";
import { jsonSemCache } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, contexto: Contexto) {
  await connection();
  const { id } = await contexto.params;
  const registro = await lerAtendimento(id);
  if (!registro) return jsonSemCache({ erro: "Não encontramos este atendimento." }, 404);
  const googleMeetLink = await buscarGoogleMeetPorServicoId(id);
  return jsonSemCache({
    ...registro,
    ...(googleMeetLink ? { googleMeetLink } : {}),
  });
}

export async function PATCH(request: Request, contexto: Contexto) {
  await connection();
  const { id } = await contexto.params;
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return jsonSemCache({ erro: "Nada para guardar." }, 400);
  }
  const atualizado = await atualizarAtendimento(id, corpo);
  if (!atualizado.ok) return jsonSemCache({ erro: atualizado.erro }, atualizado.status);
  return jsonSemCache(atualizado.registro);
}
