"use client";

import { useEffect, useMemo } from "react";
import ConfirmarBadge from "@/components/landing/ConfirmarBadge";
import {
  classificarUrlVideoDestaque,
  normalizarPermalinkInstagram,
} from "@/lib/instagram-embed";
import { glassCard } from "@/components/landing/plantao-theme";

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
  }
}

type Props = {
  url: string;
  titulo?: string;
  data?: string;
  legenda?: string;
  confirmar?: boolean;
};

function carregarInstagramEmbed() {
  if (typeof window === "undefined") return;
  if (window.instgrm?.Embeds?.process) {
    window.instgrm.Embeds.process();
    return;
  }
  const jaExiste = document.querySelector('script[src="https://www.instagram.com/embed.js"]');
  if (jaExiste) return;
  const script = document.createElement("script");
  script.src = "https://www.instagram.com/embed.js";
  script.async = true;
  script.onload = () => window.instgrm?.Embeds?.process();
  document.body.appendChild(script);
}

export default function VideoDestaqueEmbed({ url, titulo, data, legenda, confirmar }: Props) {
  const tipo = classificarUrlVideoDestaque(url);
  const permalink = useMemo(
    () => (tipo === "instagram" ? normalizarPermalinkInstagram(url) : ""),
    [tipo, url],
  );

  useEffect(() => {
    if (tipo !== "instagram") return;
    carregarInstagramEmbed();
  }, [tipo, permalink]);

  if (!tipo) return null;

  return (
    <article className={`${glassCard} mt-8 overflow-hidden p-4 sm:p-6`}>
      {(titulo?.trim() || data?.trim() || confirmar) && (
        <header className="mb-4 flex flex-wrap items-center gap-2">
          {data?.trim() ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F8A70]">
              Vídeo do dia · {data.trim()}
            </p>
          ) : (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F8A70]">Vídeo do dia</p>
          )}
          {titulo?.trim() ? <h3 className="w-full text-lg font-semibold text-[#0E3A43]">{titulo.trim()}</h3> : null}
          {confirmar ? <ConfirmarBadge /> : null}
        </header>
      )}
      <div className="mx-auto max-w-md">
        {tipo === "instagram" ? (
          <blockquote
            className="instagram-media"
            data-instgrm-captioned
            data-instgrm-permalink={permalink}
            data-instgrm-version="14"
            style={{
              background: "#FFF",
              border: 0,
              borderRadius: 3,
              boxShadow: "0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)",
              margin: 1,
              maxWidth: 540,
              minWidth: 326,
              padding: 0,
              width: "calc(100% - 2px)",
            }}
          />
        ) : (
          <video
            className="w-full rounded-xl bg-black"
            src={url.trim()}
            controls
            playsInline
            preload="metadata"
          />
        )}
      </div>
      {legenda?.trim() ? (
        <p className="mt-4 text-base leading-7 text-[#0E3A43]/75 sm:text-lg">{legenda.trim()}</p>
      ) : null}
    </article>
  );
}
