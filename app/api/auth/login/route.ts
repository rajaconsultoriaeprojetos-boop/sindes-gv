import { connection } from "next/server";
import { autenticarEmailSenha } from "@/lib/usuarios";
import { jsonSemCache } from "@/lib/http";
import { emitirTokenUsuario, cookieSessaoUsuario } from "@/lib/rbac/sessao-usuario";
import { redirecionarPosLogin } from "@/lib/rbac/roles";

export async function POST(request: Request) {
  await connection();
  let corpo: { email?: unknown; senha?: unknown };
  try {
    corpo = (await request.json()) as { email?: unknown; senha?: unknown };
  } catch {
    return jsonSemCache({ erro: "Envie e-mail e senha." }, 400);
  }
  const email = typeof corpo.email === "string" ? corpo.email : "";
  const senha = typeof corpo.senha === "string" ? corpo.senha : "";
  if (!email || !senha) return jsonSemCache({ erro: "Informe e-mail e senha." }, 400);

  const resultado = await autenticarEmailSenha(email, senha);
  if (!resultado.ok) return jsonSemCache({ erro: resultado.erro }, 401);

  const token = emitirTokenUsuario({
    sub: resultado.usuario.id,
    email: resultado.usuario.email,
    role: resultado.usuario.role,
  });
  const resposta = jsonSemCache({
    ok: true,
    usuario: {
      email: resultado.usuario.email,
      role: resultado.usuario.role,
    },
    redirect: redirecionarPosLogin(resultado.usuario.role),
  });
  resposta.cookies.set(cookieSessaoUsuario(token, new URL(request.url).protocol === "https:"));
  return resposta;
}
