import { connection } from "next/server";
import { revisarPedidoValidacao } from "@/lib/envio-validacao";
import { jsonSemCache, negarSemSessao } from "@/lib/http";
import { listarValidacoes } from "@/lib/validacao-trabalhador";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  if (statusParam === "aprovado") {
    return jsonSemCache({ validacoes: await listarValidacoes("voucher", "aprovado") });
  }
  const pendentes = await listarValidacoes("voucher", "pendente");
  return jsonSemCache({ validacoes: pendentes });
}

export async function PATCH(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return jsonSemCache({ erro: "Informe a decisão." }, 400);
  }
  const campos = corpo as { id?: unknown; decisao?: unknown };
  if (typeof campos.id !== "string" || (campos.decisao !== "aprovar" && campos.decisao !== "recusar")) {
    return jsonSemCache({ erro: "Informe aprovar ou recusar." }, 400);
  }
  const resultado = await revisarPedidoValidacao("voucher", campos.id, campos.decisao);
  if (!resultado.ok) return jsonSemCache({ erro: resultado.erro }, resultado.status);
  return jsonSemCache({ ok: true, validacao: resultado.registro });
}
