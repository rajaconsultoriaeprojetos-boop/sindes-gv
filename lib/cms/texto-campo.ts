/** Resumo aceita texto longo colado (multilinha, emoji); limite generoso para o CMS. */
export const MAX_RESUMO_NOTICIA = 4000;
export const MAX_TITULO_NOTICIA = 200;
export const MAX_DATA_NOTICIA = 80;

export function asTextoCampo(valor: unknown): string {
  if (typeof valor === "string") return valor;
  if (valor == null) return "";
  return String(valor);
}

/** Remove só espaços nas bordas; mantém quebras de linha e emoji no meio. */
export function trimExternoTexto(valor: string) {
  return valor.trim();
}

export function textoObrigatorio(valor: string, max: number) {
  const t = trimExternoTexto(valor);
  return t.length >= 1 && t.length <= max;
}

export function mensagemTextoCampo(
  valor: unknown,
  max: number,
  rotulos: { vazio: string; longo: (max: number) => string },
): string | null {
  const t = trimExternoTexto(asTextoCampo(valor));
  if (t.length < 1) return rotulos.vazio;
  if (t.length > max) return rotulos.longo(max);
  return null;
}
