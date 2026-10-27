import { connection } from "next/server";
import { abrirSessao } from "@/lib/http";

export async function POST(request: Request) {
  await connection();
  return abrirSessao(request, "assessoria");
}
