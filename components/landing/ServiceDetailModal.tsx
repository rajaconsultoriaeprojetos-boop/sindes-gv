"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { btnPrimary } from "./plantao-theme";

type Props = {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  hrefAcao?: string;
  rotuloAcao?: string;
};

export default function ServiceDetailModal({
  aberto,
  titulo,
  onFechar,
  children,
  hrefAcao,
  rotuloAcao = "Acessar",
}: Props) {
  useEffect(() => {
    if (!aberto) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onFechar();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-servico-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0E3A43]/50 backdrop-blur-sm"
        aria-label="Fechar"
        onClick={onFechar}
      />
      <div className="relative max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/40 bg-[#F7FAF9]/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-servico-titulo" className="text-xl font-semibold text-[#0E3A43]">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(14,58,67,0.15)] bg-white/80 transition hover:bg-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Fechar</span>
          </button>
        </div>
        <div className="mt-4 text-sm leading-7 text-[#0E3A43]/80">{children}</div>
        {hrefAcao ? (
          <a href={hrefAcao} className={`${btnPrimary} mt-6 w-full`} onClick={onFechar}>
            {rotuloAcao}
          </a>
        ) : null}
      </div>
    </div>
  );
}
