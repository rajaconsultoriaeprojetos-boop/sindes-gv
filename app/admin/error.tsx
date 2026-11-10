"use client";

import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: Props) {
  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center gap-4 px-4 py-12 text-[#0E3A43]">
      <h1 className="text-2xl font-semibold">Não foi possível carregar o painel administrativo</h1>
      <p className="text-sm leading-relaxed text-[#0E3A43]/80">
        Algo falhou ao abrir esta página. Isso pode acontecer após uma atualização do site ou por um rascunho antigo
        salvo neste navegador. Tente recarregar; se o problema continuar, entre novamente.
      </p>
      {error?.message ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-900">
          {error.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-xl bg-[#1F8A70] px-4 py-2.5 text-sm font-semibold text-white"
          onClick={() => window.location.reload()}
        >
          Recarregar página
        </button>
        <button
          type="button"
          className="rounded-xl border border-[rgba(14,58,67,0.2)] bg-white px-4 py-2.5 text-sm font-semibold"
          onClick={() => reset()}
        >
          Tentar de novo
        </button>
        <Link href="/entrar" className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#1F8A70] underline">
          Voltar para /entrar
        </Link>
      </div>
    </main>
  );
}
