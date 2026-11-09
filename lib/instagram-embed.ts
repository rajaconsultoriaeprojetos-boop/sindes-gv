/** Normaliza permalink do Instagram (ex.: /reels/ → /reel/). */
export function normalizarPermalinkInstagram(url: string): string {
  const t = url.trim();
  if (!t) return "";
  try {
    const u = new URL(t);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "instagram.com") return t;
    let pathname = u.pathname;
    pathname = pathname.replace(/\/reels\//gi, "/reel/");
    if (!pathname.endsWith("/")) pathname += "/";
    u.pathname = pathname;
    u.hash = "";
    return u.toString();
  } catch {
    return t;
  }
}

const INSTAGRAM_PATH =
  /^\/(?:reel|p|tv)\/[A-Za-z0-9_-]+\/?$/i;

export function isPermalinkInstagram(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "instagram.com") return false;
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const path = u.pathname.replace(/\/reels\//gi, "/reel/");
    return INSTAGRAM_PATH.test(path);
  } catch {
    return false;
  }
}

export function isUrlMp4Https(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return false;
    const path = u.pathname.toLowerCase();
    return path.endsWith(".mp4") || /\.mp4(?:\?|$)/i.test(u.pathname + u.search);
  } catch {
    return false;
  }
}

export type TipoMidiaVideoDestaque = "instagram" | "mp4";

export function classificarUrlVideoDestaque(url: string): TipoMidiaVideoDestaque | null {
  const bruto = url.trim();
  if (!bruto) return null;
  const normalizado = isPermalinkInstagram(bruto) ? normalizarPermalinkInstagram(bruto) : bruto;
  if (isPermalinkInstagram(normalizado) || isPermalinkInstagram(bruto)) return "instagram";
  if (isUrlMp4Https(bruto)) return "mp4";
  return null;
}

export function urlVideoDestaqueValida(url: string): boolean {
  return classificarUrlVideoDestaque(url) !== null;
}
