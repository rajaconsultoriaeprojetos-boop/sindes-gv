import { connection } from "next/server";
import { processarPedidoVoucher } from "@/lib/envio-validacao";
import { jsonSemCache } from "@/lib/http";

export async function POST(request: Request) {
  await connection();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonSemCache({ erro: "Envie o formulário com os documentos." }, 400);
  }
  const criado = await processarPedidoVoucher(form);
  if (!criado.ok) return jsonSemCache({ erro: criado.erro }, criado.status);
  return jsonSemCache({ id: criado.id, aguardandoValidacao: true }, 201);
}
