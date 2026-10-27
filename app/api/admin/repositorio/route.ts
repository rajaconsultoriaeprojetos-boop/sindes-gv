import { connection } from "next/server";
import { jsonSemCache, negarSemSessao } from "@/lib/http";
import { listarRepositorio } from "@/lib/validacao-trabalhador";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  return jsonSemCache({ itens: await listarRepositorio() });
}
