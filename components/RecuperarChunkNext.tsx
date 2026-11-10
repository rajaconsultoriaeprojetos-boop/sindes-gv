"use client";

import { useEffect } from "react";

const FLAG = "sindes:chunk-reload:v1";

function pareceErroChunk(mensagem: string): boolean {
  const m = mensagem.toLowerCase();
  return m.includes("loading chunk") || m.includes("chunkloaderror");
}

export default function RecuperarChunkNext() {
  useEffect(() => {
    function recarregarUmaVez() {
      try {
        if (sessionStorage.getItem(FLAG)) return;
        sessionStorage.setItem(FLAG, "1");
      } catch {
        /* modo privado */
      }
      window.location.reload();
    }

    function onError(event: ErrorEvent) {
      const msg = event.message || String(event.error ?? "");
      if (pareceErroChunk(msg)) recarregarUmaVez();
    }

    function onRejection(event: PromiseRejectionEvent) {
      const msg =
        event.reason instanceof Error ? event.reason.message : String(event.reason ?? "");
      if (pareceErroChunk(msg)) recarregarUmaVez();
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
