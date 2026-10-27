import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_USUARIO } from "@/lib/rbac/chave-sessao";
import { lerTokenUsuarioEdge } from "@/lib/rbac/sessao-edge";
import type { PapelUsuario } from "@/lib/rbac/roles";

type Regra = { prefixo: string; papeis: PapelUsuario[] };

const REGRAS: Regra[] = [
  { prefixo: "/admin/sistema", papeis: ["superadmin"] },
  { prefixo: "/admin", papeis: ["superadmin", "admin"] },
  { prefixo: "/assessoria", papeis: ["superadmin", "admin"] },
  { prefixo: "/juridico", papeis: ["superadmin", "admin", "juridico"] },
  { prefixo: "/contador", papeis: ["superadmin", "admin", "contador"] },
  { prefixo: "/calculadora", papeis: ["superadmin", "admin", "contador"] },
];

function papelPermitido(role: PapelUsuario, permitidos: PapelUsuario[]) {
  if (permitidos.includes(role)) return true;
  if (role === "superadmin") return true;
  return false;
}

function regraParaPath(pathname: string) {
  return REGRAS.find((r) => pathname === r.prefixo || pathname.startsWith(`${r.prefixo}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const regra = regraParaPath(pathname);
  if (!regra) return NextResponse.next();

  const token = request.cookies.get(COOKIE_USUARIO)?.value;
  const sessao = await lerTokenUsuarioEdge(token);
  if (sessao && papelPermitido(sessao.role, regra.papeis)) {
    return NextResponse.next();
  }

  const legadoAdmin = request.cookies.get("sindes_admin")?.value;
  const legadoAssessoria = request.cookies.get("sindes_assessoria")?.value;
  if (legadoAdmin || legadoAssessoria) {
    const equivalente: PapelUsuario = "admin";
    if (papelPermitido(equivalente, regra.papeis)) {
      return NextResponse.next();
    }
  }

  const entrar = new URL("/entrar", request.url);
  entrar.searchParams.set("depois", pathname);
  return NextResponse.redirect(entrar);
}

export const config = {
  matcher: ["/admin/:path*", "/assessoria/:path*", "/juridico/:path*", "/contador/:path*", "/calculadora/:path*"],
};
