"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import FilaValidacao from "@/components/FilaValidacao";
import AdminCmsLanding from "@/components/AdminCmsLanding";
import GestaoGoogleSheets from "@/components/GestaoGoogleSheets";
import GestaoUsuarios from "@/components/GestaoUsuarios";
import ListaAgendamentos from "@/components/ListaAgendamentos";
import GeradorVoucher from "@/components/GeradorVoucher";
import PainelShell from "@/components/PainelShell";
import RepositorioDocumentos, { type ItemRepositorio } from "@/components/RepositorioDocumentos";
import type { PapelUsuario } from "@/lib/rbac/roles";
import { CATEGORIAS, type CategoriaId } from "@/lib/convenios-publico";

type Parceiro = {
  id: string;
  name: string;
  category: CategoriaId;
  categoryLabel: string;
  discountPercent: number;
  benefit: string;
  example: boolean;
  logoUrl: string | null;
};

type Pedido = {
  id: string;
  createdAt: string;
  name: string;
  telefone: string;
  cargo: string;
  localTrabalho: string;
  validacaoStatus: "pendente" | "aprovado" | "recusado";
  partnerId: string;
  partnerName: string;
  voucherCode: string | null;
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

type Voucher = {
  code: string;
  partnerName: string;
  discountPercent: number;
  workerName: string;
  cpfMascarado: string;
  situacao: string;
  validUntil: string;
  issuedAt: string;
  issuedByEmail?: string;
};

const campo = "mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base";

function hora(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export default function AdminConvenios() {
  const [codigo, setCodigo] = useState("");
  const [liberado, setLiberado] = useState(false);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nomeParceiro, setNomeParceiro] = useState("");
  const [categoria, setCategoria] = useState<CategoriaId>("farmacia");
  const [desconto, setDesconto] = useState("20");
  const [beneficio, setBeneficio] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [validacoes, setValidacoes] = useState<Validacao[]>([]);
  const [processandoValidacao, setProcessandoValidacao] = useState<string | null>(null);
  const [repositorio, setRepositorio] = useState<ItemRepositorio[]>([]);
  const [emailUsuario, setEmailUsuario] = useState("");
  const [papelUsuario, setPapelUsuario] = useState<PapelUsuario | null>(null);

  function limparDados() {
    setLiberado(false);
    setParceiros([]);
    setPedidos([]);
    setVouchers([]);
    setValidacoes([]);
    setRepositorio([]);
  }

  async function carregarRepositorio() {
    const resposta = await fetch("/api/admin/repositorio");
    const dados = (await resposta.json().catch(() => null)) as { itens?: ItemRepositorio[] } | null;
    if (resposta.ok && dados?.itens) setRepositorio(dados.itens);
  }

  async function carregarValidacoes() {
    const resposta = await fetch("/api/admin/validacoes");
    const dados = (await resposta.json().catch(() => null)) as { validacoes?: Validacao[] } | null;
    if (resposta.ok && dados?.validacoes) setValidacoes(dados.validacoes);
  }

  async function carregarPainel() {
    const resposta = await fetch("/api/admin/convenios");
    const dados = (await resposta.json().catch(() => null)) as {
      configurado?: boolean;
      erro?: string;
      parceiros?: Parceiro[];
      pedidos?: Pedido[];
      vouchers?: Voucher[];
    } | null;
    if (dados?.configurado === false) {
      limparDados();
      setErro("O código não foi configurado.");
      return;
    }
    if (resposta.ok && dados?.parceiros && dados.pedidos && dados.vouchers) {
      setParceiros(dados.parceiros);
      setPedidos(dados.pedidos);
      setVouchers(dados.vouchers);
      setLiberado(true);
      setErro("");
      await carregarValidacoes();
      await carregarRepositorio();
    }
  }

  useEffect(() => {
    let vivo = true;
    void fetch("/api/auth/me")
      .then(async (me) => {
        if (!vivo) return;
        if (me.ok) {
          const corpo = (await me.json()) as { email?: string; role?: PapelUsuario };
          setEmailUsuario(corpo.email ?? "");
          setPapelUsuario(corpo.role ?? null);
          setLiberado(true);
          await carregarPainel();
          return;
        }
      })
      .catch(() => {
        if (vivo) setErro("");
      });
    return () => {
      vivo = false;
    };
  }, []);

  function cabecalho() {
    return { "content-type": "application/json" };
  }

  async function carregar() {
    const resposta = await fetch("/api/admin/convenios");
    const dados = (await resposta.json().catch(() => null)) as {
      configurado?: boolean;
      parceiros?: Parceiro[];
      pedidos?: Pedido[];
      vouchers?: Voucher[];
    } | null;
    if (!resposta.ok || !dados?.parceiros || !dados.pedidos || !dados.vouchers) {
      limparDados();
      setErro(
        dados?.configurado === false
          ? "O código não foi configurado."
          : "Código não confere. Nenhum dado foi mostrado.",
      );
      return false;
    }
    setParceiros(dados.parceiros);
    setPedidos(dados.pedidos);
    setVouchers(dados.vouchers);
    setLiberado(true);
    setErro("");
    await carregarValidacoes();
    await carregarRepositorio();
    return true;
  }

  async function entrar(event: FormEvent) {
    event.preventDefault();
    setBuscando(true);
    setAviso("");
    try {
      const resposta = await fetch("/api/admin/sessao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const dados = (await resposta.json().catch(() => null)) as { erro?: string; configurado?: boolean } | null;
      setCodigo("");
      if (!resposta.ok) {
        limparDados();
        setErro(dados?.erro ?? "Código não confere. Nenhum dado foi mostrado.");
        return;
      }
      await carregar();
    } catch {
      limparDados();
      setErro("Não foi possível consultar a administração.");
    } finally {
      setBuscando(false);
    }
  }

  function editar(parceiro: Parceiro) {
    setEditando(parceiro.id);
    setNomeParceiro(parceiro.name);
    setCategoria(parceiro.category);
    setDesconto(String(parceiro.discountPercent));
    setBeneficio(parceiro.benefit);
    setLogo(null);
  }

  function limparFormulario() {
    setEditando(null);
    setNomeParceiro("");
    setCategoria("farmacia");
    setDesconto("20");
    setBeneficio("");
    setLogo(null);
  }

  async function salvarParceiro(event: FormEvent) {
    event.preventDefault();
    setAviso("");
    const resposta = await fetch("/api/admin/parceiros", {
      method: "POST",
      headers: cabecalho(),
      body: JSON.stringify({
        id: editando,
        name: nomeParceiro,
        category: categoria,
        discountPercent: Number(desconto),
        benefit: beneficio,
      }),
    });
    const dados = (await resposta.json().catch(() => null)) as { id?: string; erro?: string } | null;
    if (!resposta.ok || !dados?.id) {
      setAviso(dados?.erro ?? "Não foi possível salvar o convênio.");
      return;
    }
    if (logo) {
      const formulario = new FormData();
      formulario.set("logo", logo);
      const envio = await fetch(`/api/admin/parceiros/${dados.id}/logo`, {
        method: "POST",
        body: formulario,
      });
      if (!envio.ok) {
        const falha = (await envio.json().catch(() => null)) as { erro?: string } | null;
        setAviso(falha?.erro ?? "O convênio foi salvo, mas a logo não.");
        await carregar();
        return;
      }
    }
    limparFormulario();
    setAviso("Convênio salvo.");
    await carregar();
  }

  async function emitir(corpo: Record<string, string>) {
    setAviso("");
    const resposta = await fetch("/api/admin/vouchers", {
      method: "POST",
      headers: cabecalho(),
      body: JSON.stringify(corpo),
    });
    const dados = (await resposta.json().catch(() => null)) as { code?: string; erro?: string } | null;
    if (!resposta.ok || !dados?.code) {
      setAviso(dados?.erro ?? "Não foi possível emitir o voucher.");
      return;
    }
    setAviso(`Voucher ${dados.code} emitido.`);
    await carregar();
  }

  async function marcar(code: string, status: "utilizado" | "cancelado") {
    setAviso("");
    const resposta = await fetch(`/api/admin/vouchers/${code}`, {
      method: "PATCH",
      headers: cabecalho(),
      body: JSON.stringify({ status }),
    });
    if (!resposta.ok) {
      setAviso("Não foi possível atualizar o voucher.");
      return;
    }
    await carregar();
  }

  const painelLogado = (
    <>
      {aviso ? (
        <p className="text-base" role="status">
          {aviso}
        </p>
      ) : null}
      <div className="space-y-12">
            <GestaoUsuarios />
            <AdminCmsLanding role={papelUsuario} email={emailUsuario} />
            <ListaAgendamentos autenticado={liberado} />
            <GestaoGoogleSheets />
            <RepositorioDocumentos
              titulo="Repositório de documentos"
              itens={repositorio}
              baseArquivo="/api/admin/validacoes"
            />
            <section>
              <h2 className="text-2xl font-semibold">{editando ? "Editar convênio" : "Novo convênio"}</h2>
              <form className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={salvarParceiro}>
                <div>
                  <label htmlFor="nome-parceiro" className="text-base font-semibold">
                    Nome
                  </label>
                  <input id="nome-parceiro" value={nomeParceiro} onChange={(event) => setNomeParceiro(event.target.value)} className={campo} required />
                </div>
                <div>
                  <label htmlFor="categoria-parceiro" className="text-base font-semibold">
                    Categoria
                  </label>
                  <select
                    id="categoria-parceiro"
                    value={categoria}
                    onChange={(event) => setCategoria(event.target.value as CategoriaId)}
                    className={campo}
                  >
                    {CATEGORIAS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="desconto-parceiro" className="text-base font-semibold">
                    Desconto (%)
                  </label>
                  <input
                    id="desconto-parceiro"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={desconto}
                    onChange={(event) => setDesconto(event.target.value)}
                    className={campo}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="beneficio-parceiro" className="text-base font-semibold">
                    Benefício
                  </label>
                  <input id="beneficio-parceiro" value={beneficio} onChange={(event) => setBeneficio(event.target.value)} className={campo} required />
                </div>
                <div>
                  <label htmlFor="logo-parceiro" className="text-base font-semibold">
                    Logo (PNG ou JPG, até 1 MB)
                  </label>
                  <input
                    id="logo-parceiro"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-base"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C]">
                    Salvar convênio
                  </button>
                  {editando ? (
                    <button type="button" onClick={limparFormulario} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-base font-semibold">
                      Cancelar edição
                    </button>
                  ) : null}
                </div>
              </form>
              <ul className="mt-4 space-y-3">
                {parceiros.map((parceiro) => (
                  <li key={parceiro.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <span className="flex min-w-0 items-center gap-3">
                      {parceiro.logoUrl ? (
                        <img src={parceiro.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <img src="/sindes-logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-lg bg-white object-contain" />
                      )}
                      <span className="min-w-0">
                        <span className="block font-semibold">{parceiro.name}</span>
                        <span className="block text-sm text-slate-600">
                          {parceiro.example ? "Exemplo · " : ""}
                          {parceiro.categoryLabel} · {parceiro.discountPercent}%
                        </span>
                      </span>
                    </span>
                    <button type="button" onClick={() => editar(parceiro)} className="shrink-0 text-sm font-semibold text-[#5D25AA]">
                      Editar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <FilaValidacao
              titulo="Validação para voucher"
              itens={validacoes}
              baseArquivo="/api/admin/validacoes"
              processando={processandoValidacao}
              aoDecidir={async (id, decisao) => {
                setProcessandoValidacao(id);
                try {
                  const resposta = await fetch("/api/admin/validacoes", {
                    method: "PATCH",
                    headers: cabecalho(),
                    body: JSON.stringify({ id, decisao }),
                  });
                  if (!resposta.ok) {
                    setAviso("Não foi possível registrar a decisão.");
                    return;
                  }
                  await carregar();
                } finally {
                  setProcessandoValidacao(null);
                }
              }}
            />
            <GeradorVoucher
              parceiros={parceiros}
              pedidos={pedidos}
              vouchers={vouchers}
              cabecalhoJson={cabecalho}
              onEmitido={() => void carregar()}
              onMarcar={marcar}
            />
            <section>
              <h2 className="text-2xl font-semibold">Pedidos de desconto</h2>
              {pedidos.length === 0 ? <p className="mt-3 text-base">Nenhum pedido ainda.</p> : null}
              <ul className="mt-4 space-y-3">
                {pedidos.map((pedido) => (
                  <li key={pedido.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold">{pedido.name}</p>
                    <p className="text-sm text-slate-600">
                      {pedido.cargo} · {pedido.localTrabalho} · {pedido.partnerName} · {hora(pedido.createdAt)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#5D25AA]">
                      Validação:{" "}
                      {pedido.validacaoStatus === "pendente"
                        ? "aguardando"
                        : pedido.validacaoStatus === "aprovado"
                          ? "aprovada"
                          : "recusada"}
                    </p>
                    {pedido.voucherCode ? (
                      <p className="mt-2 text-sm font-semibold">Voucher {pedido.voucherCode}</p>
                    ) : pedido.validacaoStatus === "aprovado" ? (
                      <button
                        type="button"
                        onClick={() => void emitir({ requestId: pedido.id })}
                        className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C]"
                      >
                        Emitir voucher
                      </button>
                    ) : (
                      <p className="mt-2 text-sm text-slate-600">O voucher só pode ser emitido depois da validação.</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
      </div>
    </>
  );

  if (liberado) {
    return (
      <PainelShell
        titulo="Convênios e vouchers"
        subtitulo="Administração de convênios, validações e emissão de vouchers."
        email={emailUsuario}
        role={papelUsuario}
      >
        {painelLogado}
      </PainelShell>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F7FAF9] text-[#0E3A43]">
      <header className="border-b border-[rgba(14,58,67,0.12)] bg-white/90">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <img src="/sindes-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            SINDES
          </Link>
          <Link href="/convenios" className="text-sm font-medium text-[#1F8A70]">
            Ver vitrine
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1F8A70]">Administração</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Convênios e vouchers</h1>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={entrar}>
          <div className="min-w-0 flex-1">
            <label htmlFor="codigo-admin" className="block text-base font-semibold">
              Código do administrador
            </label>
            <input
              id="codigo-admin"
              type="password"
              autoComplete="off"
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              className={campo}
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#5D25AA] px-4 text-base font-semibold text-white sm:self-end"
          >
            {buscando ? "Consultando..." : "Entrar"}
          </button>
        </form>
        {erro ? (
          <p className="mt-4 text-base text-red-700" role="alert">
            {erro}
          </p>
        ) : null}
        <p className="mt-4 text-sm text-[#0E3A43]/75">
          Preferencial:{" "}
          <Link href="/entrar?depois=/admin" className="font-semibold text-[#1F8A70]">
            entrar com e-mail e senha
          </Link>
          . O código legado abaixo continua válido durante a transição.
        </p>
      </div>
    </main>
  );
}
