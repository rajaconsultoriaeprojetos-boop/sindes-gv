import { connection } from "next/server";
import { emitirVoucher } from "@/lib/convenios";
import { jsonSemCache, negarSemSessao } from "@/lib/http";
import { sessaoUsuarioDoPedido } from "@/lib/rbac/sessao-usuario";

export async function POST(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  let corpo: unknown = null;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }
  const usuario = sessaoUsuarioDoPedido(request);
  const emitido = await emitirVoucher(corpo, {
    issuedByEmail: usuario?.email ?? "admin-legado",
  });
  if (!emitido.ok) return jsonSemCache({ erro: emitido.erro }, emitido.status);
  return jsonSemCache(emitido.voucher, 201);
}
