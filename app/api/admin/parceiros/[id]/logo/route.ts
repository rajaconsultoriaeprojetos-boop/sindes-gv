import { connection } from "next/server";
import { gravarLogo } from "@/lib/convenios";
import { jsonSemCache, negarSemSessao } from "@/lib/http";

type Contexto = { params: Promise<{ id: string }> };

export async function POST(request: Request, contexto: Contexto) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  const { id } = await contexto.params;
  let arquivo: File | null = null;
  try {
    const formulario = await request.formData();
    const campo = formulario.get("logo");
    arquivo = campo instanceof File ? campo : null;
  } catch {
    arquivo = null;
  }
  if (!arquivo) return jsonSemCache({ erro: "Envie um PNG ou JPG de até 1 MB." }, 400);
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  try {
    const salvo = await gravarLogo(id, bytes);
    if (!salvo.ok) return jsonSemCache({ erro: salvo.erro }, 400);
    return jsonSemCache(salvo.parceiro);
  } finally {
    bytes.fill(0);
  }
}
