/** Client-side: encerra sessão RBAC e cookies legados via API. */
export async function encerrarSessao() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
}
