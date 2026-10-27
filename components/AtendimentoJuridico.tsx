"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ExternalLink, Lock, MessageSquare, Video } from "lucide-react";

type Mensagem = {
  at: string;
  author: string;
  text: string;
};

type FaseRegistro = "carregando" | "pronto" | "ausente" | "falha";

type Registro = {
  name: string;
  cpfMascarado: string;
  validacaoStatus: "pendente" | "aprovado" | "recusado";
  status: "aguardando_validacao" | "aguardando" | "em_atendimento" | "encerrado";
  notes: string;
  messages: Mensagem[];
  googleMeetLink?: string;
};

const ROTULO_REGISTRO: Record<Registro["status"], string> = {
  aguardando_validacao: "Aguardando validação",
  aguardando: "Aguardando",
  em_atendimento: "Em atendimento",
  encerrado: "Encerrado",
};

function horaDaMensagem(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function autorDaMensagem(nome: string): string {
  if (typeof window === "undefined") return nome;
  return new URLSearchParams(window.location.search).get("como") === "assessoria" ? "Assessoria" : nome;
}

export default function AtendimentoJuridico({ atendimentoId }: { atendimentoId: string }) {
  const [chatOpen, setChatOpen] = useState(true);
  const [googleMeetLink, setGoogleMeetLink] = useState<string | undefined>();
  const [aviso, setAviso] = useState("");
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [rascunho, setRascunho] = useState("");
  const [erroChat, setErroChat] = useState("");
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [notas, setNotas] = useState("");
  const [avisoNotas, setAvisoNotas] = useState("");
  const [salvandoNotas, setSalvandoNotas] = useState(false);
  const [fase, setFase] = useState<FaseRegistro>("carregando");
  const [nome, setNome] = useState("");
  const [cpfMascarado, setCpfMascarado] = useState("");
  const [statusRegistro, setStatusRegistro] = useState<Registro["status"]>("aguardando_validacao");
  const [validacaoStatus, setValidacaoStatus] = useState<Registro["validacaoStatus"]>("pendente");

  const listaChatRef = useRef<HTMLDivElement>(null);
  const notasServidorRef = useRef("");
  const nomeRef = useRef("");

  useEffect(() => {
    let vivo = true;
    setFase("carregando");
    void fetch(`/api/atendimentos/${atendimentoId}`)
      .then(async (resposta) => {
        if (!vivo) return;
        if (resposta.status === 404) {
          setFase("ausente");
          return;
        }
        if (!resposta.ok) {
          setFase("falha");
          return;
        }
        const dados = (await resposta.json()) as Registro;
        if (!vivo) return;
        nomeRef.current = dados.name;
        notasServidorRef.current = dados.notes;
        setNome(dados.name);
        setCpfMascarado(dados.cpfMascarado);
        setValidacaoStatus(dados.validacaoStatus);
        setStatusRegistro(dados.status);
        setNotas(dados.notes);
        setMensagens(dados.messages);
        setGoogleMeetLink(dados.googleMeetLink);
        setFase("pronto");
      })
      .catch(() => {
        if (vivo) setFase("falha");
      });
    return () => {
      vivo = false;
    };
  }, [atendimentoId]);

  useEffect(() => {
    const caixa = listaChatRef.current;
    if (!caixa) return;
    caixa.scrollTo({ top: caixa.scrollHeight });
  }, [mensagens, chatOpen]);

  async function marcarStatus(status: "em_atendimento" | "encerrado") {
    try {
      const resposta = await fetch(`/api/atendimentos/${atendimentoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!resposta.ok) throw new Error("status");
      const dados = (await resposta.json()) as Registro;
      setStatusRegistro(dados.status);
    } catch {
      setAviso("O status do atendimento não foi gravado. Tente de novo.");
    }
  }

  function abrirGoogleMeet() {
    if (validacaoStatus !== "aprovado") {
      setAviso(
        validacaoStatus === "recusado"
          ? "Este pedido foi recusado pela equipe. A consulta por vídeo não será aberta."
          : "A equipe ainda está conferindo seu pedido. O link do Meet libera depois da validação.",
      );
      return;
    }
    if (!googleMeetLink) {
      setAviso("O link do Google Meet ainda não está disponível. Aguarde a confirmação do agendamento na agenda.");
      return;
    }
    setAviso("");
    void marcarStatus("em_atendimento");
    window.open(googleMeetLink, "_blank", "noopener,noreferrer");
  }

  function alternarChat() {
    const estreita = window.matchMedia("(max-width: 1023px)").matches;
    if (!estreita) {
      setChatOpen(true);
      document.getElementById("mensagem-chat")?.focus();
      return;
    }
    setChatOpen((aberto) => !aberto);
  }

  async function salvarNotas(texto?: string) {
    const valor = texto ?? notas;
    if (valor === notasServidorRef.current) {
      setAvisoNotas("Notas salvas neste atendimento.");
      return;
    }
    setSalvandoNotas(true);
    try {
      const resposta = await fetch(`/api/atendimentos/${atendimentoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes: valor }),
      });
      if (!resposta.ok) throw new Error("notas");
      const dados = (await resposta.json()) as Registro;
      notasServidorRef.current = dados.notes;
      setNotas(dados.notes);
      setAvisoNotas("Notas salvas neste atendimento.");
    } catch {
      setAvisoNotas("Não foi possível salvar as notas. O texto continua nesta tela.");
    } finally {
      setSalvandoNotas(false);
    }
  }

  async function enviarMensagem(event: FormEvent) {
    event.preventDefault();
    const text = rascunho.trim();
    if (!text) {
      setErroChat("Escreva a mensagem antes de enviar.");
      return;
    }
    setEnviandoChat(true);
    setErroChat("");
    try {
      const resposta = await fetch(`/api/atendimentos/${atendimentoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: { author: autorDaMensagem(nomeRef.current), text } }),
      });
      const dados = (await resposta.json().catch(() => null)) as (Registro & { erro?: string }) | null;
      if (!resposta.ok || !dados?.messages) {
        setErroChat(dados?.erro ?? "Não foi possível guardar a mensagem.");
        return;
      }
      setMensagens(dados.messages);
      setRascunho("");
    } catch {
      setErroChat("Não foi possível guardar a mensagem.");
    } finally {
      setEnviandoChat(false);
    }
  }

  const botao =
    "inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-base font-semibold text-[#1D0D2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2";

  if (fase !== "pronto") {
    const titulo =
      fase === "carregando"
        ? "Carregando o atendimento"
        : fase === "ausente"
          ? "Não encontramos este atendimento"
          : "Não foi possível abrir o atendimento";
    const texto =
      fase === "carregando"
        ? "Buscando o registro neste servidor."
        : fase === "ausente"
          ? "O número não corresponde a um pedido aberto no portal."
          : "A consulta continua no portal. Tente de novo daqui a pouco.";
    return (
      <main className="min-h-dvh bg-[#F8FAFC] px-4 py-16 text-[#1D0D2C]">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">{texto}</p>
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

  const meetDisponivel = validacaoStatus === "aprovado" && Boolean(googleMeetLink);

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC] text-[#1D0D2C] lg:h-dvh lg:overflow-hidden">
      <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <img src="/sindes-logo.png" alt="" width={40} height={40} className="mt-0.5 h-10 w-10 shrink-0 rounded-lg object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#5D25AA]">SINDES · Atendimento jurídico</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{nome}</h1>
              <p className="mt-2 text-base font-semibold">CPF {cpfMascarado}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <p className="inline-flex min-h-11 items-center rounded-lg border border-[#1D0D2C] bg-white px-3 text-base font-semibold">
              Registro: {ROTULO_REGISTRO[statusRegistro]}
            </p>
            <p className="inline-flex min-h-11 items-center rounded-lg border border-[#5D25AA] bg-white px-3 text-base font-semibold">
              Assessoria jurídica
            </p>
            <p className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#1D0D2C] bg-slate-50 px-3 text-base font-semibold">
              <Lock aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span>Conexão segura — cadeado neste aparelho</span>
            </p>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-base font-semibold text-[#5D25AA] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <section className="relative z-0 flex min-h-0 min-w-0 flex-col overflow-hidden" aria-label="Consulta por vídeo">
          <div className="relative flex min-h-[320px] flex-1 flex-col p-3 lg:min-h-0">
            <div className="relative flex min-h-[240px] flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#1D0D2C] px-6 py-10 text-center shadow-lg">
              <Video aria-hidden="true" className="h-12 w-12 text-[#FCB065]" />
              <h2 className="mt-4 text-xl font-semibold text-white sm:text-2xl">Consulta por Google Meet</h2>
              <p className="mt-3 max-w-lg text-base leading-7 text-slate-200">
                A videochamada acontece no Google Meet, em nova aba. Nesta página ficam o chat e as notas deste atendimento.
              </p>
              {validacaoStatus !== "aprovado" ? (
                <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
                  {validacaoStatus === "recusado"
                    ? "A equipe não liberou este atendimento."
                    : "Aguarde a confirmação da equipe do sindicato para abrir o Meet."}
                </p>
              ) : !googleMeetLink ? (
                <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
                  O link do Meet aparece aqui depois que o agendamento for confirmado na agenda do sindicato.
                </p>
              ) : null}
              <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                <button
                  type="button"
                  onClick={abrirGoogleMeet}
                  disabled={!meetDisponivel}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#FCB065] px-5 text-base font-semibold text-[#1D0D2C] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D0D2C]"
                >
                  <ExternalLink aria-hidden="true" className="h-5 w-5 shrink-0" />
                  Abrir Google Meet
                </button>
                {statusRegistro !== "encerrado" && statusRegistro !== "aguardando_validacao" ? (
                  <button
                    type="button"
                    onClick={() => void marcarStatus("encerrado")}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/30 bg-transparent px-5 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D0D2C]"
                  >
                    Encerrar atendimento
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={alternarChat}
                aria-pressed={chatOpen}
                aria-controls="painel-chat"
                className={botao}
              >
                <MessageSquare aria-hidden="true" className="h-5 w-5 shrink-0 text-[#5D25AA]" />
                <span>
                  Abrir Chat
                  <span className="mt-0.5 block text-sm font-medium">{chatOpen ? "Aberto" : "Oculto"}</span>
                </span>
              </button>
            </div>
          </div>

          {aviso ? (
            <p className="mx-3 mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base leading-7" role="status">
              {aviso}
            </p>
          ) : null}
        </section>

        <aside className="relative z-10 flex min-h-0 min-w-0 flex-col border-t border-slate-200 bg-white lg:overflow-hidden lg:border-t-0 lg:border-l" aria-label="Chat e anotações">
          <section
            id="painel-chat"
            aria-label="Chat"
            className={`${chatOpen ? "flex" : "hidden"} min-h-0 flex-col border-b border-slate-200 lg:flex lg:min-h-0 lg:flex-1`}
          >
            <div className="px-4 pt-4">
              <h2 className="text-xl font-semibold">Chat da consulta</h2>
              <p className="mt-1 text-base leading-7 text-slate-700">
                As mensagens ficam neste atendimento, neste servidor, até o sindicato definir a retenção.
              </p>
            </div>
            <div
              ref={listaChatRef}
              role="log"
              aria-label="Mensagens da consulta"
              aria-live="polite"
              className="mt-3 max-h-64 space-y-3 overflow-y-auto px-4 lg:max-h-none lg:min-h-0 lg:flex-1"
            >
              {mensagens.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-base leading-7 text-slate-700">
                  Nenhuma mensagem ainda. O que você enviar fica neste atendimento.
                </p>
              ) : (
                mensagens.map((mensagem, indice) => (
                  <article key={`${mensagem.at}-${indice}`} className="rounded-lg bg-slate-100 px-3 py-3">
                    <p className="text-sm font-semibold text-[#5D25AA]">
                      {mensagem.author} · {horaDaMensagem(mensagem.at)}
                    </p>
                    <p className="mt-1 text-base leading-7">{mensagem.text}</p>
                  </article>
                ))
              )}
            </div>
            <form className="grid gap-2 p-4" onSubmit={enviarMensagem}>
              <label htmlFor="mensagem-chat" className="text-base font-semibold">
                Mensagem
              </label>
              <input
                id="mensagem-chat"
                value={rascunho}
                onChange={(event) => {
                  setRascunho(event.target.value);
                  if (erroChat) setErroChat("");
                }}
                className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA]"
                placeholder="Escreva em linguagem simples"
              />
              {erroChat ? (
                <p className="text-base text-red-700" role="alert">
                  {erroChat}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={enviandoChat}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D0D2C] focus-visible:ring-offset-2"
              >
                {enviandoChat ? "Enviando..." : "Enviar mensagem"}
              </button>
            </form>
          </section>
          {chatOpen ? null : (
            <p className="px-4 py-4 text-base leading-7 lg:hidden">
              O chat está fechado. Toque em Abrir Chat para ver as mensagens.
            </p>
          )}

          <section className="p-4" aria-label="Notas rápidas">
            <h2 className="text-xl font-semibold">Notas rápidas</h2>
            <label htmlFor="notas-locais" className="mt-2 block text-base leading-7 text-slate-700">
              O texto fica neste atendimento, neste servidor, até o sindicato definir a retenção.
            </label>
            <textarea
              id="notas-locais"
              value={notas}
              onChange={(event) => {
                setNotas(event.target.value);
                if (avisoNotas) setAvisoNotas("");
              }}
              onBlur={() => void salvarNotas()}
              className="mt-3 min-h-36 w-full rounded-lg border border-slate-300 px-3 py-3 text-base leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA]"
              placeholder="Aviso prévio, férias ou outro ponto da consulta."
            />
            <button
              type="button"
              onClick={() => void salvarNotas()}
              disabled={salvandoNotas}
              className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#1D0D2C] bg-white px-4 text-base font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
            >
              {salvandoNotas ? "Salvando..." : "Salvar"}
            </button>
            {avisoNotas ? (
              <p className="mt-2 text-base leading-7" role="status">
                {avisoNotas}
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
