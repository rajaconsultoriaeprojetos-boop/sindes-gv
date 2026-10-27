import { connection } from "next/server";
import { lerVoucherPublico } from "@/lib/convenios";
import { jsonSemCache } from "@/lib/http";

type Contexto = { params: Promise<{ code: string }> };

export async function GET(_request: Request, contexto: Contexto) {
  await connection();
  const { code } = await contexto.params;
  const cartao = await lerVoucherPublico(code);
  if (!cartao) return jsonSemCache({ erro: "Não encontramos este voucher." }, 404);
  return jsonSemCache(cartao);
}
