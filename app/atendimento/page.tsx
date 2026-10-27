import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Atendimento jurídico online — SINDES",
  description: "O atendimento jurídico do SINDES começa no portal do trabalhador.",
};

export default function PaginaAtendimento() {
  return (
    <main className="min-h-dvh bg-[#F8FAFC] text-[#1D0D2C]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <img src="/sindes-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            SINDES
          </Link>
          <Link
            href="/"
            className="rounded-md text-sm font-medium text-[#5D25AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
          >
            Voltar ao início
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5D25AA]">Atendimento jurídico</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">O atendimento começa no portal</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Abra o portal, informe nome, CPF e o assunto, e aceite guardar esses dados neste servidor para esta consulta. A sala, as notas e o chat usam o registro criado ali.
        </p>
        <Link
          href="/portal"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D0D2C] focus-visible:ring-offset-2"
        >
          Ir ao portal do trabalhador
        </Link>
      </div>
    </main>
  );
}
