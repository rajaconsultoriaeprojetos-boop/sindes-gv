import { connection } from "next/server";
import { salvarParceiro } from "@/lib/convenios";
import { jsonSemCache, negarSemSessao } from "@/lib/http";

export async function POST(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return jsonSemCache({ erro: "Informe o convênio." }, 400);
  }
  const salvo = await salvarParceiro(corpo);
  if (!salvo.ok) return jsonSemCache({ erro: salvo.erro }, 400);
  return jsonSemCache(salvo.parceiro, 201);
}
