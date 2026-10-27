"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
type Cartao = {
  code: string;
  partnerName: string;
  categoryLabel: string;
  discountPercent: number;
  benefit: string;
  logoUrl: string | null;
  firstName: string;
  cpfMascarado: string;
  validUntil: string;
  situacao: "valido" | "utilizado" | "cancelado" | "expirado";
};

const TEXTO: Record<Cartao["situacao"], string> = {
  valido: "Mostre este cartão no balcão.",
  utilizado: "Este voucher já foi utilizado.",
  cancelado: "Este voucher foi cancelado.",
  expirado: "Este voucher venceu.",
};

function dataCurta(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(data);
}

export default function CartaoVoucher({ code }: { code: string }) {
  const [cartao, setCartao] = useState<Cartao | null>(null);
  const [fase, setFase] = useState<"carregando" | "pronto" | "ausente">("carregando");

  useEffect(() => {
    let vivo = true;
    void fetch(`/api/voucher/${code}`)
      .then(async (resposta) => {
        if (!vivo) return;
        if (!resposta.ok) {
          setFase("ausente");
          return;
        }
        setCartao((await resposta.json()) as Cartao);
        setFase("pronto");
      })
      .catch(() => {
        if (vivo) setFase("ausente");
      });
    return () => {
      vivo = false;
    };
  }, [code]);

  if (fase !== "pronto" || !cartao) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm items-center px-4">
        <p className="text-base">{fase === "carregando" ? "Carregando o cartão..." : "Não encontramos este voucher."}</p>
      </main>
    );
  }

  const pronto = cartao.situacao === "valido";

  return (
    <main className="min-h-dvh bg-[#F8FAFC] px-4 py-8 text-[#1D0D2C]">
      <article
        className={`mx-auto w-full max-w-sm rounded-3xl border bg-white p-6 shadow-lg ${pronto ? "border-[#FCB065]" : "border-slate-300"}`}
      >
        <div className="flex items-center gap-3">
          {cartao.logoUrl ? (
            <img src={cartao.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <img src="/sindes-logo.png" alt="" width={64} height={64} className="h-16 w-16 rounded-2xl bg-white object-contain" />
          )}
          <div>
            <p className="text-sm text-slate-600">{cartao.categoryLabel}</p>
            <h1 className="text-xl font-semibold text-balance">{cartao.partnerName}</h1>
          </div>
        </div>
        <p className={`mt-6 text-5xl font-semibold tracking-tight ${pronto ? "text-[#5D25AA]" : "text-slate-400"}`}>
          {cartao.discountPercent}%
        </p>
        <p className="text-lg font-semibold">{pronto ? "de desconto" : TEXTO[cartao.situacao]}</p>
        <p className="mt-4 text-base leading-7">{cartao.benefit}</p>
        <dl className="mt-6 space-y-2 text-base">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Trabalhador</dt>
            <dd className="font-semibold">{cartao.firstName}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">CPF</dt>
            <dd className="font-semibold">{cartao.cpfMascarado}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Código</dt>
            <dd className="font-mono text-sm font-semibold">{cartao.code}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Validade</dt>
            <dd className="font-semibold">{dataCurta(cartao.validUntil)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Status</dt>
            <dd className="font-semibold">{cartao.situacao}</dd>
          </div>
        </dl>
        <p className={`mt-6 rounded-xl px-3 py-3 text-center text-base font-semibold ${pronto ? "bg-[#FCB065] text-[#1D0D2C]" : "bg-slate-100 text-slate-600"}`}>
          {TEXTO[cartao.situacao]}
        </p>
      </article>
      <p className="mx-auto mt-6 max-w-sm text-center">
        <Link href="/convenios" className="text-sm font-semibold text-[#5D25AA]">
          Voltar aos convênios
        </Link>
      </p>
    </main>
  );
}
