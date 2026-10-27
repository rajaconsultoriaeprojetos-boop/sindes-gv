import { connection } from "next/server";
import { definirSenhaPorConvite } from "@/lib/usuarios";
import { jsonSemCache } from "@/lib/http";
import { cookieSessaoUsuario, emitirTokenUsuario } from "@/lib/rbac/sessao-usuario";
import { redirecionarPosLogin } from "@/lib/rbac/roles";

export async function POST(request: Request) {
  await connection();
  let corpo: { token?: unknown; senha?: unknown };
  try {
    corpo = (await request.json()) as { token?: unknown; senha?: unknown };
  } catch {
    return jsonSemCache({ erro: "Dados inválidos." }, 400);
  }
  const token = typeof corpo.token === "string" ? corpo.token : "";
  const senha = typeof corpo.senha === "string" ? corpo.senha : "";
  if (!token || !senha) return jsonSemCache({ erro: "Informe token e senha." }, 400);

  const resultado = await definirSenhaPorConvite(token, senha);
  if (!resultado.ok) return jsonSemCache({ erro: resultado.erro }, 400);

  const jwt = emitirTokenUsuario({
    sub: resultado.usuario.id,
    email: resultado.usuario.email,
    role: resultado.usuario.role,
  });
  const resposta = jsonSemCache({
    ok: true,
    redirect: redirecionarPosLogin(resultado.usuario.role),
  });
  resposta.cookies.set(cookieSessaoUsuario(jwt, new URL(request.url).protocol === "https:"));
  return resposta;
}
