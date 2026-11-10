import { isPermalinkInstagram, normalizarPermalinkInstagram } from "./instagram-embed";

const META_OG_IMAGE = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
const META_OG_IMAGE_REV = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i;
const META_TW_IMAGE = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i;
const META_TW_IMAGE_REV = /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i;

export function extrairImagemOgDoHtml(html: string): string | null {
  const amostra = html.slice(0, 120_000);
  for (const re of [META_OG_IMAGE, META_OG_IMAGE_REV, META_TW_IMAGE, META_TW_IMAGE_REV]) {
    const m = amostra.match(re);
    if (m?.[1]?.trim()) return decodificarEntidadesMeta(m[1].trim());
  }
  return null;
}

function decodificarEntidadesMeta(valor: string): string {
  return valor
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export type ResultadoParamThumb =
  | { ok: true; permalink: string }
  | { ok: false; erro: string };

export function validarParamInstagramThumb(urlBruto: string): ResultadoParamThumb {
  const bruto = urlBruto.trim();
  if (!bruto) return { ok: false, erro: "Informe o parâmetro url." };
  const normalizado = isPermalinkInstagram(bruto) ? normalizarPermalinkInstagram(bruto) : bruto;
  if (!isPermalinkInstagram(normalizado)) {
    return { ok: false, erro: "URL deve ser um post ou reel público do Instagram." };
  }
  return { ok: true, permalink: normalizado };
}

export const INSTAGRAM_FETCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
