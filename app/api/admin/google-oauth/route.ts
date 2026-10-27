import { connection } from "next/server";
import { concluirOAuthCalendarCallback, iniciarFluxoOAuthCalendar, statusOAuthCalendarAdmin } from "@/lib/google-oauth-flow";
import { jsonSemCache, negarSemSessao } from "@/lib/http";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  return jsonSemCache(await statusOAuthCalendarAdmin());
}

export async function POST(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  const resultado = iniciarFluxoOAuthCalendar(request);
  if ("erro" in resultado) {
    return jsonSemCache({ erro: resultado.erro }, resultado.status);
  }
  return resultado.resposta;
}

export async function handleOAuthCallback(request: Request) {
  await connection();
  return concluirOAuthCalendarCallback(request);
}
