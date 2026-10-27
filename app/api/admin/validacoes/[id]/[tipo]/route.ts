import { connection } from "next/server";
import { mimeSalvo } from "@/lib/documento-arquivo";
import { jsonSemCache, negarSemSessao } from "@/lib/http";
import { lerArquivoValidacao, lerValidacao } from "@/lib/validacao-trabalhador";

type Contexto = { params: Promise<{ id: string; tipo: string }> };

export async function GET(request: Request, contexto: Contexto) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  const { id, tipo } = await contexto.params;
  if (tipo !== "contracheque" && tipo !== "documento") {
    return jsonSemCache({ erro: "Arquivo inválido." }, 400);
  }
  const registro = await lerValidacao(id);
  if (!registro || registro.tipo !== "voucher") {
    return jsonSemCache({ erro: "Não encontramos este pedido." }, 404);
  }
  const arquivo = await lerArquivoValidacao(id, tipo);
  if (!arquivo) return jsonSemCache({ erro: "Não encontramos este arquivo." }, 404);
  return new Response(new Uint8Array(arquivo.bytes), {
    status: 200,
    headers: {
      "Content-Type": mimeSalvo(arquivo.tipo),
      "Cache-Control": "no-store",
    },
  });
}
