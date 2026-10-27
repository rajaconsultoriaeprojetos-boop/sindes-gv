"use client";

import { formatarTelefoneDigitando } from "@/lib/telefone";

export type ItemRepositorio = {
  id: string;
  createdAt: string;
  tipo: "juridico" | "voucher";
  servicoId: string;
  nomeCompleto: string;
  telefone: string;
  localTrabalho: string;
  cargo: string;
  statusPublico: "aguardando_validacao" | "aprovado" | "recusado";
};

function hora(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

const ROTULO_TIPO = { juridico: "Jurídico", voucher: "Voucher" } as const;

export default function RepositorioDocumentos({
  titulo,
  itens,
  baseArquivo,
}: {
  titulo: string;
  itens: ItemRepositorio[];
  baseArquivo: string;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-base">
          Nenhum documento arquivado ainda.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {itens.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-lg font-semibold">{item.nomeCompleto}</p>
              <p className="text-sm text-slate-600">
                {ROTULO_TIPO[item.tipo]} · {formatarTelefoneDigitando(item.telefone)} · {item.localTrabalho} · {item.cargo}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#5D25AA]">Status: {item.statusPublico.replace(/_/g, " ")}</p>
              <p className="text-sm text-slate-500">{hora(item.createdAt)} · pedido {item.servicoId.slice(0, 8)}…</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  href={`${baseArquivo}/${item.id}/contracheque`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-[#5D25AA]"
                >
                  Contracheque
                </a>
                <a
                  href={`${baseArquivo}/${item.id}/documento`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-[#5D25AA]"
                >
                  Documento com foto
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
