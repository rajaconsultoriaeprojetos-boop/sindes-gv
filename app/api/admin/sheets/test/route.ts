import { connection } from "next/server";
import { testarConexaoGoogle } from "@/lib/google-sheets-sync";
import { jsonSemCache, negarSemSessao } from "@/lib/http";

export async function POST(request: Request) {
  await connection();
  const negado = negarSemSessao(request, "admin");
  if (negado) return negado;
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    corpo = null;
  }
  const spreadsheetId =
    corpo && typeof corpo === "object" && typeof (corpo as { spreadsheetId?: unknown }).spreadsheetId === "string"
      ? (corpo as { spreadsheetId: string }).spreadsheetId
      : undefined;
  const resultado = await testarConexaoGoogle(spreadsheetId);
  if (!resultado.ok) return jsonSemCache({ erro: resultado.erro }, 400);
  return jsonSemCache({ ok: true });
}
