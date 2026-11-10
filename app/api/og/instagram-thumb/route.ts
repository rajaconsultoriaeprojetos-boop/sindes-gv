import { NextResponse } from "next/server";
import {
  extrairImagemOgDoHtml,
  INSTAGRAM_FETCH_USER_AGENT,
  validarParamInstagramThumb,
} from "@/lib/instagram-og";

export async function GET(request: Request) {
  const urlParam = new URL(request.url).searchParams.get("url") ?? "";
  const validado = validarParamInstagramThumb(urlParam);
  if (!validado.ok) {
    return NextResponse.json({ erro: validado.erro, thumbnail_url: null }, { status: 400 });
  }

  try {
    const res = await fetch(validado.permalink, {
      headers: {
        "User-Agent": INSTAGRAM_FETCH_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { thumbnail_url: null, erro: "Não foi possível carregar a página do Instagram." },
        { status: 502 },
      );
    }
    const html = await res.text();
    const thumbnail_url = extrairImagemOgDoHtml(html);
    return NextResponse.json({ thumbnail_url, permalink: validado.permalink });
  } catch {
    return NextResponse.json(
      { thumbnail_url: null, erro: "Falha ao buscar miniatura." },
      { status: 502 },
    );
  }
}
