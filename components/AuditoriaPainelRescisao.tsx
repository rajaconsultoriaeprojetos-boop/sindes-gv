"use client";

import {
  auditarRescisao,
  textoAlerta,
  textoDiferenca,
  textoDinheiro,
  type LinhaAuditoria,
  type ResultadoParaAuditoria,
} from "@/lib/auditoria";
import type { VerbasPagasEmpregador } from "@/lib/trct";

function SeloAuditoria({ status }: { status: LinhaAuditoria["status"] }) {
  if (status === "exato") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#FCB065] px-2.5 py-1 text-xs font-semibold text-[#1D0D2C]">
        valor exato
      </span>
    );
  }
  if (status === "favoravel") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#FCB065] px-2.5 py-1 text-xs font-semibold text-[#1D0D2C]">
        favorável ao trabalhador
      </span>
    );
  }
  if (status === "naoLido") {
    return <span className="text-sm font-medium text-slate-600">não lido</span>;
  }
  return <span className="text-sm font-semibold text-red-900">a menos</span>;
}

function valorEmpresa(linha: LinhaAuditoria) {
  if (linha.empresaCentavos === null) return "não lido";
  return textoDinheiro(linha.empresaCentavos);
}

function valorDiferenca(linha: LinhaAuditoria) {
  if (linha.diferencaCentavos === null) return "não lido";
  const texto = textoDiferenca(linha.diferencaCentavos);
  return linha.status === "divergente" ? `${texto} a menos` : texto;
}

export default function AuditoriaPainel({
  verbas,
  resultado,
}: {
  verbas: VerbasPagasEmpregador;
  resultado: ResultadoParaAuditoria;
}) {
  const auditoria = auditarRescisao(verbas, resultado);
  return (
    <section aria-labelledby="titulo-auditoria" className="space-y-4">
      <h2 id="titulo-auditoria" className="text-lg font-semibold">
        Auditoria do TRCT
      </h2>
      {auditoria.alerta && auditoria.faltaCentavos !== null ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-base font-semibold leading-7 text-red-950"
        >
          {textoAlerta(auditoria.faltaCentavos)}
        </p>
      ) : null}
      <div className="space-y-3 md:hidden">
        {auditoria.linhas.map((linha) => (
          <article key={linha.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">{linha.verba}</h3>
              <SeloAuditoria status={linha.status} />
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-600">Valor no TRCT da empresa</dt>
                <dd className="text-right font-semibold whitespace-nowrap tabular-nums">{valorEmpresa(linha)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-600">Valor correto SINDES</dt>
                <dd className="text-right font-semibold whitespace-nowrap tabular-nums">{textoDinheiro(linha.sindesCentavos)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-600">Diferença</dt>
                <dd className="text-right font-semibold whitespace-nowrap tabular-nums">{valorDiferenca(linha)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">Comparação entre o TRCT da empresa e o cálculo SINDES</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th scope="col" className="px-4 py-3 font-semibold">
                Verba
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Valor no TRCT da empresa
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Valor correto SINDES
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Diferença
              </th>
            </tr>
          </thead>
          <tbody>
            {auditoria.linhas.map((linha) => (
              <tr key={linha.id} className="border-b border-slate-100 align-top">
                <th scope="row" className="px-4 py-4 text-left font-medium">
                  <span className="block text-base">{linha.verba}</span>
                  <span className="mt-2 inline-flex">
                    <SeloAuditoria status={linha.status} />
                  </span>
                </th>
                <td className="px-4 py-4 text-right font-semibold whitespace-nowrap tabular-nums">{valorEmpresa(linha)}</td>
                <td className="px-4 py-4 text-right font-semibold whitespace-nowrap tabular-nums">{textoDinheiro(linha.sindesCentavos)}</td>
                <td className="px-4 py-4 text-right font-semibold whitespace-nowrap tabular-nums">{valorDiferenca(linha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
