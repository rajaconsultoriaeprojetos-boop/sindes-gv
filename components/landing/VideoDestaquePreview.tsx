"use client";

import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import ConfirmarBadge from "@/components/landing/ConfirmarBadge";
import InstagramIconGradient from "@/components/landing/InstagramIconGradient";
import { glassCard } from "@/components/landing/plantao-theme";
import {
  classificarUrlVideoDestaque,
  normalizarPermalinkInstagram,
} from "@/lib/instagram-embed";

type Props = {
  url: string;
  titulo?: string;
  data?: string;
  legenda?: string;
  confirmar?: boolean;
  /** Versão reduzida para o painel admin */
  compacto?: boolean;
};

function PlaceholderInstagram() {
  return (
    <div
      className="flex h-full min-h-[12rem] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#FEDA75] via-[#D62976] to-[#4F5BD5] p-6"
      aria-hidden
    >
      <InstagramIconGradient className="h-14 w-14 opacity-95" />
      <span className="text-sm font-semibold text-white drop-shadow">Reel / post no Instagram</span>
    </div>
  );
}

export default function VideoDestaquePreview({
  url,
  titulo,
  data,
  legenda,
  confirmar,
  compacto = false,
}: Props) {
  const tipo = classificarUrlVideoDestaque(url);
  const permalink = useMemo(
    () => (tipo === "instagram" ? normalizarPermalinkInstagram(url) : ""),
    [tipo, url],
  );
  const [thumb, setThumb] = useState<string | null>(null);
  const [thumbErro, setThumbErro] = useState(false);

  useEffect(() => {
    if (tipo !== "instagram" || !permalink) {
      setThumb(null);
      setThumbErro(false);
      return;
    }
    let cancelado = false;
    setThumb(null);
    setThumbErro(false);
    void (async () => {
      try {
        const res = await fetch(`/api/og/instagram-thumb?url=${encodeURIComponent(permalink)}`);
        const json = (await res.json()) as { thumbnail_url?: string | null };
        if (cancelado) return;
        if (json.thumbnail_url) setThumb(json.thumbnail_url);
        else setThumbErro(true);
      } catch {
        if (!cancelado) setThumbErro(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [tipo, permalink]);

  if (!tipo) return null;

  const cardClass = compacto
    ? "rounded-xl border border-[rgba(14,58,67,0.12)] bg-white/90 overflow-hidden"
    : `${glassCard} mt-8 overflow-hidden p-4 sm:p-6`;

  const linkInner = (
    <div className="group relative block overflow-hidden rounded-xl ring-1 ring-[rgba(14,58,67,0.08)]">
      <div className={`relative ${compacto ? "aspect-[4/5] max-h-56" : "aspect-[4/5] sm:aspect-[9/16] sm:max-h-[32rem]"}`}>
        {thumb && !thumbErro ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            onError={() => setThumbErro(true)}
          />
        ) : (
          <PlaceholderInstagram />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E3A43]/75 via-[#0E3A43]/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg ring-4 ring-white/40">
            <Play className="ml-1 h-8 w-8 fill-[#D62976] text-[#D62976]" aria-hidden />
          </span>
          <p className="text-center text-base font-semibold text-white drop-shadow-md sm:text-lg">
            Assistir no Instagram
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <article className={cardClass}>
      {(titulo?.trim() || data?.trim() || confirmar) && (
        <header className={`flex flex-wrap items-center gap-2 ${compacto ? "px-3 pt-3" : "mb-4"}`}>
          {data?.trim() ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F8A70]">
              Vídeo do dia · {data.trim()}
            </p>
          ) : (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1F8A70]">Vídeo do dia</p>
          )}
          {titulo?.trim() ? (
            <h3 className={`w-full font-semibold text-[#0E3A43] ${compacto ? "text-sm" : "text-lg"}`}>
              {titulo.trim()}
            </h3>
          ) : null}
          {confirmar ? <ConfirmarBadge /> : null}
        </header>
      )}
      <div className={compacto ? "p-3 pt-2" : "mx-auto max-w-md"}>
        {tipo === "instagram" ? (
          <a href={permalink} target="_blank" rel="noopener noreferrer" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F8A70]">
            {linkInner}
          </a>
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
        <p
          className={`text-[#0E3A43]/75 leading-7 ${compacto ? "px-3 pb-3 text-sm" : "mt-4 text-base sm:text-lg"}`}
        >
          {legenda.trim()}
        </p>
      ) : null}
    </article>
  );
}
