import { connection } from "next/server";
import { alterarVoucher } from "@/lib/convenios";
import { jsonSemCache, negarSemSessao } from "@/lib/http";

type Contexto = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, contexto: Contexto) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  const { code } = await contexto.params;
  let corpo: unknown = null;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }
  const alterado = await alterarVoucher(code, corpo);
  if (!alterado.ok) return jsonSemCache({ erro: alterado.erro }, alterado.status);
  return jsonSemCache(alterado.voucher);
}
