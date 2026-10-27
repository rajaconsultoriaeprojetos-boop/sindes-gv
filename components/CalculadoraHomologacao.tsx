"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ControlesSessao from "@/components/ControlesSessao";
import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw, UploadCloud } from "lucide-react";
import {
  calcularRescisao,
  formatarCentavos,
  type GrauInsalubridade,
  type MotivoRescisao,
  type ResultadoRescisao,
} from "@/lib/rescisao";
import AuditoriaPainel from "@/components/AuditoriaPainelRescisao";
import AuditoriaPorDocumentos from "@/components/AuditoriaPorDocumentos";
import RelatorioAchadosAuditoria from "@/components/RelatorioAchadosAuditoria";
import { montarRelatorioConsistencia } from "@/lib/consistencia-trct";
import { enviarArquivoTrctApi, prepararArquivoTrct } from "@/lib/trct-arquivo-client";
import { classificarMotivo, validarLeitura, type VerbasPagasEmpregador } from "@/lib/trct";

const PASSOS = [
  { id: 1, titulo: "Dados contratuais" },
  { id: 2, titulo: "Particularidades da saúde" },
  { id: 3, titulo: "Resultado" },
] as const;

const GRAUS: { valor: GrauInsalubridade; rotulo: string }[] = [
  { valor: 0, rotulo: "Nenhum (0%)" },
  { valor: 10, rotulo: "10%" },
  { valor: 20, rotulo: "20%" },
  { valor: 40, rotulo: "40%" },
];

function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : null;
}

function dataPorExtenso(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CampoErro({ id, mensagem }: { id: string; mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p id={id} className="text-sm font-medium text-red-800">
      {mensagem}
    </p>
  );
}

type ModoCalculadora = "calculo" | "auditoria";

export default function CalculadoraHomologacao() {
  const router = useRouter();
  const [modo, setModo] = useState<ModoCalculadora>("calculo");
  const [consentimento, setConsentimento] = useState(false);
  const [caixaMarcada, setCaixaMarcada] = useState(false);
  const dialogoRef = useRef<HTMLDivElement>(null);
  const [passo, setPasso] = useState(1);
  const [admissao, setAdmissao] = useState("");
  const [demissao, setDemissao] = useState("");
  const [motivo, setMotivo] = useState<MotivoRescisao>("sem-justa-causa");
  const [salario, setSalario] = useState("");
  const [grau, setGrau] = useState<GrauInsalubridade>(0);
  const [horas, setHoras] = useState("");
  const [noturno, setNoturno] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoRescisao | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [erroUpload, setErroUpload] = useState("");
  const [leituraRecebida, setLeituraRecebida] = useState(false);
  const [motivoLido, setMotivoLido] = useState<string | null>(null);
  const [motivoClassificado, setMotivoClassificado] = useState(false);
  const [verbasLidas, setVerbasLidas] = useState<VerbasPagasEmpregador | null>(null);
  const pedido = useRef(0);
  const profundidadeArraste = useRef(0);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [sessaoOk, setSessaoOk] = useState<boolean | null>(null);
  const [emailUsuario, setEmailUsuario] = useState("");

  useEffect(() => {
    let vivo = true;
    void fetch("/api/auth/me")
      .then(async (resposta) => {
        if (!vivo) return;
        if (!resposta.ok) {
          router.replace("/entrar?depois=/calculadora");
          return;
        }
        const me = (await resposta.json()) as { role?: string; email?: string };
        const ok =
          me.role === "superadmin" || me.role === "admin" || me.role === "contador" || me.role === undefined;
        if (!ok) {
          router.replace("/entrar?depois=/calculadora");
          return;
        }
        if (me.email) setEmailUsuario(me.email);
        setSessaoOk(true);
      })
      .catch(() => {
        if (vivo) router.replace("/entrar?depois=/calculadora");
      });
    return () => {
      vivo = false;
    };
  }, [router]);

  useEffect(() => {
    if (consentimento) return;
    dialogoRef.current?.focus();
  }, [consentimento]);

  function limparErro(...chaves: string[]) {
    setErros((atual) => {
      if (!chaves.some((chave) => atual[chave])) return atual;
      const copia = { ...atual };
      for (const chave of chaves) delete copia[chave];
      return copia;
    });
  }

  function validarPasso1() {
    const proximos: Record<string, string> = {};
    if (!admissao) proximos.admissao = "Informe a data de admissão.";
    if (!demissao) proximos.demissao = "Informe a data de demissão.";
    if (admissao && demissao && demissao < admissao) {
      proximos.demissao = "A demissão não pode ser anterior à admissão.";
    }
    const valorSalario = lerNumero(salario);
    if (valorSalario === null || valorSalario <= 0) {
      proximos.salario = "Informe um salário base maior que zero.";
    }
    return proximos;
  }

  function validarPasso2() {
    const proximos: Record<string, string> = {};
    const valorHoras = horas.trim() === "" ? 0 : lerNumero(horas);
    const valorNoturno = noturno.trim() === "" ? 0 : lerNumero(noturno);
    if (valorHoras === null || valorHoras < 0) {
      proximos.horas = "As horas extras precisam ser um número igual ou maior que zero.";
    }
    if (valorNoturno === null || valorNoturno < 0) {
      proximos.noturno = "O adicional noturno precisa ser um valor igual ou maior que zero.";
    }
    return proximos;
  }

  function avancar() {
    if (!consentimento) return;
    if (passo === 1) {
      const proximos = validarPasso1();
      setErros(proximos);
      if (Object.keys(proximos).length === 0) setPasso(2);
      return;
    }
    const proximos = validarPasso2();
    setErros(proximos);
    if (Object.keys(proximos).length > 0) return;
    const calculo = calcularRescisao({
      admissao,
      demissao,
      motivo,
      salarioBase: lerNumero(salario) ?? 0,
      grauInsalubridade: grau,
      mediaHorasExtras: horas.trim() === "" ? 0 : (lerNumero(horas) ?? 0),
      adicionalNoturno: noturno.trim() === "" ? 0 : (lerNumero(noturno) ?? 0),
    });
    setResultado(calculo);
    setPasso(3);
  }

  function novaSimulacao() {
    pedido.current += 1;
    setPasso(1);
    setAdmissao("");
    setDemissao("");
    setMotivo("sem-justa-causa");
    setSalario("");
    setGrau(0);
    setHoras("");
    setNoturno("");
    setErros({});
    setResultado(null);
    setIsLoading(false);
    setArrastando(false);
    setErroUpload("");
    setLeituraRecebida(false);
    setMotivoLido(null);
    setMotivoClassificado(false);
    setVerbasLidas(null);
  }

  function aplicarLeitura(leitura: NonNullable<ReturnType<typeof validarLeitura>>) {
    const dados = leitura.dadosContratuais;
    if (dados.dataAdmissao) setAdmissao(dados.dataAdmissao);
    if (dados.dataDemissao) setDemissao(dados.dataDemissao);
    if (typeof dados.salarioBase === "number") setSalario(String(dados.salarioBase));
    if (typeof dados.grauInsalubridade === "number") setGrau(dados.grauInsalubridade);
    if (typeof dados.mediaHorasExtras === "number") setHoras(String(dados.mediaHorasExtras));
    if (typeof dados.adicionalNoturno === "number") setNoturno(String(dados.adicionalNoturno));
    if (dados.motivoAfastamento) {
      setMotivoLido(dados.motivoAfastamento);
      const classe = classificarMotivo(dados.motivoAfastamento);
      setMotivoClassificado(classe !== null);
      if (classe) setMotivo(classe);
    } else {
      setMotivoLido(null);
      setMotivoClassificado(false);
    }
    setVerbasLidas(leitura.verbasPagasEmpregador);
    setLeituraRecebida(true);
    setErros({});
  }

  function retirarConsentimento() {
    pedido.current += 1;
    setConsentimento(false);
    setCaixaMarcada(false);
    setIsLoading(false);
  }

  function aceitarConsentimento() {
    if (!caixaMarcada) return;
    setConsentimento(true);
  }

  function tecladoDoDialogo(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      return;
    }
    if (evento.key !== "Tab" || !dialogoRef.current) return;
    const focaveis = [
      ...dialogoRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), a[href]",
      ),
    ];
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  async function enviarArquivo(arquivo: File) {
    if (!consentimento || isLoading) return;
    let preparado: Awaited<ReturnType<typeof prepararArquivoTrct>>;
    try {
      preparado = await prepararArquivoTrct(arquivo);
    } catch (erro) {
      setErroUpload(erro instanceof Error ? erro.message : "Envie apenas PDF, PNG ou JPG.");
      if (arquivoRef.current) arquivoRef.current.value = "";
      return;
    }
    const id = ++pedido.current;
    setIsLoading(true);
    setErroUpload("");
    try {
      const dados = await enviarArquivoTrctApi(preparado.blob, preparado.nome);
      if (id !== pedido.current) return;
      const leitura = validarLeitura(dados);
      if (!leitura) {
        setErroUpload("A leitura não voltou os dados esperados. Nada foi preenchido.");
        return;
      }
      aplicarLeitura(leitura);
    } catch {
      if (id === pedido.current) {
        setErroUpload("Não foi possível enviar o arquivo. Os campos não foram alterados.");
      }
    } finally {
      if (id === pedido.current) setIsLoading(false);
      if (arquivoRef.current) arquivoRef.current.value = "";
    }
  }

  function aoArrastar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    if (!consentimento || isLoading) return;
    profundidadeArraste.current += 1;
    setArrastando(true);
  }

  function aoSair(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    profundidadeArraste.current -= 1;
    if (profundidadeArraste.current <= 0) {
      profundidadeArraste.current = 0;
      setArrastando(false);
    }
  }

  function aoSoltar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    profundidadeArraste.current = 0;
    setArrastando(false);
    if (!consentimento || isLoading) return;
    const arquivo = evento.dataTransfer.files[0];
    if (arquivo) void enviarArquivo(arquivo);
  }

  const passoAtual = PASSOS[passo - 1];
  const leituraCompleta =
    verbasLidas && admissao && demissao && lerNumero(salario)
      ? montarRelatorioConsistencia({
          dadosContratuais: {
            dataAdmissao: admissao,
            dataDemissao: demissao,
            motivoAfastamento: motivoLido,
            salarioBase: lerNumero(salario),
            grauInsalubridade: grau,
            mediaHorasExtras: horas.trim() === "" ? null : lerNumero(horas),
            adicionalNoturno: noturno.trim() === "" ? null : lerNumero(noturno),
          },
          verbasPagasEmpregador: verbasLidas,
        })
      : verbasLidas
        ? montarRelatorioConsistencia({
            dadosContratuais: {
              dataAdmissao: admissao || null,
              dataDemissao: demissao || null,
              motivoAfastamento: motivoLido,
              salarioBase: lerNumero(salario),
              grauInsalubridade: grau,
              mediaHorasExtras: horas.trim() === "" ? null : lerNumero(horas),
              adicionalNoturno: noturno.trim() === "" ? null : lerNumero(noturno),
            },
            verbasPagasEmpregador: verbasLidas,
          })
        : null;

  if (sessaoOk !== true) {
    return (
      <main className="min-h-dvh bg-[#F8FAFC] px-4 py-16 text-center text-[#0E3A43]">
        <p className="text-sm font-medium">Verificando acesso da assessoria…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAF9] text-[#0E3A43]">
      <header className="border-b border-[rgba(14,58,67,0.12)] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/contador" className="inline-flex items-center gap-2 text-base font-semibold text-[#0E3A43]">
            <img src="/sindes-logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg bg-white object-contain" />
            SINDES · Calculadora
          </Link>
          <ControlesSessao email={emailUsuario} />
        </div>
      </header>

      {consentimento ? (
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base font-semibold text-[#1D0D2C]">Consentimento ativo para esta auditoria.</p>
          <button
            type="button"
            onClick={retirarConsentimento}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#1D0D2C] bg-white px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
          >
            Retirar consentimento
          </button>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1D0D2C]/60 p-4 sm:items-center">
          <div
            ref={dialogoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-consentimento"
            aria-describedby="texto-consentimento"
            tabIndex={-1}
            onKeyDown={tecladoDoDialogo}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-[#1D0D2C] shadow-lg outline-none"
          >
            <h2 id="titulo-consentimento" className="text-2xl font-semibold tracking-tight text-balance">
              Termo de Consentimento e Privacidade de Dados (LGPD)
            </h2>
            <p id="texto-consentimento" className="mt-4 text-base leading-7 text-slate-700">
              O arquivo é enviado ao provedor de IA configurado no servidor (OpenRouter / OpenAI / Anthropic) somente para esta leitura e não fica armazenado. A calculadora não pede CPF.
            </p>
            <label className="mt-5 flex min-h-11 items-start gap-3 text-base leading-7">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                checked={caixaMarcada}
                onChange={(evento) => setCaixaMarcada(evento.target.checked)}
              />
              Entendo que o arquivo é enviado à OpenAI ou à Anthropic somente para esta leitura e não fica armazenado.
            </label>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={!caixaMarcada}
                onClick={aceitarConsentimento}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D0D2C] focus-visible:ring-offset-2"
              >
                Aceitar
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D25AA] focus-visible:ring-offset-2"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`mx-auto px-4 py-8 sm:py-10 ${modo === "auditoria" || verbasLidas ? "max-w-5xl" : "max-w-3xl"}`}
        inert={!consentimento}
        aria-hidden={consentimento ? undefined : true}
      >
        <div
          role="tablist"
          aria-label="Modo da calculadora"
          className="flex flex-col gap-2 sm:flex-row sm:gap-3"
        >
          <button
            type="button"
            role="tab"
            aria-selected={modo === "calculo"}
            id="tab-calculo"
            aria-controls="painel-calculo"
            onClick={() => setModo("calculo")}
            className={`min-h-12 flex-1 rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
              modo === "calculo"
                ? "border-[#5D25AA] bg-[#5D25AA] text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Cálculo completo
            <span className={`mt-0.5 block text-sm font-normal ${modo === "calculo" ? "text-white/85" : "text-slate-500"}`}>
              Assistente em 3 passos com estimativa SINDES
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === "auditoria"}
            id="tab-auditoria"
            aria-controls="painel-auditoria"
            onClick={() => setModo("auditoria")}
            className={`min-h-12 flex-1 rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
              modo === "auditoria"
                ? "border-[#5D25AA] bg-[#5D25AA] text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Auditoria por documentos
            <span className={`mt-0.5 block text-sm font-normal ${modo === "auditoria" ? "text-white/85" : "text-slate-500"}`}>
              Só upload de TRCT (e anexos) com checagens automáticas
            </span>
          </button>
        </div>

        {modo === "auditoria" ? (
          <div id="painel-auditoria" role="tabpanel" aria-labelledby="tab-auditoria" className="mt-8">
            <h1 className="text-3xl font-semibold tracking-tight text-balance">Auditoria por documentos</h1>
            <AuditoriaPorDocumentos consentimento={consentimento} />
          </div>
        ) : (
          <div id="painel-calculo" role="tabpanel" aria-labelledby="tab-calculo">
        <p className="mt-8 text-sm font-semibold text-[#5D25AA]">Passo {passo} de 3</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
          {passoAtual.titulo}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
          Estimativa das verbas de uma rescisão CLT para quem trabalha na saúde.
          O valor ajuda a conversa com a assessoria e não substitui a homologação.
        </p>

        <ol className="mt-6 grid grid-cols-3 gap-2">
          {PASSOS.map((item) => {
            const atual = item.id === passo;
            const feito = item.id < passo;
            return (
              <li
                key={item.id}
                aria-current={atual ? "step" : undefined}
                className={`rounded-lg border px-3 py-3 text-sm font-semibold ${
                  atual
                    ? "border-[#5D25AA] bg-[#5D25AA] text-white"
                    : feito
                      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                      : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span className="block text-xs font-medium opacity-80">{item.id}</span>
                {item.titulo}
              </li>
            );
          })}
        </ol>

        {passo === 1 ? (
          <form
            className="mt-8 space-y-6"
            onSubmit={(evento) => {
              evento.preventDefault();
              avancar();
            }}
          >
            <div className="space-y-3">
              <label
                htmlFor="arquivo-trct"
                onDragEnter={aoArrastar}
                onDragOver={(evento) => {
                  evento.preventDefault();
                  if (!isLoading) setArrastando(true);
                }}
                onDragLeave={aoSair}
                onDrop={aoSoltar}
                className={`border-dashed border-2 border-slate-300 rounded-xl bg-slate-50/50 p-6 text-center hover:bg-slate-50 transition block cursor-pointer focus-within:ring-2 focus-within:ring-[#5D25AA] ${
                  isLoading ? "cursor-wait" : arrastando ? "ring-2 ring-[#5D25AA]" : ""
                }`}
              >
                <input
                  ref={arquivoRef}
                  id="arquivo-trct"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  disabled={!consentimento || isLoading}
                  aria-label="Enviar TRCT ou contracheque"
                  className="sr-only"
                  onChange={(evento) => {
                    const arquivo = evento.target.files?.[0];
                    if (arquivo) void enviarArquivo(arquivo);
                  }}
                />
                {isLoading ? (
                  <div role="status" aria-live="polite">
                    <Loader2 aria-hidden="true" className="mx-auto h-10 w-10 animate-spin text-[#5D25AA] motion-reduce:animate-none" />
                    <p className="mt-4 text-lg font-semibold text-balance text-[#1D0D2C]">
                      Nossa inteligência artificial está lendo seu documento trabalhista...
                    </p>
                  </div>
                ) : (
                  <>
                    <UploadCloud aria-hidden="true" className="mx-auto h-10 w-10 text-[#5D25AA]" />
                    <p className="mt-4 text-lg font-semibold text-balance text-[#1D0D2C]">
                      Deseja automatizar? Insira o TRCT assinado ou contracheques aqui
                    </p>
                    <p className="mx-auto mt-2 max-w-xl text-base leading-7 text-slate-600">
                      Nossa IA vai ler o documento, preencher a calculadora e auditar os valores automaticamente.
                    </p>
                  </>
                )}
                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
                  O arquivo é enviado ao provedor de IA somente para esta leitura. PDF, PNG ou JPG, até 5 MB.
                </p>
              </label>
              {erroUpload ? (
                <p role="alert" className="text-sm font-medium text-red-800">
                  {erroUpload}
                </p>
              ) : null}
              {leituraRecebida ? (
                <p className="rounded-lg border border-[#5D25AA]/25 bg-[#5D25AA]/10 px-4 py-3 text-sm leading-6 text-[#1D0D2C]">
                  A leitura devolveu os campos abaixo. O que não veio preenchido ficou como estava. Confira antes de continuar.
                </p>
              ) : null}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="admissao" className="block text-base font-semibold">
                  Data de admissão
                </label>
                <input
                  id="admissao"
                  type="date"
                  value={admissao}
                  onChange={(evento) => {
                    setAdmissao(evento.target.value);
                    limparErro("admissao", "demissao");
                  }}
                  aria-invalid={Boolean(erros.admissao)}
                  aria-describedby={erros.admissao ? "erro-admissao" : undefined}
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
                />
                {dataPorExtenso(admissao) ? (
                  <p className="text-sm text-slate-600">{dataPorExtenso(admissao)}</p>
                ) : null}
                <CampoErro id="erro-admissao" mensagem={erros.admissao} />
              </div>
              <div className="space-y-2">
                <label htmlFor="demissao" className="block text-base font-semibold">
                  Data de demissão
                </label>
                <input
                  id="demissao"
                  type="date"
                  value={demissao}
                  onChange={(evento) => {
                    setDemissao(evento.target.value);
                    limparErro("admissao", "demissao");
                  }}
                  aria-invalid={Boolean(erros.demissao)}
                  aria-describedby={erros.demissao ? "erro-demissao" : undefined}
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
                />
                {dataPorExtenso(demissao) ? (
                  <p className="text-sm text-slate-600">{dataPorExtenso(demissao)}</p>
                ) : null}
                <CampoErro id="erro-demissao" mensagem={erros.demissao} />
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-base font-semibold">Motivo</legend>
              {motivoLido ? (
                <p className="text-sm leading-6 text-slate-700">
                  Motivo lido no documento: {motivoLido}
                  {motivoClassificado
                    ? ""
                    : " Não deu para classificar como sem justa causa ou pedido de demissão. A opção abaixo permanece a que já estava marcada."}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["sem-justa-causa", "Sem justa causa"],
                    ["pedido-demissao", "Pedido de demissão"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <label
                    key={valor}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-base ${
                      motivo === valor
                        ? "border-[#5D25AA] bg-[#5D25AA]/10"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="motivo"
                      value={valor}
                      checked={motivo === valor}
                      onChange={() => setMotivo(valor)}
                      className="h-5 w-5"
                    />
                    {rotulo}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <label htmlFor="salario" className="block text-base font-semibold">
                Salário base
              </label>
              <input
                id="salario"
                inputMode="decimal"
                value={salario}
                onChange={(evento) => {
                  setSalario(evento.target.value);
                  limparErro("salario");
                }}
                placeholder="3.000,00"
                aria-invalid={Boolean(erros.salario)}
                aria-describedby={erros.salario ? "erro-salario ajuda-salario" : "ajuda-salario"}
                className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
              />
              <p id="ajuda-salario" className="text-sm text-slate-600">
                Valor mensal do contrato, sem insalubridade, horas extras ou adicional noturno.
              </p>
              <CampoErro id="erro-salario" mensagem={erros.salario} />
            </div>

            <button
              type="submit"
              disabled={!consentimento}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Continuar
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </form>
        ) : null}

        {passo === 2 ? (
          <form
            className="mt-8 space-y-6"
            onSubmit={(evento) => {
              evento.preventDefault();
              avancar();
            }}
          >
            {leituraRecebida ? (
              <p className="text-sm leading-6 text-slate-600">
                Grau, horas extras e adicional noturno só foram preenchidos quando o documento trouxe o número. Campo nulo ficou como estava.
              </p>
            ) : null}
            <fieldset className="space-y-3">
              <legend className="text-base font-semibold">Grau de insalubridade</legend>
              <p className="text-sm leading-6 text-slate-600">
                O percentual incide sobre o salário mínimo de 2024, R$ 1.412,00. Não usa o salário do contrato.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {GRAUS.map((item) => (
                  <label
                    key={item.valor}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-base font-semibold ${
                      grau === item.valor
                        ? "border-[#5D25AA] bg-[#5D25AA]/10"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="grau"
                      value={item.valor}
                      checked={grau === item.valor}
                      onChange={() => setGrau(item.valor)}
                      className="h-5 w-5"
                    />
                    {item.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <label htmlFor="horas" className="block text-base font-semibold">
                Média de horas extras mensais
              </label>
              <input
                id="horas"
                inputMode="decimal"
                value={horas}
                onChange={(evento) => {
                  setHoras(evento.target.value);
                  limparErro("horas");
                }}
                placeholder="10"
                aria-invalid={Boolean(erros.horas)}
                aria-describedby={erros.horas ? "erro-horas ajuda-horas" : "ajuda-horas"}
                className="h-14 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"
              />
              <p id="ajuda-horas" className="text-sm text-slate-600">
                Horas por mês. A conta usa o divisor 220 e o adicional de 50%.
              </p>
              <CampoErro id="erro-horas" mensagem={erros.horas} />
            </div>

            <div className="space-y-2">
              <label htmlFor="noturno" className="block text-base font-semibold">
                Média de adicional noturno (R$)
              </label>
              <input
                id="noturno"
                inputMode="decimal"
                value={noturno}
                onChange={(evento) => {
                  setNoturno(evento.target.value);
                  limparErro("noturno");
                }}
                placeholder="200,00"
                aria-invalid={Boolean(erros.noturno)}
                aria-describedby={erros.noturno ? "erro-noturno ajuda-noturno" : "ajuda-noturno"}
                className="h-14 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"
              />
              <p id="ajuda-noturno" className="text-sm text-slate-600">
                Valor mensal em reais, já calculado na folha.
              </p>
              <CampoErro id="erro-noturno" mensagem={erros.noturno} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setErros({});
                  setPasso(1);
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Voltar
              </button>
              <button
                type="submit"
                disabled={!consentimento}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#FCB065] px-4 text-base font-semibold text-[#1D0D2C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ver resultado
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </form>
        ) : null}

        {passo === 3 && resultado ? (
          <div className="mt-8 space-y-8">
            <div className="space-y-8">
            <section aria-labelledby="titulo-proventos" className="rounded-xl border border-slate-200 bg-white">
              <h2 id="titulo-proventos" className="border-b border-slate-200 px-4 py-4 text-lg font-semibold">
                Proventos
              </h2>
              <table className="w-full">
                <tbody>
                  {resultado.proventos.map((linha) => (
                    <tr key={linha.id} className="border-b border-slate-100 align-top">
                      <th scope="row" className="px-4 py-4 text-left font-medium">
                        <span className="block text-base">{linha.rotulo}</span>
                        <span className="mt-1 block text-sm font-normal leading-6 text-slate-600">
                          {linha.detalhe}
                        </span>
                      </th>
                      <td className="px-4 py-4 text-right text-base font-semibold whitespace-nowrap tabular-nums">
                        {formatarCentavos(linha.centavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" className="px-4 py-4 text-left text-base">
                      Total de proventos
                    </th>
                    <td className="px-4 py-4 text-right text-base font-semibold whitespace-nowrap tabular-nums">
                      {formatarCentavos(resultado.proventosCentavos)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section aria-labelledby="titulo-descontos" className="rounded-xl border border-slate-200 bg-white">
              <h2 id="titulo-descontos" className="border-b border-slate-200 px-4 py-4 text-lg font-semibold">
                Descontos
              </h2>
              <table className="w-full">
                <tbody>
                  {resultado.descontos.map((linha) => (
                    <tr key={linha.id} className="border-b border-slate-100 align-top">
                      <th scope="row" className="px-4 py-4 text-left font-medium">
                        <span className="block text-base">{linha.rotulo}</span>
                        <span className="mt-1 block text-sm font-normal leading-6 text-slate-600">
                          {linha.detalhe}
                        </span>
                      </th>
                      <td className="px-4 py-4 text-right text-base font-semibold whitespace-nowrap tabular-nums">
                        {formatarCentavos(linha.centavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" className="px-4 py-4 text-left text-base">
                      Total de descontos
                    </th>
                    <td className="px-4 py-4 text-right text-base font-semibold whitespace-nowrap tabular-nums">
                      {formatarCentavos(resultado.descontosCentavos)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>

            <section className="rounded-xl bg-[#1D0D2C] px-5 py-6 text-white" aria-labelledby="titulo-liquido">
              <h2 id="titulo-liquido" className="text-sm font-semibold text-white/75">
                Valor líquido
              </h2>
              <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
                {formatarCentavos(resultado.liquidoCentavos)}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Proventos menos os descontos de INSS. Férias e aviso prévio não sofrem INSS nesta estimativa.
              </p>
            </section>

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
              Esta é uma estimativa. Não substitui a homologação nem a assessoria. A jornada assumida é de 220 horas.
              A insalubridade incide sobre R$ 1.412,00. FGTS e multa não entram.
            </p>

            {leituraCompleta ? (
              <RelatorioAchadosAuditoria
                achados={leituraCompleta.achados}
                titulo="Consistência do documento lido"
              />
            ) : null}

            {verbasLidas ? (
              <AuditoriaPainel verbas={verbasLidas} resultado={resultado} />
            ) : (
              <p className="text-sm text-slate-600">Nenhum TRCT lido para auditar.</p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setPasso(2)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Voltar
              </button>
              <button
                type="button"
                onClick={novaSimulacao}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-base font-semibold"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Nova simulação
              </button>
            </div>
            </div>
          </div>
        ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
