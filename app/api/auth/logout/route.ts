import { connection } from "next/server";
import { jsonSemCache } from "@/lib/http";
import { COOKIE_USUARIO } from "@/lib/rbac/sessao-usuario";
import { COOKIE_ADMIN, COOKIE_ASSESSORIA } from "@/lib/sessao";

function expirarCookie(resposta: ReturnType<typeof jsonSemCache>, request: Request, name: string) {
  resposta.cookies.set({
    name,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request: Request) {
  await connection();
  const resposta = jsonSemCache({ ok: true });
  expirarCookie(resposta, request, COOKIE_USUARIO);
  expirarCookie(resposta, request, COOKIE_ADMIN);
  expirarCookie(resposta, request, COOKIE_ASSESSORIA);
  return resposta;
}
