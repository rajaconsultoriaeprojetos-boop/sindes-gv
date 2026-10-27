import { connection } from "next/server";
import { listarUsuarios } from "@/lib/usuarios";
import { hashSenha } from "@/lib/rbac/senha";
import { jsonSemCache } from "@/lib/http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Uso único: define senha do superadmin seed quando ainda não há nenhuma senha no sistema. */
export async function POST(request: Request) {
  await connection();
  const segredo = (process.env.RBAC_BOOTSTRAP_SECRET ?? "").trim();
  if (!segredo) {
    return jsonSemCache({ erro: "Bootstrap não configurado no servidor." }, 503);
  }
  let corpo: { secret?: unknown; email?: unknown; senha?: unknown };
  try {
    corpo = (await request.json()) as { secret?: unknown; email?: unknown; senha?: unknown };
  } catch {
    return jsonSemCache({ erro: "JSON inválido." }, 400);
  }
  if (corpo.secret !== segredo) return jsonSemCache({ erro: "Secret inválido." }, 403);
  const email = typeof corpo.email === "string" ? corpo.email.trim().toLowerCase() : "";
  const senha = typeof corpo.senha === "string" ? corpo.senha : "";
  if (!email || senha.length < 8) return jsonSemCache({ erro: "Informe e-mail e senha (8+)." }, 400);

  const lista = await listarUsuarios();
  if (lista.some((u) => u.passwordHash)) {
    return jsonSemCache({ erro: "Bootstrap já foi usado." }, 403);
  }

  const alvo = lista.find((u) => u.email === email);
  if (!alvo) return jsonSemCache({ erro: "E-mail não encontrado nos seeds." }, 404);

  const arquivo = path.join(process.cwd(), "data", "usuarios.json");
  const bruto = await readFile(arquivo, "utf8");
  const usuarios = JSON.parse(bruto) as Array<{ id: string; passwordHash?: string; status: string; inviteToken?: string }>;
  const indice = usuarios.findIndex((u) => u.id === alvo.id);
  if (indice < 0) return jsonSemCache({ erro: "Usuário não encontrado." }, 404);
  usuarios[indice].passwordHash = await hashSenha(senha);
  usuarios[indice].status = "ativo";
  usuarios[indice].inviteToken = undefined;
  await writeFile(arquivo, `${JSON.stringify(usuarios, null, 2)}\n`, "utf8");

  return jsonSemCache({ ok: true, mensagem: "Senha definida. Use /entrar." });
}
