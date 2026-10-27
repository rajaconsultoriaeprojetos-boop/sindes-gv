"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Loader2, RotateCcw, UploadCloud } from "lucide-react";
import RelatorioAchadosAuditoria from "@/components/RelatorioAchadosAuditoria";
import AuditoriaPainel from "@/components/AuditoriaPainelRescisao";
import { montarRelatorioConsistencia } from "@/lib/consistencia-trct";
import { mesclarLeituras } from "@/lib/mesclar-leitura-trct";
import { enviarArquivoTrctApi, prepararArquivoTrct } from "@/lib/trct-arquivo-client";
import { validarLeitura, type LeituraTrct } from "@/lib/trct";

type SlotId = "trct" | "recibo" | "discriminativo";

const SLOTS: { id: SlotId; titulo: string; obrigatorio: boolean; ajuda: string }[] = [
  {
    id: "trct",
    titulo: "TRCT (obrigatório)",
    obrigatorio: true,
    ajuda: "Termo de rescisão assinado — PDF ou imagem.",
  },
  {
    id: "recibo",
    titulo: "Recibo de pagamento (opcional)",
    obrigatorio: false,
    ajuda: "Complementa valores que não apareceram no TRCT.",
  },
  {
    id: "discriminativo",
    titulo: "Discriminativo / demonstrativo (opcional)",
    obrigatorio: false,
    ajuda: "Detalhamento de verbas; preenche campos nulos da leitura principal.",
  },
];

export default function AuditoriaPorDocumentos({ consentimento }: { consentimento: boolean }) {
  const [arquivos, setArquivos] = useState<Partial<Record<SlotId, File>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [leitura, setLeitura] = useState<LeituraTrct | null>(null);
  const pedido = useRef(0);
  const inputsRef = useRef<Partial<Record<SlotId, HTMLInputElement | null>>>({});

  function escolherArquivo(slot: SlotId, evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setArquivos((atual) => ({ ...atual, [slot]: arquivo }));
    setErro("");
    evento.target.value = "";
  }

  function reiniciar() {
    pedido.current += 1;
    setArquivos({});
    setLeitura(null);
    setErro("");
    setIsLoading(false);
  }

  async function analisar() {
    if (!consentimento || isLoading) return;
    if (!arquivos.trct) {
      setErro("Envie pelo menos o TRCT para iniciar a auditoria.");
      return;
    }
    const id = ++pedido.current;
    setIsLoading(true);
    setErro("");
    setLeitura(null);
    try {
      const ordem: SlotId[] = ["trct", "recibo", "discriminativo"];
      let mesclado: LeituraTrct | null = null;
      for (const slot of ordem) {
        const arquivo = arquivos[slot];
        if (!arquivo) continue;
        const preparado = await prepararArquivoTrct(arquivo);
        const bruto = await enviarArquivoTrctApi(preparado.blob, preparado.nome);
        if (id !== pedido.current) return;
        const parcial = validarLeitura(bruto);
        if (!parcial) {
          setErro(`A leitura de "${SLOTS.find((s) => s.id === slot)?.titulo}" não veio no formato esperado.`);
          return;
        }
        mesclado = mesclado ? mesclarLeituras(mesclado, parcial) : parcial;
      }
      if (!mesclado) {
        setErro("Nenhum documento foi processado.");
        return;
      }
      setLeitura(mesclado);
    } catch (causa) {
      if (id === pedido.current) {
        setErro(causa instanceof Error ? causa.message : "Não foi possível analisar os documentos.");
      }
    } finally {
      if (id === pedido.current) setIsLoading(false);
    }
  }

  const relatorio = leitura ? montarRelatorioConsistencia(leitura) : null;

  return (
    <div className="mt-8 space-y-8">
      <p className="max-w-2xl text-base leading-7 text-slate-700">
        Envie o TRCT e, se quiser, até dois anexos (recibo ou discriminativo). O sistema lê os valores,
        verifica consistência interna e compara com a estimativa SINDES quando houver dados contratuais suficientes.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {SLOTS.map((slot) => {
          const selecionado = arquivos[slot.id];
          return (
            <div key={slot.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-semibold">{slot.titulo}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{slot.ajuda}</p>
              <label
                className={`mt-4 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/80 px-3 py-4 text-center transition hover:bg-slate-50 ${
                  isLoading ? "cursor-wait opacity-70" : ""
                }`}
              >
                <input
                  ref={(el) => {
                    inputsRef.current[slot.id] = el;
                  }}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  disabled={!consentimento || isLoading}
                  className="sr-only"
                  onChange={(evento) => escolherArquivo(slot.id, evento)}
                />
                <UploadCloud aria-hidden className="h-8 w-8 text-[#5D25AA]" />
                <span className="mt-2 text-sm font-semibold">
                  {selecionado ? selecionado.name : "Escolher arquivo"}
                </span>
                <span className="mt-1 text-xs text-slate-500">PDF, PNG ou JPG · até 5 MB</span>
              </label>
            </div>
          );
        })}
      </div>

      {erro ? (
        <p role="alert" className="text-sm font-medium text-red-800">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!consentimento || isLoading || !arquivos.trct}
          onClick={() => void analisar()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#FCB065] px-5 text-base font-semibold text-[#1D0D2C] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
              Analisando documentos…
            </>
          ) : (
            "Analisar documentos"
          )}
        </button>
        <button
          type="button"
          onClick={reiniciar}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold"
        >
          <RotateCcw aria-hidden className="h-4 w-4" />
          Limpar
        </button>
      </div>

      {leitura && relatorio ? (
        <div className="space-y-10 border-t border-slate-200 pt-10">
          <RelatorioAchadosAuditoria achados={relatorio.achados} titulo="Auditoria por documentos" />
          {relatorio.resultadoSindes ? (
            <AuditoriaPainel verbas={leitura.verbasPagasEmpregador} resultado={relatorio.resultadoSindes} />
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Não foi possível calcular a estimativa SINDES automaticamente (faltam admissão, demissão ou salário na leitura).
              Ajuste os dados no modo &quot;Cálculo completo&quot; se precisar do cruzamento.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
