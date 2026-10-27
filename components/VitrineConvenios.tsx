"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import CamposValidacaoTrabalhador from "@/components/CamposValidacaoTrabalhador";
import { prepararArquivoTrabalhador } from "@/lib/arquivo-cliente";
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

export default function VitrineConvenios() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [filtro, setFiltro] = useState<CategoriaId | "todos">("todos");
  const [fase, setFase] = useState<"carregando" | "pronto" | "falha">("carregando");
  const [escolhido, setEscolhido] = useState<Parceiro | null>(null);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [telefone, setTelefone] = useState("");
  const [localTrabalho, setLocalTrabalho] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [contracheque, setContracheque] = useState<File | null>(null);
  const [documento, setDocumento] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [errosDocumentos, setErrosDocumentos] = useState<{ contracheque?: string; documento?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const [pedidoId, setPedidoId] = useState("");

  useEffect(() => {
    let vivo = true;
    void fetch("/api/convenios/parceiros")
      .then((resposta) => resposta.json())
      .then((dados: { parceiros?: Parceiro[] }) => {
        if (!vivo) return;
        setParceiros(dados.parceiros ?? []);
        setFase("pronto");
      })
      .catch(() => {
        if (vivo) setFase("falha");
      });
    return () => {
      vivo = false;
    };
  }, []);

  const maior = parceiros.reduce((atual, item) => Math.max(atual, item.discountPercent), 0);
  const visiveis = filtro === "todos" ? parceiros : parceiros.filter((item) => item.category === filtro);

  function abrir(parceiro: Parceiro) {
    setEscolhido(parceiro);
    setNome("");
    setCargo("");
    setTelefone("");
    setLocalTrabalho("");
    setConsentimento(false);
    setContracheque(null);
    setDocumento(null);
    setErro("");
    setPedidoId("");
    setTentouEnviar(false);
    setErrosDocumentos({});
  }

  function pedidoValido() {
    if (!escolhido || !consentimento) return false;
    if (!nome.trim() || !cargo.trim() || !telefone.trim() || !localTrabalho.trim()) return false;
    if (!contracheque || !documento) return false;
    return true;
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setTentouEnviar(true);
    const docsErro: { contracheque?: string; documento?: string } = {};
    if (!contracheque) docsErro.contracheque = "Selecione o contracheque para enviar o pedido.";
    if (!documento) docsErro.documento = "Selecione o documento de identificação para enviar.";
    if (docsErro.contracheque || docsErro.documento) {
      setErrosDocumentos(docsErro);
      setErro("Envie contracheque e documento com foto para continuar.");
      return;
    }
    if (!escolhido || !consentimento || enviando || !pedidoValido()) {
      setErro("Preencha todos os campos obrigatórios e marque o consentimento.");
      return;
    }
    setEnviando(true);
    setErro("");
    setErrosDocumentos({});
    try {
      const formulario = new FormData();
      formulario.set("partnerId", escolhido.id);
      formulario.set("name", nome.trim());
      formulario.set("cargo", cargo.trim());
      formulario.set("telefone", telefone.replace(/\D/g, ""));
      formulario.set("localTrabalho", localTrabalho.trim());
      formulario.set("consent", "true");
      const pay = await prepararArquivoTrabalhador(contracheque!, "contracheque");
      const id = await prepararArquivoTrabalhador(documento!, "documento");
      formulario.set("contracheque", new File([pay.blob], pay.nomeNeutro, { type: pay.blob.type }));
      formulario.set("documento", new File([id.blob], id.nomeNeutro, { type: id.blob.type }));
      const resposta = await fetch("/api/convenios/pedidos", {
        method: "POST",
        body: formulario,
      });
      const dados = (await resposta.json().catch(() => null)) as { id?: string; erro?: string } | null;
      if (!resposta.ok || !dados?.id) {
        setErro(dados?.erro ?? "Não foi possível registrar o pedido.");
        return;
      }
      setPedidoId(dados.id);
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "Não foi possível registrar o pedido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#F8FAFC] text-[#1D0D2C]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
            <img src="/sindes-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
            SINDES
          </Link>
          <Link
            href="/"
            className="rounded-md text-sm font-medium text-[#5D25AA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
          >
            Voltar ao início
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5D25AA]">Convênios</p>
        {fase === "pronto" && maior > 0 ? (
          <p className="mt-3 text-5xl font-semibold tracking-tight text-[#5D25AA] sm:text-6xl">até {maior}% de desconto</p>
        ) : (
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Convênios</h1>
        )}
        {fase === "pronto" && maior > 0 ? (
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance">para quem está no plantão</h1>
        ) : null}
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Farmácia, psiquiatria, clube, academia, estética e ótica. O desconto aparece quando a administração publica o convênio.
        </p>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Categorias">
          <button
            type="button"
            aria-pressed={filtro === "todos"}
            onClick={() => setFiltro("todos")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filtro === "todos" ? "bg-[#1D0D2C] text-white" : "border border-slate-300 bg-white"}`}
          >
            Todos
          </button>
          {CATEGORIAS.map((categoria) => (
            <button
              key={categoria.id}
              type="button"
              aria-pressed={filtro === categoria.id}
              onClick={() => setFiltro(categoria.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${filtro === categoria.id ? "bg-[#1D0D2C] text-white" : "border border-slate-300 bg-white"}`}
            >
              {categoria.rotulo}
            </button>
          ))}
        </div>
        {fase === "carregando" ? <p className="mt-8 text-base">Carregando convênios...</p> : null}
        {fase === "falha" ? (
          <p className="mt-8 text-base text-red-700" role="alert">
            Não foi possível carregar os convênios.
          </p>
        ) : null}
        {fase === "pronto" && parceiros.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-base">
            Nenhum convênio publicado.
          </p>
        ) : null}
        {fase === "pronto" && parceiros.length > 0 && visiveis.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-base">
            Nenhum convênio nesta categoria.
          </p>
        ) : null}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {visiveis.map((parceiro) => (
            <li key={parceiro.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                {parceiro.logoUrl ? (
                  <img src={parceiro.logoUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <img src="/sindes-logo.png" alt="" width={56} height={56} className="h-14 w-14 rounded-xl bg-white object-contain" />
                )}
                <div className="min-w-0">
                  {parceiro.example ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5D25AA]">Exemplo</p>
                  ) : null}
                  <h2 className="text-lg font-semibold text-balance">{parceiro.name}</h2>
                  <p className="text-sm text-slate-600">{parceiro.categoryLabel}</p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-[#1D0D2C]">{parceiro.discountPercent}% de desconto</p>
              <p className="mt-2 text-base leading-7 text-slate-700">{parceiro.benefit}</p>
              <button
                type="button"
                onClick={() => abrir(parceiro)}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D0D2C] focus-visible:ring-offset-2"
              >
                Quero este desconto
              </button>
            </li>
          ))}
        </ul>
      </div>
      {escolhido ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1D0D2C]/60 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-pedido" className="w-full max-w-lg rounded-2xl bg-white p-5 text-[#1D0D2C] shadow-lg">
            <h2 id="titulo-pedido" className="text-2xl font-semibold tracking-tight">
              {escolhido.discountPercent}% de desconto
            </h2>
            <p className="mt-1 text-base text-slate-600">{escolhido.name}</p>
            {pedidoId ? (
              <div className="mt-4" role="status">
                <p className="text-base leading-7">
                  Pedido enviado. A equipe do sindicato vai conferir seus documentos antes de liberar o voucher. Isso não cria um cartão automaticamente.
                </p>
                <button
                  type="button"
                  onClick={() => setEscolhido(null)}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#1D0D2C] px-4 text-base font-semibold text-white"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1" onSubmit={enviar}>
                <CamposValidacaoTrabalhador
                  idPrefixo="pedido"
                  nome={nome}
                  setNome={setNome}
                  cargo={cargo}
                  setCargo={setCargo}
                  telefone={telefone}
                  setTelefone={setTelefone}
                  localTrabalho={localTrabalho}
                  setLocalTrabalho={setLocalTrabalho}
                  consentimento={consentimento}
                  setConsentimento={setConsentimento}
                  contracheque={contracheque}
                  setContracheque={setContracheque}
                  documento={documento}
                  setDocumento={setDocumento}
                  errosDocumentos={tentouEnviar ? errosDocumentos : undefined}
                />
                {erro ? (
                  <p className="text-base text-red-700" role="alert">
                    {erro}
                  </p>
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={enviando}
                    aria-disabled={!pedidoValido()}
                    className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] disabled:opacity-50 ${!pedidoValido() ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {enviando ? "Enviando..." : "Enviar pedido"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscolhido(null)}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-base font-semibold"
                  >
                    Agora não
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
