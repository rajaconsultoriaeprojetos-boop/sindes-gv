"use client";

import { useEffect, useState } from "react";
import { ROTULO_TIPO_AGENDAMENTO, type TipoAgendamento } from "@/lib/tipos-agendamento";

type Item = {
  id: string;
  createdAt: string;
  tipo: TipoAgendamento;
  inicio: string;
  fim: string;
  nome: string;
  telefone: string;
  localTrabalho: string;
  cargo: string;
  assunto?: string;
  partnerName?: string;
  status: string;
  googleSyncErro?: string;
};

type Props = {
  autenticado: boolean;
};

function formatar(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export default function ListaAgendamentos({ autenticado }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [calendarLink, setCalendarLink] = useState<string | null>(null);
  const [avisoCalendario, setAvisoCalendario] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!autenticado) return;
    setCarregando(true);
    void fetch("/api/agendamentos")
      .then(async (resposta) => {
        const dados = (await resposta.json().catch(() => null)) as {
          agendamentos?: Item[];
          integracao?: { calendarLink?: string | null; lastCalendarError?: string };
        } | null;
        if (resposta.ok && dados?.agendamentos) setItens(dados.agendamentos);
        if (dados?.integracao?.calendarLink) setCalendarLink(dados.integracao.calendarLink);
        if (dados?.integracao?.lastCalendarError) setAvisoCalendario(dados.integracao.lastCalendarError);
      })
      .finally(() => setCarregando(false));
  }, [autenticado]);

  if (!autenticado) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Agendamentos</h2>
        {calendarLink ? (
          <a
            href={calendarLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#5D25AA] underline-offset-2 hover:underline"
          >
            Abrir Google Calendar
          </a>
        ) : null}
      </div>
      {avisoCalendario ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          {avisoCalendario} Os horários continuam salvos neste servidor.
        </p>
      ) : null}
      {carregando ? <p className="text-sm text-slate-600">Carregando agendamentos…</p> : null}
      {!carregando && itens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-base text-slate-600">
          Nenhum agendamento ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {itens.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold">{ROTULO_TIPO_AGENDAMENTO[item.tipo]}</p>
              <p className="mt-1 text-base">
                {item.nome} · {item.telefone}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatar(item.inicio)} — {item.cargo}, {item.localTrabalho}
              </p>
              {item.assunto ? <p className="mt-2 text-sm text-slate-700">{item.assunto}</p> : null}
              {item.partnerName ? <p className="mt-1 text-sm text-slate-700">Convênio: {item.partnerName}</p> : null}
              {item.googleSyncErro ? (
                <p className="mt-2 text-xs text-amber-800">Calendário: {item.googleSyncErro}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
