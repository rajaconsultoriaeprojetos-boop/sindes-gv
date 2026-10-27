export type PapelUsuario = "superadmin" | "admin" | "juridico" | "contador";

export const PAPEIS: PapelUsuario[] = ["superadmin", "admin", "juridico", "contador"];

export function papelValido(valor: string): valor is PapelUsuario {
  return PAPEIS.includes(valor as PapelUsuario);
}

export function emailNormalizado(email: string) {
  return email.trim().toLowerCase();
}

export function podeAtribuirPapel(atribuidor: PapelUsuario, alvo: PapelUsuario) {
  if (alvo === "superadmin") return false;
  if (atribuidor === "superadmin") return true;
  if (atribuidor === "admin") return alvo === "juridico" || alvo === "contador";
  return false;
}

export function papelInclui(atual: PapelUsuario, permitidos: PapelUsuario[]) {
  return permitidos.includes(atual);
}

/** Hierarquia operacional: superadmin herda tudo de admin. */
export function papelEfetivoParaRota(papel: PapelUsuario, rota: PapelUsuario) {
  if (papel === "superadmin") return true;
  if (papel === rota) return true;
  if (rota === "admin" && papel === "admin") return true;
  return false;
}

export function redirecionarPosLogin(papel: PapelUsuario) {
  if (papel === "juridico") return "/juridico";
  if (papel === "contador") return "/contador";
  return "/admin";
}
