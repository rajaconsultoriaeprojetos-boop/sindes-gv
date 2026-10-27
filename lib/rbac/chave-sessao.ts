export const COOKIE_USUARIO = "sindes_usuario";
export const SESSAO_USUARIO_SEGUNDOS = 8 * 60 * 60;

/** Chave HMAC da sessão RBAC (Edge e Node). */
export function chaveSessaoRbac() {
  const explicita = (process.env.RBAC_SESSION_SECRET ?? "").trim();
  if (explicita) return explicita;
  const legado = (process.env.ADMIN_CODIGO ?? "").trim();
  if (legado) return `rbac:${legado}`;
  return "dev-only-rbac-secret-change-me";
}
