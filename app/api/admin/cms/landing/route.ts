import { connection } from "next/server";
import { lerLandingCms, salvarLandingCms } from "@/lib/cms/landing";
import type { LandingCms } from "@/lib/cms/landing-model";
import { normalizarLandingCmsParaSalvar, validarLandingCms } from "@/lib/cms/validar-landing";
import { negarSemAdmin } from "@/lib/rbac/autorizacao";
import { jsonSemCache } from "@/lib/http";

export async function GET(request: Request) {
  await connection();
  const negado = negarSemAdmin(request);
  if (negado) return negado;
  return jsonSemCache(await lerLandingCms());
}

export async function PUT(request: Request) {
  await connection();
  const negado = negarSemAdmin(request);
  if (negado) return negado;
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return jsonSemCache({ erro: "JSON inválido." }, 400);
  }
  const falha = validarLandingCms(corpo as LandingCms);
  if (falha) {
    console.error("[cms/landing] PUT validação:", falha);
    return jsonSemCache({ erro: falha, codigo: "VALIDATION" }, 400);
  }
  let normalizado: LandingCms;
  try {
    normalizado = normalizarLandingCmsParaSalvar(corpo as LandingCms);
    const salvo = await salvarLandingCms(normalizado);
    return jsonSemCache(salvo);
  } catch (erro) {
    console.error("[cms/landing] PUT gravação:", erro);
    return jsonSemCache({ erro: "Não foi possível gravar landing.json no servidor.", codigo: "IO" }, 500);
  }
}
