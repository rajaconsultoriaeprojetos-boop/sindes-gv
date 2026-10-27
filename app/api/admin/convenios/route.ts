import { connection } from "next/server";
import { painelAdmin } from "@/lib/convenios";
import { jsonSemCache, negarSemSessao } from "@/lib/http";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  return jsonSemCache(await painelAdmin());
}
