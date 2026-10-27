"use client";

import { formatarTelefoneDigitando } from "@/lib/telefone";

type Item = {
  id: string;
  createdAt: string;
  nomeCompleto: string;
  telefone: string;
  localTrabalho: string;
  cargo: string;
  servicoId: string;
};

function hora(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export default function FilaValidacao({
  titulo,
  itens,
  baseArquivo,
  aoDecidir,
  processando,
}: {
  titulo: string;
  itens: Item[];
  baseArquivo: string;
  aoDecidir: (id: string, decisao: "aprovar" | "recusar") => void;
  processando: string | null;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-base">
          Nenhum pedido aguardando validação.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {itens.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-lg font-semibold">{item.nomeCompleto}</p>
              <p className="mt-1 text-base text-slate-700">
                {formatarTelefoneDigitando(item.telefone)} · {item.localTrabalho} · {item.cargo}
              </p>
              <p className="mt-2 text-sm text-slate-500">{hora(item.createdAt)}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  href={`${baseArquivo}/${item.id}/contracheque`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-[#5D25AA]"
                >
                  Ver contracheque
                </a>
                <a
                  href={`${baseArquivo}/${item.id}/documento`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-[#5D25AA]"
                >
                  Ver documento
                </a>
                <button
                  type="button"
                  disabled={processando === item.id}
                  onClick={() => aoDecidir(item.id, "aprovar")}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] disabled:opacity-50"
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  disabled={processando === item.id}
                  onClick={() => aoDecidir(item.id, "recusar")}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-300 px-4 text-base font-semibold text-red-800 disabled:opacity-50"
                >
                  Recusar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
