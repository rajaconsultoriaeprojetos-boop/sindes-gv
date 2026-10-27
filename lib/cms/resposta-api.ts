/** Mensagem legível para falhas de fetch no CMS (401/403/400/500). */
export async function mensagemErroRespostaApi(resposta: Response, fallback: string): Promise<string> {
  let corpo: { erro?: string } | null = null;
  try {
    corpo = (await resposta.json()) as { erro?: string };
  } catch {
    corpo = null;
  }
  const detalhe = corpo?.erro?.trim();
  const status = resposta.status;
  if (status === 401) {
    return detalhe
      ? `${detalhe} (401 — sessão expirada)`
      : "Sessão expirada (401). Entre de novo em /entrar e tente publicar.";
  }
  if (status === 403) {
    return detalhe
      ? `${detalhe} (403 — sem permissão de admin)`
      : "Sem permissão para publicar (403). Use conta admin (ex.: sindesoficial@gmail.com) em /entrar ou o código legado.";
  }
  if (status === 400 && detalhe) {
    return `${detalhe} (validação — HTTP 400)`;
  }
  if (detalhe) {
    return `${detalhe} (HTTP ${status})`;
  }
  if (status >= 500) {
    return `Erro no servidor (HTTP ${status}). Tente de novo em instantes.`;
  }
  return `${fallback} (HTTP ${status})`;
}
