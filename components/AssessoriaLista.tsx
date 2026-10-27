"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import ControlesSessao from "@/components/ControlesSessao";
import FilaValidacao from "@/components/FilaValidacao";
import ListaAgendamentos from "@/components/ListaAgendamentos";
import RepositorioDocumentos, { type ItemRepositorio } from "@/components/RepositorioDocumentos";

type Resumo = {
  id: string;
  createdAt: string;
  name: string;
  cpfMascarado: string;
  subject: string;
  status: "aguardando_validacao" | "aguardando" | "em_atendimento" | "encerrado";
  validacaoStatus: "pendente" | "aprovado" | "recusado";
};

type Validacao = {
  id: string;
  createdAt: string;
  nomeCompleto: string;
  telefone: string;
  localTrabalho: string;
  cargo: string;
  servicoId: string;
};

const ROTULO: Record<Resumo["status"], string> = {
  aguardando_validacao: "Aguardando validação",
  aguardando: "Aguardando",
  em_atendimento: "Em atendimento",
  encerrado: "Encerrado",
};

function hora(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export default function AssessoriaLista() {
  const [codigo, setCodigo] = useState("");
  const [liberado, setLiberado] = useState(false);
  const [atendimentos, setAtendimentos] = useState<Resumo[]>([]);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [validacoes, setValidacoes] = useState<Validacao[]>([]);
  const [processandoValidacao, setProcessandoValidacao] = useState<string | null>(null);
  const [repositorio, setRepositorio] = useState<ItemRepositorio[]>([]);
  const [emailUsuario, setEmailUsuario] = useState("");

  function limparDados() {
    setLiberado(false);
    setAtendimentos([]);
    setValidacoes([]);
    setRepositorio([]);
  }

  async function carregarRepositorio() {
    const resposta = await fetch("/api/assessoria/repositorio");
    const dados = (await resposta.json().catch(() => null)) as { itens?: ItemRepositorio[] } | null;
    if (resposta.ok && dados?.itens) setRepositorio(dados.itens);
  }

  async function carregarValidacoes() {
    const resposta = await fetch("/api/assessoria/validacoes");
    const dados = (await resposta.json().catch(() => null)) as { validacoes?: Validacao[] } | null;
    if (resposta.ok && dados?.validacoes) setValidacoes(dados.validacoes);
  }

  useEffect(() => {
    let vivo = true;
    void fetch("/api/auth/me")
      .then(async (me) => {
        if (!vivo || !me.ok) return;
        const corpo = (await me.json()) as { email?: string };
        if (corpo.email) setEmailUsuario(corpo.email);
      })
      .catch(() => undefined);
    void fetch("/api/atendimentos")
      .then(async (resposta) => {
        const dados = (await resposta.json().catch(() => null)) as {
          configurado?: boolean;
          atendimentos?: Resumo[];
        } | null;
        if (!vivo) return;
        if (dados?.configurado === false) {
          limparDados();
          setErro("O código não foi configurado.");
          return;
        }
        if (resposta.ok && dados?.atendimentos) {
          setAtendimentos(dados.atendimentos);
          setLiberado(true);
          setErro("");
          void carregarValidacoes();
          void carregarRepositorio();
        }
      })
      .catch(() => {
        if (vivo) setErro("");
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function entrar(event: FormEvent) {
    event.preventDefault();
    setBuscando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/assessoria/sessao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const dados = (await resposta.json().catch(() => null)) as { erro?: string } | null;
      setCodigo("");
      if (!resposta.ok) {
        limparDados();
        setErro(dados?.erro ?? "Código não confere. Nenhum atendimento foi mostrado.");
        return;
      }
      const lista = await fetch("/api/atendimentos");
      const corpo = (await lista.json().catch(() => null)) as { atendimentos?: Resumo[]; configurado?: boolean } | null;
      if (!lista.ok || !corpo?.atendimentos) {
        limparDados();
        setErro(
          corpo?.configurado === false
            ? "O código não foi configurado."
            : "Código não confere. Nenhum atendimento foi mostrado.",
        );
        return;
      }
      setAtendimentos(corpo.atendimentos);
      setLiberado(true);
      await carregarValidacoes();
      await carregarRepositorio();
    } catch {
      limparDados();
      setErro("Não foi possível consultar os atendimentos.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#F8FAFC] text-[#1D0D2C]">
      <header className="border-b border-[rgba(14,58,67,0.12)] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-[#0E3A43]">
            <img src="/sindes-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            SINDES
          </Link>
          {liberado ? (
            <ControlesSessao email={emailUsuario} />
          ) : (
            <Link
              href="/"
              className="text-sm font-medium text-[#1F8A70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F8A70] focus-visible:ring-offset-2"
            >
              Voltar ao início
            </Link>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5D25AA]">Assessoria</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">Assessoria e agendamentos</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Atendimentos jurídicos, validações e horários reservados pelo portal. O código não abre a sala de outra pessoa sem o registro.
        </p>
        {!liberado ? (
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={entrar}>
          <div className="min-w-0 flex-1">
            <label htmlFor="codigo-assessoria" className="block text-base font-semibold">
              Código da assessoria
            </label>
            <input
              id="codigo-assessoria"
              type="password"
              autoComplete="off"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA]"
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5D25AA] px-4 text-base font-semibold text-white disabled:opacity-50 sm:self-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
          >
            {buscando ? "Consultando..." : "Ver atendimentos"}
          </button>
        </form>
        ) : null}
        {erro ? (
          <p className="mt-4 text-base text-red-700" role="alert">
            {erro}
          </p>
        ) : null}
        {liberado ? (
          <div className="mt-10 space-y-10">
            <ListaAgendamentos autenticado={liberado} />
            <div className="rounded-xl border border-[#5D25AA]/25 bg-[#5D25AA]/5 p-4 sm:p-5">
              <p className="text-sm font-semibold text-[#1D0D2C]">Auditoria de rescisão (interno)</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Calculadora de homologação e leitura de TRCT — uso da presidência e assessoria jurídica.
              </p>
              <Link
                href="/calculadora"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5D25AA] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
              >
                Abrir calculadora de homologação
              </Link>
            </div>
            <RepositorioDocumentos
              titulo="Repositório jurídico"
              itens={repositorio}
              baseArquivo="/api/assessoria/validacoes"
            />
            <FilaValidacao
              titulo="Validação de trabalhadores"
              itens={validacoes}
              baseArquivo="/api/assessoria/validacoes"
              processando={processandoValidacao}
              aoDecidir={async (id, decisao) => {
                setProcessandoValidacao(id);
                try {
                  const resposta = await fetch("/api/assessoria/validacoes", {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ id, decisao }),
                  });
                  if (!resposta.ok) {
                    setErro("Não foi possível registrar a decisão.");
                    return;
                  }
                  const lista = await fetch("/api/atendimentos");
                  const corpo = (await lista.json()) as { atendimentos?: Resumo[] };
                  if (corpo.atendimentos) setAtendimentos(corpo.atendimentos);
                  await carregarValidacoes();
                  await carregarRepositorio();
                } finally {
                  setProcessandoValidacao(null);
                }
              }}
            />
            {atendimentos.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-base leading-7">
              Nenhum atendimento ainda.
            </p>
          ) : (
            <ul className="mt-8 space-y-3">
              {atendimentos.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/atendimento/${item.id}?como=assessoria`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#5D25AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
                  >
                    <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="text-lg font-semibold">{item.name}</span>
                      <span className="text-sm font-semibold text-[#5D25AA]">{ROTULO[item.status]}</span>
                    </span>
                    <span className="mt-2 block text-base">CPF {item.cpfMascarado}</span>
                    <span className="mt-1 block text-base leading-7 text-slate-700">{item.subject}</span>
                    <span className="mt-2 block text-sm text-slate-500">{hora(item.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
