"use client";

import { useEffect, useState } from "react";
import { PLANTAO } from "@/components/landing/plantao-theme";
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
  novo?: boolean;
};

type Props = {
  autenticado: boolean;
  /** Admin/superadmin: lista com indicador de novos e marca como visto ao abrir. */
  indicadorAdmin?: boolean;
  onNovosPendentes?: (quantidade: number) => void;
};

function formatar(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export default function ListaAgendamentos({ autenticado, indicadorAdmin = false, onNovosPendentes }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [calendarLink, setCalendarLink] = useState<string | null>(null);
  const [avisoCalendario, setAvisoCalendario] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [novosPendentes, setNovosPendentes] = useState(0);

  useEffect(() => {
    if (!autenticado) return;
    setCarregando(true);
    const url = indicadorAdmin ? "/api/admin/agendamentos" : "/api/agendamentos";
    void fetch(url)
      .then(async (resposta) => {
        const dados = (await resposta.json().catch(() => null)) as {
          agendamentos?: Item[];
          novosPendentes?: number;
          integracao?: { calendarLink?: string | null; lastCalendarError?: string };
        } | null;
        if (resposta.ok && dados?.agendamentos) {
          setItens(dados.agendamentos);
          const pendentes = indicadorAdmin
            ? (dados.novosPendentes ?? dados.agendamentos.filter((a) => a.novo).length)
            : 0;
          setNovosPendentes(pendentes);
          onNovosPendentes?.(pendentes);
        }
        if (dados?.integracao?.calendarLink) setCalendarLink(dados.integracao.calendarLink);
        if (dados?.integracao?.lastCalendarError) setAvisoCalendario(dados.integracao.lastCalendarError);
      })
      .finally(() => setCarregando(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onNovosPendentes é callback opcional do pai
  }, [autenticado, indicadorAdmin]);

  useEffect(() => {
    if (!autenticado || !indicadorAdmin || carregando) return;
    void fetch("/api/admin/agendamentos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ acao: "visto" }),
    }).then(() => {
      setNovosPendentes(0);
      onNovosPendentes?.(0);
      setItens((lista) => lista.map((item) => ({ ...item, novo: false })));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- marcar visto só após primeira carga
  }, [autenticado, indicadorAdmin, carregando]);

  if (!autenticado) return null;

  const ancora = indicadorAdmin ? "agendamentos-admin" : undefined;

  return (
    <section className="space-y-4" id={ancora}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">Agendamentos</h2>
          {indicadorAdmin && novosPendentes > 0 ? (
            <span
              className="inline-flex min-h-7 items-center rounded-full px-3 text-sm font-bold text-[#0E3A43] shadow-sm"
              style={{ backgroundColor: PLANTAO.amber }}
            >
              {novosPendentes} novo{novosPendentes === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
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
      {indicadorAdmin && novosPendentes > 0 ? (
        <p
          className="rounded-xl border-2 px-4 py-3 text-base font-semibold text-[#0E3A43]"
          style={{ borderColor: PLANTAO.amber, backgroundColor: "rgba(242, 162, 12, 0.15)" }}
          role="status"
        >
          Há {novosPendentes} agendamento{novosPendentes === 1 ? "" : "s"} novo
          {novosPendentes === 1 ? "" : "s"} desde a última vez que a administração abriu esta lista.
        </p>
      ) : null}
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
            <li
              key={item.id}
              className={`rounded-xl border bg-white p-4 ${
                item.novo
                  ? "border-[#F2A20C] ring-2 ring-[#F2A20C]/35 shadow-[0_0_0_1px_rgba(242,162,12,0.2)]"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{ROTULO_TIPO_AGENDAMENTO[item.tipo]}</p>
                {item.novo ? (
                  <span className="rounded-md bg-[#F2A20C] px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[#0E3A43]">
                    Novo
                  </span>
                ) : null}
              </div>
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
