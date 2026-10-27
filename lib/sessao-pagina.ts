import { cookies } from "next/headers";
import { COOKIE_ADMIN, COOKIE_ASSESSORIA, codigoConfigurado, sessaoValida } from "@/lib/sessao";
import { COOKIE_USUARIO, lerTokenUsuario } from "@/lib/rbac/sessao-usuario";
import type { PapelUsuario } from "@/lib/rbac/roles";

async function sessaoUsuarioServidor() {
  const jar = await cookies();
  const token = jar.get(COOKIE_USUARIO)?.value;
  return lerTokenUsuario(token);
}

function legadoAdminOuAssessoria(jar: Awaited<ReturnType<typeof cookies>>) {
  if (codigoConfigurado("admin") && sessaoValida("admin", jar.get(COOKIE_ADMIN)?.value)) return true;
  if (codigoConfigurado("assessoria") && sessaoValida("assessoria", jar.get(COOKIE_ASSESSORIA)?.value)) {
    return true;
  }
  return false;
}

function temPapel(usuario: { role: PapelUsuario } | null, papeis: PapelUsuario[]) {
  if (!usuario) return false;
  if (usuario.role === "superadmin") return true;
  return papeis.includes(usuario.role);
}

/** @deprecated Prefer login unificado; mantido para APIs legadas. */
export async function assessoriaAutenticadaServidor() {
  const usuario = await sessaoUsuarioServidor();
  if (temPapel(usuario, ["admin", "contador"])) return true;
  const jar = await cookies();
  return legadoAdminOuAssessoria(jar);
}

export async function calculadoraAutenticadaServidor() {
  const usuario = await sessaoUsuarioServidor();
  if (temPapel(usuario, ["admin", "contador"])) return true;
  const jar = await cookies();
  return legadoAdminOuAssessoria(jar);
}

export async function adminAutenticadoServidor() {
  const usuario = await sessaoUsuarioServidor();
  if (temPapel(usuario, ["admin"])) return true;
  const jar = await cookies();
  if (codigoConfigurado("admin") && sessaoValida("admin", jar.get(COOKIE_ADMIN)?.value)) return true;
  return false;
}
