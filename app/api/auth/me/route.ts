import { connection } from "next/server";
import { contextoAuth } from "@/lib/rbac/autorizacao";
import { jsonSemCache } from "@/lib/http";
import { sessaoUsuarioDoPedido } from "@/lib/rbac/sessao-usuario";

export async function GET(request: Request) {
  await connection();
  const ctx = contextoAuth(request);
  const usuario = sessaoUsuarioDoPedido(request);
  if (usuario) {
    return jsonSemCache({
      autenticado: true,
      email: usuario.email,
      role: usuario.role,
      legado: false,
    });
  }
  if (ctx?.tipo === "legado") {
    return jsonSemCache({
      autenticado: true,
      email: "",
      role: ctx.papel === "assessoria" ? "admin" : "admin",
      legado: true,
    });
  }
  return jsonSemCache({ autenticado: false }, 401);
}
