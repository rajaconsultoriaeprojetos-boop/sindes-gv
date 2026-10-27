"use client";

import {
  contagemPorSeveridade,
  ordenarAchados,
  type AchadoConsistencia,
  type SeveridadeAchado,
} from "@/lib/consistencia-trct";
import { abrirRelatorioImpressao } from "@/lib/relatorio-auditoria-impressao";

const ROTULO_SEVERIDADE: Record<SeveridadeAchado, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function classeSeveridade(severidade: SeveridadeAchado): string {
  if (severidade === "alta") return "border-red-300 bg-red-50 text-red-950";
  if (severidade === "media") return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-emerald-200 bg-emerald-50/80 text-emerald-950";
}

function SeloSeveridade({ severidade }: { severidade: SeveridadeAchado }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${classeSeveridade(severidade)}`}
    >
      {ROTULO_SEVERIDADE[severidade]}
    </span>
  );
}

export default function RelatorioAchadosAuditoria({
  achados,
  titulo = "Relatório de consistência",
  mostrarExportar = true,
}: {
  achados: AchadoConsistencia[];
  titulo?: string;
  mostrarExportar?: boolean;
}) {
  const ordenados = ordenarAchados(achados);
  const contagem = contagemPorSeveridade(achados);

  return (
    <section aria-labelledby="titulo-relatorio-consistencia" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="titulo-relatorio-consistencia" className="text-lg font-semibold">
            {titulo}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Checagens automáticas no documento lido (sem custo extra de IA).
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700">
            Alta: {contagem.alta} · Média: {contagem.media} · Baixa: {contagem.baixa}
          </p>
        </div>
        {mostrarExportar ? (
          <button
            type="button"
            onClick={() => abrirRelatorioImpressao(titulo, achados)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold"
          >
            Exportar / imprimir
          </button>
        ) : null}
      </div>

      {ordenados.length === 0 ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
          Nenhuma inconsistência detectada nas regras automáticas. Confira manualmente campos que a IA não leu.
        </p>
      ) : (
        <ul className="space-y-3">
          {ordenados.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border px-4 py-4 ${classeSeveridade(item.severidade)}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <SeloSeveridade severidade={item.severidade} />
                <p className="text-base font-semibold">{item.mensagem}</p>
              </div>
              {item.detalhe ? (
                <p className="mt-2 text-sm leading-6 opacity-90">{item.detalhe}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
