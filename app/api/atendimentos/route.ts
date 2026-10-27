import { connection } from "next/server";
import { listarAtendimentos } from "@/lib/atendimento";
import { processarPedidoJuridico } from "@/lib/envio-validacao";
import { jsonSemCache } from "@/lib/http";
import { negarSemPainelAssessoria } from "@/lib/rbac/autorizacao";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemPainelAssessoria(request);
  if (negado) return negado;
  return jsonSemCache({ atendimentos: await listarAtendimentos() });
}

export async function POST(request: Request) {
  await connection();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonSemCache({ erro: "Envie o formulário com os documentos." }, 400);
  }
  const criado = await processarPedidoJuridico(form);
  if (!criado.ok) return jsonSemCache({ erro: criado.erro }, criado.status);
  return jsonSemCache({ id: criado.id, aguardandoValidacao: true }, 201);
}
